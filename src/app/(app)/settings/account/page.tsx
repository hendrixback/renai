import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { AccountForms } from "@/components/account-forms";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/settings/account");

  return (
    <AccountForms
      user={{ name: user.name ?? "", email: user.email }}
    />
  );
}
