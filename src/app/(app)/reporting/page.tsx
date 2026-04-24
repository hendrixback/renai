import { permanentRedirect } from "next/navigation";

// Legacy route. The feature now lives under /analysis per Spec §6.2.
// Kept as a permanent redirect so old bookmarks + the flag-off sidebar
// fallback land users on the right place.
export default function ReportingPage() {
  permanentRedirect("/analysis");
}
