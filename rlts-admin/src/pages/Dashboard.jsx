import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, Truck, CreditCard, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import api from '../api/axios';
import StatusChip from '../components/StatusChip';
import { formatRelativeTime, statusConfig, formatDate } from '../utils/formatters';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, analyticsRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/analytics'),
        ]);
        setStats(dashRes.data.data);
        setAnalytics(analyticsRes.data.data);
      } catch (e) {
        console.error('Dashboard fetch failed:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-72 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const s = stats?.stats || {};

  const kpiCards = [
    { label: 'Total Complaints', value: s.total || 0, icon: FileText, color: '#6366F1', bg: 'from-indigo-500 to-indigo-700', trend: s.last30DaysTotal },
    { label: 'Pending Approval', value: s.pendingApproval || 0, icon: Clock, color: '#F59E0B', bg: 'from-amber-500 to-amber-700', onClick: () => navigate('/complaints?status=CREATED') },
    { label: 'Pickups In Progress', value: s.pickupsInProgress || 0, icon: Truck, color: '#3B82F6', bg: 'from-blue-500 to-blue-700' },
    { label: 'Refunds This Month', value: s.completedRefundsThisMonth || 0, icon: CreditCard, color: '#10B981', bg: 'from-emerald-500 to-emerald-700' },
  ];

  // Status donut chart data
  const statusData = analytics?.byStatus?.map(s => ({
    name: statusConfig[s._id]?.label || s._id,
    value: s.count,
    color: statusConfig[s._id]?.color || '#94A3B8',
  })) || [];

  // Line chart data
  const lineData = analytics?.complaintsOverTime?.map(d => ({
    date: d._id.slice(5), // MM-DD
    count: d.count,
  })) || [];

  // Top dealers
  const topDealers = analytics?.topDealers?.map(d => ({
    name: d.businessName || d.name,
    count: d.count,
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Return logistics overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div
            key={i}
            onClick={card.onClick}
            className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${card.bg} shadow-lg card-hover ${card.onClick ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-sm font-medium">{card.label}</p>
                <p className="text-3xl font-bold mt-2">{card.value}</p>
              </div>
              <div className="p-2.5 bg-white/15 rounded-xl">
                <card.icon size={22} />
              </div>
            </div>
            {card.trend !== undefined && (
              <div className="flex items-center gap-1 mt-3 text-sm text-white/70">
                <TrendingUp size={14} />
                <span>{card.trend} in last 30 days</span>
              </div>
            )}
            {/* Decorative circle */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Donut */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Complaints by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {statusData.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}: {s.value}
              </div>
            ))}
          </div>
        </div>

        {/* Complaints Over Time */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Complaints Over Time (30 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Dealers */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Top Dealers by Complaints</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDealers} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <button onClick={() => navigate('/complaints')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats?.recentActivity?.map((activity, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="mt-0.5">
                  <StatusChip status={activity.status} size="xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{activity.complaintId}</p>
                  <p className="text-xs text-gray-500">by {activity.actor} · {formatRelativeTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
            {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
              <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
