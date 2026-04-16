import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Edit, Ban, Eye, Users, X, Trash2, Loader2, Key, Download, Upload, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';

const ImportModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setResult(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/admin/dealer-master/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data);
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Dealer Master" size="md">
        <div className="space-y-6 py-2">
            {!result ? (
                <>
                    <p className="text-sm text-gray-500">Upload an Excel (.xlsx) or CSV file. The system will use <strong>AG Code</strong> or <strong>AG</strong> to create or update Dealers.</p>
                    <div className={`mt-4 border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${file ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 hover:border-blue-300'}`}>
                        <input type="file" id="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={e => setFile(e.target.files[0])}/>
                        <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                            <Upload className={`w-12 h-12 mb-4 ${file ? 'text-blue-500' : 'text-gray-300'}`} />
                            {file ? (
                              <div className="text-center">
                                <p className="text-lg font-bold text-gray-800">{file.name}</p>
                                <p className="text-sm text-gray-500 mt-1">Ready to import</p>
                              </div>
                            ) : (
                              <div className="text-center">
                                <p className="text-lg font-bold text-gray-800">Select File</p>
                                <p className="text-sm text-gray-500 mt-1">.xlsx, .xls, .csv files supported</p>
                              </div>
                            )}
                        </label>
                    </div>
                    {file && (
                        <button onClick={handleImport} disabled={loading} className="w-full mt-6 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex justify-center items-center gap-2">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Start Import</span>}
                        </button>
                    )}
                </>
            ) : (
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Import Successful</h3>
                    <div className="bg-gray-50 rounded-xl p-4 mt-6 inline-block text-left w-full max-w-sm">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-600 font-medium">New Dealers</span>
                            <span className="text-sm font-bold text-green-600">+{result.data.imported}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-600 font-medium">Updated</span>
                            <span className="text-sm font-bold text-blue-600">{result.data.updated}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600 font-medium">Skipped/Errors</span>
                            <span className="text-sm font-bold text-red-600">{result.data.skipped}</span>
                        </div>
                    </div>
                    <div className="mt-8">
                        <button onClick={onClose} className="px-8 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Close</button>
                    </div>
                </div>
            )}
        </div>
    </Modal>
  );
};

