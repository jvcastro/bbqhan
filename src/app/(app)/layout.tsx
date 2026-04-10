import { auth } from "@/auth";
import { AppNav } from "@/components/navigation/app-nav";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full">
      <AppNav />
      <main className="flex min-h-full flex-1 flex-col pb-24 xl:pb-6 xl:pl-52">
        <div className="mx-auto w-full max-w-5xl flex-1 p-4 xl:p-6">{children}</div>
      </main>
    </div>
  );
}
