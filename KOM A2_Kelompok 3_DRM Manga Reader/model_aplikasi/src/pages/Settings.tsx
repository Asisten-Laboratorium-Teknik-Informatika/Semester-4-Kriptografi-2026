import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  User, 
  Bell, 
  Moon, 
  Trash2, 
  Info, 
  Shield, 
  Globe,
  Smartphone,
  BookOpen
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

interface SettingsItem {
  icon: React.ReactNode;
  label: string;
  value?: string | boolean;
  type?: 'toggle' | 'link';
  onClick?: () => void;
  danger?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

export default function Settings() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const sections: SettingsSection[] = [
    {
      title: 'Account',
      items: [
        { icon: <User size={18} />, label: 'Profile Settings', value: user?.displayName || 'Guest', onClick: () => navigate('/profile') },
        { icon: <Shield size={18} />, label: 'Privacy & Security', onClick: () => {} },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: <Moon size={18} />, 
          label: 'Dark Mode', 
          type: 'toggle', 
          value: isDarkMode, 
          onClick: toggleTheme 
        },
        { 
          icon: <BookOpen size={18} />, 
          label: 'Reading Mode', 
          value: 'Webtoon (Vertical)', 
          onClick: () => {} 
        },
        { 
          icon: <Globe size={18} />, 
          label: 'Language', 
          value: 'English', 
          onClick: () => {} 
        },
      ]
    },
    {
      title: 'Storage & Data',
      items: [
        { 
          icon: <Trash2 size={18} />, 
          label: 'Clear Cache', 
          onClick: () => {
            if (window.confirm('Clear all cached images and data?')) {
              localStorage.clear();
              window.location.reload();
            }
          },
          danger: true
        },
        { icon: <Smartphone size={18} />, label: 'Offline Downloads', value: 'Manage', onClick: () => navigate('/downloads') },
      ]
    },
    {
      title: 'About',
      items: [
        { icon: <Info size={18} />, label: 'App Version', value: '1.0.0 (Stable)' },
        { icon: <Bell size={18} />, label: 'Terms of Service', onClick: () => {} },
      ]
    }
  ];

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-pastel-cardbg rounded-xl shadow-sm text-pastel-text active:scale-90 transition-transform"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-pastel-heading">Settings</h1>
      </div>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <motion.div 
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <h3 className="px-2 mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-pastel-muted">
              {section.title}
            </h3>
            
            <div className="bg-pastel-cardbg rounded-[2rem] overflow-hidden shadow-sm border border-pastel-border">
              {section.items.map((item, itemIdx) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  disabled={!item.onClick}
                  className={`w-full flex items-center justify-between p-5 transition-colors active:bg-pastel-light ${
                    itemIdx !== section.items.length - 1 ? 'border-b border-pastel-border' : ''
                  }`}
                >
                  <div className={`flex items-center gap-4 ${item.danger ? 'text-red-400' : 'text-pastel-text'}`}>
                    <div className={`p-2 rounded-xl ${item.danger ? 'bg-red-50' : 'bg-pastel-light'}`}>
                      {item.icon}
                    </div>
                    <span className="font-bold text-sm">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.type === 'toggle' ? (
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${item.value ? 'bg-pastel-pink' : 'bg-pastel-muted/30'}`}>
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${item.value ? 'left-6' : 'left-1'}`} />
                      </div>
                    ) : (
                      item.value && (
                        <span className="text-[10px] font-bold text-pastel-muted bg-pastel-light px-2 py-1 rounded-lg">
                          {item.value}
                        </span>
                      )
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-4"
          >
            <button 
              onClick={logout}
              className="w-full p-5 bg-white border-2 border-pastel-pink/20 text-pastel-pink font-black rounded-[2rem] shadow-sm active:scale-95 transition-all"
            >
              Sign Out
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
