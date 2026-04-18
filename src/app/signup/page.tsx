import Link from "next/link";

import { getValidInvitationByToken } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import { ModeToggle } from "@/components/mode-toggle";
import { SignupForm } from "@/components/signup-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <ClosedSignup reason="missing-token" />;
  }

  const invitation = await getValidInvitationByToken(token);
  if (!invitation) {
    return <ClosedSignup reason="invalid-or-expired" />;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email.toLowerCase() },
    select: { id: true, name: true },
  });

  return (
    <div className="bg-muted relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>
              Join <span className="text-primary">{invitation.company.name}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              You&apos;ve been invited to join as{" "}
              <span className="font-medium text-foreground lowercase">
                {invitation.role.toLowerCase()}
              </span>
              . Set up your account to continue.
            </p>
          </CardHeader>
          <CardContent>
            <SignupForm
              token={token}
              email={invitation.email}
              existingUserName={existingUser?.name ?? null}
            />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={`/login?from=/signup?token=${token}`}
            className="underline hover:text-foreground"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function ClosedSignup({
  reason,
}: {
  reason: "missing-token" | "invalid-or-expired";
}) {
  const message =
    reason === "missing-token"
      ? "RenAI is invite-only. Ask your company admin to send you an invite link."
      : "This invite is no longer valid — it may have already been used or expired. Ask for a new one.";

  return (
    <div className="bg-muted relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Signup not available</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{message}</p>
          <Link
            href="/login"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
