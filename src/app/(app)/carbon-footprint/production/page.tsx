import { ComingSoonPanel } from "@/components/carbon/coming-soon-panel";

export default function ProductionPage() {
  return (
    <ComingSoonPanel
      title="Production emissions"
      description="Track per-product CO2 intensity — inputs (raw materials, energy per unit) and allocated emissions across your output volume."
      examples={[
        "Product-level emission factors (kgCO2e per unit produced)",
        "Link production volume to your Scope 1 + 2 consumption",
        "Allocate site emissions across product lines",
        "Calculate carbon intensity per ton of output for ESG reporting",
      ]}
    />
  );
}
