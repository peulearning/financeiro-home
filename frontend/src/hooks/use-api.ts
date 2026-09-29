import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Account,
  AccountPayload,
  Bill,
  BillPayload,
  Budget,
  BudgetPayload,
  Category,
  CategoryPayload,
  Dashboard,
  Invite,
  PageResponse,
  Recurrence,
  RecurrencePayload,
  Transaction,
  TransactionFilters,
  TransactionPayload,
  TransferPayload,
} from '@/types';

export const queryKeys = {
  dashboard: (month: string) => ['dashboard', month] as const,
  accounts: (includeInactive: boolean) => ['accounts', includeInactive] as const,
  categories: (includeInactive: boolean) => ['categories', includeInactive] as const,
  transactions: (filters: TransactionFilters) => ['transactions', filters] as const,
  bills: () => ['bills'] as const,
  recurrences: () => ['recurrences'] as const,
  budgets: (month: string) => ['budgets', month] as const,
  household: () => ['household'] as const,
  invites: () => ['invites'] as const,
};

/* --------------------------------- Dashboard -------------------------------- */

export function useDashboard(month: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(month),
    queryFn: () => api.get<Dashboard>('/dashboard', { month }),
  });
}

/* ---------------------------------- Contas ---------------------------------- */

export function useAccounts(includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.accounts(includeInactive),
    queryFn: () => api.get<Account[]>('/accounts', { includeInactive }),
  });
}

export function useCreateAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: AccountPayload) => api.post<Account>('/accounts', payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AccountPayload }) =>
      api.put<Account>(`/accounts/${id}`, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeactivateAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/accounts/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useReactivateAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<Account>(`/accounts/${id}/reactivate`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

/* -------------------------------- Categorias -------------------------------- */

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.categories(includeInactive),
    queryFn: () => api.get<Category[]>('/categories', { includeInactive }),
  });
}

export function useCreateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryPayload) => api.post<Category>('/categories', payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CategoryPayload }) =>
      api.put<Category>(`/categories/${id}`, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeactivateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/categories/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useReactivateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<Category>(`/categories/${id}/reactivate`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['categories'] }),
  });
}

/* ------------------------------ Movimentacoes ------------------------------- */

function cleanFilters(filters: TransactionFilters) {
  return {
    from: filters.from,
    to: filters.to,
    accountId: filters.accountId ?? undefined,
    categoryId: filters.categoryId ?? undefined,
    type: filters.type ?? undefined,
    search: filters.search?.trim() || undefined,
    page: filters.page ?? 0,
    size: filters.size ?? 25,
  };
}

export function useTransactions(filters: TransactionFilters) {
  const params = cleanFilters(filters);
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: () => api.get<PageResponse<Transaction>>('/transactions', params),
  });
}

function invalidateFinancial(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({ queryKey: ['transactions'] });
  client.invalidateQueries({ queryKey: ['dashboard'] });
  client.invalidateQueries({ queryKey: ['budgets'] });
}

export function useCreateTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransactionPayload) => api.post<Transaction>('/transactions', payload),
    onSuccess: () => {
      invalidateFinancial(client);
      client.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useCreateTransfer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferPayload) => api.post<Transaction[]>('/transactions/transfers', payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['transactions'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      client.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TransactionPayload }) =>
      api.put<Transaction>(`/transactions/${id}`, payload),
    onSuccess: () => {
      invalidateFinancial(client);
      client.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/transactions/${id}`),
    onSuccess: () => {
      invalidateFinancial(client);
      client.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

/* --------------------------- Contas a pagar/receber ------------------------ */

export function useBills() {
  return useQuery({
    queryKey: queryKeys.bills(),
    queryFn: () => api.get<Bill[]>('/bills'),
  });
}

export function useCreateBill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: BillPayload) => api.post<Bill>('/bills', payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['bills'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BillPayload }) =>
      api.put<Bill>(`/bills/${id}`, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['bills'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteBill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/bills/${id}`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['bills'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      client.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useToggleInstallment() {
  const client = useQueryClient();
  return useMutation({
    // O backend espera a data do pagamento como query param, nao no corpo.
    mutationFn: ({ installmentId, paidAt }: { installmentId: number; paidAt?: string }) =>
      api.post<Bill>(`/bills/installments/${installmentId}/toggle`, undefined, { paidAt }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['bills'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      client.invalidateQueries({ queryKey: ['transactions'] });
      client.invalidateQueries({ queryKey: ['accounts'] });
      client.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

/* ------------------------------- Recorrencias ------------------------------- */

export function useRecurrences() {
  return useQuery({
    queryKey: queryKeys.recurrences(),
    queryFn: () => api.get<Recurrence[]>('/recurrences'),
  });
}

export function useCreateRecurrence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecurrencePayload) => api.post<Recurrence>('/recurrences', payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ['recurrences'] }),
  });
}

export function useUpdateRecurrence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RecurrencePayload }) =>
      api.put<Recurrence>(`/recurrences/${id}`, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: ['recurrences'] }),
  });
}

export function useToggleRecurrence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.patch<Recurrence>(`/recurrences/${id}/active`, undefined, { active }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['recurrences'] }),
  });
}

export function useDeleteRecurrence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/recurrences/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['recurrences'] }),
  });
}

export function useGenerateRecurrences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ created: number }>(`/recurrences/${id}/generate`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['recurrences'] });
      client.invalidateQueries({ queryKey: ['transactions'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/* -------------------------------- Orcamentos -------------------------------- */

export function useBudgets(month: string) {
  return useQuery({
    queryKey: queryKeys.budgets(month),
    queryFn: () => api.get<Budget[]>('/budgets', { month }),
  });
}

export function useCreateBudget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: BudgetPayload) => api.post<Budget>('/budgets', payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['budgets'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBudget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BudgetPayload }) =>
      api.put<Budget>(`/budgets/${id}`, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['budgets'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteBudget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/budgets/${id}`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['budgets'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCopyBudgets() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (month: string) => api.post<{ copied: number }>('/budgets/copy-previous', undefined, { month }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['budgets'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/* --------------------------------- Household -------------------------------- */

export function useHousehold() {
  return useQuery({
    queryKey: queryKeys.household(),
    queryFn: () => api.get<import('@/types').Household>('/household'),
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (name: string) => api.patch<import('@/types').User>('/auth/profile', { name }),
  });
}

export function useRenameHousehold() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.patch<import('@/types').Household>('/household', { name }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['household'] }),
  });
}

export function useInvites() {
  return useQuery({
    queryKey: queryKeys.invites(),
    queryFn: () => api.get<Invite[]>('/household/invites'),
  });
}

export function useCreateInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Invite>('/household/invites'),
    onSuccess: () => client.invalidateQueries({ queryKey: ['invites'] }),
  });
}

export function useRevokeInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/household/invites/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['invites'] }),
  });
}

export function useRemoveMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.delete<void>(`/household/members/${userId}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['household'] }),
  });
}
