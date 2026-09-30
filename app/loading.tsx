export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background text-foreground transition-colors duration-200">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-300 border-t-accent" />
        <p className="text-xs font-medium tracking-wide text-muted">
          Loading archive…
        </p>
      </div>
    </main>
  );
}
