import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEffectiveBranchId } from '@/app/actions/_utils/branch'
import { getSalesReport, getGSTSummary, getStockValuation } from '@/actions/finance'
import ReportsClient from './client'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { tab?: string; fromDate?: string; toDate?: string; branchId?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const branchId = await getEffectiveBranchId(session)

  // Default date range: current month
  const now = new Date()
  const fromDate = searchParams.fromDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`
  const toDate   = searchParams.toDate   ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 19)
  const activeTab = searchParams.tab ?? 'sales'

  const [salesData, gstData, stockData] = await Promise.all([
    activeTab === 'sales' ? getSalesReport({ branchId: branchId ?? undefined, fromDate, toDate }) : Promise.resolve(null),
    activeTab === 'gst'   ? getGSTSummary({ branchId: branchId ?? undefined, fromDate, toDate }) : Promise.resolve(null),
    activeTab === 'stock' ? getStockValuation({ branchId: branchId ?? undefined }) : Promise.resolve(null),
  ])

  return (
    <ReportsClient
      activeTab={activeTab}
      fromDate={fromDate.slice(0, 10)}
      toDate={toDate.slice(0, 10)}
      branchId={branchId}
      salesData={salesData}
      gstData={gstData}
      stockData={stockData}
      role={session.user.role ?? ''}
    />
  )
}
