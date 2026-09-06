import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Phone, Hash } from 'lucide-react';
import { Table, PageHeader, Avatar, MetricCard } from '../components/ui';
import { statsApi } from '../services/api';
import { Users, TrendingUp, Repeat } from 'lucide-react';
import { format } from 'date-fns';

const mockCustomers = [
  { id: '1', name: 'Rahul Sharma', phone: '+919812345678', createdAt: new Date().toISOString(), _count: { appointments: 8 } },
  { id: '2', name: 'Priya Joshi', phone: '+918800123456', createdAt: new Date(Date.now() - 86400000).toISOString(), _count: { appointments: 3 } },
  { id: '3', name: 'Amit Singh', phone: '+917700987654', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), _count: { appointments: 2 } },
  { id: '4', name: 'Deepak Mehra', phone: '+919900876543', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), _count: { appointments: 5 } },
  { id: '5', name: 'Sunita Bisht', phone: '+919800000005', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), _count: { appointments: 1 } },
  { id: '6', name: 'Vikas Tiwari', phone: '+919800000006', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), _count: { appointments: 12 } },
  { id: '7', name: 'Neha Rawat', phone: '+919800000007', createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), _count: { appointments: 4 } },
  { id: '8', name: 'Arun Pandey', phone: '+919800000008', createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), _count: { appointments: 7 } },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      try {
        const res = await statsApi.getUsers();
        return res.data.data.items;
      } catch {
        return mockCustomers;
      }
    },
    initialData: mockCustomers,
  });

  const customers = (data || mockCustomers).filter((c: any) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const totalBookings = customers.reduce((s: number, c: any) => s + (c._count?.appointments || 0), 0);
  const repeatUsers = customers.filter((c: any) => c._count?.appointments > 1).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Customers" subtitle={`${customers.length} registered customers`} />

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total customers" value={customers.length.toLocaleString()} change="↑ 12% MoM" trend="up" icon={<Users size={18} className="text-brand-600" />} color="bg-brand-50" />
        <MetricCard label="Total bookings" value={totalBookings} change="Across all customers" trend="up" icon={<TrendingUp size={18} className="text-green-600" />} color="bg-green-50" />
        <MetricCard label="Repeat customers" value={`${Math.round(repeatUsers / customers.length * 100)}%`} change={`${repeatUsers} of ${customers.length}`} trend="up" icon={<Repeat size={18} className="text-blue-600" />} color="bg-blue-50" />
      </div>

      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      <div className="card">
        <Table
          keyExtractor={(r) => r.id}
          data={customers}
          emptyMessage="No customers found"
          columns={[
            {
              key: 'name', header: 'Customer', render: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} size="sm" />
                  <span className="font-medium text-gray-900">{r.name}</span>
                </div>
              )
            },
            {
              key: 'phone', header: 'Phone', render: (r) => (
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Phone size={12} className="text-gray-400" /> {r.phone}
                </span>
              )
            },
            {
              key: 'appointments', header: 'Bookings', render: (r) => (
                <span className="flex items-center gap-1.5">
                  <Hash size={12} className="text-gray-400" />
                  <span className="font-medium">{r._count?.appointments || 0}</span>
                </span>
              )
            },
            {
              key: 'loyalty', header: 'Loyalty', render: (r) => {
                const count = r._count?.appointments || 0;
                if (count >= 10) return <span className="badge-green">⭐ Gold</span>;
                if (count >= 5) return <span className="badge-blue">Silver</span>;
                if (count >= 2) return <span className="badge-gray">Bronze</span>;
                return <span className="text-gray-400 text-xs">New</span>;
              }
            },
            {
              key: 'joined', header: 'Joined', render: (r) => (
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Calendar size={12} className="text-gray-400" />
                  {format(new Date(r.createdAt), 'd MMM yyyy')}
                </span>
              )
            },
          ]}
        />
      </div>
    </div>
  );
}
