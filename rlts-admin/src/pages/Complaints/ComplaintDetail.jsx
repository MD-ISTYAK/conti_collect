import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, UserPlus, ShieldCheck, CreditCard, MapPin, Image, Clock, Loader2, Calendar, ChevronDown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api/axios';
import StatusChip from '../../components/StatusChip';
import Modal from '../../components/Modal';
import { formatDate, formatDateTime, formatCurrency, productTypeLabels, reasonLabels } from '../../utils/formatters';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const CustomSelect = ({ value, onChange, options, className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({ left: rect.left, top: rect.bottom, width: rect.width });
    }
  }, [open]);

  useEffect(() => {
    const clickOut = (e) => { 
      if(ref.current && !ref.current.contains(e.target) && !e.target.closest?.('.custom-select-portal')) setOpen(false); 
    };
    const scrollOut = (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('custom-select-portal')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', clickOut);
    window.addEventListener('scroll', scrollOut, true);
    return () => {
      document.removeEventListener('mousedown', clickOut);
      window.removeEventListener('scroll', scrollOut, true);
    };
  }, []);

  return (
    <div className="relative flex-1" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className={`${className} flex justify-between items-center w-full`}>
        <span className="flex-1 text-center">{value}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {open && coords && createPortal(
        <div style={{ position: 'fixed', top: coords.top + 4, left: coords.left, width: coords.width }} className="custom-select-portal max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-2xl z-[999999] py-1">
          {options.map(o => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); }} className={`py-2 px-1 text-center text-sm cursor-pointer hover:bg-indigo-50 transition-colors ${value === o ? 'bg-indigo-100 font-bold text-indigo-700' : 'text-gray-700 font-medium'}`}>
              {o}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

const CustomDateInput = ({ value, onChange, minDate }) => {
  const displayVal = value ? format(new Date(value), 'M/d/yyyy') : 'M/d/yyyy';
  return (
    <div className="relative w-full rounded-xl border-2 border-gray-200 bg-gray-50 focus-within:border-indigo-500 transition-all">
      <input type="date" onClick={(e) => e.target.showPicker?.()} value={value} onChange={e => onChange(e.target.value)} min={minDate} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
      <div className="w-full p-3.5 flex justify-between items-center pointer-events-none">
        <span className={`text-sm font-medium ${value ? 'text-gray-800' : 'text-gray-400'}`}>{displayVal}</span>
        <Calendar size={16} className="text-gray-400" />
      </div>
    </div>
  );
};

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
  const [showSchedulePickup, setShowSchedulePickup] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedCFA, setSelectedCFA] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedHour, setSchedHour] = useState('10');
  const [schedMin, setSchedMin] = useState('00');
  const [schedAmPm, setSchedAmPm] = useState('AM');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundRef, setRefundRef] = useState('');

  const getCombinedPickupStr = () => {
    if (!schedDate) return '';
    const h = parseInt(schedHour);
    const isPm = schedAmPm === 'PM';
    const hour24 = isPm ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    return `${schedDate}T${hour24.toString().padStart(2, '0')}:${schedMin}:00`;
  };

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
    try { const { data } = await api.get('/admin/cfa-master'); setCfaList(data.data || []); } catch(e){}
  };

  const handleAction = async (endpoint, body, msg) => {
    setActionLoading(true);
    try {
      await api.post(endpoint, body);
      toast.success(msg);
      setShowApprove(false); setShowReject(false); setShowAssignCFA(false); setShowSchedulePickup(false); setShowVerify(false); setShowRefund(false);
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
  if (['APPROVED', 'CFA_ASSIGNED'].includes(c.status)) {
    const isScheduled = !!c.estimatedPickupDate;
    actions.push({ 
      label: isScheduled ? 'Reschedule' : 'Schedule Pickup', 
      icon: Clock, 
      color: isScheduled ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-indigo-600 hover:bg-indigo-700', 
      onClick: () => { 
        if (c.estimatedPickupDate) {
          const d = new Date(c.estimatedPickupDate);
          const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString();
          const [dStr, tStr] = localIso.split('T');
          setSchedDate(dStr);
          const hour24 = parseInt(tStr.split(':')[0]);
          const min = tStr.split(':')[1];
          setSchedMin(min);
          if (hour24 >= 12) {
            setSchedAmPm('PM');
            setSchedHour((hour24 === 12 ? 12 : hour24 - 12).toString());
          } else {
            setSchedAmPm('AM');
            setSchedHour((hour24 === 0 ? 12 : hour24).toString());
          }
        } else {
          setSchedDate('');
          setSchedHour('10'); setSchedMin('00'); setSchedAmPm('AM');
        }
        setShowSchedulePickup(true); 
      } 
    });
  }
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
            <h3 className="font-semibold text-gray-900 mb-3">Dealer Master Info</h3>
            <div className="space-y-2"><div><p className="text-xs text-gray-400">AG Code</p><p className="text-sm font-medium">{c.dealerEntity?.code}</p></div><div><p className="text-xs text-gray-400">Company</p><p className="text-sm">{c.dealerEntity?.company||'—'}</p></div><div><p className="text-xs text-gray-400">Region</p><p className="text-sm">{c.dealerEntity?.region||'—'}</p></div></div>
          </div>
          {c.qrCode && <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center"><h3 className="font-semibold mb-3">QR Code</h3><QRCodeSVG value={c.complaintId} size={160} className="mx-auto" fgColor="#1E3A5F" /><p className="text-xs text-gray-400 mt-2">{c.complaintId}</p></div>}
          {c.cfaEntity && <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"><h3 className="font-semibold mb-3">CFA Assignment</h3><div className="space-y-2"><div><p className="text-xs text-gray-400">Sales Office</p><p className="text-sm font-medium">{c.cfaEntity?.company} ({c.cfaEntity?.code})</p></div>{c.estimatedPickupDate && <div><p className="text-xs text-gray-400">Est. Pickup</p><p className="text-sm">{formatDate(c.estimatedPickupDate)}</p></div>}</div></div>}
          
          {c.rescheduleRequests?.length > 0 && (
            <div className="bg-red-50 rounded-2xl p-6 shadow-sm border border-red-100">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2"><Clock size={16} className="text-red-600" /> Reschedule Requests</h3>
              <div className="space-y-3">
                {c.rescheduleRequests.map((req, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-red-200 pb-2 last:border-0 last:pb-0">
                    <p className="text-xs font-semibold text-red-800 uppercase">{req.role}</p>
                    <p className="text-xs text-red-700">Requested: {formatDateTime(req.requestedAt)}</p>
                    {req.proposedDate && <p className="text-xs text-red-900 font-medium">Proposed: {formatDateTime(req.proposedDate)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock size={16}/>Timeline</h3>
            <div>
              {(() => {
                const displayTimeline = [...(c.timeline || [])];
                const hasCreated = displayTimeline.some(t => t.status === 'CREATED');
                if (!hasCreated) {
                  if (c.misCreatedAt) {
                     displayTimeline.unshift({
                        status: 'CREATED',
                        timestamp: c.misCreatedAt,
                        note: 'Complaint Created (MIS)'
                     });
                  } else if (c.createdAt) {
                     displayTimeline.unshift({
                        status: 'CREATED',
                        timestamp: c.createdAt,
                     });
                  }
                }
                return displayTimeline.map((e,i) => {
                  const timeString = (e.note && e.note.includes('MIS')) ? format(new Date(e.timestamp), 'M/d/yyyy') : formatDateTime(e.timestamp);
                  return (
                    <div key={i} className="flex gap-3"><div className="flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />{i<displayTimeline.length-1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}</div><div className="pb-4"><StatusChip status={e.status} size="xs" /><p className="text-xs text-gray-500 mt-1">{timeString}</p>{e.note && <p className="text-xs text-gray-400 mt-0.5">{e.note}</p>}</div></div>
                  );
                });
              })()}
            </div>
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
        <div className="space-y-4">
          <select value={selectedCFA} onChange={e => setSelectedCFA(e.target.value)} className="w-full p-3 border rounded-xl text-sm font-medium"><option value="">Select CFA Sales Office</option>{cfaList.map(c => <option key={c._id} value={c._id}>{c.company} ({c.code}) — {c.activeComplaints||0} active</option>)}</select>
          <div className="p-4 bg-gray-50 border rounded-xl">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Clock size={14} className="text-gray-400" /> Estimated Pickup Date & Time</label>
            <div className="flex flex-col gap-3">
              <CustomDateInput value={schedDate} onChange={setSchedDate} minDate={new Date().toISOString().slice(0,10)} />
              <div className="flex gap-2 items-center">
                <CustomSelect value={schedHour} onChange={setSchedHour} options={Array.from({length: 12}, (_, i) => (i+1).toString().padStart(2,'0'))} className="p-2.5 border border-gray-300 rounded-lg text-sm bg-white" />
                <span className="font-bold text-gray-400">:</span>
                <CustomSelect value={schedMin} onChange={setSchedMin} options={Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'))} className="p-2.5 border border-gray-300 rounded-lg text-sm bg-white" />
                <CustomSelect value={schedAmPm} onChange={setSchedAmPm} options={['AM', 'PM']} className="p-2.5 border border-gray-300 rounded-lg text-sm bg-white" />
              </div>
            </div>
          </div>
          <button onClick={() => handleAction(`/admin/complaints/${c._id}/assign-cfa`,{cfaId:selectedCFA,estimatedPickupDate:getCombinedPickupStr()},'CFA assigned!')} disabled={actionLoading || !selectedCFA || !schedDate} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">{actionLoading ? <Loader2 size={16} className="animate-spin"/> : <UserPlus size={16}/>}Assign</button>
        </div>
      </Modal>
      <Modal isOpen={showSchedulePickup} onClose={() => setShowSchedulePickup(false)} title={c.estimatedPickupDate ? "Reschedule Pickup" : "Schedule Pickup"}>
        <div className="space-y-6 py-2">
          {c.estimatedPickupDate && (
             <div className="bg-orange-50 text-orange-800 p-4 rounded-xl text-sm border border-orange-200 shadow-sm flex items-start gap-3">
               <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
               <div>
                  <p className="font-bold">Current Schedule</p>
                  <p className="mt-0.5 opacity-90">{formatDateTime(c.estimatedPickupDate)}</p>
               </div>
             </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Select Date</label>
              <CustomDateInput value={schedDate} onChange={setSchedDate} minDate={new Date().toISOString().slice(0,10)} />
            </div>
            <div>
               <label className="block text-sm font-bold text-gray-700 mb-2">Select Time</label>
               <div className="flex gap-2 items-center">
                 <CustomSelect value={schedHour} onChange={setSchedHour} options={Array.from({length: 12}, (_, i) => (i+1).toString().padStart(2, '0'))} className="p-3.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium text-gray-800 shadow-sm hover:border-gray-300 transition-colors" />
                 <span className="font-bold text-gray-400">:</span>
                 <CustomSelect value={schedMin} onChange={setSchedMin} options={Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'))} className="p-3.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 bg-white font-medium text-gray-800 shadow-sm hover:border-gray-300 transition-colors" />
                 <CustomSelect value={schedAmPm} onChange={setSchedAmPm} options={['AM', 'PM']} className="p-3.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 bg-white font-bold text-gray-800 shadow-sm hover:border-gray-300 transition-colors" />
               </div>
            </div>
          </div>
          <button 
            onClick={() => handleAction(`/admin/complaints/${c._id}/schedule-pickup`,{estimatedPickupDate:getCombinedPickupStr()}, c.estimatedPickupDate ? 'Pickup rescheduled!' : 'Pickup scheduled!')} 
            disabled={actionLoading || !schedDate} 
            className={`w-full py-3.5 mt-2 ${c.estimatedPickupDate ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25'} text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95`}
          >
            {actionLoading ? <Loader2 size={18} className="animate-spin"/> : <Clock size={18}/>}
            {c.estimatedPickupDate ? 'Update Schedule' : 'Confirm Schedule'}
          </button>
        </div>
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
