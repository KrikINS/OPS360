import React from 'react';
import { numberToWords } from '@/lib/number-to-words';

interface POPrintTemplateProps {
  po: any;
  vendor: any;
  branch: any;
}

export const POPrintTemplate: React.FC<POPrintTemplateProps> = ({ po, vendor, branch }) => {
  // Financial Calculations
  const taxableValue = po.items.reduce((acc: number, item: any) => acc + (item.unit_price * item.quantity), 0);
  const cgst = taxableValue * 0.09;
  const sgst = taxableValue * 0.09;
  const grandTotal = taxableValue + cgst + sgst;
  const systemTimestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div 
      id="po-print-template" 
      className="bg-white text-[#1e293b] flex flex-col"
      style={{ 
        width: '210mm', 
        minHeight: '297mm', 
        padding: '15mm', 
        margin: '0 auto', 
        fontFamily: "'Inter', system-ui, sans-serif",
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start border-b-4 border-[#001529] pb-8 mb-8">
        <div className="space-y-2">
          <div className="inline-block px-3 py-1 bg-[#001529] text-white text-[10px] font-black tracking-widest uppercase rounded">
            Official Purchase Order
          </div>
          <h1 className="text-4xl font-black text-[#001529] tracking-tighter">ETHAN</h1>
          <p className="text-xs font-bold text-slate-400 font-mono">Control ID: {po.po_number}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm font-black text-[#001529] uppercase">Corporate Headquarters</p>
          <p className="text-[10px] text-slate-500 leading-tight max-w-[200px]">
            123 Tech Park, Phase II, Industrial Area, Bengaluru, Karnataka - 560100
          </p>
          <p className="text-[10px] font-black text-[#001529] pt-2">GSTIN: 29AAACE1234F1Z5</p>
        </div>
      </div>

      {/* Entity Details Grid */}
      <div className="grid grid-cols-2 gap-10 mb-10">
        <div className="space-y-3">
          <h3 className="text-[#001529] font-black text-[10px] uppercase tracking-[0.2em] border-l-4 border-[#001529] pl-3">Vendor Partner</h3>
          <div className="p-5 rounded-xl border border-slate-100 bg-slate-50/50 min-h-[140px]">
            <p className="font-extrabold text-slate-900 text-sm mb-1">{vendor.name}</p>
            <p className="text-[10px] text-slate-500 leading-relaxed italic mb-4">
              {vendor.address || 'Standard Registered Address'}
            </p>
            <p className="text-[10px] font-black text-[#001529] bg-white border inline-block px-2 py-1 rounded shadow-sm">
              GSTIN: {vendor.gstin || 'UNREGISTERED'}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-[#001529] font-black text-[10px] uppercase tracking-[0.2em] border-l-4 border-[#001529] pl-3">Ship-To / Logistics</h3>
          <div className="p-5 rounded-xl border border-slate-100 bg-slate-50/50 min-h-[140px]">
            <p className="font-extrabold text-slate-900 text-sm mb-1">Ethan - {branch?.name || 'Central Hub'}</p>
            <p className="text-[10px] text-slate-500 leading-relaxed italic mb-4">
              {branch?.address || 'Site delivery as per instruction'}
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
              <div>
                <p className="text-[8px] uppercase font-bold text-slate-400">Date Issued</p>
                <p className="text-[10px] font-black text-slate-700">{new Date(po.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-[8px] uppercase font-bold text-slate-400">Payment Link</p>
                <p className="text-[10px] font-black text-slate-700">{vendor.payment_terms || 'Standard 30 Days'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Item Table */}
      <div className="flex-grow">
        <table className="w-full border-collapse rounded-xl overflow-hidden shadow-sm">
          <thead>
            <tr className="bg-[#001529] text-white text-[9px] uppercase tracking-widest font-black">
              <th className="p-4 text-left w-10">#</th>
              <th className="p-4 text-left">SKU & Model Name</th>
              <th className="p-4 text-center w-24">HSN/SAC</th>
              <th className="p-4 text-center w-16">Qty</th>
              <th className="p-4 text-right w-28">Net Rate</th>
              <th className="p-4 text-right w-32">Taxable Val</th>
            </tr>
          </thead>
          <tbody className="text-[10px]">
            {po.items.map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-100 odd:bg-slate-50/30">
                <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                <td className="p-4">
                  <div className="font-extrabold text-slate-900">{item.product?.model_name || item.model_name}</div>
                  <div className="text-[8px] font-black text-blue-500 mt-0.5 uppercase tracking-tighter">Brand: {item.product?.brand || 'Premium'}</div>
                </td>
                <td className="p-4 text-center font-mono font-bold text-slate-600 tracking-tighter">{item.product?.hsn_code || item.hsn_code || '---'}</td>
                <td className="p-4 text-center font-black text-slate-900">{item.quantity}</td>
                <td className="p-4 text-right font-bold text-slate-600">₹{item.unit_price.toLocaleString('en-IN')}</td>
                <td className="p-4 text-right font-black text-[#001529]">₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Section: Totals & Terms */}
      <div className="mt-10 flex flex-col md:flex-row gap-10">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#001529] border-b pb-1">Contractual Terms & Conditions</h4>
            <div className="text-[9px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
              {po.terms_content || "1. Supply as per agreed specifications and delivery schedule.\n2. Invoices must mention the PO Number and GSTIN of both parties.\n3. Subject to Bengaluru Jurisdiction."}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#001529] border-b pb-1">Total Value in Words</h4>
            <div className="text-[10px] p-4 rounded-xl border border-slate-100 bg-slate-50 italic font-black text-[#001529] shadow-inner">
              {numberToWords(grandTotal)}
            </div>
          </div>
        </div>
        
        <div className="w-full md:w-1/3">
          <div className="space-y-1 p-6 rounded-2xl bg-[#001529] text-white shadow-xl shadow-[#001529]/10">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-[9px] uppercase font-bold opacity-60">Net Taxable Value</span>
              <span className="text-sm font-bold">₹{taxableValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-[9px] uppercase font-bold opacity-60">CGST (9%)</span>
              <span className="text-sm font-bold">₹{cgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-[9px] uppercase font-bold opacity-60">SGST (9%)</span>
              <span className="text-sm font-bold">₹{sgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-4">
              <span className="text-[10px] uppercase font-black tracking-widest">Grand Total</span>
              <span className="text-xl font-black text-[#7FD1E3]">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Area */}
      <div className="mt-16 flex justify-end">
        <div className="text-center w-64 space-y-4">
          <div className="h-20 flex items-center justify-center opacity-10">
             <div className="w-24 h-24 border-8 border-[#001529] rounded-full flex items-center justify-center -rotate-12 border-double">
                <span className="text-[12px] font-black uppercase text-center leading-[12px] text-[#001529]">ETHAN PO<br/>VALIDATED</span>
             </div>
          </div>
          <div className="border-t-2 border-[#001529] pt-4">
            <p className="text-[11px] font-black text-[#001529] uppercase tracking-[0.3em]">Authorized Signatory</p>
            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">This is a computer generated document. No physical signature required.</p>
          </div>
        </div>
      </div>

      {/* Corporate Footer (A4 Positioned) */}
      <div 
        className="mt-auto pt-10 border-t border-slate-100 flex justify-between items-end text-[8px] font-bold text-slate-400 uppercase tracking-widest"
        style={{ position: 'absolute', bottom: '15mm', width: 'calc(210mm - 30mm)', left: '15mm' }}
      >
        <div className="max-w-[150px]">
          CONFIDENTIAL – FOR AUTHORIZED VENDOR USE ONLY
        </div>
        <div className="text-center">
          Digitally Generated via Ethan Systems
        </div>
        <div className="text-right">
          Generated: {systemTimestamp}
        </div>
      </div>
    </div>
  );
};

