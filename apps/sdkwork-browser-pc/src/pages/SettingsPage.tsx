import type { BrowserEngineId } from "@sdkwork/browser-contracts";
import { BROWSER_ENGINE_IDS } from "@sdkwork/browser-contracts";
import { useBrowserShellStore } from "../stores/browserShellStore";
import { useThemeStore, type BrowserTheme } from "../stores/themeStore";

interface EngineMeta {
  id: BrowserEngineId;
  label: string;
  description: string;
  size: string;
  dot: string;
}

const ENGINES: EngineMeta[] = [
  {
    id: BROWSER_ENGINE_IDS.webview,
    label: "WebView",
    description: "System WebView2 / WKWebView — lightweight, built-in.",
    size: "~10 MB",
    dot: "bg-engine-webview",
  },
  {
    id: BROWSER_ENGINE_IDS.servo,
    label: "Servo",
    description: "Rust-based experimental engine by Mozilla Research.",
    size: "~80 MB",
    dot: "bg-engine-servo",
  },
  {
    id: BROWSER_ENGINE_IDS.cef,
    label: "CEF (Chromium Embedded)",
    description: "Full Chromium engine for maximum web compatibility.",
    size: "~200 MB",
    dot: "bg-engine-cef",
  },
];

const THEMES: { id: BrowserTheme; label: string; description: string }[] = [
  { id: "light", label: "Light", description: "Clean and bright — Chrome/Edge style." },
  { id: "dark", label: "Dark", description: "Deep and focused — reduced eye strain." },
];

export function SettingsPage() {
  const engineId = useBrowserShellStore((s) => s.engineId);
  const loading = useBrowserShellStore((s) => s.loading);
  const switchEngine = useBrowserShellStore((s) => s.switchEngine);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <section className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink-primary">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          Customize your browsing experience.
        </p>
      </div>

      {/* Appearance */}
      <div className="card p-6">
        <h2 className="mb-1 text-[0.9375rem] font-semibold text-ink-primary">
          Appearance
        </h2>
        <p className="mb-5 text-[0.8125rem] text-ink-tertiary">
          Choose how SDKWork Browser looks.
        </p>

        <div className="settings-row">
          <div>
            <p className="text-[0.875rem] font-medium text-ink-primary">Theme</p>
            <p className="text-[0.75rem] text-ink-faint">
              Switch between light and dark appearance.
            </p>
          </div>
          <div className="segmented">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`segmented-item ${theme === t.id ? "segmented-item-active" : ""}`}
                onClick={() => setTheme(t.id)}
                title={t.description}
              >
                {t.id === "light" ? (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                )}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Browser Engine */}
      <div className="card p-6">
        <h2 className="mb-1 text-[0.9375rem] font-semibold text-ink-primary">
          Browser Engine
        </h2>
        <p className="mb-5 text-[0.8125rem] text-ink-tertiary">
          Select the rendering engine used to load web pages. Changes apply
          immediately.
        </p>

        <div className="space-y-3">
          {ENGINES.map((engine) => {
            const active = engineId === engine.id;
            return (
              <button
                key={engine.id}
                type="button"
                disabled={loading}
                onClick={() => void switchEngine(engine.id)}
                className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all duration-150 ${
                  active
                    ? "border-accent bg-accent-soft/50 shadow-glow-accent"
                    : "border-hairline hover:border-hairline-strong hover:bg-surface-0"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    active ? "bg-accent-soft" : "bg-surface-2"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${engine.dot} ${active ? "animate-pulse-soft" : ""}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[0.875rem] font-semibold text-ink-primary">
                      {engine.label}
                    </span>
                    <span className="pill">{engine.size}</span>
                    {active ? (
                      <span className="pill pill-ok">
                        <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                        Active
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[0.75rem] text-ink-tertiary">
                    {engine.description}
                  </span>
                </span>
                {active ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <h2 className="mb-3 text-[0.9375rem] font-semibold text-ink-primary">
          About
        </h2>
        <dl className="space-y-2.5 text-[0.8125rem]">
          <div className="flex items-center justify-between">
            <dt className="text-ink-faint">Product</dt>
            <dd className="font-medium text-ink-secondary">SDKWork Browser</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-faint">Version</dt>
            <dd className="font-medium text-ink-secondary">0.1.0</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-faint">Active Engine</dt>
            <dd className="font-medium text-ink-secondary">{engineId}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-faint">Theme</dt>
            <dd className="font-medium text-ink-secondary">{theme}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
