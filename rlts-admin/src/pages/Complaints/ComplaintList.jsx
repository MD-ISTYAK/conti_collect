import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import StatusChip from '../../components/StatusChip';
import { formatDate, productTypeLabels } from '../../utils/formatters';

const STATUSES = ['', 'CREATED', 'APPROVED', 'CFA_ASSIGNED', 'PICKED_UP', 'RECEIVED_AT_CFA', 'VERIFIED', 'REFUND_PROCESSED', 'REJECTED'];

const ComplaintList = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
    page: parseInt(searchParams.get('page') || '1'),
  });

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      params.page = filters.page;
      params.limit = 20;
      params.sortBy = 'createdAt';
      params.sortOrder = 'desc';

      const { data } = await api.get('/complaints', { params });
      setComplaints(data.data || []);
      setMeta(data.meta || { page: 1, pages: 1, total: 0 });
    } catch (e) {
      console.error('Failed to fetch complaints:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    const newParams = {};
    if (filters.status) newParams.status = filters.status;
    if (filters.search) newParams.search = filters.search;
    if (filters.page > 1) newParams.page = filters.page;
    setSearchParams(newParams);
  }, [filters]);

  const exportCSV = async () => {
    try {
      const { data } = await api.get('/admin/reports/export', { params: { format: 'json' } });
      const items = data.data || [];
      if (items.length === 0) return;

      const headers = ['Complaint ID', 'Dealer', 'Product', 'Type', 'Qty', 'Status', 'Reason', 'Created'];
      const rows = items.map(c => [
        c.complaintId, c.dealerId?.name || '', c.productName, c.productType,
        c.quantity, c.status, c.reason, new Date(c.createdAt).toLocaleDateString()
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complaints_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
          <p className="text-gray-500 text-sm mt-0.5">{meta.total} total complaints</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Complaint ID or product..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-blue-500 transition-all"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Complaint ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dealer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CFA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No complaints found
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => navigate(`/complaints/${c._id}`)}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-blue-600">{c.complaintId}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{c.dealerId?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{c.dealerId?.businessName || ''}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-800">{c.productName}</p>
                      <p className="text-xs text-gray-400">{productTypeLabels[c.productType]}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{c.quantity}</td>
                    <td className="px-5 py-3.5">
                      <StatusChip status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{c.cfaId?.name || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Page {meta.page} of {meta.pages} · {meta.total} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                disabled={meta.page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                disabled={meta.page >= meta.pages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintList;
