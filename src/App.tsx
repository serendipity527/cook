const stack = [
  { label: '前端', value: 'Vite + React + TypeScript' },
  { label: '样式', value: 'Tailwind CSS' },
  { label: '本地存储', value: 'Dexie / IndexedDB' },
  { label: 'AI 网关', value: 'Hono' },
];

export default function App() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-[0.3em] text-[var(--accent)]">KAIHUO</p>
        <h1 className="text-5xl font-bold tracking-tight">开火</h1>
        <p className="text-[var(--muted)]">手上有油也能用的做饭流程助手</p>
      </header>

      <section className="rounded-3xl bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-sm font-medium text-[var(--muted)]">环境状态</h2>
        <ul className="space-y-3">
          {stack.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[var(--muted)]">{item.label}</span>
              <span className="text-right">{item.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-center text-xs text-[var(--muted)]">M0 · 项目骨架已就绪</footer>
    </main>
  );
}
