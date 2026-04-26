import type { ReactNode } from 'react';
import { APP_BRAND, APP_FOOTER_TEXT, APP_PRIMARY_NAV } from './navigation';
import type { View } from './routes';
import { withBasePath } from '../utils/basePath';
import { CLIENT_BASE_PATH } from '../shared/api/client';
import { Button } from '../shared/ui/button';
import { cn } from '../shared/lib/cn';

interface AppShellProps {
  activeView: View;
  onNavigateToView: (view: View) => void;
  children: ReactNode;
}

export function AppShell({ activeView, onNavigateToView, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex w-[94vw] flex-col gap-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <button type="button" onClick={() => onNavigateToView('home')} className="flex items-center gap-3 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 shadow-soft">
                  <img
                    src={withBasePath('/BIOREMPP_LOGO.png', CLIENT_BASE_PATH)}
                    alt="BioRemPP logo"
                    className="h-8 w-8 rounded object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{APP_BRAND.title}</h1>
                  <p className="text-sm text-slate-600 sm:text-base">{APP_BRAND.subtitle}</p>
                </div>
              </button>
            </div>

            <nav aria-label="Primary" className="flex flex-wrap items-center gap-1.5">
              {APP_PRIMARY_NAV.map((item) => (
                <Button
                  key={item.id}
                  variant={item.view === activeView ? 'subtle' : 'ghost'}
                  size="sm"
                  className={cn('rounded-full px-4', item.view === activeView ? 'shadow-none' : '')}
                  onClick={() => onNavigateToView(item.view)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-[94vw] flex-1 flex-col py-8">{children}</main>

      <footer className="mt-16 border-t border-slate-200/80 bg-white/85">
        <div className="mx-auto w-[94vw] py-6 text-center text-sm text-slate-500">
          {APP_FOOTER_TEXT}
        </div>
      </footer>
    </div>
  );
}
