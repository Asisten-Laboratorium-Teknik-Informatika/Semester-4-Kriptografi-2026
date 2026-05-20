import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Settings as SettingsIcon, LogOut, HelpCircle, ChevronRight, Sparkles, Clock, Download, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Profile() {
  const { profile, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  if (loading) return null;

  const menuItems = [
    { icon: SettingsIcon, label: 'Settings', color: 'text-pastel-purple', onClick: () => navigate('/settings'), desc: 'Theme, reading mode, and storage' },
    { icon: Clock, label: 'Reading History', color: 'text-pastel-blue', onClick: () => navigate('/history'), desc: 'Continue where you left off' },
    { icon: Download, label: 'Offline Downloads', color: 'text-pastel-orange', onClick: () => navigate('/downloads'), desc: 'Manage your saved chapters' },
    { icon: HelpCircle, label: 'Help & Support', color: 'text-pastel-green', onClick: () => {}, desc: 'FAQ and contact us' },
  ];

  return (
    <div className="space-y-10">
      <header className="text-center pt-4">
        <div className="relative inline-block mb-6">
          <div className="w-28 h-28 rounded-full border-4 border-pastel-cardbg shadow-xl overflow-hidden bg-pastel-cardbg flex items-center justify-center">
            {profile ? (
              <img 
                src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} 
                alt={profile.displayName} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={48} className="text-pastel-muted opacity-40" />
            )}
          </div>
          {profile && (
            <div className="absolute bottom-1 right-1 bg-pastel-pink p-2 rounded-full border-4 border-pastel-bg text-white shadow-lg">
              <Sparkles size={16} />
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold">{profile ? profile.displayName : 'Guest User'}</h1>
        <p className="text-pastel-muted text-sm mt-1">{profile ? profile.email : 'Sign in to sync your data'}</p>
      </header>

      <div className="space-y-4">
        <p className="text-[10px] font-bold text-pastel-muted uppercase tracking-[0.2em] px-4">Menu</p>
        <div className="pastel-card overflow-hidden border border-pastel-border">
          {menuItems.map((item, index) => (
            <button 
              key={index}
              onClick={item.onClick}
              className={`w-full flex items-center gap-4 p-5 hover:bg-pastel-bg transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-pastel-border' : ''
              }`}
            >
              <div className={`p-2.5 rounded-2xl bg-pastel-cardbg shadow-none border border-pastel-border ${item.color}`}>
                <item.icon size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-pastel-heading">{item.label}</p>
                <p className="text-[10px] text-pastel-muted mt-0.5">{item.desc}</p>
              </div>
              <ChevronRight size={18} className="text-pastel-muted opacity-50" />
            </button>
          ))}
        </div>

        {profile ? (
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-5 rounded-3xl bg-pastel-light text-pastel-heading font-bold text-sm hover:bg-pastel-border transition-colors border border-pastel-border mt-4"
          >
            <LogOut size={18} />
            Sign Out
          </motion.button>
        ) : (
          <Link to="/login">
            <motion.button 
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 p-5 rounded-3xl bg-pastel-pink text-white font-bold text-sm shadow-lg shadow-pastel-pink/20 mt-4"
            >
              <LogIn size={18} />
              Sign In / Sign Up
            </motion.button>
          </Link>
        )}
      </div>

      <footer className="text-center pb-10">
        <p className="text-[10px] text-pastel-muted opacity-50 uppercase tracking-widest">Pastel Comics v1.0.0</p>
      </footer>
    </div>
  );
}
