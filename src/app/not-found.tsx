import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-[#001529] text-white text-4xl font-black mx-auto">
          404
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Page Not Found</h1>
          <p className="text-slate-500 mt-2 text-sm">The page you're looking for doesn't exist or has been moved.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#001529] text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-[#002545] transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
