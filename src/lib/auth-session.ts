import { auth } from "@/auth";
import type { UserRole } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Ensures the JWT refers to a real User row (avoids FK errors after DB re-seed / reset).
 * Uses redirect instead of throw so production never shows a generic RSC error (e.g. in-app browsers with no session).
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!dbUser) {
    redirect("/login?reason=stale-session");
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
