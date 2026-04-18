import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";

export const dynamic = "force-dynamic";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SettingsNav />
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </>
  );
}
