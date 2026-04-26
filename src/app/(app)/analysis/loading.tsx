import { DashboardPageSkeleton } from "@/components/page-skeleton";

export default function AnalysisLoading() {
  // Analysis is filter-bar + chart widgets — DashboardPageSkeleton's
  // KPI-and-chart shape is closer than a list view.
  return <DashboardPageSkeleton />;
}
