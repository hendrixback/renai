import "server-only";

import { createId } from "@paralleldrive/cuid2";

import type { Document, DocumentLink } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  type CreateDocumentInput,
  type DocumentModule,
  type ListDocumentsInput,
} from "@/lib/schemas/document.schema";
import { StorageError, getStorage } from "@/lib/storage";

type ServiceContext = {
  user: { id: string };
  company: { id: string };
};

/**
 * Documents service (ADR-006).
 *
 * Every method scopes by `companyId` implicitly — callers pass the current
 * `ctx` and can't reach another tenant's data through this service. Storage
 * and DB operations are orchestrated here so call sites (server actions,
 * route handlers) stay thin.
 *
 * Pattern:
 *  - Create: generate id client-side → upload bytes → insert metadata row.
 *    On DB failure, the uploaded file is cleaned up so we don't leak
 *    orphan bytes.
 *  - Read: verify tenant ownership via the DB row before returning the
 *    stream — two guards, defence in depth.
 *  - Delete: soft-delete the row, then remove bytes. We keep the row so
 *    the audit trail + DocumentLink history survive; `deletedAt` hides
 *    it from list queries.
 */

type CreateArgs = CreateDocumentInput & {
  /** Raw bytes to persist. Service takes ownership of the buffer. */
  data: Buffer | Uint8Array;
};

async function create(
  ctx: ServiceContext,
  args: CreateArgs,
): Promise<Document> {
  const documentId = createId();

  const uploadResult = await getStorage().upload({
    companyId: ctx.company.id,
    documentId,
    filename: args.originalFilename,
    mimeType: args.mimeType,
    data: args.data,
  });

  try {
    const doc = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          id: documentId,
          companyId: ctx.company.id,
          uploadedById: ctx.user.id,
          filename: uploadResult.sanitizedFilename,
          originalFilename: args.originalFilename,
          mimeType: args.mimeType,
          size: uploadResult.size,
          storageKey: uploadResult.storageKey,
          documentType: args.documentType,
          title: args.title ?? null,
          description: args.description ?? null,
          tags: args.tags,
          plantId: args.plantId ?? null,
          department: args.department ?? null,
          reportingYear: args.reportingYear ?? null,
          reportingMonth: args.reportingMonth ?? null,
        },
      });

      if (args.link) {
        await tx.documentLink.create({
          data: {
            documentId: created.id,
            module: args.link.module,
            recordId: args.link.recordId,
            linkedById: ctx.user.id,
          },
        });
      }

      return created;
    });

    return doc;
  } catch (err) {
    // DB insert / transaction failed after the bytes were written —
    // compensate by removing the file so we don't leak storage.
    await getStorage()
      .delete(ctx.company.id, uploadResult.storageKey)
      .catch((cleanupErr) => {
        logger.error(
          "Failed to clean up uploaded file after DB rollback",
          cleanupErr,
          { companyId: ctx.company.id, storageKey: uploadResult.storageKey },
        );
      });
    throw err;
  }
}

async function findByIdForTenant(
  ctx: ServiceContext,
  id: string,
): Promise<Document | null> {
  const doc = await prisma.document.findFirst({
    where: {
      id,
      companyId: ctx.company.id,
      deletedAt: null,
    },
  });
  return doc;
}

async function listByCompany(
  ctx: ServiceContext,
  opts: ListDocumentsInput = { limit: 50 },
): Promise<Document[]> {
  const where: Parameters<typeof prisma.document.findMany>[0] = {
    where: {
      companyId: ctx.company.id,
      deletedAt: null,
      ...(opts.documentType ? { documentType: opts.documentType } : {}),
      ...(opts.plantId ? { plantId: opts.plantId } : {}),
      ...(opts.reportingYear
        ? { reportingYear: opts.reportingYear }
        : {}),
      ...(opts.query
        ? {
            OR: [
              { title: { contains: opts.query, mode: "insensitive" } },
              {
                originalFilename: {
                  contains: opts.query,
                  mode: "insensitive",
                },
              },
              { description: { contains: opts.query, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(opts.module && opts.recordId
        ? {
            links: {
              some: { module: opts.module, recordId: opts.recordId },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit,
  };
  return prisma.document.findMany(where);
}

async function listForRecord(
  ctx: ServiceContext,
  module: DocumentModule,
  recordId: string,
): Promise<Document[]> {
  return prisma.document.findMany({
    where: {
      companyId: ctx.company.id,
      deletedAt: null,
      links: {
        some: { module, recordId },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function openReadStream(
  ctx: ServiceContext,
  documentId: string,
): Promise<{
  document: Document;
  stream: ReadableStream<Uint8Array>;
}> {
  const document = await findByIdForTenant(ctx, documentId);
  if (!document) {
    throw new StorageError("not_found", "Document not found");
  }
  const stream = await getStorage().read(ctx.company.id, document.storageKey);
  return { document, stream };
}

async function softDelete(
  ctx: ServiceContext,
  documentId: string,
): Promise<Document | null> {
  const doc = await findByIdForTenant(ctx, documentId);
  if (!doc) return null;

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      deletedAt: new Date(),
      recordStatus: "ARCHIVED",
    },
  });

  // Remove the physical bytes — the row remains so audit + link history
  // survive, but the file itself is gone. If we ever add a "restore"
  // feature, re-upload will be required.
  await getStorage()
    .delete(ctx.company.id, doc.storageKey)
    .catch((err) => {
      logger.error("Failed to delete file during soft-delete", err, {
        companyId: ctx.company.id,
        documentId: doc.id,
        storageKey: doc.storageKey,
      });
    });

  return updated;
}

async function link(
  ctx: ServiceContext,
  args: { documentId: string; module: DocumentModule; recordId: string },
): Promise<DocumentLink> {
  // Defence in depth: verify the document belongs to this tenant before
  // linking. Without this check, a caller that controls documentId could
  // link another tenant's file into their own record.
  const doc = await findByIdForTenant(ctx, args.documentId);
  if (!doc) {
    throw new StorageError("not_found", "Document not found");
  }

  return prisma.documentLink.upsert({
    where: {
      documentId_module_recordId: {
        documentId: args.documentId,
        module: args.module,
        recordId: args.recordId,
      },
    },
    create: {
      documentId: args.documentId,
      module: args.module,
      recordId: args.recordId,
      linkedById: ctx.user.id,
    },
    update: {},
  });
}

async function listLinksForDocument(
  ctx: ServiceContext,
  documentId: string,
): Promise<DocumentLink[]> {
  // Tenant-scope via the document FK join — a link whose document belongs
  // to a different company doesn't match.
  return prisma.documentLink.findMany({
    where: {
      documentId,
      document: { companyId: ctx.company.id },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function unlink(
  ctx: ServiceContext,
  linkId: string,
): Promise<void> {
  // deleteMany with a tenant join: if the link's document belongs to a
  // different company, the delete matches zero rows and is a no-op.
  await prisma.documentLink.deleteMany({
    where: {
      id: linkId,
      document: { companyId: ctx.company.id },
    },
  });
}

export const DocumentService = {
  create,
  findByIdForTenant,
  listByCompany,
  listForRecord,
  listLinksForDocument,
  openReadStream,
  softDelete,
  link,
  unlink,
};
