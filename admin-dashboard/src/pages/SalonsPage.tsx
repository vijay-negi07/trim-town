import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, CheckCircle, XCircle, MapPin, Phone, Star, Users } from 'lucide-react';
import { Table, PageHeader, StatusBadge } from '../components/ui';
import { statsApi } from '../services/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

type VerificationFilter = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED';

// Fallback mock data for development without backend
const mockSalons = [
  { id: '1', name: 'Raja Barber Shop', ownerName: 'Raja Kumar', phone: '+919876543210', area: 'Bhotiya Parao', verificationStatus: 'VERIFIED', isActive: true, barbers: [{ availability: { status: 'AVAILABLE' }, _count: { appointments: 447 } }], _count: { barbers: 1 }, createdAt: new Date().toISOString() },
  { id: '2', name: 'Gents Galaxy Salon', ownerName: 'Gagan Sharma', phone: '+919876543211', area: 'Rampur Road', verificationStatus: 'VERIFIED', isActive: true, barbers: [{ availability: { status: 'BUSY' }, _count: { appointments: 312 } }], _count: { barbers: 1 }, createdAt: new Date().toISOString() },
  { id: '3', name: 'Modern Look Studio', ownerName: 'Mohan Verma', phone: '+919876543212', area: 'Mall Road', verificationStatus: 'VERIFIED', isActive: true, barbers: [{ availability: { status: 'CLOSED' }, _count: { appointments: 289 } }], _count: { barbers: 1 }, createdAt: new Date().toISOString() },
  { id: '4', name: 'Smart Cuts', ownerName: 'Suresh Jat', phone: '+919876543213', area: 'Kathgodam Road', verificationStatus: 'VERIFIED', isActive: true, barbers: [{ availability: { status: 'AVAILABLE' }, _count: { appointments: 201 } }], _count: { barbers: 1 }, createdAt: new Date().toISOString() },
  { id: '5', name: 'New Style Salon', ownerName: 'Suresh Joshi', phone: '+919876543215', area: 'Haldwani Chowk', verificationStatus: 'PENDING', isActive: false, barbers: [], _count: { barbers: 0 }, createdAt: new Date().toISOString() },
  { id: '6', name: 'Kumaon Cuts', ownerName: 'Vinod Mehra', phone: '+919876543216', area: 'Bus Stand', verificationStatus: 'PENDING', isActive: false, barbers: [], _count: { barbers: 0 }, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

export default function SalonsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VerificationFilter>('ALL');
  const [selectedSalon, setSelectedSalon] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-salons', filter],
    queryFn: async () => {
      try {
        const res = await statsApi.getSalons({ status: filter !== 'ALL' ? filter : undefined });
        return res.data.data.items;
      } catch {
        return mockSalons;
      }
    },
    initialData: mockSalons,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      statsApi.verifySalon(id, status),
    onSuccess: (_, { status }) => {
      toast.success(`Salon ${status.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ['admin-salons'] });
      setSelectedSalon(null);
    },
    onError: () => toast.error('Action failed'),
  });

  const salons = (data || mockSalons).filter((s: any) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.area.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || s.verificationStatus === filter;
    return matchSearch && matchFilter;
  });

  const filters: { label: string; value: VerificationFilter; count?: number }[] = [
    { label: 'All', value: 'ALL', count: (data || mockSalons).length },
    { label: 'Verified', value: 'VERIFIED', count: (data || mockSalons).filter((s: any) => s.verificationStatus === 'VERIFIED').length },
    { label: 'Pending', value: 'PENDING', count: (data || mockSalons).filter((s: any) => s.verificationStatus === 'PENDING').length },
    { label: 'Rejected', value: 'REJECTED', count: (data || mockSalons).filter((s: any) => s.verificationStatus === 'REJECTED').length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Salons"
        subtitle={`${salons.length} salons in Haldwani`}
        action={
          <button className="btn-primary flex items-center gap-2">
            + Onboard salon
          </button>
        }
      />

      {/* Filters + Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx('px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5', {
                'bg-white text-gray-900 shadow-sm': filter === f.value,
                'text-gray-500 hover:text-gray-700': filter !== f.value,
              })}
            >
              {f.label}
              {f.count !== undefined && (
                <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', {
                  'bg-brand-100 text-brand-700': filter === f.value,
                  'bg-gray-200 text-gray-500': filter !== f.value,
                })}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <Table
          keyExtractor={(r) => r.id}
          data={salons}
          loading={isLoading}
          emptyMessage="No salons found"
          columns={[
            {
              key: 'name', header: 'Salon', render: (r) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-sm">✂️</div>
                  <div>
                    <p className="font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={10} /> {r.area}
                    </p>
                  </div>
                </div>
              )
            },
            {
              key: 'owner', header: 'Owner', render: (r) => (
                <div>
                  <p className="text-sm text-gray-700">{r.ownerName}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Phone size={10} /> {r.phone}
                  </p>
                </div>
              )
            },
            {
              key: 'status', header: 'Live status', render: (r) => {
                const liveStatus = r.barbers?.[0]?.availability?.status;
                return liveStatus ? <StatusBadge status={liveStatus} /> : <span className="text-gray-300 text-xs">—</span>;
              }
            },
            {
              key: 'verification', header: 'Verification', render: (r) => (
                <StatusBadge status={r.verificationStatus} />
              )
            },
            {
              key: 'bookings', header: 'Bookings', render: (r) => (
                <span className="font-medium">{r.barbers?.[0]?._count?.appointments ?? 0}</span>
              )
            },
            {
              key: 'actions', header: '', render: (r) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSalon(r)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    View
                  </button>
                  {r.verificationStatus === 'PENDING' && (
                    <>
                      <button
                        onClick={() => verifyMutation.mutate({ id: r.id, status: 'VERIFIED' })}
                        className="p-1 text-green-500 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Approve"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => verifyMutation.mutate({ id: r.id, status: 'REJECTED' })}
                        className="p-1 text-red-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Reject"
                      >
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                </div>
              )
            },
          ]}
        />
      </div>

      {/* Detail drawer */}
      {selectedSalon && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelectedSalon(null)}>
          <div className="w-80 bg-white h-full shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">{selectedSalon.name}</h3>
                <button onClick={() => setSelectedSalon(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <p className="text-sm text-gray-500">{selectedSalon.area}, Haldwani</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                {[
                  { label: 'Owner', value: selectedSalon.ownerName },
                  { label: 'Phone', value: selectedSalon.phone },
                  { label: 'Area', value: selectedSalon.area },
                  { label: 'Status', value: selectedSalon.verificationStatus },
                  { label: 'Barbers', value: selectedSalon._count?.barbers ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
              {selectedSalon.verificationStatus === 'PENDING' && (
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => verifyMutation.mutate({ id: selectedSalon.id, status: 'VERIFIED' })}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={15} /> Approve salon
                  </button>
                  <button
                    onClick={() => verifyMutation.mutate({ id: selectedSalon.id, status: 'REJECTED' })}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
