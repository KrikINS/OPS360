export default function ProcurementDiscrepancyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Handling Discrepancies & Partial Deliveries</h1>
      
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Partial Receipts (GRN)</h2>
        <p className="text-muted-foreground">
          Ops360 now supports multi-stage Goods Receipt Notes (GRN). This allows you to receive items as they arrive, 
          rather than waiting for the entire Purchase Order to be fulfilled.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <p className="text-sm font-medium text-blue-800">Workflow:</p>
          <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
            <li>Select an approved PO from the Procurement dashboard.</li>
            <li>Enter only the serial numbers received in the current delivery.</li>
            <li>The system will calculate the remaining quantity automatically.</li>
            <li>Status transitions to <strong>PARTIALLY_RECEIVED</strong>.</li>
            <li>Repeat for subsequent deliveries until the PO is fully <strong>RECEIVED</strong>.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. GST & Landed Cost Compliance</h2>
        <p className="text-muted-foreground">
          Landed cost is now calculated using the <strong>Composite Supply</strong> rule. GST is applied to the combined 
          total of the Base Price and Freight Charges.
        </p>
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <p className="text-sm font-medium text-amber-800">Formula:</p>
          <code className="block mt-2 font-mono text-xs">
            Landed Cost = ((Base Price + Freight) * (1 + GST Rate)) / Quantity
          </code>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. HSN Slab Protection</h2>
        <p className="text-muted-foreground">
          To ensure tax compliance, HSN codes are locked to specific GST slabs:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>28%:</strong> Air Conditioners (8415), Refrigerators (8418)</li>
          <li><strong>18%:</strong> Washing Machines (8450)</li>
          <li><strong>12%:</strong> Fans & Small Appliances (8414)</li>
        </ul>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-sm font-medium text-red-800">Manager Override:</p>
          <p className="text-xs text-red-700 mt-1">
            If a manual change is required, the <strong>Manual Override</strong> checkbox must be enabled. 
            This action is logged for audit purposes.
          </p>
        </div>
      </section>
    </div>
  )
}
