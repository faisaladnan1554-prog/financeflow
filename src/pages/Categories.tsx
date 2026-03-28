import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Modal } from '../components/ui/Modal';
import type { Category } from '../types';
import { toast } from 'sonner';

const ICONS = ['💼','💻','🏢','📈','🎁','💰','🍔','🚗','🏠','💡','🏥','📚','🎬','🛍️','✈️','📦','🍕','☕','🎮','🏋️','💊','🎓','🎵','🌊','🐾','🌿','🎨','🔧','🏪','🎪'];
const COLORS = ['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EC4899','#EF4444','#06B6D4','#84CC16','#F97316','#6366F1','#14B8A6','#A855F7','#F43F5E','#0EA5E9','#EAB308','#6B7280'];

interface CatForm { name: string; type: 'income' | 'expense'; icon: string; color: string; }
const emptyForm: CatForm = { name: '', type: 'expense', icon: '📦', color: '#6B7280' };

export default function Categories() {
  const { data, addCategory, updateCategory, deleteCategory } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CatForm>(emptyForm);

  const incomeCategories = data.categories.filter(c => c.type === 'income');
  const expenseCategories = data.categories.filter(c => c.type === 'expense');

  const openAdd = (type: 'income' | 'expense') => {
    setEditing(null);
    setForm({ ...emptyForm, type });
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, type: c.type, icon: c.icon, color: c.color });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (editing) {
      updateCategory(editing.id, form);
      toast.success('Category updated');
    } else {
      addCategory(form);
      toast.success('Category added');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string, isDefault: boolean) => {
    if (isDefault) { toast.error('Cannot delete default categories'); return; }
    if (confirm('Delete this category?')) {
      deleteCategory(id);
      toast.success('Category deleted');
    }
  };

  const CategoryGrid = ({ cats, type }: { cats: Category[]; type: 'income' | 'expense' }) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
          {type === 'income' ? 'Income' : 'Expense'} Categories ({cats.length})
        </h3>
        <button onClick={() => openAdd(type)}
          className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
          <Plus size={13} /> Add
        </button>
      </div>
      {cats.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No {type} categories</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {cats.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between group hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: c.color + '20' }}>
                  {c.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  {c.isDefault && <span className="text-xs text-gray-400">Default</span>}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                  <Edit2 size={12} />
                </button>
                {!c.isDefault && (
                  <button onClick={() => handleDelete(c.id, c.isDefault)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
      <CategoryGrid cats={expenseCategories} type="expense" />
      <CategoryGrid cats={incomeCategories} type="income" />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <div className="space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${form.type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Groceries"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border text-xl transition-colors ${form.icon === ic ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Preview:</p>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: form.color + '20' }}>
                {form.icon}
              </div>
              <span className="text-sm font-medium text-gray-900">{form.name || 'Category Name'}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              {editing ? 'Update' : 'Add'} Category
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
