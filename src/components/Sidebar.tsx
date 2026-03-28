import { Link, useRoute } from 'wouter';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Tag, Target,
  CreditCard, TrendingUp, BarChart2, Users2,
  Settings, HandCoins, Receipt, X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/categories', label: 'Categories', icon: Tag },
  { path: '/budget', label: 'Budget & Goals', icon: Target },
  { path: '/loans', label: 'Loans', icon: HandCoins },
  { path: '/credit-cards', label: 'Credit Cards', icon: CreditCard },
  { path: '/cash-flow', label: 'Cash Flow', icon: TrendingUp },
  { path: '/reports', label: 'Reports', icon: BarChart2 },
  { path: '/recurring-bills', label: 'Recurring Bills', icon: Receipt },
  { path: '/split-expenses', label: 'Split Expenses', icon: Users2 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const [active] = useRoute(item.path);
  const Icon = item.icon;
  return (
    <Link href={item.path} onClick={onClick}>
      <div className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}>
        <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400'} />
        <span>{item.label}</span>
      </div>
    </Link>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30 flex flex-col transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">FinanceFlow</span>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-gray-600 p-1"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} item={item} onClick={onClose} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">FinanceFlow v1.0</p>
        </div>
      </aside>
    </>
  );
}
