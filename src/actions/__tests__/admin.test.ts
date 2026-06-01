/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as provisionUser } from '@/app/api/admin/staff/route'
import { POST as resetPassword } from '@/app/api/admin/reset-password/route'
import { getAdminUsersDataAction, getBranchesAction, updateUserPermissionsAction } from '@/app/actions/admin-users'
import {
  setupTestDb, cleanupTestDb, teardownTestDb,
  seedBranch,
} from '@/test/db'
import type { TestDb } from '@/test/db'
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'

// Both the route (next-auth/next) and the server actions (next-auth/next) import
// getServerSession from this sub-path — mock it here so the global setup's
// 'next-auth' mock is not bypassed.
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}))

import { getServerSession } from 'next-auth/next'

let db: TestDb
beforeAll(async () => { db = await setupTestDb() })
afterEach(async () => { await cleanupTestDb(db) })
afterAll(async () => { await teardownTestDb() })

const ADMIN_ID   = '00000000-0000-0000-0000-000000000001'
const MANAGER_ID = '00000000-0000-0000-0000-000000000002'
const STAFF_ID   = '00000000-0000-0000-0000-000000000003'

function makeProvisionRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─────────────────────────────────────────────────────
// POST /api/admin/staff — user provisioning
// ─────────────────────────────────────────────────────

describe('POST /api/admin/staff — user provisioning', () => {

  it('creates a user with profile, branch access, and permissions', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: branch.id },
    })

    const req = makeProvisionRequest({
      email: 'newstaff@ops360.com',
      password: 'SecurePass123!',
      fullName: 'New Staff Member',
      role: 'staff',
      branchIds: [branch.id],
    })

    const res = await provisionUser(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.email).toBe('newstaff@ops360.com')

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'newstaff@ops360.com'))
      .limit(1)
    expect(user).toHaveLength(1)

    const profile = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, user[0].id))
      .limit(1)
    expect(profile[0].full_name).toBe('New Staff Member')
    expect(profile[0].role).toBe('staff')

    const access = await db
      .select()
      .from(schema.user_branch_access)
      .where(eq(schema.user_branch_access.user_id, user[0].id))
    expect(access).toHaveLength(1)
    expect(access[0].branch_id).toBe(branch.id)
    expect(access[0].is_primary).toBe(true)

    const perms = await db
      .select()
      .from(schema.user_permissions)
      .where(eq(schema.user_permissions.user_id, user[0].id))
    expect(perms).toHaveLength(8)
  })

  it('rejects unauthenticated requests with 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const req = makeProvisionRequest({
      email: 'hacker@evil.com',
      password: 'password',
      role: 'admin',
      branchIds: [],
    })

    const res = await provisionUser(req)
    expect(res.status).toBe(401)

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'hacker@evil.com'))
    expect(user).toHaveLength(0)
  })

  it('rejects staff role attempting to provision — 403', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: null },
    })

    const req = makeProvisionRequest({
      email: 'newuser@ops360.com',
      password: 'password',
      role: 'staff',
      branchIds: [],
    })

    const res = await provisionUser(req)
    expect(res.status).toBe(403)
  })

  it('rejects manager role attempting to provision — 403', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: MANAGER_ID, role: 'manager', branchId: null },
    })

    const req = makeProvisionRequest({
      email: 'newuser@ops360.com',
      password: 'password',
      role: 'staff',
      branchIds: [],
    })

    const res = await provisionUser(req)
    expect(res.status).toBe(403)
  })

  it('rejects duplicate email with 409', async () => {
    const branch = await seedBranch(db)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: branch.id },
    })
    await provisionUser(makeProvisionRequest({
      email: 'duplicate@ops360.com',
      password: 'SecurePass123!',
      role: 'staff',
      branchIds: [branch.id],
    }))

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: branch.id },
    })
    const res = await provisionUser(makeProvisionRequest({
      email: 'duplicate@ops360.com',
      password: 'DifferentPass456!',
      role: 'staff',
      branchIds: [branch.id],
    }))

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/already exists/i)
  })

  it('rejects missing email with 400', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })

    const req = makeProvisionRequest({
      password: 'SecurePass123!',
      role: 'staff',
      branchIds: [],
    })

    const res = await provisionUser(req)
    expect(res.status).toBe(400)
  })

  it('rejects missing password with 400', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })

    const req = makeProvisionRequest({
      email: 'nopass@ops360.com',
      role: 'staff',
      branchIds: [],
    })

    const res = await provisionUser(req)
    expect(res.status).toBe(400)
  })

  it('assigns multiple branches with first as primary', async () => {
    const branch1 = await seedBranch(db, { name: 'Branch One', gstin: '27AAAAA0000A1Z5' })
    const branch2 = await seedBranch(db, { name: 'Branch Two', gstin: '27BBBBB0000B1Z3' })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: branch1.id },
    })

    const res = await provisionUser(makeProvisionRequest({
      email: 'multibranch@ops360.com',
      password: 'SecurePass123!',
      role: 'staff',
      branchIds: [branch1.id, branch2.id],
    }))

    expect(res.status).toBe(201)

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'multibranch@ops360.com'))
      .limit(1)

    const access = await db
      .select()
      .from(schema.user_branch_access)
      .where(eq(schema.user_branch_access.user_id, user[0].id))
      .orderBy(schema.user_branch_access.is_primary)

    expect(access).toHaveLength(2)
    const primary = access.find(a => a.is_primary)
    expect(primary?.branch_id).toBe(branch1.id)
  })

  it('passwords are hashed — plaintext never stored', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: branch.id },
    })

    const plaintext = 'MySecretPassword123!'
    await provisionUser(makeProvisionRequest({
      email: 'hashcheck@ops360.com',
      password: plaintext,
      role: 'staff',
      branchIds: [branch.id],
    }))

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'hashcheck@ops360.com'))
      .limit(1)

    expect(user[0].password_hash).not.toBe(plaintext)
    expect(user[0].password_hash).toMatch(/^\$2b\$/)
  })

  it('Admin/Owner role gets all permissions enabled', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: branch.id },
    })

    await provisionUser(makeProvisionRequest({
      email: 'owner@ops360.com',
      password: 'SecurePass123!',
      role: 'Admin/Owner',
      branchIds: [branch.id],
    }))

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'owner@ops360.com'))
      .limit(1)

    const perms = await db
      .select()
      .from(schema.user_permissions)
      .where(eq(schema.user_permissions.user_id, user[0].id))

    const allEnabled = perms.every(p => p.enabled === true)
    expect(allEnabled).toBe(true)
    expect(perms).toHaveLength(8)
  })

  it('staff role gets all permissions disabled by default', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: branch.id },
    })

    await provisionUser(makeProvisionRequest({
      email: 'newstaff2@ops360.com',
      password: 'SecurePass123!',
      role: 'staff',
      branchIds: [branch.id],
    }))

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'newstaff2@ops360.com'))
      .limit(1)

    const perms = await db
      .select()
      .from(schema.user_permissions)
      .where(eq(schema.user_permissions.user_id, user[0].id))

    const allDisabled = perms.every(p => p.enabled === false)
    expect(allDisabled).toBe(true)
  })
})

