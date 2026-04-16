import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Key, Loader2, Trash2, 
  MapPin, Store, CheckCircle2, Ban, Plus, 
  FileText, Activity, CheckSquare, Eye
} from 'lucide-react';
import api from '../api/axios';
import Modal from '../components/Modal';
import { toast } from 'react-toastify';

const DealerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dealer, setDealer] = useState(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ complaintCount: 0, activeComplaints: 0, completedComplaints: 0 });
  const [saving, setSaving] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [subForm, setSubForm] = useState({ name: '', email: '', password: '', roleLabel: '' });

  const fetchData = async () => {
    try {
      const { data } = await api.get(`/admin/dealer-master/${id}`);
      setDealer(data.data.dealer);
      setUsers(data.data.users || []);
      setStats(data.data.stats || { complaintCount: 0, activeComplaints: 0, completedComplaints: 0 });
    } catch (e) {
      toast.error('Failed to load Dealer details');
      navigate('/dealer-management');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCreateUser = async () => {
    if (!subForm.email || !subForm.password) return toast.error('Email and password required');
    setSaving(true);
    try {
      await api.post(`/admin/dealer-master/${id}/users`, subForm);
      toast.success('Dealer staff account added');
      setSubForm({ name: '', email: '', password: '', roleLabel: '' });
      setShowAddUser(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!confirm('Deactivate this dealer account?')) return;
    try {
      await api.delete(`/admin/entity-users/${userId}`);
      toast.success('User deactivated');
      fetchData();
    } catch (e) {
      toast.error('Action failed');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dealer-management')} 
            className="p-2 rounded-xl border border-gray-200 hover:bg-white hover:shadow-sm transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{dealer.company || 'Dealer Detail'}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${dealer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {dealer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Store size={14} /> AG Code: <span className="font-bold text-blue-600">{dealer.code}</span>
            </p>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/complaints?search=${dealer.code}`)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
        >
          <Eye size={16} className="text-blue-500" /> View All Complaints
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* General Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-blue-500" /> Shop Location
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Region / Area</p>
                <p className="text-gray-700 font-medium mt-1">{dealer.region || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Country</p>
                <p className="text-gray-700 font-medium mt-1">{dealer.country || 'India'}</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 px-1">Complaint Performance</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{stats.complaintCount}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Total Raised</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-indigo-600">{stats.activeComplaints}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tight text-indigo-600/60">Currently Active</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-green-600">{stats.completedComplaints}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tight text-green-600/60">Closed Cases</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: User Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Dealer Accounts</h3>
                <p className="text-xs text-gray-500 mt-0.5">Mobile app access for this dealer shop</p>
              </div>
              <button 
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              >
                <Plus size={16} /> Add User
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="text-gray-300" size={32} />
                  </div>
                  <p className="text-gray-400 text-sm italic">No user accounts created for this shop</p>
                </div>
              ) : (
                users.map(user => (
                  <div key={user._id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                        {user.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email} • <span className="font-medium text-indigo-600">{user.roleLabel || 'Shop Owner'}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {user.isActive && (
                        <button 
                          onClick={() => handleDeactivateUser(user._id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
             <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-2">Dealer Verification</h4>
             <p className="text-sm text-indigo-800 leading-relaxed font-medium">
               This dealer shop is <span className="font-bold underline">{dealer.isActive ? 'Active' : 'Suspended'}</span>. 
               {dealer.isActive 
                 ? " They can raise fresh complaints and track existing ones through the mobile app." 
                 : " Access is restricted. Reactivate the entity to allow mobile login for all staff."}
             </p>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)} title="Create Dealer App User">
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Full Name</label>
              <input 
                value={subForm.name} 
                onChange={e => setSubForm({...subForm, name: e.target.value})} 
                placeholder="Owner/Staff Name" 
                className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Mobile/Email</label>
              <input 
                value={subForm.email} 
                onChange={e => setSubForm({...subForm, email: e.target.value})} 
                placeholder="Login Identifier" 
                className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Password</label>
            <div className="relative">
              <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                value={subForm.password} 
                onChange={e => setSubForm({...subForm, password: e.target.value})} 
                placeholder="••••••••" 
                type="password" 
                className="w-full pl-11 p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Designation</label>
            <input 
              value={subForm.roleLabel} 
              onChange={e => setSubForm({...subForm, roleLabel: e.target.value})} 
              placeholder="e.g. Counter Head" 
              className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={() => setShowAddUser(false)}
              className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateUser} 
              disabled={saving} 
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {saving ? 'Registering...' : 'Create Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DealerDetail;
