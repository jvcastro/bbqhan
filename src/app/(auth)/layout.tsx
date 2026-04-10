export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted flex min-h-full flex-col items-center justify-center p-4">
      {children}
    </div>
  );
}
