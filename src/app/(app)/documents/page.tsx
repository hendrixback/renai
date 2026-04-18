import { PageHeader } from "@/components/page-header"

export default function DocumentsPage() {
  return (
    <>
      <PageHeader title="Documents" />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="bg-muted/50 min-h-[60vh] flex-1 rounded-xl" />
      </div>
    </>
  )
}
