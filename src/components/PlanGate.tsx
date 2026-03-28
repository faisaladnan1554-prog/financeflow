import { Link } from 'wouter';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PlanGateProps {
  requiredPlan: 'basic' | 'pro' | 'enterprise';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PlanGate({ requiredPlan, children, fallback }: PlanGateProps) {
  const { user } = useAuth();
  const planOrder = ['free', 'basic', 'pro', 'enterprise'];
  const userPlanIndex = planOrder.indexOf(user?.plan ?? 'free');
  const requiredPlanIndex = planOrder.indexOf(requiredPlan);

  if (userPlanIndex >= requiredPlanIndex) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
        <Lock size={24} className="text-purple-600" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">Upgrade Required</h3>
      <p className="text-sm text-gray-500 text-center mb-4">
        This feature requires the <strong className="capitalize">{requiredPlan}</strong> plan or higher.
      </p>
      <Link to="/pricing">
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
          View Plans
        </button>
      </Link>
    </div>
  );
}
