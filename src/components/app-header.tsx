export function AppHeader({ title }: { title: string }) {
  return (
    <header className="glass-bar z-30 shrink-0 border-b">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-center px-5">
        <span className="text-[17px] font-semibold tracking-tight text-foreground">
          {title}
        </span>
      </div>
    </header>
  );
}
