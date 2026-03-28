import { useState, useEffect } from 'react';
import { Palette, Monitor, Sun, Moon, Globe, Image, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useOrg } from '../contexts/OrgContext';
import type { OrgSettings } from '../types';

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'PKR', label: 'Pakistani Rupee (PKR)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
  { code: 'CNY', label: 'Chinese Yuan (CNY)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'NGN', label: 'Nigerian Naira (NGN)' },
  { code: 'KES', label: 'Kenyan Shilling (KES)' },
  { code: 'ZAR', label: 'South African Rand (ZAR)' },
  { code: 'BRL', label: 'Brazilian Real (BRL)' },
  { code: 'MXN', label: 'Mexican Peso (MXN)' },
];

export default function WhiteLabel() {
  const { org, orgSettings, orgRole, updateSettings } = useOrg();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<OrgSettings>>({
    appName: 'FinanceFlow',
    logoUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#7c3aed',
    accentColor: '#059669',
    mode: 'light',
    currency: 'USD',
  });

  // Sync from context once loaded
  useEffect(() => {
    if (orgSettings) {
      setForm({
        appName: orgSettings.appName || 'FinanceFlow',
        logoUrl: orgSettings.logoUrl || '',
        primaryColor: orgSettings.primaryColor || '#2563eb',
        secondaryColor: orgSettings.secondaryColor || '#7c3aed',
        accentColor: orgSettings.accentColor || '#059669',
        mode: orgSettings.mode || 'light',
        currency: orgSettings.currency || 'USD',
      });
    }
  }, [orgSettings]);

  if (orgRole !== 'owner' && orgRole !== 'admin') {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <Palette size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Permission Denied</p>
          <p className="text-sm text-gray-400">Only owners and admins can configure white-label settings.</p>
        </div>
      </div>
    );
  }

  const handleChange = (key: keyof OrgSettings, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      toast.success('White-label settings saved successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
          <Palette size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">White Label</h1>
          <p className="text-sm text-gray-500">Customize the look and feel for your organization</p>
        </div>
      </div>

      {/* App Identity */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Image size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">App Identity</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">App Name</label>
            <input
              type="text"
              value={form.appName ?? ''}
              onChange={e => handleChange('appName', e.target.value)}
              placeholder="FinanceFlow"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">This name will appear in the browser tab and header.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Logo URL</label>
            <input
              type="url"
              value={form.logoUrl ?? ''}
              onChange={e => handleChange('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.logoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="h-8 w-auto rounded border border-gray-200 object-contain"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
                <span className="text-xs text-gray-400">Logo preview</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Color Scheme */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Color Scheme</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              { key: 'primaryColor', label: 'Primary Color' },
              { key: 'secondaryColor', label: 'Secondary Color' },
              { key: 'accentColor', label: 'Accent Color' },
            ] as { key: keyof OrgSettings; label: string }[]
          ).map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700 block mb-2">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(form[key] as string) ?? '#000000'}
                  onChange={e => handleChange(key, e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={(form[key] as string) ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder="#2563eb"
                  maxLength={7}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Appearance (Light/Dark Mode) */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Appearance</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleChange('mode', 'light')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
              form.mode === 'light'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              form.mode === 'light' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Sun size={18} className={form.mode === 'light' ? 'text-blue-600' : 'text-gray-400'} />
            </div>
            <div className="text-left">
              <p className={`text-sm font-medium ${form.mode === 'light' ? 'text-blue-700' : 'text-gray-700'}`}>
                Light
              </p>
              <p className="text-xs text-gray-400">Default light theme</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleChange('mode', 'dark')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
              form.mode === 'dark'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              form.mode === 'dark' ? 'bg-purple-100' : 'bg-gray-100'
            }`}>
              <Moon size={18} className={form.mode === 'dark' ? 'text-purple-600' : 'text-gray-400'} />
            </div>
            <div className="text-left">
              <p className={`text-sm font-medium ${form.mode === 'dark' ? 'text-purple-700' : 'text-gray-700'}`}>
                Dark
              </p>
              <p className="text-xs text-gray-400">Dark theme for night use</p>
            </div>
          </button>
        </div>
      </section>

      {/* Currency */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Default Currency</h2>
        </div>
        <select
          value={form.currency ?? 'USD'}
          onChange={e => handleChange('currency', e.target.value)}
          className="w-full sm:w-72 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </section>

      {/* Live Preview */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Eye size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Live Preview</h2>
        </div>

        <div
          className="rounded-xl border border-gray-200 overflow-hidden"
          style={{ background: form.mode === 'dark' ? '#1f2937' : '#f9fafb' }}
        >
          {/* Mock header */}
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ background: form.primaryColor ?? '#2563eb' }}
          >
            {form.logoUrl ? (
              <img
                src={form.logoUrl}
                alt="logo"
                className="h-7 w-auto object-contain rounded"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <Palette size={14} className="text-white" />
              </div>
            )}
            <span className="text-white font-bold text-sm">
              {form.appName || 'FinanceFlow'}
            </span>
            <span className="ml-auto text-white/70 text-xs">
              {org?.name ?? 'My Workspace'}
            </span>
          </div>

          {/* Mock content area */}
          <div className="p-4 space-y-3">
            <div
              className="text-xs font-semibold mb-2"
              style={{ color: form.mode === 'dark' ? '#e5e7eb' : '#374151' }}
            >
              Dashboard
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Income', color: form.accentColor ?? '#059669' },
                { label: 'Expenses', color: form.primaryColor ?? '#2563eb' },
                { label: 'Balance', color: form.secondaryColor ?? '#7c3aed' },
              ].map(card => (
                <div
                  key={card.label}
                  className="rounded-lg p-2.5 text-center"
                  style={{ background: card.color + '20', border: `1px solid ${card.color}40` }}
                >
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: card.color }} />
                  <p className="text-xs font-medium" style={{ color: card.color }}>{card.label}</p>
                </div>
              ))}
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: form.mode === 'dark' ? '#374151' : '#e5e7eb' }}
            >
              <div
                className="h-2 rounded-full"
                style={{ width: '60%', background: form.primaryColor ?? '#2563eb' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save size={15} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
