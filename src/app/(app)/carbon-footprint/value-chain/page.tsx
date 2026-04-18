import { ComingSoonPanel } from "@/components/carbon/coming-soon-panel";

export default function ValueChainPage() {
  return (
    <ComingSoonPanel
      title="Scope 3 — Value chain"
      description="Upstream and downstream emissions outside your direct operations. This is often the largest portion of a company's footprint."
      examples={[
        "Purchased goods & services (from suppliers)",
        "Upstream & downstream transportation / distribution",
        "Employee commuting and business travel",
        "Use of sold products; end-of-life treatment",
        "Leased assets, investments, franchises",
      ]}
    />
  );
}
