import { useQuery } from '@tanstack/react-query';
import {
  Users, Store, Calendar, TrendingUp, CheckCircle,
  Clock, Star, AlertCircle
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { MetricCard, StatusBadge, Table, PageHeader, LiveDot } from '../components/ui';
import { statsApi } from '../services/api';
import { format } from 'date-fns';

// Mock chart data (replace with real API data in production)
const bookingsTrend = [
  { day: 'Mon', bookings: 42, revenue: 3360 },
  { day: 'Tue', bookings: 58, revenue: 4640 },
  { day: 'Wed', bookings: 51, revenue: 4080 },
  { day: 'Thu', bookings: 74, revenue: 5920 },
  { day: 'Fri', bookings: 89, revenue: 7120 },
  { day: 'Sat', bookings: 112, revenue: 8960 },
  { day: 'Sun', bookings: 63, revenue: 5040 },
];

const hourlyData = [
  { hour: '8AM', queue: 2 },
  { hour: '9AM', queue: 5 },
  { hour: '10AM', queue: 12 },
  { hour: '11AM', queue: 18 },
  { hour: '12PM', queue: 22 },
  { hour: '1PM', queue: 19 },
  { hour: '2PM', queue: 14 },
  { hour: '3PM', queue: 11 },
  { hour: '4PM', queue: 16 },
  { hour: '5PM', queue: 21 },
  { hour: '6PM', queue: 17 },
  { hour: '7PM', queue: 9 },
];

const topSalons = [
  { id: '1', name: 'Raja Barber Shop', area: 'Bhotiya Parao', bookings: 24, revenue: 1920, status: 'AVAILABLE', rating: 4.7 },
  { id: '2', name: 'Gents Galaxy Salon', area: 'Rampur Road', bookings: 19, revenue: 2660, status: 'BUSY', rating: 4.4 },
  { id: '3', name: 'Modern Look Studio', area: 'Mall Road', bookings: 17, revenue: 3400, status: 'CLOSED', rating: 4.2 },
  { id: '4', name: 'Smart Cuts', area: 'Kathgodam Road', bookings: 14, revenue: 1120, status: 'AVAILABLE', rating: 4.5 },
  { id: '5', name: 'Shahi Saloon', area: 'Haldwani Chowk', bookings: 11, revenue: 880, status: 'BUSY', rating: 4.3 },
];

const pendingVerifications = [
  { id: 'p1', name: 'New Style Salon', owner: 'Suresh Joshi', phone: '+91 98765 43210', submittedAt: new Date() },
  { id: 'p2', name: 'Kumaon Cuts', owner: 'Vinod Mehra', phone: '+91 88001 23456', submittedAt: new Date(Date.now() - 86400000) },
];

export default function OverviewPage() {
  const { data: statsRes, isLoading } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => statsApi.getPlatformStats(),
    refetchInterval: 30000,
    retry: false,
  });

  const stats = statsRes?.data?.data;

  const metrics = [
    {
      label: 'Active salons',
      value: stats?.activeSalons ?? 47,
      change: '↑ 3 this week',
      trend: 'up' as const,
      icon: <Store size={18} className="text-brand-600" />,
      color: 'bg-brand-50',
    },
    {
      label: 'Customers',
      value: stats?.totalUsers?.toLocaleString() ?? '1,284',
      change: '↑ 12% MoM',
      trend: 'up' as const,
      icon: <Users size={18} className="text-blue-600" />,
      color: 'bg-blue-50',
    },
    {
      label: 'Bookings today',
      value: stats?.todayAppointments ?? 318,
      change: '↑ 28 vs yesterday',
      trend: 'up' as const,
      icon: <Calendar size={18} className="text-green-600" />,
      color: 'bg-green-50',
    },
    {
      label: 'GMV today',
      value: `₹${((stats?.todayRevenue ?? 31800) / 1000).toFixed(1)}K`,
      change: '↑ 9%',
      trend: 'up' as const,
      icon: <TrendingUp size={18} className="text-orange-600" />,
      color: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        subtitle={`${format(new Date(), 'EEEE, d MMMM yyyy')} · Haldwani`}
        action={<LiveDot />}
      />

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bookings trend */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Bookings this week</h3>
              <p className="text-xs text-gray-500">Daily volume + revenue</p>
            </div>
            <span className="text-xs text-gray-400">489 total</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={bookingsTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="bookingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Area type="monotone" dataKey="bookings" stroke="#4f46e5" strokeWidth={2} fill="url(#bookingsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly queue pressure */}
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Hourly queue pressure</h3>
            <p className="text-xs text-gray-500">Platform-wide avg today</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData} margin={{ top: 5, right: 0, bottom: 0, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="queue" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Top salons */}
        <div className="card col-span-3">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Top salons today</h3>
            <span className="text-xs text-gray-400">By bookings</span>
          </div>
          <Table
            keyExtractor={(r) => r.id}
            data={topSalons}
            columns={[
              { key: 'name', header: 'Salon', render: (r) => (
                <div>
                  <p className="font-medium text-gray-900 text-sm">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.area}</p>
                </div>
              )},
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'bookings', header: 'Bookings', render: (r) => (
                <span className="font-medium">{r.bookings}</span>
              )},
              { key: 'revenue', header: 'Revenue', render: (r) => (
                <span className="font-medium">₹{r.revenue.toLocaleString()}</span>
              )},
              { key: 'rating', header: 'Rating', render: (r) => (
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" /> {r.rating}
                </span>
              )},
            ]}
          />
        </div>

        {/* Pending verifications + quick stats */}
        <div className="col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Pending verifications</h3>
              {pendingVerifications.length > 0 && (
                <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full text-xs flex items-center justify-center font-semibold">
                  {pendingVerifications.length}
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {pendingVerifications.map((p) => (
                <div key={p.id} className="px-5 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.owner} · {p.phone}</p>
                    </div>
                    <button
                      onClick={() => statsApi.verifySalon(p.id, 'VERIFIED')}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Verify →
                    </button>
                  </div>
                </div>
              ))}
              {pendingVerifications.length === 0 && (
                <div className="px-5 py-6 text-center">
                  <CheckCircle size={20} className="text-green-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">All salons verified</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick health */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Platform health</h3>
            {[
              { label: 'Avg wait time', value: '18 min', icon: Clock, ok: true },
              { label: 'Rating avg', value: '4.4 ⭐', icon: Star, ok: true },
              { label: 'Queue full salons', value: '3', icon: AlertCircle, ok: false },
            ].map(({ label, value, icon: Icon, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Icon size={14} className={ok ? 'text-green-500' : 'text-orange-400'} />
                  {label}
                </div>
                <span className="text-sm font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
