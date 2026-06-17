import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/db/client';
import { users, profiles, user_branch_access, user_permissions, branches, employees } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { hasCapability, branchFilterFor } from "@/lib/access";
import { normalizeRole, isBranchScoped, ROLE_RANK } from "@/lib/rbac";

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, { status: 401 }
    )
  }

  if (!(await hasCapability("admin", "view", session))) {
    return NextResponse.json(
      { error: 'Insufficient permission' }, { status: 403 }
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
  if (!(await hasCapability("admin", "edit", session))) {
    return NextResponse.json({ error: 'Insufficient permission' }, { status: 403 });
  }

  try {
    const { email, password, fullName, role: newUserRole, branchIds } = await req.json();

    const actorRole = normalizeRole(session.user.role);
    const targetRole = normalizeRole(newUserRole || 'staff');

    if (!targetRole) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (!actorRole || ROLE_RANK[targetRole] > ROLE_RANK[actorRole]) {
      return NextResponse.json(
        { error: 'You cannot create a user with a role higher than your own' },
        { status: 403 }
      );
    }

    if (isBranchScoped(actorRole) && Array.isArray(branchIds)) {
      const allowed = await branchFilterFor(session, "admin", "edit");
      if (allowed !== null) {
        const outside = branchIds.filter((b: string) => !allowed.includes(b));
        if (outside.length > 0) {
          return NextResponse.json(
            { error: 'You can only assign branches you manage' },
            { status: 403 }
          );
        }
      }
    }

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

    const nameParts = (fullName || 'Unknown User').split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || ' ';
    const primaryBranchId = (Array.isArray(branchIds) && branchIds.length > 0) ? branchIds[0] : null;

    const [newEmployee] = await db.insert(employees).values({
      first_name: firstName,
      last_name: lastName,
      email: email,
      designation: newUserRole || 'staff',
      branch_id: primaryBranchId
    }).returning();

    await db.insert(profiles).values({
      id: newUser.id,
      email,
      full_name: fullName || null,
      role: newUserRole || 'staff',
      employee_id: newEmployee.id,
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
