import { auth } from "@/auth";
import { AppNav } from "@/components/navigation/app-nav";
import { redirect } from "next/navigation";

/** Session uses cookies — must not be statically cached (fixes Vercel / RSC prefetch). */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh min-h-full w-full max-w-[100vw]">
      <AppNav />
      <main className="flex min-h-dvh min-h-full min-w-0 flex-1 flex-col pb-[calc(3.75rem+max(0.5rem,env(safe-area-inset-bottom,0px)))] xl:pb-6 xl:pl-52">
        <div className="mx-auto w-full min-w-0 max-w-5xl flex-1 p-4 xl:p-6">{children}</div>
      </main>
    </div>
  );
}
