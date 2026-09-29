import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './button';

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <SkeletonBlock
              key={colIndex}
              className={colIndex === 0 ? 'h-9 w-9 rounded-full' : 'h-4 flex-1'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted-2">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-expense/10 text-expense">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <div>
        <p className="font-medium">Nao foi possivel carregar</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          {message ?? 'Verifique sua conexao e tente novamente.'}
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" icon={<RefreshCw className="size-4" />} onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
