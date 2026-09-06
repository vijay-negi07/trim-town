import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Phone, KeyRound, ArrowRight, Loader2 } from 'lucide-react';
import { authApi, useAuthStore } from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
      const res = await authApi.sendOtp(formatted);
      setDevOtp(res.data.devOtp || null);
      setPhone(formatted);
      setStep('otp');
      toast.success('OTP sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, otp);
      const { accessToken, refreshToken, user } = res.data.data;
      if (user.role !== 'ADMIN') {
        toast.error('Admin access only');
        return;
      }
      setAuth({ accessToken, refreshToken, user });
      toast.success(`Welcome, ${user.name}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#0f0f23] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-600/30">
            <Scissors size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">TrimTown Admin</h1>
          <p className="text-white/40 text-sm mt-1">Haldwani Operations Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
                <p className="text-sm text-gray-500">Enter your admin phone number</p>
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  placeholder="+91 99999 99999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input pl-9"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : (
                  <> Send OTP <ArrowRight size={16} /> </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Enter OTP</h2>
                <p className="text-sm text-gray-500">Sent to {phone}</p>
                {devOtp && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-700 font-mono">Dev OTP: <strong>{devOtp}</strong></p>
                  </div>
                )}
              </div>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit OTP"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="input pl-9 tracking-widest text-center font-mono text-lg"
                  required
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Verify & Sign in'}
              </button>
              <button type="button" onClick={() => setStep('phone')} className="w-full text-sm text-gray-500 hover:text-gray-700">
                ← Change number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">TrimTown © 2024 · Admin access only</p>
      </div>
    </div>
  );
}
