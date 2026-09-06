import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── METRIC CARD ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  color?: string;
}

export function MetricCard({ label, value, change, trend, icon, color = 'bg-brand-50' }: MetricCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        {icon && (
          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {change && (
        <div className={clsx('flex items-center gap-1 mt-2 text-xs font-medium', {
          'text-green-600': trend === 'up',
          'text-red-500': trend === 'down',
          'text-gray-400': trend === 'neutral',
        })}>
          {trend === 'up' && <TrendingUp size={12} />}
          {trend === 'down' && <TrendingDown size={12} />}
          {trend === 'neutral' && <Minus size={12} />}
          {change}
        </div>
      )}
    </div>
  );
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: 'AVAILABLE' | 'BUSY' | 'CLOSED' | 'VERIFIED' | 'PENDING' | 'REJECTED' | 'SUSPENDED' | string;
}

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  AVAILABLE: { label: 'Available', className: 'badge-green', dot: 'bg-green-500' },
  BUSY:      { label: 'Busy',      className: 'badge-yellow', dot: 'bg-yellow-500' },
  CLOSED:    { label: 'Closed',    className: 'badge-red',    dot: 'bg-red-500' },
  VERIFIED:  { label: 'Verified',  className: 'badge-green',  dot: 'bg-green-500' },
  PENDING:   { label: 'Pending',   className: 'badge-yellow', dot: 'bg-yellow-500' },
  REJECTED:  { label: 'Rejected',  className: 'badge-red',    dot: 'bg-red-500' },
  SUSPENDED: { label: 'Suspended', className: 'badge-gray',   dot: 'bg-gray-400' },
  CONFIRMED: { label: 'Confirmed', className: 'badge-green',  dot: 'bg-green-500' },
  COMPLETED: { label: 'Completed', className: 'badge-blue',   dot: 'bg-blue-500' },
  CANCELLED: { label: 'Cancelled', className: 'badge-red',    dot: 'bg-red-400' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = statusConfig[status] || { label: status, className: 'badge-gray', dot: 'bg-gray-400' };
  return (
    <span className={cfg.className}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── TABLE ────────────────────────────────────────────────────────────────────

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (row: T) => string;
}

export function Table<T>({ columns, data, loading, emptyMessage = 'No data', keyExtractor }: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-gray-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-gray-700">
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── LIVE DOT ────────────────────────────────────────────────────────────────

export function LiveDot() {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Live
    </span>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 mb-4">{icon}</div>
      <p className="text-gray-600 font-medium">{title}</p>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
    </div>
  );
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sizeClass = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }[size];

  return (
    <div className={clsx('rounded-full flex items-center justify-center font-semibold', sizeClass, color)}>
      {initials}
    </div>
  );
}
