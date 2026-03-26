import { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Settings | SoroScan",
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const tabs = [
    { href: "/settings", label: "Overview" },
    { href: "/settings/account", label: "Account" },
    { href: "/settings/preferences", label: "Preferences" },
    { href: "/settings/api-keys", label: "API Keys" },
    { href: "/settings/notifications", label: "Notifications" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e27] text-green-400 p-6 font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 border-b border-green-500/30 pb-3">
          <h1 className="text-green-400 text-xl font-bold tracking-widest">◆ SETTINGS</h1>
        </div>

        <nav className="mb-6 flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="px-3 py-1 rounded border border-green-500/20 text-sm text-green-300 hover:border-green-400"
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <section>{children}</section>
      </div>
    </div>
  );
}
