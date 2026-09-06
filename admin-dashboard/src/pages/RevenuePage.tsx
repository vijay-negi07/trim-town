import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import { MetricCard, PageHeader } from '../components/ui';

const monthlyGMV = [
  { month: 'Oct', gmv: 0, revenue: 0 },
  { month: 'Nov', gmv: 0, revenue: 0 },
  { month: 'Dec', gmv: 120000, revenue: 0 },
  { month: 'Jan', gmv: 280000, revenue: 0 },
  { month: 'Feb', gmv: 490000, revenue: 0 },
  { month: 'Mar', gmv: 840000, revenue: 0 },
  { month: 'Apr (P2)', gmv: 1200000, revenue: 149500 },
  { month: 'May', gmv: 1800000, revenue: 224700 },
  { month: 'Jun', gmv: 2400000, revenue: 299100 },
  { month: 'Jul (P3)', gmv: 3200000, revenue: 512000 },
  { month: 'Aug', gmv: 3800000, revenue: 608000 },
  { month: 'Sep', gmv: 4200000, revenue: 672000 },
];

const serviceBreakdown = [
  { name: 'Haircut', value: 52, color: '#4f46e5' },
  { name: 'Beard trim', value: 21, color: '#818cf8' },
  { name: 'Combo', value: 18, color: '#c7d2fe' },
  { name: 'Massage', value: 9, color: '#e0e7ff' },
];

const salonRevenue = [
  { name: 'Raja Barber', revenue: 57600 },
  { name: 'Gents Galaxy', revenue: 79800 },
  { name: 'Modern Look', revenue: 102000 },
  { name: 'Smart Cuts', revenue: 33600 },
  { name: 'Shahi Saloon', revenue: 26400 },
];

const roadmap = [
  { phase: 'Phase 1 (Now)', stream: 'Free onboarding', model: 'Build supply side', target: '50+ salons', status: 'active' },
  { phase: 'Phase 2', stream: 'Subscriptions', model: '₹299–₹999/month', target: '₹1.5L MRR', status: 'upcoming' },
  { phase: 'Phase 3', stream: 'Booking commission', model: '5–8% per booking', target: '₹2.3L MRR', status: 'upcoming' },
  { phase: 'Phase 4', stream: 'Home services', model: '10–15% per visit', target: '₹5L+ MRR', status: 'future' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{(p.value / 1000).toFixed(0)}K
        </p>
      ))}
    </div>
  );
};

export default function RevenuePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Revenue & monetization" subtitle="Phase 1 is free — tracking GMV and projections" />

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="This month GMV" value="₹8.4L" change="↑ 42% MoM" trend="up" icon={<TrendingUp size={18} className="text-brand-600" />} color="bg-brand-50" />
        <MetricCard label="Platform revenue" value="₹0" change="Phase 1 (free)" trend="neutral" icon={<DollarSign size={18} className="text-gray-400" />} color="bg-gray-50" />
        <MetricCard label="Projected MRR (P2)" value="₹1.5L" change="50 salons × ₹299" trend="up" icon={<Target size={18} className="text-green-600" />} color="bg-green-50" />
        <MetricCard label="Est. paying salons" value="47" change="Once Phase 2 launches" trend="neutral" icon={<Users size={18} className="text-blue-600" />} color="bg-blue-50" />
      </div>

      {/* GMV Projection */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">GMV & Revenue projection (12-month)</h3>
            <p className="text-xs text-gray-500">Monetization starts Phase 2 (Month 4)</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand-500 inline-block" />GMV</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Revenue</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyGMV} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="gmv" name="GMV" stroke="#4f46e5" strokeWidth={2} fill="url(#gmvGrad)" />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Service breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Booking by service type</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={serviceBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {serviceBreakdown.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 flex-1">
              {serviceBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-gray-600">{s.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top salon revenue */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">GMV by salon (this month)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={salonRevenue} layout="vertical" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}K`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, 'GMV']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monetization roadmap */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Monetization roadmap</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {roadmap.map((r) => (
            <div key={r.phase} className="px-5 py-4 flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.status === 'active' ? 'bg-green-500' : r.status === 'upcoming' ? 'bg-yellow-400' : 'bg-gray-200'}`} />
              <div className="w-32 flex-shrink-0">
                <p className="text-sm font-medium text-gray-900">{r.phase}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">{r.stream}</p>
                <p className="text-xs text-gray-400">{r.model}</p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-semibold ${r.status === 'active' ? 'text-green-600' : 'text-gray-700'}`}>
                  {r.target}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
