import { useState } from 'react';
import { User, Globe, Database, Shield, Info, Download, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { loadData, saveData, clearData, exportData, importData } from '../lib/storage';
import { toast } from 'sonner';

const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
];

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const { data } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  const handleSaveProfile = () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    updateUser({ name, email });
    toast.success('Profile updated');
  };

  const handleExportData = () => {
    const d = loadData();
    exportData(d);
    toast.success('Data exported');
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = importData(ev.target?.result as string);
          saveData(imported);
          toast.success('Data imported! Refresh the page.');
          setTimeout(() => window.location.reload(), 1500);
        } catch {
          toast.error('Invalid backup file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearData = () => {
    if (!confirm('This will delete ALL your data. This cannot be undone. Continue?')) return;
    if (!confirm('Are you absolutely sure?')) return;
    clearData();
    toast.success('All data cleared');
    logout();
  };

  const loginTime = user?.loginTime ? new Date(user.loginTime) : null;
  const sessionDuration = loginTime ? Math.floor((Date.now() - loginTime.getTime()) / 60000) : 0;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <User size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Profile Settings</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={handleSaveProfile} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Save Profile
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Globe size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Preferences</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select value={user?.currency ?? 'PKR'} onChange={e => updateUser({ currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Month Start</label>
            <select value={user?.fiscalMonthStart ?? 1} onChange={e => updateUser({ fiscalMonthStart: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Shield size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Session & Security</h3>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Account created</span>
            <span className="text-gray-900">{user?.createdAt ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Last login</span>
            <span className="text-gray-900">{loginTime?.toLocaleDateString() ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Session duration</span>
            <span className="text-gray-900">{sessionDuration} minutes</span>
          </div>
          <div className="pt-2">
            <button onClick={logout} className="text-sm text-red-600 hover:underline font-medium">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Database size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Data Management</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="font-bold text-gray-900 text-base">{data.transactions.length}</p>
              <p>Transactions</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="font-bold text-gray-900 text-base">{data.accounts.length}</p>
              <p>Accounts</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="font-bold text-gray-900 text-base">{data.categories.length}</p>
              <p>Categories</p>
            </div>
          </div>
          <div className="space-y-2">
            <button onClick={handleExportData} className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              <Download size={14} /> Export All Data (JSON)
            </button>
            <button onClick={handleImportData} className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              <Upload size={14} /> Import Data (JSON)
            </button>
            <button onClick={handleClearData} className="w-full flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
              <Trash2 size={14} /> Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Info size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">About</h3>
        </div>
        <div className="p-4 space-y-1 text-sm text-gray-500">
          <p>FinanceFlow v1.0.0</p>
          <p>Personal Finance Management System</p>
          <p>All data stored locally in your browser.</p>
          <p className="text-xs text-gray-400 mt-2">Built with React 19 + Tailwind CSS 4</p>
        </div>
      </div>
    </div>
  );
}
