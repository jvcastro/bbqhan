import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground w-full max-w-md rounded-xl border border-border bg-card p-8 text-center text-sm shadow-lg">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
