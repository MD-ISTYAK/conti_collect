import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Edit, Ban, Eye, Loader2 } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';

const DealerManagement = () => {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ total:0 });
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', businessName:'', region:'' });
  const navigate = useNavigate();

  const fetchDealers = async () => {
    try {
      const { data } = await api.get('/admin/users?role=dealer&limit=100');
      setDealers(data.data || []);
      setMeta(data.meta || {});
    } catch(e) { toast.error('Failed to load dealers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDealers(); }, []);

  const resetForm = () => setForm({ name:'', email:'', password:'', phone:'', businessName:'', region:'' });

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/admin/users', { ...form, role: 'dealer' });
      toast.success('Dealer account created'); setShowAdd(false); resetForm(); fetchDealers();
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/users/${editUser._id}`, { name:form.name, phone:form.phone, businessName:form.businessName, region:form.region });
      toast.success('Dealer updated'); setShowEdit(false); fetchDealers();
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this dealer?')) return;
    try { await api.delete(`/admin/users/${id}`); toast.success('Dealer deactivated'); fetchDealers(); }
    catch(e) { toast.error(e.response?.data?.message || 'Cannot deactivate'); }
  };

  const openEdit = (u) => { setEditUser(u); setForm({ name:u.name, email:u.email, password:'', phone:u.phone||'', businessName:u.businessName||'', region:u.region||'' }); setShowEdit(true); };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Dealer Management</h1><p className="text-sm text-gray-500">{meta.total || dealers.length} dealers</p></div>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm"><UserPlus size={16} />Add Dealer</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50/80">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Business</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Region</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? [...Array(3)].map((_,i) => <tr key={i}>{[...Array(6)].map((_,j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>)}</tr>) :
            dealers.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No dealers</td></tr> :
            dealers.map(d => (
              <tr key={d._id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium">{d.name}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{d.businessName || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{d.email}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{d.region || '—'}</td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/complaints?dealerId=${d._id}`)} title="View Complaints" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Eye size={14} /></button>
                    <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Edit size={14} /></button>
                    {d.isActive && <button onClick={() => handleDeactivate(d._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Ban size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Dealer">
        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Full Name" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="Email" type="email" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="Password" type="password" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="Phone" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.businessName} onChange={e => setForm({...form, businessName:e.target.value})} placeholder="Business Name" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.region} onChange={e => setForm({...form, region:e.target.value})} placeholder="Region" className="w-full p-3 border rounded-xl text-sm" />
          <button onClick={handleCreate} disabled={saving||!form.name||!form.email||!form.password} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50">Create Dealer</button>
        </div>
      </Modal>
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Dealer">
        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Name" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="Phone" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.businessName} onChange={e => setForm({...form, businessName:e.target.value})} placeholder="Business" className="w-full p-3 border rounded-xl text-sm" />
          <input value={form.region} onChange={e => setForm({...form, region:e.target.value})} placeholder="Region" className="w-full p-3 border rounded-xl text-sm" />
          <button onClick={handleUpdate} disabled={saving} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50">Update</button>
        </div>
      </Modal>
    </div>
  );
};

export default DealerManagement;
