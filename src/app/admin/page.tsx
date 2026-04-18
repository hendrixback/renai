import Link from "next/link";
import { BuildingIcon, PlusIcon, UsersIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { memberships: true, wasteFlows: true, sites: true },
      },
    },
  });

  const [totalUsers, totalAdmins, totalFlows] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.wasteFlow.count(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Platform overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage tenants, invite owners, view-as to support customers.
          </p>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={
            <Link href="/admin/companies/new">
              <PlusIcon className="size-4" />
              New Company
            </Link>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Companies" value={companies.length} />
        <MetricCard label="Users" value={totalUsers} />
        <MetricCard
          label="Platform admins"
          value={totalAdmins}
          caption="internal staff"
        />
        <MetricCard label="Total waste flows" value={totalFlows} />
      </div>

      <Card className="gap-0 overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
          <h2 className="text-sm font-medium">
            Companies
            <span className="ml-2 text-xs text-muted-foreground">
              {companies.length}
            </span>
          </h2>
        </div>
        <CardContent className="p-0">
          {companies.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium">No companies yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first company — the owner gets an invite link.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {companies.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BuildingIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/companies/${c.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{c.slug}</span>
                        {c.country ? (
                          <>
                            <span className="mx-1">·</span>
                            {c.country}
                          </>
                        ) : null}
                        <span className="mx-1">·</span>
                        created {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="gap-1">
                      <UsersIcon className="size-3" />
                      {c._count.memberships}
                    </Badge>
                    <Badge variant="outline">
                      {c._count.wasteFlows} flows
                    </Badge>
                    <Badge variant="outline">{c._count.sites} sites</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <Link href={`/admin/companies/${c.id}`}>Open</Link>
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption?: string;
}) {
  return (
    <Card className="gap-1 p-5">
      <CardContent className="p-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {caption ? (
          <p className="text-xs text-muted-foreground">{caption}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
