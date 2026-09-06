import { useState } from 'react';
import { Save, Bell, Shield, Map, Smartphone } from 'lucide-react';
import { PageHeader } from '../components/ui';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast.success('Settings saved');
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    {
      icon: Map,
      title: 'Platform configuration',
      fields: [
        { label: 'Launch city', type: 'text', value: 'Haldwani', key: 'city' },
        { label: 'Default search radius (km)', type: 'number', value: '5', key: 'radius' },
        { label: 'Max queue size per barber', type: 'number', value: '10', key: 'maxQueue' },
        { label: 'Avg service time (mins)', type: 'number', value: '20', key: 'avgService' },
      ],
    },
    {
      icon: Bell,
      title: 'Notifications',
      fields: [
        { label: 'Booking reminder (mins before)', type: 'number', value: '30', key: 'reminderMins' },
        { label: 'Queue alert threshold', type: 'number', value: '8', key: 'queueAlert' },
      ],
      toggles: [
        { label: 'Send booking confirmations', key: 'bookingConfirm', defaultOn: true },
        { label: 'Send queue position updates', key: 'queueUpdates', defaultOn: true },
        { label: 'Send review requests after visit', key: 'reviewRequest', defaultOn: false },
      ],
    },
    {
      icon: Shield,
      title: 'Content moderation',
      toggles: [
        { label: 'Auto-publish reviews', key: 'autoPublish', defaultOn: false },
        { label: 'Flag low ratings (<3★) for review', key: 'flagLow', defaultOn: true },
        { label: 'Require admin approval for new salons', key: 'salonApproval', defaultOn: true },
      ],
    },
    {
      icon: Smartphone,
      title: 'App configuration',
      fields: [
        { label: 'App version (customer)', type: 'text', value: '1.0.0', key: 'appVersion' },
        { label: 'Force update minimum version', type: 'text', value: '1.0.0', key: 'minVersion' },
        { label: 'Maintenance message', type: 'text', value: '', key: 'maintenanceMsg' },
      ],
      toggles: [
        { label: 'Maintenance mode', key: 'maintenance', defaultOn: false },
        { label: 'Allow new registrations', key: 'allowRegistrations', defaultOn: true },
      ],
    },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Platform configuration and controls"
        action={
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save size={15} />
            {saved ? 'Saved!' : 'Save changes'}
          </button>
        }
      />

      {sections.map(({ icon: Icon, title, fields, toggles }) => (
        <div key={title} className="card p-5">
          <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Icon size={16} className="text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          </div>

          <div className="space-y-4">
            {fields?.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-gray-600 flex-1">{field.label}</label>
                <input
                  type={field.type}
                  defaultValue={field.value}
                  className="w-48 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-right"
                />
              </div>
            ))}

            {toggles?.map((toggle) => (
              <Toggle key={toggle.key} label={toggle.label} defaultOn={toggle.defaultOn} />
            ))}
          </div>
        </div>
      ))}

      {/* Danger zone */}
      <div className="card p-5 border-red-200">
        <h3 className="text-sm font-semibold text-red-600 mb-4">Danger zone</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Clear all queue data</p>
              <p className="text-xs text-gray-500">Resets all live queues to empty</p>
            </div>
            <button
              onClick={() => toast.error('Not available in MVP')}
              className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              Clear queues
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <button
        onClick={() => setOn(!on)}
        className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
