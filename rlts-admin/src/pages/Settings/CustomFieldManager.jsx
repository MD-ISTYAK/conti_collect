import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, GripVertical, CheckCircle2, ChevronRight, Settings } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import Modal from '../../components/Modal';

const CustomFieldManager = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [formData, setFormData] = useState({ label: '', type: 'text', key: '' });

  const fetchFields = async () => {
    try {
      const { data } = await api.get('/admin/custom-fields');
      setFields(data.data || []);
    } catch (e) {
      toast.error('Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.label) return;

    try {
      if (editingField) {
        await api.patch(`/admin/custom-fields/${editingField._id}`, formData);
        toast.success('Field updated');
      } else {
        await api.post('/admin/custom-fields', formData);
        toast.success('Field created');
      }
      setIsModalOpen(false);
      setEditingField(null);
      setFormData({ label: '', type: 'text', key: '' });
      fetchFields();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed');
    }
  };

  const deleteField = async (id) => {
    if (!confirm('Are you sure? This will remove the column from the view, but data remains in the database.')) return;
    try {
      await api.delete(`/admin/custom-fields/${id}`);
      toast.success('Field deleted');
      fetchFields();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const openEdit = (field) => {
    setEditingField(field);
    setFormData({ label: field.label, type: field.type, key: field.key });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Field Management</h1>
          <p className="text-gray-500 text-sm mt-0.5 font-medium">Define your custom Excel columns for MIS imports</p>
        </div>
        <button 
          onClick={() => { setEditingField(null); setFormData({ label: '', type: 'text', key: '' }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} /> Define New Field
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Help Panel */}
        <div className="lg:col-span-1 space-y-4">
             <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center mb-4 shadow-md">
                    <Settings size={20} />
                </div>
                <h3 className="text-lg font-bold text-blue-900">How it works</h3>
                <p className="text-sm text-blue-700/80 mt-2 leading-relaxed">Define the column headers found in your MIS Excel reports. For example, if your excel has a column named <strong className="text-blue-900">"ASM Name"</strong>, create a field here with that exact label.</p>
                <div className="mt-6 space-y-3">
                    <div className="flex gap-3 items-start">
                        <CheckCircle2 size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                        <p className="text-xs text-blue-800 font-medium">Dynamic Mapping during MIS imports</p>
                    </div>
                    <div className="flex gap-3 items-start">
                        <CheckCircle2 size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                        <p className="text-xs text-blue-800 font-medium">Excel-like resizing enabled globally</p>
                    </div>
                    <div className="flex gap-3 items-start">
                        <CheckCircle2 size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                        <p className="text-xs text-blue-800 font-medium">Role-awareness and persistence</p>
                    </div>
                </div>
             </div>
        </div>

        {/* Fields List */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Schema Columns</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{fields.length} Custom Fields</span>
                </div>
                
                {loading ? (
                    <div className="p-20 text-center"><div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto"/></div>
                ) : fields.length === 0 ? (
                    <div className="p-20 text-center border-dashed border-2 border-gray-100 m-4 rounded-xl">
                        <p className="text-gray-400 font-medium italic">No custom fields defined yet. Start by defining your first column like "ASM" or "Region".</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {fields.map(field => (
                            <div key={field._id} className="group flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-8 bg-blue-500 rounded-full opacity-20 group-hover:opacity-100 transition-opacity" />
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{field.label}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">{field.type}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">Mapped to: {field.key}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    <button 
                                        onClick={() => openEdit(field)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button 
                                        onClick={() => deleteField(field._id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingField ? 'Edit Field Definition' : 'Register New Column'} size="md">
            <form onSubmit={handleSubmit} className="space-y-6 py-2">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Column Label (Excel Header)</label>
                    <input 
                        type="text" 
                        required
                        autoFocus
                        value={formData.label}
                        onChange={e => setFormData({...formData, label: e.target.value})}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        placeholder="e.g. Regional Manager"
                    />
                    <p className="text-[10px] text-gray-400 ml-1 italic font-medium">Must match exactly with the header in your MIS Excel.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Data Type</label>
                        <select 
                            value={formData.type}
                            onChange={e => setFormData({...formData, type: e.target.value})}
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:border-blue-500 focus:outline-none transition-all font-bold text-gray-700 bg-gray-50/30"
                        >
                            <option value="text">Text / Label</option>
                            <option value="number">Numeric / Count</option>
                            <option value="currency">Currency / Payout</option>
                            <option value="date">Date / Timestamp</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Internal Key</label>
                        <input 
                            type="text" 
                            disabled={!!editingField}
                            value={formData.key || formData.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm disabled:bg-gray-100 disabled:text-gray-400 font-mono"
                            placeholder="auto-generated"
                        />
                    </div>
                </div>

                <div className="pt-6 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">Cancel</button>
                    <button type="submit" className="flex-2 px-10 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95">
                        {editingField ? 'Update Column' : 'Register Column'}
                    </button>
                </div>
            </form>
      </Modal>
    </div>
  );
};

export default CustomFieldManager;
