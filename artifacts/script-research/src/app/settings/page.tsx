import { Layout } from "@/components/Layout";

export default function SettingsPage() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col py-12 px-6">
        <div className="max-w-[640px] w-full mx-auto">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Configuration for Script Research
          </p>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Environment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                API keys and database connections are managed via Vercel environment variables.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Database</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Claude API</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Configured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">OneDrive Sync</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Not configured (Session 5)</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Supported Company Types
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Templates available for Core Sheet generation.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Software / General</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Banking</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Financials (SPGI-style)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Planned (Session 6)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Internet (Tencent-style)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Planned (Session 6)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
