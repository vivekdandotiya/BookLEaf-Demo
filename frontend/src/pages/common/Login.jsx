import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { BookOpen, ShieldCheck, UserCheck, Sparkles, AlertCircle } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'ADMIN',
    name: 'BookLeaf Ops Admin',
    email: 'admin@bookleaf.com',
    password: 'Admin@12345',
    detail: 'Full Operations & AI Draft Access',
    color: 'border-ink-800 bg-ink-900 text-white',
  },
  {
    role: 'AUTHOR',
    name: 'Priya Sharma (Mumbai)',
    email: 'priya.sharma@email.com',
    password: 'Author@12345',
    detail: '2 Published Books (₹3,570 Pending)',
    color: 'border-brand/30 bg-brand/5 text-ink-900',
  },
  {
    role: 'AUTHOR',
    name: 'Sneha Kulkarni (Bangalore)',
    email: 'sneha.kulkarni@email.com',
    password: 'Author@12345',
    detail: '3 Books (1 In Production - Cover Design)',
    color: 'border-amber/30 bg-amber/5 text-ink-900',
  },
  {
    role: 'AUTHOR',
    name: 'Ananya Reddy (Hyderabad)',
    email: 'ananya.reddy@email.com',
    password: 'Author@12345',
    detail: '1 Book (₹0 Paid, ₹2,546 Pending)',
    color: 'border-sage/30 bg-sage/5 text-ink-900',
  },
];

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login(email, password);
      addToast({ type: 'success', message: `Welcome back, ${user.name}!` });

      if (user.role === 'admin') {
        navigate('/admin/tickets');
      } else {
        navigate('/author/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
      addToast({ type: 'error', message: err.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center font-serif text-2xl font-bold mx-auto shadow-md">
          B
        </div>
        <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink-950">
          BookLeaf <span className="text-brand font-normal italic">Publishing</span>
        </h2>
        <p className="mt-1 text-sm text-ink-600">
          Author Support & Communication Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-paper-200/90 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="author@email.com or admin@bookleaf.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full text-base font-semibold"
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Quick Demo Credentials Selector */}
          <div className="mt-8 pt-6 border-t border-paper-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold tracking-wider uppercase text-ink-500">
                1-Click Demo Accounts (Pre-Seeded)
              </span>
              <span className="text-[11px] text-brand font-medium">Click to Fill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => fillCredentials(acc)}
                  className={`p-3 rounded-xl border text-left transition hover:shadow-xs hover:border-brand/60 focus:outline-none ${acc.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">
                      {acc.role}
                    </span>
                    {acc.role === 'ADMIN' ? (
                      <ShieldCheck className="w-3.5 h-3.5 opacity-80" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 opacity-80" />
                    )}
                  </div>
                  <p className="text-xs font-bold mt-1 truncate">{acc.name}</p>
                  <p className="text-[11px] opacity-75 mt-0.5 leading-snug">{acc.detail}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Evaluation Note */}
        <p className="mt-4 text-center text-xs text-ink-400">
          All 10 author accounts from the sample dataset are pre-seeded and accessible.
        </p>
      </div>
    </div>
  );
};
