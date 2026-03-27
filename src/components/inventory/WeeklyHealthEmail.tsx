import React from 'react';

/**
 * Interface definitions for type-safe report data
 */
export interface NetworkOverview {
  status: 'HEALTHY' | 'WARNING' | 'NEEDS_ATTENTION';
  total_value: number;
  critical_items_count: number;
}

export interface TopMovingItem {
  model_name: string;
  product_code: string;
  units_sold: number;
}

export interface BranchMetric {
  branch_name: string;
  total_value: number;
  critical_skus: number;
}

export interface StockHealthReportData {
  network_overview: NetworkOverview;
  top_moving_items: TopMovingItem[];
  branch_metrics: BranchMetric[];
}

/**
 * WeeklyStockHealthEmail component
 * This component is optimized for in-app viewing using Tailwind CSS.
 * For the email version with inlined styles, see the Edge Function source.
 * 
 * NOTE: All inline styles have been removed and replaced with Tailwind classes 
 * to comply with project linting rules. 
 */
export const WeeklyStockHealthEmail = ({ data }: { data: StockHealthReportData }) => {
  const { network_overview, top_moving_items, branch_metrics } = data;
  
  const statusColorClass = network_overview.status === 'HEALTHY' 
    ? 'bg-[#52c41a]' 
    : (network_overview.status === 'WARNING' ? 'bg-[#faad14]' : 'bg-[#ff4d4f]');

  return (
    <div className="font-sans bg-[#f4f7f9] m-0 py-5">
      <div className="max-w-[600px] mx-auto bg-white rounded-lg overflow-hidden shadow-lg border border-slate-200">
        {/* Header Section */}
        <div className="bg-[#001529] p-8 text-center text-white">
          <div className="text-3xl font-black text-[#7FD1E3] tracking-wider">EHAN</div>
          <h1 className="mt-2 text-2xl tracking-wide font-bold">Ethan Home Appliances</h1>
          <div className="text-xs opacity-70 mt-1 uppercase tracking-tighter">Weekly Stock Health Report</div>
        </div>

        {/* Dynamic Status Bar */}
        <div className={`h-3 w-full ${statusColorClass}`}></div>

        <div className="p-8">
          {/* Status Overview */}
          <div className="flex justify-between items-center mb-8">
            <div className="font-bold text-[#595959] text-sm flex items-center gap-2">
              SYSTEM STATUS: 
              <span className={`px-2.5 py-1 rounded text-[10px] font-bold text-white uppercase ${statusColorClass}`}>
                {network_overview.status}
              </span>
            </div>
            <div className="text-xs text-[#8c8c8c] font-medium">{new Date().toLocaleDateString()}</div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[#fafafa] p-5 rounded-md border-l-4 border-[#001529] shadow-inner">
              <div className="text-[10px] text-[#8c8c8c] uppercase font-bold tracking-wider">Total Network Valuation</div>
              <div className="text-xl font-bold text-[#001529] mt-2">
                ₹{new Intl.NumberFormat('en-IN').format(network_overview.total_value)}
              </div>
            </div>
            <div className="bg-[#fafafa] p-5 rounded-md border-l-4 border-[#ff4d4f] shadow-inner">
              <div className="text-[10px] text-[#8c8c8c] uppercase font-bold tracking-wider">Critical SKU Deficit</div>
              <div className={`text-xl font-bold mt-2 ${network_overview.critical_items_count > 0 ? 'text-[#ff4d4f]' : 'text-[#52c41a]'}`}>
                {network_overview.critical_items_count} Units
              </div>
            </div>
          </div>

          {/* Top Moving Items */}
          <div className="text-base font-bold text-[#001529] border-b-2 border-[#f0f0f0] pb-2.5 mb-4 uppercase tracking-wider">
            Top 5 Fastest Moving Items
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#f0f0f0]">
                <th className="text-left py-3 text-[11px] text-[#8c8c8c] uppercase font-bold">Product</th>
                <th className="text-left py-3 text-[11px] text-[#8c8c8c] uppercase font-bold text-center">EHA Code</th>
                <th className="text-right py-3 text-[11px] text-[#8c8c8c] uppercase font-bold">Sold</th>
              </tr>
            </thead>
            <tbody>
              {top_moving_items.map((item: TopMovingItem, idx: number) => (
                <tr key={idx} className="border-b border-[#f0f0f0] transition-colors hover:bg-slate-50">
                  <td className="py-3 text-sm font-semibold text-[#262626]">{item.model_name}</td>
                  <td className="py-3 text-[13px] text-[#595959] text-center">
                    <code className="bg-[#f0f2f5] px-1.5 py-0.5 rounded font-mono text-xs">{item.product_code}</code>
                  </td>
                  <td className="py-3 text-right text-sm font-bold text-[#001529]">{item.units_sold}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Branch Health Table */}
          <div className="text-base font-bold text-[#001529] border-b-2 border-[#f0f0f0] pb-2.5 mb-4 mt-10 uppercase tracking-wider">
            Branch Health Breakdown
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#f0f0f0]">
                <th className="text-left py-3 text-[11px] text-[#8c8c8c] uppercase font-bold">Outlet Branch</th>
                <th className="text-right py-3 text-[11px] text-[#8c8c8c] uppercase font-bold">Valuation</th>
                <th className="text-right py-3 text-[11px] text-[#8c8c8c] uppercase font-bold">Critical</th>
              </tr>
            </thead>
            <tbody>
              {branch_metrics.map((bm: BranchMetric, idx: number) => (
                <tr key={idx} className="border-b border-[#f0f0f0] transition-colors hover:bg-slate-50">
                  <td className="py-3 text-sm text-[#262626]">{bm.branch_name}</td>
                  <td className="py-3 text-right text-sm text-[#595959]">₹{new Intl.NumberFormat('en-IN').format(bm.total_value)}</td>
                  <td className={`py-3 text-right text-sm font-bold ${bm.critical_skus > 0 ? 'text-[#ff4d4f]' : 'text-[#52c41a]'}`}>
                    {bm.critical_skus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Call to Action */}
          <div className="text-center mt-12 mb-4">
            <a 
              href="https://ops360.app/admin/inventory-config" 
              className="bg-[#001529] text-white px-8 py-3.5 rounded-md no-underline font-bold text-base inline-block hover:brightness-125 transition-all shadow-md active:transform active:scale-95"
            >
              View Full Report
            </a>
            <p className="mt-4 text-xs text-[#8c8c8c]">Click to adjust stock thresholds or view movement insights.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f0f2f5] p-8 text-center text-[#8c8c8c] text-[11px]">
          <div className="font-bold mb-2 text-[#595959]">Ethan Home Appliances | OPS360 ERP</div>
          <div className="leading-relaxed">
            Automated intelligence report generated by the Inventory Control System.<br />
            © 2026 EHA Logistics Division. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};
