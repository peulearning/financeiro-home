export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type BillType = 'PAYABLE' | 'RECEIVABLE';
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type MemberRole = 'OWNER' | 'MEMBER';
export type InstallmentStatus = 'PAID' | 'OVERDUE' | 'DUE_TODAY' | 'PENDING';
export type BudgetStatus = 'OK' | 'WARNING' | 'EXCEEDED';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface HouseholdMember {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
}

export interface Household {
  id: number;
  name: string;
  createdAt: string;
  members: HouseholdMember[];
}

export interface Invite {
  id: number;
  code: string;
  expiresAt: string;
  usedByName: string | null;
  usedAt: string | null;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: User;
  household: Household;
}

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  openingBalance: number;
  creditLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
  color: string | null;
  active: boolean;
  currentBalance: number;
  availableCredit: number | null;
}

export interface AccountPayload {
  name: string;
  type: AccountType;
  openingBalance: number;
  creditLimit?: number | null;
  closingDay?: number | null;
  dueDay?: number | null;
  color?: string | null;
}

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  active: boolean;
}

export type CategoryPayload = Pick<Category, 'name' | 'type' | 'color' | 'icon'>;

export interface Transaction {
  id: number;
  accountId: number;
  accountName: string;
  accountType: AccountType;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  type: TransactionType;
  amount: number;
  signedAmount: number;
  description: string | null;
  notes: string | null;
  entryDate: string;
  transferGroupId: string | null;
  createdById: number;
  createdByName: string;
  createdAt: string;
}

export interface TransactionPayload {
  accountId: number;
  categoryId?: number | null;
  type: TransactionType;
  amount: number;
  description?: string | null;
  notes?: string | null;
  entryDate: string;
}

export interface TransferPayload {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description?: string | null;
  entryDate: string;
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  accountId?: number | null;
  categoryId?: number | null;
  type?: TransactionType | null;
  search?: string;
  page?: number;
  size?: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface BillInstallment {
  id: number;
  billId: number;
  number: number;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidAt: string | null;
  transactionId: number | null;
  status: InstallmentStatus;
}

export interface Bill {
  id: number;
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string | null;
  type: BillType;
  description: string;
  totalAmount: number;
  installmentCount: number;
  firstDueDate: string;
  paidAmount: number;
  remainingAmount: number;
  paidInstallments: number;
  pendingInstallments: number;
  nextDueDate: string | null;
  lastDueDate: string | null;
  notes: string | null;
  createdAt: string;
  installments: BillInstallment[];
}

export interface BillPayload {
  accountId: number;
  categoryId?: number | null;
  type: BillType;
  description: string;
  totalAmount: number;
  installmentCount: number;
  firstDueDate: string;
  notes?: string | null;
}

export interface Recurrence {
  id: number;
  accountId: number;
  accountName: string;
  categoryId: number | null;
  categoryName: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate: string | null;
  dayOfMonth: number | null;
  weekday: number | null;
  active: boolean;
  lastGeneratedAt: string | null;
  createdAt: string;
}

export interface RecurrencePayload {
  accountId: number;
  categoryId?: number | null;
  type: TransactionType;
  amount: number;
  description: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string | null;
  dayOfMonth?: number | null;
  weekday?: number | null;
}

export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
  month: string;
  amountLimit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: BudgetStatus;
}

export interface BudgetPayload {
  categoryId: number;
  month: string;
  amountLimit: number;
}

export interface CategoryShare {
  categoryId: number | null;
  name: string;
  color: string | null;
  amount: number;
  percent: number;
  transactions: number;
}

export interface AccountBalance {
  id: number;
  name: string;
  type: AccountType;
  color: string | null;
  balance: number;
  creditLimit: number | null;
  availableCredit: number | null;
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface Dashboard {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  accountTotal: number;
  creditTotal: number;
  creditLimit: number;
  creditAvailable: number;
  pendingBills: number;
  pendingBillsAmount: number;
  overdueBills: number;
  overdueAmount: number;
  expensesByCategory: CategoryShare[];
  incomeByCategory: CategoryShare[];
  accounts: AccountBalance[];
  trend: MonthlyPoint[];
  budgets: Budget[];
  upcomingBills: BillInstallment[];
}

export interface ApiErrorBody {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  fieldErrors?: { field: string; message: string }[];
}
