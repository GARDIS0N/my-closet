import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../services/authContext.js';
import { showToast } from '../common/Toast.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, register, resetPassword, switchToGuestMode } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (tab === 'login') {
      const res = await login(email, password);
      setLoading(false);
      if (res.success) {
        showToast('success', 'Welcome back!', 'Signed into your wardrobe.');
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to sign in. Please verify your credentials.');
      }
    } else if (tab === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your name.');
        setLoading(false);
        return;
      }
      const res = await register(email, password, fullName);
      setLoading(false);
      if (res.success) {
        showToast('success', 'Account created!', 'Welcome to MyCloset.');
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg(res.error || 'Could not complete registration.');
      }
    } else if (tab === 'forgot') {
      const res = await resetPassword(email);
      setLoading(false);
      if (res.success) {
        setResetSent(true);
        showToast('info', 'Check your email', 'Password reset instructions sent.');
      } else {
        setErrorMsg(res.error || 'Failed to send password reset email.');
      }
    }
  };

  const handleGuestAccess = async () => {
    await switchToGuestMode();
    showToast('success', 'Guest Mode Activated', 'Exploring with full offline/local storage.');
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1E392A] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Sparkles className="w-6 h-6 text-[#C2A674]" />
          </div>
          <h2 className="font-editorial text-2xl font-bold text-[#1C1917]">
            {tab === 'login' ? 'Welcome to MyCloset' : tab === 'register' ? 'Create Your Wardrobe' : 'Reset Password'}
          </h2>
          <p className="text-xs text-stone-600 max-w-xs mx-auto">
            {tab === 'login'
              ? 'Access your clothes, saved outfits, and personalized styling recommendations.'
              : tab === 'register'
              ? 'Your private digital wardrobe and personal AI stylist.'
              : 'Enter your account email to receive recovery instructions.'}
          </p>
        </div>

        {/* Tab Switcher */}
        {tab !== 'forgot' && (
          <div className="flex p-1 bg-stone-200/60 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                tab === 'login' ? 'bg-white text-[#1C1917] shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                tab === 'register' ? 'bg-white text-[#1C1917] shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Password Reset Confirmation */}
        {resetSent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#1E392A] mx-auto" />
            <p className="text-sm font-medium text-stone-800">
              Recovery instructions sent to {email}.
            </p>
            <button
              type="button"
              onClick={() => { setTab('login'); setResetSent(false); }}
              className="text-xs font-semibold text-[#1E392A] underline cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#1E392A] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#1E392A] transition-colors"
                />
              </div>
            </div>

            {tab !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-stone-700">
                    Password
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setTab('forgot')}
                      className="text-[11px] text-[#1E392A] hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:border-[#1E392A] transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1E392A] hover:bg-[#15291E] disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{tab === 'login' ? 'Sign In' : tab === 'register' ? 'Create Account' : 'Send Reset Link'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Guest Mode Option */}
        <div className="pt-2 border-t border-[#E8E2D8] text-center space-y-2">
          <button
            type="button"
            onClick={handleGuestAccess}
            className="w-full py-2 px-3 border border-stone-300 hover:border-stone-400 bg-white/70 hover:bg-white text-stone-700 text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C2A674]" />
            <span>Continue as Guest (Private Local Storage)</span>
          </button>
          {tab === 'forgot' && (
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(null); }}
              className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
