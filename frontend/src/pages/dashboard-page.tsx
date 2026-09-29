import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Target,
} from 'lucide-react';
import { useAccounts, useCategories, useDashboard, useToggleInstallment } from '@/hooks/use-api';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/toast';
import { Card, Chip, PageHeader, StatCard } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { ErrorState, SkeletonBlock } from '@/components/ui/states';
import { TransactionFormDialog } from '@/components/transactions/transaction-form-dialog';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatMonth,
  formatMonthShort,
  formatPercent,
  shiftMonth,
  ACCOUNT_TYPE_SHORT,
} from '@/lib/format';
import { formatCompactForAxis, pickColor } from '@/lib/ui';

export function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [formOpen, setFormOpen] = useState(false);

  const dashboard = useDashboard(month);
  const accounts = useAccounts();
  const categories = useCategories();
  const toggleInstallment = useToggleInstallment();

  const data = dashboard.data;
  const isCurrentMonth = month === new Date().toISOString().slice(0, 7);

  const trend = useMemo(() => {
    if (!data) return [];
    return data.trend.map((point) => ({
      ...point,
      label: formatMonthShort(point.month),
      incomeLabel: formatCurrency(point.income),
      expenseLabel: formatCurrency(point.expense),
    }));
  }, [data]);

  const expenseChart = useMemo(
    () => (data?.expensesByCategory ?? []).slice(0, 8).map((item, index) => ({
      ...item,
      fill: pickColor(index, item.color),
      label: item.name.length > 14 ? `${item.name.slice(0, 13)}...` : item.name,
    })),
    [data],
  );

  const handleToggle = async (installmentId: number) => {
    try {
      await toggleInstallment.mutateAsync({ installmentId });
      toast.success('Parcela atualizada');
    } catch {
      toast.error('Nao foi possivel atualizar a parcela');
    }
  };

  if (dashboard.isError) {
    return (
      <Card>
        <ErrorState message={(dashboard.error as Error)?.message} onRetry={() => dashboard.refetch()} />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={`Ola, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle="Resumo financeiro do casal"
        actions={
          <>
            <div className="flex items-center rounded-lg border border-border bg-surface">
              <button
                type="button"
                onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
                className="btn btn-ghost btn-icon rounded-r-none"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-32 px-1 text-center text-sm font-medium">{formatMonth(month)}</span>
              <button
                type="button"
                onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
                disabled={isCurrentMonth}
                className="btn btn-ghost btn-icon rounded-l-none disabled:opacity-40"
                aria-label="Proximo mes"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <Button icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
              Nova movimentacao
            </Button>
          </>
        }
      />

      {/* Indicadores */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.isPending ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-5">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="mt-3 h-8 w-32" />
              <SkeletonBlock className="mt-2 h-3 w-20" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              label="Receitas do mes"
              value={formatCurrency(data?.totalIncome)}
              icon={TrendingUp}
              tone="income"
              hint={data?.savingsRate ? `${formatPercent(data.savingsRate)} de sobra` : undefined}
            />
            <StatCard
              label="Despesas do mes"
              value={formatCurrency(data?.totalExpense)}
              icon={TrendingDown}
              tone="expense"
              hint={`${data?.expensesByCategory.length ?? 0} categorias`}
            />
            <StatCard
              label="Saldo do mes"
              value={formatCurrency(data?.balance)}
              icon={PiggyBank}
              tone={(data?.balance ?? 0) >= 0 ? 'income' : 'expense'}
              hint={(data?.balance ?? 0) >= 0 ? 'Sobrou no mes' : 'Gastou mais do que ganhou'}
            />
            <StatCard
              label="Fatura do cartao"
              value={formatCurrency(data?.creditTotal)}
              icon={CreditCard}
              tone={data?.creditTotal ? 'warning' : 'default'}
              hint={
                data?.creditLimit
                  ? `${formatCurrency(data.creditAvailable)} de limite livre`
                  : 'Nenhum limite definido'
              }
            />
          </>
        )}
      </div>

      {/* Alerta de atrasos */}
      {data && data.overdueBills > 0 && (
        <Card className="mt-4 flex items-start gap-3 border-expense/40 bg-expense/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-expense" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-expense">
              {data.overdueBills} {data.overdueBills === 1 ? 'parcela vencida' : 'parcelas vencidas'} sem
              pagamento
            </p>
            <p className="mt-0.5 text-sm text-muted">
              Total em atraso: {formatCurrency(data.overdueAmount)}
            </p>
          </div>
          <Link to="/contas-a-pagar" className="btn btn-secondary btn-sm shrink-0">
            Regularizar
          </Link>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Evolucao */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Evolucao dos ultimos 6 meses</h2>
              <p className="text-sm text-muted">Receitas e despesas por mes</p>
            </div>
          </div>

          {dashboard.isPending ? (
            <SkeletonBlock className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--income)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--income)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--expense)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--expense)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-2)', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-2)', fontSize: 12 }}
                  tickFormatter={formatCompactForAxis}
                  width={52}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 13,
                    boxShadow: 'var(--shadow-pop)',
                  }}
                  formatter={(value, name) => [
                    formatCurrency(Number(value ?? 0)),
                    name === 'income' ? 'Receitas' : 'Despesas',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="var(--income)"
                  strokeWidth={2}
                  fill="url(#gradIncome)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="var(--expense)"
                  strokeWidth={2}
                  fill="url(#gradExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Patrimonio */}
        <Card className="p-5">
          <h2 className="font-semibold">Patrimonio disponivel</h2>
          <p className="text-sm text-muted">Contas de custodia propria</p>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-income">
            {formatCurrency(data?.accountTotal)}
          </p>

          {data && data.creditLimit > 0 && (
            <p className="mt-1 text-sm text-muted">
              Limite total de {formatCurrencyCompact(data.creditLimit)}
            </p>
          )}

          <ul className="mt-4 space-y-2.5">
            {(accounts.data ?? []).slice(0, 6).map((account) => {
              const percent =
                account.creditLimit && account.creditLimit > 0
                  ? Math.min(100, (Math.abs(account.currentBalance) / Number(account.creditLimit)) * 100)
                  : null;
              const isCredit = account.type === 'CREDIT_CARD';

              return (
                <li key={account.id}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{account.name}</span>
                    <span
                      className={`shrink-0 font-medium tabular-nums ${
                        account.currentBalance < 0 ? 'text-expense' : 'text-foreground'
                      }`}
                    >
                      {formatCurrency(account.currentBalance)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-muted-2">
                      {ACCOUNT_TYPE_SHORT[account.type]}
                    </span>
                    {percent !== null && (
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-warning"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {isCredit && account.creditLimit && (
                    <p className="mt-0.5 text-xs text-muted-2">
                      Livre: {formatCurrency(account.availableCredit)}
                    </p>
                  )}
                </li>
              );
            })}
            {(accounts.data ?? []).length === 0 && (
              <li className="rounded-lg bg-surface-2 px-3 py-4 text-center text-sm text-muted">
                <Link to="/contas" className="text-primary hover:underline">
                  Cadastre sua primeira conta
                </Link>
              </li>
            )}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Despesas por categoria */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold">Despesas por categoria</h2>
          <p className="mb-4 text-sm text-muted">{formatMonth(month)}</p>

          {dashboard.isPending ? (
            <SkeletonBlock className="h-64 w-full" />
          ) : expenseChart.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted">
              Nenhuma despesa registrada neste mes
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expenseChart}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {expenseChart.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={60}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <ul className="space-y-2 self-center">
                {expenseChart.slice(0, 6).map((item) => (
                  <li key={item.name} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.fill }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-muted">{item.name}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="w-11 shrink-0 text-right text-xs text-muted-2 tabular-nums">
                      {formatPercent(item.percent, 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Proximos vencimentos */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Proximos vencimentos</h2>
              <p className="text-sm text-muted">{data?.pendingBills ?? 0} em aberto</p>
            </div>
            <Link to="/contas-a-pagar" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </div>

          {dashboard.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (data?.upcomingBills ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              Nenhuma parcela pendente
            </div>
          ) : (
            <ul className="space-y-2">
              {data?.upcomingBills.map((installment) => (
                <li
                  key={installment.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Parcela {installment.number}
                    </p>
                    <p className="text-xs text-muted-2">
                      Vence {new Date(installment.dueDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrency(installment.amount)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={toggleInstallment.isPending}
                    onClick={() => handleToggle(installment.id)}
                  >
                    Pagar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Orcamentos */}
      <Card className="mt-4 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-muted-2" aria-hidden />
            <div>
              <h2 className="font-semibold">Orcamentos do mes</h2>
              <p className="text-sm text-muted">Metas por categoria</p>
            </div>
          </div>
          <Link to="/orcamentos" className="text-xs text-primary hover:underline">
            Gerenciar
          </Link>
        </div>

        {dashboard.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : (data?.budgets ?? []).length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">Nenhum orcamento definido para {formatMonth(month)}.</p>
            <Link to="/orcamentos" className="btn btn-secondary btn-sm mt-3">
              <Plus className="size-3.5" /> Criar orcamento
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data?.budgets.map((budget) => {
              const percent = Math.min(budget.percentUsed, 100);
              const tone =
                budget.status === 'EXCEEDED'
                  ? 'bg-expense'
                  : budget.status === 'WARNING'
                    ? 'bg-warning'
                    : 'bg-income';

              return (
                <div key={budget.id} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">{budget.categoryName}</p>
                    <Chip
                      tone={
                        budget.status === 'EXCEEDED'
                          ? 'expense'
                          : budget.status === 'WARNING'
                            ? 'warning'
                            : 'income'
                      }
                    >
                      {formatPercent(budget.percentUsed, 0)}
                    </Chip>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full transition-all ${tone}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {formatCurrency(budget.spent)} de {formatCurrency(budget.amountLimit)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {categories.data && categories.data.length === 0 && !categories.isPending && (
        <Card className="mt-4 p-4 text-sm text-muted">
          Nenhuma categoria cadastrada.{' '}
          <Link to="/categorias" className="text-primary hover:underline">
            Criar categorias
          </Link>{' '}
          para organizar suas movimentacoes.
        </Card>
      )}

      <TransactionFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
}
