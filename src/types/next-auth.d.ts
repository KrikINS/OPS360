import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: string;
      branchId: string | null;
    };
  }

  interface User {
    id: string;
    role?: string;
    branchId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    branchId: string | null;
  }
}
