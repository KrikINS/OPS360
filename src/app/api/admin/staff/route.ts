import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/db/client';
import { users, profiles, user_branch_access, user_permissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function GET() {
  return NextResponse.json({ data: [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user.role ?? '').toLowerCase();
  if (!['admin', 'super_admin', 'admin/owner'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { email, password, fullName, role: newUserRole, branchIds } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      email,
      password_hash,
      role: newUserRole || 'staff',
    }).returning();

    await db.insert(profiles).values({
      id: newUser.id,
      email,
      full_name: fullName || null,
      role: newUserRole || 'staff',
    });

    if (Array.isArray(branchIds) && branchIds.length > 0) {
      await db.insert(user_branch_access).values(
        branchIds.map((branch_id: string, i: number) => ({
          user_id: newUser.id,
          branch_id,
          is_primary: i === 0,
        }))
      );
    }

    const MODULES = ['pos', 'inventory', 'procurement', 'sales', 'finance', 'service', 'admin', 'hr'];
    await db.insert(user_permissions).values(
      MODULES.map(module => ({
        user_id: newUser.id,
        module,
        enabled: newUserRole === 'Admin/Owner',
      }))
    );

    return NextResponse.json({ data: { id: newUser.id, email } }, { status: 201 });
  } catch (error) {
    console.error('Staff provisioning error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to provision user' }, { status: 500 });
  }
}
