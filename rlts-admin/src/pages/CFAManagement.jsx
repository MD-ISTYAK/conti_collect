import { useState, useEffect } from 'react';
import { UserPlus, Edit, Ban, MapPin, Loader2 } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';

const CFAManagement = () => {
  const [cfas, setCfas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', businessName:'', region:'' });

  const fetchCFAs = async () => {
    try { const { data } = await api.get('/admin/users/cfa'); setCfas(data.data || []); }
    catch(e) { toast.error('Failed to load CFA agents'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCFAs(); }, []);

  const resetForm = () => setForm({ name:'', email:'', password:'', phone:'', businessName:'', region:'' });

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/admin/users', { ...form, role: 'cfa' });
      toast.success('CFA account created');
      setShowAdd(false); resetForm(); fetchCFAs();
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/users/${editUser._id}`, { name: form.name, phone: form.phone, businessName: form.businessName, region: form.region });
      toast.success('CFA updated'); setShowEdit(false); fetchCFAs();
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this CFA?')) return;
    try { await api.delete(`/admin/users/${id}`); toast.success('CFA deactivated'); fetchCFAs(); }
    catch(e) { toast.error(e.response?.data?.message || 'Cannot deactivate'); }
  };

  const openEdit = (u) => { setEditUser(u); setForm({ name:u.name, email:u.email, password:'', phone:u.phone||'', businessName:u.businessName||'', region:u.region||'' }); setShowEdit(true); };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">CFA Management</h1><p className="text-sm text-gray-500">{cfas.length} CFA agents</p></div>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm"><UserPlus size={16} />Add CFA</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50/80">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Region</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Active</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Complaints</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? [...Array(3)].map((_,i) => <tr key={i}>{[...Array(7)].map((_,j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>)}</tr>) :
            cfas.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No CFA agents</td></tr> :
            cfas.map(c => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-5 py-3"><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-gray-400">{c.businessName}</p></td>
                <td className="px-5 py-3 text-sm text-gray-600">{c.email}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{c.phone || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600"><span className="flex items-center gap-1"><MapPin size={12} />{c.region || '—'}</span></td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="px-5 py-3 text-sm font-medium text-blue-600">{c.activeComplaints || 0}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Edit size={14} /></button>
                    {c.isActive && <button onClick={() => handleDeactivate(c._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Ban size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add CFA Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add CFA Agent">
        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Full Name" className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="Email" type="email" className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="Password" type="password" className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="Phone (10 digits)" className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input value={form.businessName} onChange={e => setForm({...form, businessName:e.target.value})} placeholder="Company Name" className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <input value={form.region} onChange={e => setForm({...form, region:e.target.value})} placeholder="Region" className="w-full p-3 border rounded-xl text-sm focus:outline-none focus:border-blue-500" />
          <button onClick={handleCreate} disabled={saving||!form.name||!form.email||!form.password} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16}/>}Create CFA</button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit CFA Agent">
        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Name" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="Phone" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.businessName} onChange={e => setForm({...form, businessName:e.target.value})} placeholder="Company" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.region} onChange={e => setForm({...form, region:e.target.value})} placeholder="Region" className="w-full p-3 border rounded-xl text-sm" />
          <button onClick={handleUpdate} disabled={saving} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50">Update</button>
        </div>
      </Modal>
    </div>
  );
};

export default CFAManagement;