const DealerManagement = () => {
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editDealer, setEditDealer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ total:0 });
  const [form, setForm] = useState({ code:'', company:'', region:'' });
  const navigate = useNavigate();

  const fetchDealers = async () => {
    try {
      const { data } = await api.get('/admin/dealer-master?limit=100');
      setDealers(data.data || []);
      setMeta(data.meta || {});
    } catch(e) { toast.error('Failed to load dealers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDealers(); }, []);

  const resetForm = () => setForm({ code:'', company:'', region:'' });
  const resetSubForm = () => setSubForm({ name:'', email:'', password:'', roleLabel:'' });

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/dealer-master/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Dealer_Master.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch(e) { toast.error('Export failed'); }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post('/admin/dealer-master', form);
      toast.success('Dealer entity created'); setShowAdd(false); resetForm(); fetchDealers();
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCreateSub = async () => {
    if (!subForm.email || !subForm.password) return toast.error('Email and password required');
    setSaving(true);
    try {
      await api.post(`/admin/dealer-master/${targetDealer._id}/users`, subForm);
      toast.success('Staff account added'); resetSubForm(); fetchSubUsers(targetDealer._id);
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/dealer-master/${editDealer._id}`, form);
      toast.success('Dealer updated'); setShowEdit(false); fetchDealers();
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm(`Deactivate this dealer entity?`)) return;
    try { 
      await api.delete(`/admin/dealer-master/${id}`); 
      toast.success('Deactivated successfully'); 
      fetchDealers();
    }
    catch(e) { toast.error('Action failed'); }
  };

  const handleDeactivateSubUser = async (userId) => {
    if (!confirm(`Deactivate this user?`)) return;
    try { 
      await api.delete(`/admin/entity-users/${userId}`); 
      toast.success('User deactivated successfully'); 
      fetchSubUsers(targetDealer._id);
    }
    catch(e) { toast.error('Action failed'); }
  };

  const openEdit = (d) => { 
    setEditDealer(d); 
    setForm({ 
      code: d.code || '',
      company: d.company || '',
      region: d.region || ''
    }); 
    setShowEdit(true); 
  };

  const openSubUsers = (d) => {
    navigate(`/dealer-management/${d._id}`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Dealer Management</h1><p className="text-sm text-gray-500">{meta.total || dealers.length} master entities</p></div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm"><Download size={16} />Export</button>
          <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm"><Upload size={16} />Import</button>
          <button onClick={() => { resetForm(); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm"><UserPlus size={16} />Add Dealer Master</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50/80">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">AG Code</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Company/Shop</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Country / Region</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Complaints</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Users</th>
            <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Manage</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? [...Array(3)].map((_,i) => <tr key={i}>{[...Array(8)].map((_,j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>)}</tr>) :
            dealers.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No dealers</td></tr> :
            dealers.map(d => (
              <tr key={d._id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-bold text-blue-600">{d.code || '—'}</td>
                <td className="px-5 py-3 text-sm font-medium">{d.company || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-600">{d.country ? `${d.country} / ` : ''}{d.region || '—'}</td>
                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="px-5 py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-gray-800">{d.complaintCount || 0}</span>
                    {d.activeComplaints > 0 && <span className="text-[10px] text-blue-600 font-bold">{d.activeComplaints} Active</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-center text-sm font-medium text-gray-600">{d.userCount || 0}</td>
                <td className="px-5 py-3 text-center">
                  <button onClick={() => openSubUsers(d)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                    <Users size={14} />Accounts
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/complaints?dealerEntity=${d._id}`)} title="View Complaints" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Eye size={14} /></button>
                    <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Edit size={14} /></button>
                    {d.isActive && <button onClick={() => handleDeactivate(d._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Ban size={14} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Dealer Entity">
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <p className="text-xs text-blue-700 leading-relaxed font-medium">
              Create a new dealer master record using its unique AG Code. You can assign user accounts afterwards.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-gray-400 px-1">AG Code (Required)</label>
            <input value={form.code} onChange={e => setForm({...form, code:e.target.value})} placeholder="e.g. 6745219" className="w-full p-4 border-2 border-blue-100 rounded-2xl text-lg font-bold focus:border-blue-500 focus:outline-none transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-gray-400 px-1">Company/Shop Name</label>
            <input value={form.company} onChange={e => setForm({...form, company:e.target.value})} placeholder="Company Name" className="w-full p-3 border rounded-xl text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-gray-400 px-1">Region</label>
            <input value={form.region} onChange={e => setForm({...form, region:e.target.value})} placeholder="Region" className="w-full p-3 border rounded-xl text-sm" />
          </div>

          <button onClick={handleCreate} disabled={saving||!form.code} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
            Register Dealer Entity
          </button>
        </div>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Dealer Entity">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-gray-400 px-1">AG Code</label>
          <input value={form.code} onChange={e => setForm({...form, code:e.target.value})} placeholder="Code" className="w-full p-3 border rounded-xl text-sm font-bold bg-gray-50" />
          <label className="text-[10px] font-bold uppercase text-gray-400 px-1">Company</label>
          <input value={form.company} onChange={e => setForm({...form, company:e.target.value})} placeholder="Company Name" className="w-full p-3 border rounded-xl text-sm" />
          <label className="text-[10px] font-bold uppercase text-gray-400 px-1">Region</label>
          <input value={form.region} onChange={e => setForm({...form, region:e.target.value})} placeholder="Region" className="w-full p-3 border rounded-xl text-sm" />
          <button onClick={handleUpdate} disabled={saving} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50">Save Changes</button>
        </div>
      </Modal>

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={fetchDealers} />
    </div>
  );
};

export default DealerManagement;