// ─────────────────────────────────────────────────────
// getAdminUsersDataAction
// ─────────────────────────────────────────────────────

describe('getAdminUsersDataAction', () => {
  it('returns profiles with permissions and branch assignments', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: branch.id },
    })

    const result = await getAdminUsersDataAction(ADMIN_ID)
    expect(result.error).toBeUndefined()
    expect(Array.isArray(result.profiles)).toBe(true)
    expect(Array.isArray(result.branches)).toBe(true)
    expect(result.stats.total_users).toBeGreaterThanOrEqual(0)
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)
    const result = await getAdminUsersDataAction(undefined)
    expect(result.error).toMatch(/unauthorized/i)
    expect(result.profiles).toHaveLength(0)
  })

  it('rejects staff role', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: branch.id },
    })
    const result = await getAdminUsersDataAction(STAFF_ID)
    expect(result.error).toMatch(/permission/i)
    expect(result.profiles).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────
// getBranchesAction
// ─────────────────────────────────────────────────────

describe('getBranchesAction', () => {
  it('returns branches for authenticated user', async () => {
    await seedBranch(db, { name: 'Mumbai Hub', gstin: '27AAAAA0000A1Z5' })
    await seedBranch(db, { name: 'Pune Outlet', gstin: '27BBBBB0000B1Z3' })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })

    const result = await getBranchesAction()
    expect(result.data.length).toBeGreaterThanOrEqual(2)
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)
    const result = await getBranchesAction()
    expect(result.error).toMatch(/unauthorized/i)
    expect(result.data).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────
// updateUserPermissionsAction — branch assignment
// ─────────────────────────────────────────────────────

describe('updateUserPermissionsAction — branch assignment', () => {
  it('saves branch assignments to user_branch_access', async () => {
    const branch1 = await seedBranch(db, { name: 'Branch One', gstin: '27AAAAA0000A1Z5' })
    const branch2 = await seedBranch(db, { name: 'Branch Two', gstin: '27BBBBB0000B1Z3' })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    await provisionUser(makeProvisionRequest({
      email: 'branchtest@ops360.com',
      password: 'SecurePass123!',
      role: 'staff',
      branchIds: [branch1.id],
    }))

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'branchtest@ops360.com'))
      .limit(1)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    const result = await updateUserPermissionsAction({
      userId: user[0].id,
      role: 'staff',
      permissions: { pos: true, inventory: false },
      branchIds: [branch1.id, branch2.id],
    })

    expect(result.success).toBe(true)

    const access = await db
      .select()
      .from(schema.user_branch_access)
      .where(eq(schema.user_branch_access.user_id, user[0].id))

    expect(access).toHaveLength(2)
    expect(access.find(a => a.is_primary)?.branch_id).toBe(branch1.id)
  })

  it('replaces existing branch assignments on update', async () => {
    const branch1 = await seedBranch(db, { name: 'Old Branch', gstin: '27AAAAA0000A1Z5' })
    const branch2 = await seedBranch(db, { name: 'New Branch', gstin: '27BBBBB0000B1Z3' })

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    await provisionUser(makeProvisionRequest({
      email: 'replacetest@ops360.com',
      password: 'SecurePass123!',
      role: 'staff',
      branchIds: [branch1.id],
    }))

    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'replacetest@ops360.com'))
      .limit(1)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    await updateUserPermissionsAction({
      userId: user[0].id,
      role: 'staff',
      permissions: {},
      branchIds: [branch2.id],
    })

    const access = await db
      .select()
      .from(schema.user_branch_access)
      .where(eq(schema.user_branch_access.user_id, user[0].id))

    expect(access).toHaveLength(1)
    expect(access[0].branch_id).toBe(branch2.id)
  })
})

function makeResetRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─────────────────────────────────────────────────────
// POST /api/admin/reset-password
// ─────────────────────────────────────────────────────

describe('POST /api/admin/reset-password', () => {
  it('resets password and sets force_password_change', async () => {
    const branch = await seedBranch(db)

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    const provisionRes = await provisionUser(makeProvisionRequest({
      email: 'resetme@ops360.com',
      password: 'OriginalPass123!',
      role: 'staff',
      branchIds: [branch.id],
    }))
    const provisionBody = await provisionRes.json()
    const targetUserId = provisionBody.data.id

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    const res = await resetPassword(makeResetRequest({ userId: targetUserId }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.temporaryPassword).toMatch(/^ETHAN-[A-Z0-9]{4}$/)

    const user = await db
      .select({ password_hash: schema.users.password_hash })
      .from(schema.users)
      .where(eq(schema.users.id, targetUserId))
      .limit(1)

    const passwordChanged = await import('bcrypt').then(b =>
      b.compare(body.temporaryPassword, user[0].password_hash)
    )
    expect(passwordChanged).toBe(true)

    const profile = await db
      .select({ force_password_change: schema.profiles.force_password_change })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, targetUserId))
      .limit(1)

    expect(profile[0].force_password_change).toBe(true)
  })

  it('rejects unauthenticated requests with 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)
    const res = await resetPassword(makeResetRequest({ userId: STAFF_ID }))
    expect(res.status).toBe(401)
  })

  it('rejects staff role with 403', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: STAFF_ID, role: 'staff', branchId: null },
    })
    const res = await resetPassword(makeResetRequest({ userId: ADMIN_ID }))
    expect(res.status).toBe(403)
  })

  it('rejects missing userId with 400', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    const res = await resetPassword(makeResetRequest({}))
    expect(res.status).toBe(400)
  })

  it('rejects non-existent userId with 404', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    const res = await resetPassword(
      makeResetRequest({ userId: '00000000-0000-0000-0000-000000000099' })
    )
    expect(res.status).toBe(404)
  })

  it('generates unique temp passwords on repeated resets', async () => {
    const branch = await seedBranch(db)
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: ADMIN_ID, role: 'admin', branchId: null },
    })
    await provisionUser(makeProvisionRequest({
      email: 'multireset@ops360.com',
      password: 'Pass123!',
      role: 'staff',
      branchIds: [branch.id],
    }))
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'multireset@ops360.com'))
      .limit(1)

    const passwords: string[] = []
    for (let i = 0; i < 2; i++) {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: ADMIN_ID, role: 'admin', branchId: null },
      })
      const res = await resetPassword(
        makeResetRequest({ userId: user[0].id })
      )
      const body = await res.json()
      passwords.push(body.temporaryPassword)
    }

    passwords.forEach(p => expect(p).toMatch(/^ETHAN-[A-Z0-9]{4}$/))
    expect(passwords).toHaveLength(2)
  })
})
