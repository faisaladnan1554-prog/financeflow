import { useState, lazy, Suspense } from 'react';
import { Route, Switch, useLocation, Redirect } from 'wouter';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Categories = lazy(() => import('./pages/Categories'));
const Budget = lazy(() => import('./pages/Budget'));
const Loans = lazy(() => import('./pages/Loans'));
const CreditCards = lazy(() => import('./pages/CreditCards'));
const CashFlow = lazy(() => import('./pages/CashFlow'));
const Reports = lazy(() => import('./pages/Reports'));
const RecurringBills = lazy(() => import('./pages/RecurringBills'));
const SplitExpenses = lazy(() => import('./pages/SplitExpenses'));
const Settings = lazy(() => import('./pages/Settings'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const AIStrategy = lazy(() => import('./pages/AIStrategy'));
const Pricing = lazy(() => import('./pages/Pricing'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/accounts': 'Accounts',
  '/transactions': 'Transactions',
  '/categories': 'Categories',
  '/budget': 'Budget & Goals',
  '/loans': 'Loans',
  '/credit-cards': 'Credit Cards',
  '/cash-flow': 'Cash Flow',
  '/reports': 'Reports',
  '/recurring-bills': 'Recurring Bills',
  '/split-expenses': 'Split Expenses',
  '/users': 'User Management',
  '/ai-strategy': 'AI Financial Advisor',
  '/pricing': 'Pricing & Plans',
  '/settings': 'Settings',
};

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppLayout() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Login />
      </Suspense>
    );
  }

  const title = PAGE_TITLES[location] ?? 'FinanceFlow';

  return (
    <AppProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} title={title} />
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<LoadingSpinner />}>
              <Switch>
                <Route path="/" component={() => <Redirect to="/dashboard" />} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/accounts" component={Accounts} />
                <Route path="/transactions" component={Transactions} />
                <Route path="/categories" component={Categories} />
                <Route path="/budget" component={Budget} />
                <Route path="/loans" component={Loans} />
                <Route path="/credit-cards" component={CreditCards} />
                <Route path="/cash-flow" component={CashFlow} />
                <Route path="/reports" component={Reports} />
                <Route path="/recurring-bills" component={RecurringBills} />
                <Route path="/split-expenses" component={SplitExpenses} />
                <Route path="/users" component={UserManagement} />
                <Route path="/ai-strategy" component={AIStrategy} />
                <Route path="/pricing" component={Pricing} />
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </main>
        </div>
      </div>
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}
