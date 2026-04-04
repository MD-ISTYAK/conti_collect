import { useState } from 'react';
import { Download, Calendar } from 'lucide-react';
import api from '../api/axios';
import StatusChip from '../components/StatusChip';
import { formatDate, productTypeLabels } from '../utils/formatters';
import { toast } from 'react-toastify';

const Reports = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/admin/reports/export', { params });
      setData(res.data.data || []);
    } catch(e) { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = ['Complaint ID','Dealer','Product','Type','Qty','Status','Reason','Created','Refund Amount','Refund Ref'];
    const rows = data.map(c => [
      c.complaintId, c.dealerId?.name||'', c.productName, c.productType, c.quantity, c.status, c.reason,
      new Date(c.createdAt).toLocaleDateString(), c.refundAmount||'', c.refundReference||''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rlts_report_${dateFrom||'all'}_to_${dateTo||'now'}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2.5 border rounded-xl text-sm" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2.5 border rounded-xl text-sm" /></div>
        <button onClick={fetchReport} disabled={loading} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">{loading ? '...' : <><Calendar size={16}/>Generate</>}</button>
        {data.length > 0 && <button onClick={exportCSV} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"><Download size={16}/>Export CSV</button>}
      </div>

      {data.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dealer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{c.complaintId}</td>
                    <td className="px-4 py-3 text-sm">{c.dealerId?.name||'—'}</td>
                    <td className="px-4 py-3 text-sm">{c.productName}</td>
                    <td className="px-4 py-3 text-sm">{c.quantity}</td>
                    <td className="px-4 py-3"><StatusChip status={c.status} size="xs" /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t bg-gray-50/50 text-sm text-gray-500">{data.length} results</div>
        </div>
      )}
    </div>
  );
};

export default Reports;
