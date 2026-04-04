import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, UserPlus, ShieldCheck, CreditCard, MapPin, Image, Clock, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api/axios';
import StatusChip from '../../components/StatusChip';
import Modal from '../../components/Modal';
import { formatDate, formatDateTime, formatCurrency, productTypeLabels, reasonLabels } from '../../utils/formatters';
import { toast } from 'react-toastify';

const ComplaintDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cfaList, setCfaList] = useState([]);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showAssignCFA, setShowAssignCFA] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedCFA, setSelectedCFA] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundRef, setRefundRef] = useState('');

  const fetchComplaint = async () => {
    try {
      const { data } = await api.get(`/complaints/${id}`);
      setComplaint(data.data);
      if (['PICKED_UP','RECEIVED_AT_CFA','VERIFIED','REFUND_PROCESSED'].includes(data.data.status)) {
        try { const r = await api.get(`/complaints/${id}/proof`); setProof(r.data.data); } catch(e){}
      }
    } catch(e) { toast.error('Failed to load complaint'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComplaint(); }, [id]);

  const fetchCFAs = async () => {
    try { const { data } = await api.get('/admin/users/cfa'); setCfaList(data.data || []); } catch(e){}
  };

  const handleAction = async (endpoint, body, msg) => {
    setActionLoading(true);
    try {
      await api.post(endpoint, body);
      toast.success(msg);
      setShowApprove(false); setShowReject(false); setShowAssignCFA(false); setShowVerify(false); setShowRefund(false);
      fetchComplaint();
    } catch(e) { toast.error(e.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  if (!complaint) return <div className="text-center py-12 text-gray-400">Complaint not found</div>;

  const c = complaint;
  const actions = [];
  if (c.status === 'CREATED') {
    actions.push({ label: 'Approve', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-700', onClick: () => setShowApprove(true) });
    actions.push({ label: 'Reject', icon: X, color: 'bg-red-500 hover:bg-red-600', onClick: () => setShowReject(true) });
  }
  if (c.status === 'APPROVED') actions.push({ label: 'Assign CFA', icon: UserPlus, color: 'bg-blue-600 hover:bg-blue-700', onClick: () => { fetchCFAs(); setShowAssignCFA(true); } });
  if (c.status === 'RECEIVED_AT_CFA') actions.push({ label: 'Verify', icon: ShieldCheck, color: 'bg-amber-600 hover:bg-amber-700', onClick: () => setShowVerify(true) });
  if (c.status === 'VERIFIED') actions.push({ label: 'Process Refund', icon: CreditCard, color: 'bg-emerald-600 hover:bg-emerald-700', onClick: () => setShowRefund(true) });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/complaints')} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50"><ArrowLeft size={18} /></button>
          <div><h1 className="text-2xl font-bold text-gray-900">{c.complaintId}</h1><StatusChip status={c.status} size="md" /></div>
        </div>
        <div className="flex gap-2">
          {actions.map((a, i) => <button key={i} onClick={a.onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium ${a.color} shadow-sm`}><a.icon size={16} />{a.label}</button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Product Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400 uppercase">Product Type</p><p className="font-medium mt-0.5">{productTypeLabels[c.productType]}</p></div>
              <div><p className="text-xs text-gray-400 uppercase">Product Name</p><p className="font-medium mt-0.5">{c.productName}</p></div>
              <div><p className="text-xs text-gray-400 uppercase">Quantity</p><p className="font-medium mt-0.5">{c.quantity}</p></div>
              <div><p className="text-xs text-gray-400 uppercase">Reason</p><p className="font-medium mt-0.5">{reasonLabels[c.reason]}</p></div>
              {c.description && <div className="col-span-2"><p className="text-xs text-gray-400 uppercase">Description</p><p className="text-sm text-gray-600 mt-0.5">{c.description}</p></div>}
            </div>
          </div>

          {c.images?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Image size={18} />Product Images</h3>
              <div className="grid grid-cols-3 gap-3">{c.images.map((img,i) => <img key={i} src={img} alt="" className="w-full h-40 object-cover rounded-xl border" />)}</div>
            </div>
          )}

          {proof && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Pickup Proof</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><p className="text-xs text-gray-400">CFA Agent</p><p className="font-medium">{proof.pickedBy?.name}</p></div>
                <div><p className="text-xs text-gray-400">Pickup Time</p><p className="font-medium">{formatDateTime(proof.pickupTime)}</p></div>
                <div><p className="text-xs text-gray-400">GPS</p><p className="font-medium flex items-center gap-1"><MapPin size={14} />{proof.gpsLocation?.address || `${proof.gpsLocation?.lat?.toFixed(4)},${proof.gpsLocation?.lng?.toFixed(4)}`}</p></div>
              </div>
              {proof.signatureImage && <div><p className="text-xs text-gray-400 mb-1">Dealer Signature</p><img src={proof.signatureImage} alt="Sig" className="h-20 bg-gray-50 rounded-lg border p-2" /></div>}
            </div>
          )}

          {c.status === 'REFUND_PROCESSED' && (
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
              <h3 className="font-semibold text-emerald-800 mb-3">💰 Refund Processed</h3>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-xs text-emerald-600">Amount</p><p className="text-xl font-bold text-emerald-800">{formatCurrency(c.refundAmount)}</p></div>
                <div><p className="text-xs text-emerald-600">Reference</p><p className="font-medium text-emerald-800">{c.refundReference}</p></div>
                <div><p className="text-xs text-emerald-600">Date</p><p className="font-medium text-emerald-800">{formatDate(c.refundDate)}</p></div>
              </div>
            </div>
          )}
          {c.status === 'REJECTED' && <div className="bg-red-50 rounded-2xl p-6 border border-red-200"><h3 className="font-semibold text-red-800 mb-2">❌ Rejected</h3><p className="text-red-700">{c.rejectionReason}</p></div>}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Dealer Info</h3>
            <div className="space-y-2"><div><p className="text-xs text-gray-400">Name</p><p className="text-sm font-medium">{c.dealerId?.name}</p></div><div><p className="text-xs text-gray-400">Business</p><p className="text-sm">{c.dealerId?.businessName||'—'}</p></div><div><p className="text-xs text-gray-400">Email</p><p className="text-sm text-blue-600">{c.dealerId?.email}</p></div><div><p className="text-xs text-gray-400">Region</p><p className="text-sm">{c.dealerId?.region||'—'}</p></div></div>
          </div>
          {c.qrCode && <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center"><h3 className="font-semibold mb-3">QR Code</h3><QRCodeSVG value={c.complaintId} size={160} className="mx-auto" fgColor="#1E3A5F" /><p className="text-xs text-gray-400 mt-2">{c.complaintId}</p></div>}
          {c.cfaId && <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"><h3 className="font-semibold mb-3">CFA Assignment</h3><div className="space-y-2"><div><p className="text-xs text-gray-400">Agent</p><p className="text-sm font-medium">{c.cfaId?.name}</p></div>{c.estimatedPickupDate && <div><p className="text-xs text-gray-400">Est. Pickup</p><p className="text-sm">{formatDate(c.estimatedPickupDate)}</p></div>}</div></div>}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock size={16}/>Timeline</h3>
            <div>{c.timeline?.map((e,i) => <div key={i} className="flex gap-3"><div className="flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />{i<c.timeline.length-1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}</div><div className="pb-4"><StatusChip status={e.status} size="xs" /><p className="text-xs text-gray-500 mt-1">{formatDateTime(e.timestamp)}</p>{e.note && <p className="text-xs text-gray-400 mt-0.5">{e.note}</p>}</div></div>)}</div>
          </div>
        </div>
      </div>

      <Modal isOpen={showApprove} onClose={() => setShowApprove(false)} title="Approve Complaint">
        <div className="space-y-4"><p className="text-sm text-gray-600">Approve <strong>{c.complaintId}</strong>?</p><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="w-full p-3 border rounded-xl text-sm h-20 focus:outline-none focus:border-blue-500" /><button onClick={() => handleAction(`/admin/complaints/${c._id}/approve`,{notes},'Approved!')} disabled={actionLoading} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">{actionLoading ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}Confirm</button></div>
      </Modal>
      <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Reject Complaint">
        <div className="space-y-4"><textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason (min 10 chars)..." className="w-full p-3 border rounded-xl text-sm h-24 focus:outline-none focus:border-red-500" /><button onClick={() => handleAction(`/admin/complaints/${c._id}/reject`,{rejectionReason},'Rejected')} disabled={actionLoading || rejectionReason.length<10} className="w-full py-2.5 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">{actionLoading ? <Loader2 size={16} className="animate-spin"/> : <X size={16}/>}Reject</button></div>
      </Modal>
      <Modal isOpen={showAssignCFA} onClose={() => setShowAssignCFA(false)} title="Assign CFA">
        <div className="space-y-4"><select value={selectedCFA} onChange={e => setSelectedCFA(e.target.value)} className="w-full p-3 border rounded-xl text-sm"><option value="">Select CFA</option>{cfaList.map(c => <option key={c._id} value={c._id}>{c.name} — {c.activeComplaints||0} active</option>)}</select><input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} min={new Date().toISOString().slice(0,10)} className="w-full p-3 border rounded-xl text-sm" /><button onClick={() => handleAction(`/admin/complaints/${c._id}/assign-cfa`,{cfaId:selectedCFA,estimatedPickupDate:pickupDate},'CFA assigned!')} disabled={actionLoading || !selectedCFA || !pickupDate} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">{actionLoading ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16}/>}Assign</button></div>
      </Modal>
      <Modal isOpen={showVerify} onClose={() => setShowVerify(false)} title="Verify Complaint">
        <div className="space-y-4"><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Admin notes..." className="w-full p-3 border rounded-xl text-sm h-20" /><button onClick={() => handleAction(`/admin/complaints/${c._id}/verify`,{adminNotes:notes},'Verified!')} disabled={actionLoading} className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">{actionLoading ? <Loader2 size={16} className="animate-spin"/> : <ShieldCheck size={16}/>}Verify</button></div>
      </Modal>
      <Modal isOpen={showRefund} onClose={() => setShowRefund(false)} title="Process Refund">
        <div className="space-y-4"><input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="Amount (₹)" className="w-full p-3 border rounded-xl text-sm" /><input type="text" value={refundRef} onChange={e => setRefundRef(e.target.value)} placeholder="Reference (UTR/Bank)" className="w-full p-3 border rounded-xl text-sm" /><button onClick={() => handleAction(`/admin/complaints/${c._id}/refund`,{refundAmount:parseFloat(refundAmount),refundReference:refundRef},'Refund processed!')} disabled={actionLoading || !refundAmount || !refundRef} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">{actionLoading ? <Loader2 size={16} className="animate-spin"/> : <CreditCard size={16}/>}Process</button></div>
      </Modal>
    </div>
  );
};

export default ComplaintDetail;
