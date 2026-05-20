import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Library, Search, History, User, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { icon: Library, label: 'Library', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: History, label: 'History', path: '/history' },
  { icon: Download, label: 'Downloads', path: '/downloads' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function Layout() {
  const location = useLocation();

  // Hide bottom nav on specific pages like Reader or Auth
  const isReader = location.pathname.includes('/read/');
  const hideNav = ['/login', '/register'].some(p => location.pathname.startsWith(p)) || isReader;

  return (
    <div className={`min-h-screen ${hideNav ? '' : 'pb-24'}`}>
      <main className={isReader ? 'w-full min-h-screen bg-black' : 'max-w-md mx-auto px-6 pt-8'}>
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-md mx-auto bg-pastel-cardbg border-t border-pastel-border p-4 flex justify-around shadow-lg transition-colors duration-300">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `flex flex-col items-center gap-1 transition-colors ${
                    isActive ? 'text-pastel-pink' : 'text-pastel-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                    >
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    </motion.div>
                    <span className={`text-[9px] ${isActive ? 'font-bold' : ''}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
