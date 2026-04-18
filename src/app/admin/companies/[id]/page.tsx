import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, BuildingIcon, EyeIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ViewAsButton } from "@/components/admin/view-as-button";

export const dynamic = "force-dynamic";

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      memberships: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      invitations: {
        where: { acceptedAt: null },
        orderBy: { createdAt: "desc" },
      },
      sites: { orderBy: { name: "asc" } },
      _count: {
        select: { memberships: true, wasteFlows: true, sites: true },
      },
    },
  });

  if (!company) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to companies
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BuildingIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {company.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{company.slug}</span>
              {company.country ? ` · ${company.country}` : ""}
              {" · created "}
              {new Date(company.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ViewAsButton companyId={company.id} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Members" value={company._count.memberships} />
        <Metric label="Waste flows" value={company._count.wasteFlows} />
        <Metric label="Sites" value={company._count.sites} />
      </div>

      <Card className="gap-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {company.memberships.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No members yet. Check the pending invitations below.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.memberships.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.user.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{m.user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {m.role.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.user.role === "ADMIN" ? (
                        <Badge variant="secondary">platform admin</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {company.invitations.length > 0 ? (
        <Card className="gap-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.invitations.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm">{i.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{i.role.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(i.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(i.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/admin/companies/${company.id}`}>
                <ArrowRightIcon className="size-4" />
                Refresh
              </Link>
            }
          />
          <ViewAsButton companyId={company.id} variant="ghost">
            <EyeIcon className="size-4" />
            View app as this company
          </ViewAsButton>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="gap-1 p-4">
      <CardContent className="p-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
