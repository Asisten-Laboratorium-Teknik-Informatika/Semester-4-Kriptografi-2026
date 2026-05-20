import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Sparkles, ChevronLeft, AlertCircle } from 'lucide-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName) throw new Error('Display name is required.');
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
      navigate('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center px-4">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="fixed top-8 left-6 p-2 bg-white rounded-xl shadow-sm border border-pastel-border text-pastel-text active:scale-90 transition-transform"
      >
        <ChevronLeft size={24} />
      </button>

      <div className="w-full max-w-sm mx-auto space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-[2rem] bg-pastel-pink/10 text-pastel-pink mb-2">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-pastel-heading">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-sm text-pastel-muted">
            {isSignUp ? 'Join our community of readers' : 'Log in to continue your adventure'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-xs font-bold"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {isSignUp && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-pastel-muted group-focus-within:text-pastel-pink transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-pastel-light border-2 border-transparent focus:border-pastel-pink/30 focus:bg-white outline-none transition-all text-sm font-medium"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-pastel-muted group-focus-within:text-pastel-pink transition-colors" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-pastel-light border-2 border-transparent focus:border-pastel-pink/30 focus:bg-white outline-none transition-all text-sm font-medium"
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pastel-muted group-focus-within:text-pastel-pink transition-colors" size={18} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-pastel-light border-2 border-transparent focus:border-pastel-pink/30 focus:bg-white outline-none transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-pastel-pink text-white font-black shadow-lg shadow-pastel-pink/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Sign Up' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-pastel-muted hover:text-pastel-pink transition-colors"
          >
            {isSignUp ? (
              <>Already have an account? <span className="text-pastel-pink">Sign In</span></>
            ) : (
              <>Don't have an account? <span className="text-pastel-pink">Sign Up</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
