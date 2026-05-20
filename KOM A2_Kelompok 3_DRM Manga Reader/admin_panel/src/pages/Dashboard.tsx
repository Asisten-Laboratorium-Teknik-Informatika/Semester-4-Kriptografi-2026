import { useEffect, useState } from 'react';
import { Book, Users, Eye, TrendingUp, Loader2, Search, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardData {
  stats: {
    total_comics: number;
    total_chapters: number;
    total_users: number;
  };
  recent_comics: {
    id: number;
    title: string;
    author: string;
    rating: string;
    status: string;
    created_at: string;
  }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('admin_token') || '';
        const res = await fetch(`/admin_dashboard_api.php?admin_token=${encodeURIComponent(token)}`);
        const result = await res.json();

        if (result.ok && result.data) {
          setData(result.data);
        } else {
          setError(result.error || 'Gagal mengambil data dashboard');
        }
      } catch (err) {
        setError('Koneksi ke server gagal. Pastikan XAMPP dan backend menyala.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleDeleteComic = async (comicId: number, title: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus komik "${title}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/admin_delete_comic.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_token: token, comic_id: comicId })
      });
      const result = await res.json();

      if (result.ok) {
        // Refresh data
        setData(prevData => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            stats: {
              ...prevData.stats,
              total_comics: prevData.stats.total_comics - 1
            },
            recent_comics: prevData.recent_comics.filter(c => c.id !== comicId)
          };
        });
        alert('Komik berhasil dihapus');
      } else {
        alert(result.error || 'Gagal menghapus komik');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus komik');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200">
        <h3 className="font-bold text-lg mb-2">Terjadi Kesalahan</h3>
        <p>{error}</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Komik', value: data?.stats.total_comics ?? 0, icon: Book, color: 'bg-blue-500' },
    { label: 'Total Pengguna', value: data?.stats.total_users ?? 0, icon: Users, color: 'bg-purple-500' },
    { label: 'Sistem API', value: 'Online', icon: TrendingUp, color: 'bg-orange-500' },
  ];

  const filteredComics = data?.recent_comics?.filter(comic => 
    comic.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    comic.author.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-lg text-white ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-8 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-gray-800">Manajemen Komik</h3>
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Cari judul atau author..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-colors"
            />
          </div>
        </div>
        
        {filteredComics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600 text-sm">Judul</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Author</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Rating</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Tanggal</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredComics.map((comic) => (
                  <tr key={comic.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{comic.title}</td>
                    <td className="p-4 text-gray-600">{comic.author}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${comic.status === 'ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {comic.status}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-orange-600">⭐ {comic.rating}</td>
                    <td className="p-4 text-gray-500 text-sm">{new Date(comic.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <Link 
                        to={`/edit/${comic.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                      >
                        <Edit size={16} /> Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteComic(comic.id, comic.title)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={16} /> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? `Tidak ada komik yang cocok dengan "${searchQuery}".` : 'Belum ada data komik di database. Silakan tambah komik baru.'}
          </div>
        )}
      </div>
    </div>
  );
}
