import { useState, useEffect } from 'react';
import { Users as UsersIcon } from 'lucide-react';

interface User {
  id: number;
  email: string;
  display_name: string;
  photo_url: string | null;
  password?: string;
  created_at: string;
  updated_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/admin_users_api.php?admin_token=${encodeURIComponent(localStorage.getItem('admin_token') || '')}`);
      const data = await response.json();
      
      if (data.ok && data.data) {
        setUsers(data.data.users);
      } else {
        setError(data.error || 'Gagal mengambil data user');
      }
    } catch (err) {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Manajemen Pengguna</h1>
          <p className="text-gray-500 mt-1">Lihat daftar seluruh pengguna yang terdaftar di aplikasi.</p>
        </div>
        <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
          <UsersIcon size={20} />
          Total: {users.length} User
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600">ID</th>
                <th className="p-4 font-semibold text-gray-600">Nama Lengkap</th>
                <th className="p-4 font-semibold text-gray-600">Email</th>
                <th className="p-4 font-semibold text-gray-600">Password</th>
                <th className="p-4 font-semibold text-gray-600">Tanggal Daftar</th>
                <th className="p-4 font-semibold text-gray-600">Terakhir Update</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Belum ada pengguna terdaftar.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-gray-500">#{user.id}</td>
                    <td className="p-4 font-medium text-gray-800 flex items-center gap-3">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt={user.display_name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                          {user.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {user.display_name}
                    </td>
                    <td className="p-4 text-gray-600">{user.email}</td>
                    <td className="p-4 text-gray-600 font-mono text-xs">{user.password || 'N/A'}</td>
                    <td className="p-4 text-gray-500">{new Date(user.created_at).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-gray-500">{new Date(user.updated_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
