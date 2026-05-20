import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, BookOpen, LogOut, Users as UsersIcon } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import UploadComic from './pages/UploadComic';
import EditComic from './pages/EditComic';
import EditChapter from './pages/EditChapter';
import Login from './pages/Login';
import Users from './pages/Users';

function Sidebar({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload Komik', icon: Upload },
    { path: '/users', label: 'Pengguna', icon: UsersIcon }
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <BookOpen className="text-purple-600" size={28} />
        <h1 className="text-xl font-bold text-gray-800">Komikan <span className="text-purple-600">Admin</span></h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
              location.pathname === item.path 
                ? 'bg-purple-50 text-purple-700' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors font-medium"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));

  const handleLogin = (newToken: string) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 ml-64 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadComic />} />
            <Route path="/users" element={<Users />} />
            <Route path="/edit/:id" element={<EditComic />} />
            <Route path="/edit-chapter/:comicId/:chapterId" element={<EditChapter />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
