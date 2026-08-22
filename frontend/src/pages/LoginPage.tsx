import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { ArrowRight, AlertCircle, Loader2, Lock, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] text-[#183D40] flex flex-col justify-between">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white border border-[#D0E2E2] rounded-3xl p-6 sm:p-10 shadow-xl shadow-[#183D40]/5">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#183D40] tracking-tight">Welcome Back</h2>
            <p className="text-xs text-[#5A7E81] mt-1 font-sans">Sign in to access your transcribed handwritten notes</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-2.5 text-xs text-red-700 shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#235D62] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5A7E81] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-[#F4F8F8] border border-[#D0E2E2] rounded-2xl text-sm text-[#183D40] focus:outline-none focus:border-[#235D62] transition-colors font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-[#235D62] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5A7E81] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-[#F4F8F8] border border-[#D0E2E2] rounded-2xl text-sm text-[#183D40] focus:outline-none focus:border-[#235D62] transition-colors font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 px-4 bg-[#235D62] hover:bg-[#1C4E52] text-white font-bold rounded-full disabled:opacity-50 transition-all flex items-center justify-center space-x-2 text-xs shadow-md shadow-[#235D62]/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#78C0BD]" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#D0E2E2] text-center">
            <p className="text-xs text-[#5A7E81]">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-[#235D62] hover:underline">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>

      <footer className="bg-[#143639] border-t border-[#1C4F53] py-4 px-4 text-center text-xs font-mono text-[#78C0BD]">
        Scriptly HTR &copy; {new Date().getFullYear()} — Deep Teal AI Engine
      </footer>
    </div>
  );
};
