import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, type LucideIcon } from 'lucide-react';
import { formatCurrency, TRANSACTION_TYPE_LABELS } from '@/lib/format';
import type { AccountType, TransactionType } from '@/types';
import { avatarColor } from '@/lib/ui';

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'income' | 'expense' | 'warning';
  trend?: { value: number; label: string };
}) {
  const tones = {
    default: 'text-foreground',
    income: 'text-income',
    expense: 'text-expense',
    warning: 'text-warning',
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-2">{label}</p>
        {Icon && (
          <span
            className={`flex size-8 items-center justify-center rounded-lg ${
              tone === 'income'
                ? 'bg-income/10 text-income'
                : tone === 'expense'
                  ? 'bg-expense/10 text-expense'
                  : tone === 'warning'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-surface-2 text-muted'
            }`}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${tones[tone]}`}>{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={`font-medium ${trend.value >= 0 ? 'text-income' : 'text-expense'}`}
          >
            {trend.value >= 0 ? '+' : ''}
            {trend.value.toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-muted-2">{hint}</span>}
      </div>
    </Card>
  );
}

export function TransactionIcon({ type }: { type: TransactionType }) {
  const config = {
    INCOME: { icon: ArrowDownLeft, tone: 'bg-income/10 text-income' },
    EXPENSE: { icon: ArrowUpRight, tone: 'bg-expense/10 text-expense' },
    TRANSFER: { icon: ArrowLeftRight, tone: 'bg-info/10 text-info' },
  }[type];

  const Icon = config.icon;
  return (
    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${config.tone}`}>
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

export function Amount({
  value,
  type,
  className = '',
}: {
  value: number;
  type: TransactionType;
  className?: string;
}) {
  const tone =
    type === 'INCOME' ? 'text-income' : type === 'EXPENSE' ? 'text-expense' : 'text-foreground';
  return (
    <span className={`font-semibold tabular-nums ${tone} ${className}`}>
      {type === 'EXPENSE' ? '-' : type === 'INCOME' ? '+' : ''}
      {formatCurrency(value)}
    </span>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const label = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${avatarColor(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      title={name}
    >
      {label || '?'}
    </span>
  );
}

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'income' | 'expense' | 'warning' | 'info' | 'muted';
}) {
  const tones = {
    neutral: 'bg-surface-2 text-muted border-border',
    income: 'bg-income/10 text-income border-income/25',
    expense: 'bg-expense/10 text-expense border-expense/25',
    warning: 'bg-warning/10 text-warning border-warning/25',
    info: 'bg-info/10 text-info border-info/25',
    muted: 'bg-surface-2 text-muted-2 border-border',
  }[tone];

  return <span className={`chip ${tones}`}>{children}</span>;
}

export function AccountBadge({ account }: { account: { type: AccountType } }) {
  const label = {
    CHECKING: 'Corrente',
    SAVINGS: 'Poupanca',
    CREDIT_CARD: 'Credito',
    CASH: 'Dinheiro',
    INVESTMENT: 'Investimento',
  }[account.type];

  return <Chip tone="muted">{label}</Chip>;
}

export { TRANSACTION_TYPE_LABELS };
