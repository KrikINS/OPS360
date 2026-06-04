import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 flex-col space-y-4">
      <ShieldAlert className="h-16 w-16 text-red-500" />
      <h1 className="text-2xl font-bold">Unauthorized Access</h1>
      <p className="text-muted-foreground">Your assigned role is not permitted to access this module.</p>
      <Link href="/launchpad">
        <Button>Return to Dashboard</Button>
      </Link>
    </div>
  )
}
