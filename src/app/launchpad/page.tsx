import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/db/client"
import { profiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import LaunchpadClient from "./LaunchpadClient"
import { redirect } from "next/navigation"

// Force Next.js to never statically cache this page
export const dynamic = 'force-dynamic';

export default async function LaunchpadPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const profileList = await db.select().from(profiles).where(eq(profiles.id, session.user.id));
  const profile = profileList[0];

  const permissions = (profile?.permissions as Record<string, boolean>) || {};
  const role = profile?.role || "";

  return <LaunchpadClient initialPermissions={permissions} initialRole={role} />;
}
