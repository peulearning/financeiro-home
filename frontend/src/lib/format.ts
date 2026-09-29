import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AccountType, CategoryType, RecurrenceFrequency, TransactionType } from '@/types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Converte o numero vindo do backend (number) em texto monetario. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return currencyFormatter.format(0);
  return currencyFormatter.format(value);
}

export function formatCurrencyCompact(value: number): string {
  return compactFormatter.format(value);
}

/** Valores com sinal explicito, usado nas listas de movimentacao. */
export function formatSigned(value: number): string {
  const formatted = currencyFormatter.format(Math.abs(value));
  if (value > 0) return `+ ${formatted}`;
  if (value < 0) return `- ${formatted}`;
  return formatted;
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(digits).replace('.', ',')}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    return format(parseISO(iso), "dd 'de' MMM", { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    return format(parseISO(iso), 'dd/MM/yyyy');
  } catch {
    return '-';
  }
}

export function formatMonth(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    const [year, month] = iso.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    const label = format(date, 'MMMM yyyy', { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return iso;
  }
}

export function formatMonthShort(iso: string): string {
  const [year, month] = iso.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return format(date, 'MMM', { locale: ptBR }).replace('.', '').toUpperCase();
}

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return format(date, 'yyyy-MM');
}

export function parseNumber(value: string): number | null {
  if (!value.trim()) return null;
  // Aceita 1.234,56 e 1234.56
  const normalized = value.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function maskMoney(value: string): string {
  const parsed = parseNumber(value);
  if (parsed === null) return '';
  return parsed.toFixed(2);
}

/* --------------------------------- Rotulos --------------------------------- */

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupanca',
  CREDIT_CARD: 'Cartao de credito',
  CASH: 'Dinheiro',
  INVESTMENT: 'Investimento',
};

export const ACCOUNT_TYPE_SHORT: Record<AccountType, string> = {
  CHECKING: 'Corrente',
  SAVINGS: 'Poupanca',
  CREDIT_CARD: 'Credito',
  CASH: 'Dinheiro',
  INVESTMENT: 'Investimento',
};

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  TRANSFER: 'Transferencia',
};

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
};

export const WEEKDAY_LABELS = [
  '',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
  'Domingo',
];

export const ACCOUNT_COLORS = [
  '#10b981',
  '#0ea5e9',
  '#8b5cf6',
  '#f97316',
  '#ec4899',
  '#eab308',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
  '#64748b',
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
