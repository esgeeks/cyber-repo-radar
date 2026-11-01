import type { ReactNode } from 'react';

interface Props {
  code: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: 'neutral' | 'error';
}

/** Terminal-styled block for loading, empty and error states. */
export function StateMessage({ code, title, children, actions, tone = 'neutral' }: Props) {
  return (
    <div className="panel mx-auto max-w-xl px-6 py-10 text-center" role={tone === 'error' ? 'alert' : 'status'}>
      <p className={`font-mono text-xs ${tone === 'error' ? 'text-danger' : 'text-accent-dim'}`}>{code}</p>
      <h2 className="mt-2 font-mono text-lg font-semibold text-ink">{title}</h2>
      {children && <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function SkeletonGrid({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite">
      <p className="mb-4 font-mono text-xs text-accent-dim">
        <span className="sr-only">{label}</span>
        <span aria-hidden="true">
          $ {label}
          <span className="animate-blink">▌</span>
        </span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="panel h-56 animate-pulse p-4">
            <div className="h-4 w-2/3 rounded bg-panel-2" />
            <div className="mt-4 h-3 w-full rounded bg-panel-2" />
            <div className="mt-2 h-3 w-5/6 rounded bg-panel-2" />
            <div className="mt-6 flex gap-2">
              <div className="h-4 w-14 rounded bg-panel-2" />
              <div className="h-4 w-16 rounded bg-panel-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
