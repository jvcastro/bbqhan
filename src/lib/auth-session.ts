import { auth } from "@/auth";
import type { UserRole } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

/**
 * Ensures the JWT refers to a real User row (avoids FK errors after DB re-seed / reset).
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!dbUser) {
    throw new Error(
      "Your session is out of date (for example after re-seeding the database). Sign out and sign in again.",
    );
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name ?? undefined,
    role: dbUser.role as UserRole,
  };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("Only admins can do this.");
  }
  return user;
}

export function isAdmin(role: UserRole) {
  return role === "ADMIN";
}
