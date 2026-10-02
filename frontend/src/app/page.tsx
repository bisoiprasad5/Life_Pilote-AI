export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-950 text-slate-100">
      <div className="max-w-3xl space-y-6">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
          LifePilot AI Platform Baseline
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
          LifePilot AI
        </h1>
        <p className="text-xl text-slate-400 font-light max-w-xl mx-auto">
          &ldquo;Plan your day. Stay on track. Live better.&rdquo;
        </p>
        <div className="pt-2 flex flex-wrap gap-4 justify-center">
          <a
            href="/login"
            id="home-signin-button"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Sign In to LifePilot
          </a>
          <a
            href="/register"
            id="home-register-button"
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition-all cursor-pointer"
          >
            Create New Account
          </a>
        </div>

        <div className="pt-6 flex flex-wrap gap-4 justify-center">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left w-64">
            <h3 className="font-semibold text-blue-400">Frontend Service</h3>
            <p className="text-xs text-slate-400 mt-1">Next.js 14 App Router + Tailwind</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left w-64">
            <h3 className="font-semibold text-emerald-400">Backend Gateway</h3>
            <p className="text-xs text-slate-400 mt-1">NestJS + Prisma + BullMQ</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left w-64">
            <h3 className="font-semibold text-purple-400">AI Microservice</h3>
            <p className="text-xs text-slate-400 mt-1">Python FastAPI + LLM Provider</p>
          </div>
        </div>
      </div>
    </main>
  );
}
