import { getCustomerStatement } from '@/app/actions/customers'
import { fmtINR } from '@/lib/utils'

export async function printCustomerStatement(customerId: string, companyName: string = 'OPS360 ERP') {
  const result = await getCustomerStatement(customerId)
  if (!result.success) { alert('Failed to load statement: ' + result.error); return }

  const { customer, invoices, payments, loyalty, summary } = result
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Please allow popups to print statements'); return }

  const runningBalance: number[] = []
  let balance = 0
  const allTransactions = [
    ...invoices.map(i => ({
      date: i.created_at, type: 'invoice' as const,
      ref: i.invoice_number, description: `Sale — ${i.item_count} item(s) (${i.payment_mode ?? 'cash'})`,
      debit: Number(i.total_amount), credit: 0,
      status: i.payment_status ?? 'paid',
    })),
    ...payments.map(p => ({
      date: p.created_at, type: 'payment' as const,
      ref: p.invoice_number ?? '—', description: `Payment received (${p.payment_mode})${p.notes ? ' — ' + p.notes : ''}`,
      debit: 0, credit: Number(p.amount),
      status: 'paid',
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  allTransactions.forEach(t => {
    balance += t.debit - t.credit
    runningBalance.push(balance)
  })

  const rows = allTransactions.map((t, i) => `
    <tr style="border-bottom:1px solid #f1f5f9; ${t.type === 'payment' ? 'background:#f0fdf4' : ''}">
      <td style="padding:5px 8px;font-size:11px;color:#64748b">${new Date(t.date).toLocaleDateString('en-IN')}</td>
      <td style="padding:5px 8px;font-size:11px;font-family:monospace">${t.ref}</td>
      <td style="padding:5px 8px;font-size:11px">${t.description}</td>
      <td style="padding:5px 8px;font-size:11px;text-align:right;color:${t.debit ? '#dc2626' : '#transparent'}">${t.debit ? '₹' + t.debit.toLocaleString('en-IN', {minimumFractionDigits:2}) : ''}</td>
      <td style="padding:5px 8px;font-size:11px;text-align:right;color:${t.credit ? '#16a34a' : 'transparent'}">${t.credit ? '₹' + t.credit.toLocaleString('en-IN', {minimumFractionDigits:2}) : ''}</td>
      <td style="padding:5px 8px;font-size:11px;text-align:right;font-weight:700;color:${runningBalance[i] > 0 ? '#7c3aed' : '#16a34a'}">${runningBalance[i] >= 0 ? '₹' + runningBalance[i].toLocaleString('en-IN', {minimumFractionDigits:2}) : '(₹' + Math.abs(runningBalance[i]).toLocaleString('en-IN', {minimumFractionDigits:2}) + ')'}</td>
    </tr>
  `).join('')

  const loyaltyRows = loyalty.map(l => `
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:4px 8px;font-size:10px;color:#64748b">${new Date(l.created_at).toLocaleDateString('en-IN')}</td>
      <td style="padding:4px 8px;font-size:10px">${l.description ?? l.type}</td>
      <td style="padding:4px 8px;font-size:10px;text-align:right;color:${l.points > 0 ? '#16a34a' : '#dc2626'};font-weight:700">${l.points > 0 ? '+' : ''}${l.points}</td>
      <td style="padding:4px 8px;font-size:10px;text-align:right;font-weight:700">${l.balance_after}</td>
    </tr>
  `).join('')

  win.document.write(`<!DOCTYPE html><html><head>
    <title>Customer Statement — ${customer.full_name}</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:20px;color:#1e293b;font-size:12px}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #001529;padding-bottom:12px;margin-bottom:16px}
      .company{font-size:18px;font-weight:900;color:#001529}
      .title{font-size:16px;font-weight:900;text-align:right;color:#001529;text-transform:uppercase;letter-spacing:1px}
      .customer-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
      .summary-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px}
      .summary-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:2px}
      .summary-value{font-size:16px;font-weight:900}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{padding:5px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:#001529;color:white}
      th.right{text-align:right}
      .section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#001529;margin:16px 0 6px;padding-bottom:4px;border-bottom:1px solid #e2e8f0}
      .footer{border-top:1px solid #e2e8f0;padding-top:10px;margin-top:16px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
      @media print{body{padding:0}}
    </style></head><body>

    <div class="header">
      <div>
        <div class="company">${companyName}</div>
        <div style="font-size:9px;color:#64748b;margin-top:2px">Customer Account Statement</div>
      </div>
      <div>
        <div class="title">Account Statement</div>
        <div style="font-size:10px;color:#64748b;text-align:right;margin-top:2px">Generated: ${today}</div>
      </div>
    </div>

    <div class="customer-box">
      <div>
        <div style="font-size:15px;font-weight:900;color:#001529">${customer.full_name}</div>
        ${customer.company_name ? `<div style="font-size:11px;color:#475569">${customer.company_name}</div>` : ''}
        ${customer.phone_number ? `<div style="font-size:11px;color:#64748b">📞 ${customer.phone_number}</div>` : ''}
        ${customer.email ? `<div style="font-size:11px;color:#64748b">✉ ${customer.email}</div>` : ''}
        ${customer.gstin ? `<div style="font-size:10px;color:#94a3b8">GSTIN: ${customer.gstin}</div>` : ''}
      </div>
      <div style="text-align:right">
        ${customer.is_credit_eligible ? `
          <div style="font-size:10px;font-weight:700;color:#7c3aed;margin-bottom:4px">CREDIT CUSTOMER</div>
          <div style="font-size:11px;color:#64748b">Credit Limit: <strong>₹${Number(customer.credit_limit ?? 0).toLocaleString('en-IN')}</strong></div>
          <div style="font-size:11px;color:#64748b">Outstanding: <strong style="color:#dc2626">₹${Number(customer.credit_balance ?? 0).toLocaleString('en-IN')}</strong></div>
          <div style="font-size:11px;color:#64748b">Terms: ${customer.credit_payment_terms ?? '30 days'}</div>
        ` : ''}
        ${customer.loyalty_balance > 0 ? `<div style="font-size:11px;color:#d97706;margin-top:4px">⭐ ${customer.loyalty_balance} Loyalty Points</div>` : ''}
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Total Purchases</div>
        <div class="summary-value">₹${summary.totalSpend.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Invoices</div>
        <div class="summary-value">${summary.totalInvoices}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Outstanding</div>
        <div class="summary-value" style="color:${summary.totalOutstanding > 0 ? '#dc2626' : '#16a34a'}">₹${summary.totalOutstanding.toLocaleString('en-IN', {maximumFractionDigits:0})}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Loyalty Points</div>
        <div class="summary-value" style="color:#d97706">${customer.loyalty_balance}</div>
      </div>
    </div>

    <div class="section-title">Transaction History</div>
    <table>
      <thead><tr>
        <th>Date</th><th>Reference</th><th>Description</th>
        <th class="right">Debit (₹)</th><th class="right">Credit (₹)</th><th class="right">Balance (₹)</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#94a3b8">No transactions found</td></tr>'}</tbody>
    </table>

    ${loyalty.length > 0 ? `
      <div class="section-title">Loyalty Points History</div>
      <table>
        <thead><tr>
          <th>Date</th><th>Description</th><th class="right">Points</th><th class="right">Balance</th>
        </tr></thead>
        <tbody>${loyaltyRows}</tbody>
      </table>
    ` : ''}

    <div class="footer">
      <div>This is a computer-generated statement. All amounts in Indian Rupees (₹).</div>
      <div style="text-align:right">
        <div style="font-weight:700;color:#475569">AUTHORIZED SIGNATORY</div>
        <div style="margin-top:16px">____________________</div>
      </div>
    </div>

    <script>window.onload=function(){window.print()}</script>
    </body></html>`)
  win.document.close()
}
