import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { Spinner } from '@/components/ui/states';
import { useAuth } from '@/contexts/auth-context';
import { LoginPage } from '@/pages/login-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { TransactionsPage } from '@/pages/transactions-page';
import { AccountsPage } from '@/pages/accounts-page';
import { CategoriesPage } from '@/pages/categories-page';
import { BillsPage } from '@/pages/bills-page';
import { RecurrencesPage } from '@/pages/recurrences-page';
import { BudgetsPage } from '@/pages/budgets-page';
import { SettingsPage } from '@/pages/settings-page';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Carregando suas financas..." />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();

  if (initializing) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/movimentacoes" element={<TransactionsPage />} />
        <Route path="/contas" element={<AccountsPage />} />
        <Route path="/contas-a-pagar" element={<BillsPage />} />
        <Route path="/orcamentos" element={<BudgetsPage />} />
        <Route path="/recorrencias" element={<RecurrencesPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
