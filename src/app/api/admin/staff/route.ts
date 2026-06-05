import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/db/client';
import { users, profiles, user_branch_access, user_permissions, branches } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, { status: 401 }
    )
  }

  const role = (session.user.role ?? '').toLowerCase()
  if (!['admin', 'super_admin', 'admin/owner']
    .includes(role)) {
    return NextResponse.json(
      { error: 'Admin role required' }, { status: 403 }
    )
  }

  try {
    // Get all profiles with their primary branch
    const staff = await db
      .select({
        id: profiles.id,
        fullName: profiles.full_name,
        email: profiles.email,
        role: profiles.role,
        branchId: user_branch_access.branch_id,
        branchName: branches.name,
        isPrimary: user_branch_access.is_primary,
        createdAt: profiles.created_at,
      })
      .from(profiles)
      .leftJoin(
        user_branch_access,
        and(
          eq(user_branch_access.user_id, profiles.id),
          eq(user_branch_access.is_primary, true)
        )
      )
      .leftJoin(
        branches,
        eq(branches.id, user_branch_access.branch_id)
      )
      .orderBy(profiles.full_name)

    // Deduplicate by user id
    const seen = new Set<string>()
    const deduplicated = staff.filter(s => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })

    return NextResponse.json({
      data: deduplicated.map(s => ({
        id: s.id,
        full_name: s.fullName,
        email: s.email,
        role: s.role,
        branch_id: s.branchId,
        branch_name: s.branchName,
        created_at: s.createdAt,
      }))
    })
  } catch (error) {
    console.error('STAFF API ERROR:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
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
