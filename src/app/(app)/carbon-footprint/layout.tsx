import Link from "next/link";
import { MessageCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CarbonTabsNav } from "@/components/carbon/carbon-tabs-nav";

export default function CarbonFootprintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title="Carbon Footprint"
        actions={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href="mailto:support@renai.pt?subject=RenAI — Carbon footprint question">
                <MessageCircleIcon className="size-4" />
                Contact RenAI
              </Link>
            }
          />
        }
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Estimated emissions tracking for your operations.
          </p>
        </div>

        <CarbonTabsNav />

        <div className="mt-2">{children}</div>
      </div>
    </>
  );
}
