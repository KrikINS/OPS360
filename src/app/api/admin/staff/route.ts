import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { users, profiles, user_branch_access, user_permissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function GET() {
  return NextResponse.json({ data: [] });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, role, branchIds } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Insert into users table
    const [newUser] = await db.insert(users).values({
      email,
      password_hash,
      role: role || 'staff',
    }).returning();

    // Insert into profiles table
    await db.insert(profiles).values({
      id: newUser.id,
      email,
      full_name: fullName || null,
      role: role || 'staff',
    });

    // Insert branch access entries
    if (Array.isArray(branchIds) && branchIds.length > 0) {
      await db.insert(user_branch_access).values(
        branchIds.map((branch_id: string, i: number) => ({
          user_id: newUser.id,
          branch_id,
          is_primary: i === 0,
        }))
      );
    }

    // Insert default permissions (all false)
    const MODULES = ['pos', 'inventory', 'procurement', 'sales', 'finance', 'service', 'admin', 'hr'];
    await db.insert(user_permissions).values(
      MODULES.map(module => ({
        user_id: newUser.id,
        module,
        enabled: role === 'Admin/Owner',
      }))
    );

    return NextResponse.json({ data: { id: newUser.id, email } }, { status: 201 });
  } catch (error) {
    console.error('Staff provisioning error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to provision user' }, { status: 500 });
  }
}
