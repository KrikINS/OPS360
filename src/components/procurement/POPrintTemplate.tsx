import React from 'react';
import { numberToWords } from '@/lib/number-to-words';

interface POPrintTemplateProps {
  po: any;
  vendor: any;
  branch: any;
}

export const POPrintTemplate: React.FC<POPrintTemplateProps> = ({ po, vendor, branch }) => {
  const cgst = po.total_amount * 0.09;
  const sgst = po.total_amount * 0.09;
  const totalWithTax = po.total_amount + cgst + sgst;

  return (
    <div id="po-print-template" className="p-10 font-sans border" style={{ width: '800px', margin: '0 auto', backgroundColor: '#ffffff', color: '#1e293b', borderColor: '#f1f5f9' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-[#001529] pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#001529] tracking-tight">PURCHASE ORDER</h1>
          <p className="mt-1 font-medium" style={{ color: '#64748b' }}>#{po.po_number}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[#001529]">ETHAN</div>
          <p className="text-xs max-w-[200px] leading-relaxed" style={{ color: '#64748b' }}>
            Corporate Office: 123 Tech Park, Phase II, Bengaluru - 560100
          </p>
          <p className="text-xs font-semibold mt-1" style={{ color: '#334155' }}>GSTIN: 29AAACE1234F1Z5</p>
        </div>
      </div>

      {/* Address Grid */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div>
          <h3 className="text-[#001529] font-bold text-xs uppercase tracking-widest mb-3">Vendor Details</h3>
          <div className="p-4 rounded border min-h-[120px]" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
            <p className="font-bold mb-1" style={{ color: '#0f172a' }}>{vendor.name}</p>
            <p className="text-xs leading-relaxed italic" style={{ color: '#475569' }}>{vendor.address || 'Address not listed'}</p>
            <p className="text-xs font-semibold text-[#001529] mt-3">GSTIN: {vendor.gstin || '---'}</p>
          </div>
        </div>
        <div>
          <h3 className="text-[#001529] font-bold text-xs uppercase tracking-widest mb-3">Ship To / Billing</h3>
          <div className="p-4 rounded border min-h-[120px]" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
            <p className="font-bold mb-1" style={{ color: '#0f172a' }}>Ethan - {branch?.name || 'Main Branch'}</p>
            <p className="text-xs leading-relaxed italic" style={{ color: '#475569' }}>
              {branch?.address || 'Site delivery address as per internal log'}
            </p>
            <p className="text-xs font-semibold mt-3" style={{ color: '#334155' }}>PO Date: {new Date(po.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p className="text-xs font-semibold mt-1" style={{ color: '#334155' }}>Payment Terms: {vendor.payment_terms || 'Immediate'}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-[#001529] text-white text-xs uppercase tracking-wider">
            <th className="p-3 text-left w-12 border border-[#001529]">#</th>
            <th className="p-3 text-left border border-[#001529]">Item Description</th>
            <th className="p-3 text-center w-24 border border-[#001529]">HSN</th>
            <th className="p-3 text-center w-20 border border-[#001529]">Qty</th>
            <th className="p-3 text-right w-24 border border-[#001529]">Rate</th>
            <th className="p-3 text-right w-32 border border-[#001529]">Net Amount</th>
          </tr>
        </thead>
        <tbody className="text-xs">
          {po.items.map((item: any, idx: number) => (
            <tr key={idx} className="border-b" style={{ borderColor: '#f1f5f9' }}>
              <td className="p-3 text-center font-medium" style={{ color: '#94a3b8' }}>{idx + 1}</td>
              <td className="p-3">
                <div className="font-bold" style={{ color: '#0f172a' }}>{item.product?.model_name || item.model_name}</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{item.product?.brand || 'Premium Series'}</div>
              </td>
              <td className="p-3 text-center font-mono" style={{ color: '#475569' }}>{item.product?.hsn_code || item.hsn_code || '---'}</td>
              <td className="p-3 text-center font-bold" style={{ color: '#0f172a' }}>{item.quantity}</td>
              <td className="p-3 text-right">₹{item.unit_price.toLocaleString('en-IN')}</td>
              <td className="p-3 text-right font-bold" style={{ color: '#0f172a' }}>₹{item.total_item_cost.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex justify-end mb-10">
        <div className="w-1/2">
          <div className="flex justify-between py-2 text-xs border-b" style={{ borderColor: '#f8fafc' }}>
            <span className="font-medium tracking-wide" style={{ color: '#64748b' }}>Net Taxable Value</span>
            <span className="font-bold" style={{ color: '#334155' }}>₹{po.total_amount.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-2 text-xs border-b" style={{ borderColor: '#f8fafc' }}>
            <span style={{ color: '#64748b' }}>CGST (9%)</span>
            <span className="font-semibold" style={{ color: '#334155' }}>₹{cgst.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-2 text-xs border-b" style={{ borderColor: '#f1f5f9' }}>
            <span style={{ color: '#64748b' }}>SGST (9%)</span>
            <span className="font-semibold" style={{ color: '#334155' }}>₹{sgst.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-4 text-sm font-bold bg-[#001529] text-white px-4 rounded-b mt-1">
            <span className="uppercase tracking-widest">Grand Total</span>
            <span>₹{totalWithTax.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Words & Terms */}
      <div className="mb-12">
        <div className="text-xs mb-1 uppercase font-bold tracking-widest" style={{ color: '#64748b' }}>Total Amount in Words</div>
        <div className="text-xs p-3 border rounded italic font-bold text-[#001529]" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
          {numberToWords(totalWithTax)}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 flex justify-between items-end border-t pt-8" style={{ borderColor: '#f1f5f9' }}>
        <div className="text-[10px] leading-relaxed max-w-[400px]" style={{ color: '#94a3b8' }}>
          <p className="font-bold mb-1 uppercase tracking-tighter" style={{ color: '#64748b' }}>Terms & Conditions</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Supply as per agreed specifications and delivery schedule.</li>
            <li>Invoices must mention the PO Number and GSTIN of both parties.</li>
            <li>Subject to Bengaluru Jurisdiction.</li>
          </ol>
        </div>
        <div className="text-center w-64">
          <div className="h-20 flex items-center justify-center opacity-40 mb-2">
            <div className="w-20 h-20 border-4 rounded-full flex items-center justify-center -rotate-12 border-dashed" style={{ borderColor: '#e2e8f0' }}>
              <span className="text-[10px] font-black uppercase text-center leading-[10px]" style={{ color: '#e2e8f0' }}>ETHAN<br/>OFFICIAL<br/>STAMP</span>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-2">
            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Authorized Signatory</p>
            <p className="text-[8px]" style={{ color: '#94a3b8' }}>Digitally Generated Document</p>
          </div>
        </div>
      </div>
    </div>
  );
};
