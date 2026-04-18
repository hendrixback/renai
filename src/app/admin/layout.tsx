import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldIcon } from "lucide-react";

import { getCurrentUser, isPlatformAdmin } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/admin");
  if (!isPlatformAdmin(user)) redirect("/dashboard");

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <ShieldIcon className="size-4 text-primary" />
            <span className="font-semibold tracking-tight">
              Renai — Platform Admin
            </span>
          </Link>
          <nav className="ml-4 flex items-center gap-1 text-sm text-muted-foreground">
            <Link
              href="/admin"
              className="rounded-md px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
            >
              Companies
            </Link>
            <Link
              href="/admin/companies/new"
              className="rounded-md px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
            >
              New company
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {user.email}
          </span>
          <ModeToggle />
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
