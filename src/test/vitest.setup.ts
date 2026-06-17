import { vi, beforeAll, afterAll } from 'vitest'

// Mock next/cache so Server Actions don't blow up outside Next.js
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('server-only', () => ({}))


// Mock next/headers — Server Actions use cookies() and headers()
// No active_branch_id cookie in tests — getEffectiveBranchId falls back to
// session.user.branchId, which each test controls via mockResolvedValueOnce.
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}))

// Mock next-auth — getServerSession returns a fake session by default.
// Override per-test with vi.mocked(getServerSession).mockResolvedValueOnce(...)
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test User',
      email: 'test@ops360.com',
      role: 'staff',
      branchId: 'branch-mumbai',
    },
  }),
}))

// Silence console.error in tests unless TEST_VERBOSE=1
if (!process.env.TEST_VERBOSE) {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterAll(() => {
    vi.restoreAllMocks()
  })
}
