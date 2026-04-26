import { ListPageSkeleton } from "@/components/page-skeleton";

export default function TasksLoading() {
  return <ListPageSkeleton rows={8} columns={6} />;
}
