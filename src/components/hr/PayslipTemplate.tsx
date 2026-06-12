"use client"
import React, { forwardRef } from 'react'
import { fmtINR } from '@/lib/utils'
import { useBranding } from '@/providers/GlobalBrandingProvider'

interface PayslipData {
  staffName: string
  designation?: string | null
  department?: string | null
  payPeriod: string
  paymentDate: string
  paymentMethod: string
  branchName?: string | null
  basic: number
  hra: number
  gross: number
  pfEmployee: number
  professionalTax: number
  tds: number
  net: number
}

interface PayslipTemplateProps {
  data: PayslipData
}

export const PayslipTemplate = forwardRef<HTMLDivElement, PayslipTemplateProps>(({ data }, ref) => {
  const { companyName, billing_address, tax_id, logoUrl } = useBranding()
  const totalEarnings = data.gross
  const totalDeductions = data.pfEmployee + data.professionalTax + data.tds

  return (
    <div ref={ref} className="bg-white text-slate-900 font-sans" style={{ width: '210mm', minHeight: '148mm', padding: '12mm', boxSizing: 'border-box', fontSize: '11px', lineHeight: 1.4 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm', paddingBottom: '4mm', borderBottom: '2px solid #001529' }}>
        <div>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="logo" style={{ height: '32px', marginBottom: '4px' }} />
          )}
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#001529', letterSpacing: '-0.5px' }}>{companyName}</div>
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{billing_address}</div>
          {tax_id && <div style={{ fontSize: '9px', color: '#64748b' }}>GSTIN: {tax_id}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#001529', letterSpacing: '2px', textTransform: 'uppercase' }}>Pay Slip</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Period: <strong>{data.payPeriod}</strong></div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Date: <strong>{data.paymentDate}</strong></div>
          {data.branchName && <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>{data.branchName}</div>}
        </div>
      </div>

      {/* Employee Details */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', marginBottom: '6mm', display: 'flex', gap: '40px' }}>
        <div>
          <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#001529' }}>{data.staffName}</div>
          {data.designation && <div style={{ fontSize: '10px', color: '#475569' }}>{data.designation}</div>}
          {data.department && <div style={{ fontSize: '9px', color: '#94a3b8' }}>{data.department}</div>}
        </div>
        <div>
          <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Mode</div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>{data.paymentMethod}</div>
        </div>
      </div>

      {/* Earnings + Deductions side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '6mm' }}>
        {/* Earnings */}
        <div>
          <div style={{ backgroundColor: '#001529', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 8px', borderRadius: '4px 4px 0 0' }}>Earnings</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '4px 8px', color: '#475569' }}>Basic Salary</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtINR(data.basic)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '4px 8px', color: '#475569' }}>HRA</td>
                <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtINR(data.hra)}</td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '5px 8px', fontWeight: 700, color: '#001529' }}>Gross Earnings</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: '#001529' }}>{fmtINR(totalEarnings)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div>
          <div style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 8px', borderRadius: '4px 4px 0 0' }}>Deductions</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {data.pfEmployee > 0 && (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 8px', color: '#475569' }}>PF (Employee)</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtINR(data.pfEmployee)}</td>
                </tr>
              )}
              {data.professionalTax > 0 && (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 8px', color: '#475569' }}>Professional Tax</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtINR(data.professionalTax)}</td>
                </tr>
              )}
              {data.tds > 0 && (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '4px 8px', color: '#475569' }}>TDS</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtINR(data.tds)}</td>
                </tr>
              )}
              {totalDeductions === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: '4px 8px', color: '#94a3b8', fontStyle: 'italic' }}>No deductions</td>
                </tr>
              )}
              <tr style={{ backgroundColor: '#fff5f5' }}>
                <td style={{ padding: '5px 8px', fontWeight: 700, color: '#dc2626' }}>Total Deductions</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{fmtINR(totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Pay */}
      <div style={{ backgroundColor: '#001529', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6mm' }}>
        <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Net Pay</div>
        <div style={{ color: '#fff', fontSize: '22px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-1px' }}>{fmtINR(data.net)}</div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '4mm', marginTop: 'auto' }}>
        <div style={{ fontSize: '9px', color: '#94a3b8' }}>This is a computer-generated payslip. No signature required.</div>
        <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: '#475569', marginBottom: '8px' }}>AUTHORIZED SIGNATORY</div>
          <div>____________________</div>
        </div>
      </div>
    </div>
  )
})

PayslipTemplate.displayName = 'PayslipTemplate'
