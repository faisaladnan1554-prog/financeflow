import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Eye, EyeOff, Shield, Mail, User as UserIcon } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import { toast } from 'sonner';
import { Modal } from '../components/ui/Modal';
import { getInitials } from '../lib/utils';

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR'];

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  currency: string;
}

const EMPTY_FORM: UserFormData = { name: '', email: '', password: '', currency: 'PKR' };

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const openAdd = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowPass(false);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: '', currency: u.currency ?? 'PKR' });
    setShowPass(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    if (!editingUser && !form.password) { toast.error('Password is required for new user'); return; }
    if (form.password && form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setSaving(true);
    try {
      if (editingUser) {
        const payload: Record<string, string> = { name: form.name, email: form.email, currency: form.currency };
        if (form.password) payload.password = form.password;
        const updated = await adminApi.updateUser(editingUser.id, payload);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? updated : u));
        toast.success('User updated successfully');
      } else {
        const created = await adminApi.createUser({ name: form.name, email: form.email, password: form.password, currency: form.currency });
        setUsers(prev => [...prev, created]);
        toast.success('User created successfully');
      }
      setShowModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(deleteConfirm.id);
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
      toast.success(`User "${deleteConfirm.name}" deleted along with all their data`);
      setDeleteConfirm(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-xs text-gray-500">Total Users</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Shield size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">1</p>
            <p className="text-xs text-gray-500">Active Session</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
            <UserIcon size={20} className="text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[120px]">{currentUser?.name}</p>
            <p className="text-xs text-gray-500">Logged in as</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Users size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">All Users</h3>
        </div>

        {users.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${avatarColor(u.name)}`}>
                  {getInitials(u.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                    {u.id === currentUser?.id && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Mail size={11} className="text-gray-400 flex-shrink-0" />
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>

                {/* Currency badge */}
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium hidden sm:block">
                  {u.currency ?? 'PKR'}
                </span>

                {/* Joined date */}
                <span className="text-xs text-gray-400 hidden md:block flex-shrink-0">
                  {u.createdAt ?? '—'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(u)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit user"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(u)}
                    disabled={u.id === currentUser?.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={u.id === currentUser?.id ? "Can't delete yourself" : "Delete user"}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit User' : 'Add New User'}
        size="sm"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="john@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {editingUser && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder={editingUser ? '••••••••' : 'Min. 6 characters'}
                className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : editingUser ? 'Update User' : 'Create User'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${avatarColor(deleteConfirm?.name ?? '')}`}>
              {getInitials(deleteConfirm?.name ?? '')}
            </div>
            <div>
              <p className="font-medium text-gray-900">{deleteConfirm?.name}</p>
              <p className="text-xs text-gray-500">{deleteConfirm?.email}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            This will permanently delete this user and <strong>all their data</strong> — transactions, accounts, budgets, loans, etc.
          </p>
          <p className="text-sm font-medium text-red-600">This action cannot be undone.</p>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Yes, Delete User'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
