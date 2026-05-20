import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X, Save, Loader2, ArrowLeft, Trash2, Edit, Plus, UploadCloud } from 'lucide-react';

export default function EditComic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genres, setGenres] = useState('');
  const [rating, setRating] = useState('0');
  const [statusText, setStatusText] = useState('ongoing'); // renamed from status
  
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  const [chapters, setChapters] = useState<any[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Add Chapter State
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterNumber, setNewChapterNumber] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterFiles, setNewChapterFiles] = useState<File[]>([]);
  const [newChapterPreviews, setNewChapterPreviews] = useState<{url: string, name: string}[]>([]);
  const [isAddingChapter, setIsAddingChapter] = useState(false);

  useEffect(() => {
    const fetchComic = async () => {
      try {
        const res = await fetch(`/api.php?action=comic&id=${id}`);
        const result = await res.json();

        if (result.ok && result.data) {
          const comic = result.data;
          setTitle(comic.title);
          setAuthor(comic.author);
          setSynopsis(comic.description);
          setGenres(comic.genres.join(', '));
          setRating(comic.rating.toString());
          setStatusText(comic.status);
          setCoverUrl(comic.coverUrl);

          const chapRes = await fetch(`/api.php?action=chapters&comic_id=${id}`);
          const chapResult = await chapRes.json();
          if (chapResult.ok) {
            setChapters(chapResult.data);
          }
        } else {
          setError('Komik tidak ditemukan.');
        }
      } catch (err) {
        setError('Gagal mengambil data komik.');
      } finally {
        setLoading(false);
      }
    };
    fetchComic();
  }, [id]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async () => {
    if (!title || !author) {
      setUpdateStatus({ type: 'error', message: 'Judul dan Author harus diisi.' });
      return;
    }

    setIsUploading(true);
    setUpdateStatus({ type: null, message: '' });

    try {
      const formData = new FormData();
      formData.append('id', id || '0');
      formData.append('title', title);
      formData.append('author', author);
      formData.append('description', synopsis);
      formData.append('genres', genres);
      formData.append('rating', rating);
      formData.append('status', statusText);
      
      const token = localStorage.getItem('admin_token') || '';
      formData.append('admin_token', token);
      
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const res = await fetch('/admin_update_comic.php', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (result.ok) {
        setUpdateStatus({ type: 'success', message: 'Data komik berhasil diperbarui!' });
      } else {
        setUpdateStatus({ type: 'error', message: result.error || 'Gagal update komik.' });
      }
    } catch (err) {
      setUpdateStatus({ type: 'error', message: 'Koneksi ke server gagal saat update.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm('Yakin ingin menghapus chapter ini beserta seluruh gambarnya?')) return;
    
    try {
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch(`/admin_delete_chapter.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_token: token, chapter_id: chapterId })
      });
      const result = await res.json();
      if (result.ok) {
        setChapters(prev => prev.filter(c => c.id !== chapterId));
        alert('Chapter berhasil dihapus!');
      } else {
        alert(result.error || 'Gagal menghapus chapter');
      }
    } catch (err) {
      alert('Koneksi gagal');
    }
  };

  const handleNewChapterFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const newPreviews = newFiles.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
      }));
      setNewChapterFiles((prev) => [...prev, ...newFiles]);
      setNewChapterPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeNewChapterFile = (index: number) => {
    setNewChapterFiles((prev) => prev.filter((_, i) => i !== index));
    setNewChapterPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddChapterSubmit = async () => {
    if (!newChapterNumber || newChapterFiles.length === 0) {
      alert('Harap isi nomor chapter dan pilih minimal 1 gambar panel.');
      return;
    }
    
    setIsAddingChapter(true);
    try {
      const formData = new FormData();
      formData.append('comic_id', id || '0');
      formData.append('chapter_number', newChapterNumber);
      formData.append('chapter_title', newChapterTitle || `Chapter ${newChapterNumber}`);
      const token = localStorage.getItem('admin_token') || '';
      formData.append('admin_token', token);
      
      newChapterFiles.forEach((file) => formData.append('pages[]', file));

      const res = await fetch('/admin_add_chapter.php', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (result.ok) {
        alert('Chapter berhasil ditambahkan!');
        // Refresh chapter list
        const chapRes = await fetch(`/api.php?action=chapters&comic_id=${id}`);
        const chapResult = await chapRes.json();
        if (chapResult.ok) setChapters(chapResult.data);
        
        // Reset form
        setShowAddChapter(false);
        setNewChapterNumber('');
        setNewChapterTitle('');
        setNewChapterFiles([]);
        setNewChapterPreviews([]);
      } else {
        alert(result.error || 'Gagal menambah chapter.');
      }
    } catch (err) {
      alert('Koneksi gagal saat menambah chapter.');
    } finally {
      setIsAddingChapter(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-purple-600" size={32} /></div>;
  if (error) return <div className="text-red-500 text-center p-12">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Edit Komik</h2>
            <p className="text-gray-500 text-sm">Ubah detail komik (Data Chapter tidak diubah di sini).</p>
          </div>
        </div>
        <button 
          onClick={handleUpdate}
          disabled={isUploading}
          className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
            isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
          } text-white shadow-lg shadow-purple-200`}
        >
          {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isUploading ? 'Menyimpan...' : 'Update Data'}
        </button>
      </div>

      {updateStatus.type && (
        <div className={`p-4 rounded-xl border ${updateStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {updateStatus.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Informasi Utama</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Komik</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
            <input type="text" value={author} onChange={e => setAuthor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <input type="number" min="0" max="10" step="0.1" value={rating} onChange={e => setRating(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={statusText} onChange={e => setStatusText(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none">
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Genres</label>
            <input type="text" value={genres} onChange={e => setGenres(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Action, Fantasy..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sinopsis</label>
            <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none"></textarea>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Ubah Cover Image</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative">
            {coverPreview || coverUrl ? (
              <div className="relative">
                <img src={coverPreview || coverUrl || ''} alt="Cover Preview" className="w-full h-auto max-h-[400px] rounded-lg object-contain bg-black" />
                <button 
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                  }} 
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-md"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer py-12 flex flex-col items-center justify-center">
                <ImageIcon size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 font-medium">Pilih gambar cover baru</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleCoverChange} />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">Jika tidak ingin mengubah cover, biarkan saja (jangan klik silang).</p>
        </div>
      </div>

      {/* Chapter List Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800">Daftar Chapter</h3>
          <button 
            onClick={() => setShowAddChapter(!showAddChapter)}
            className="px-4 py-2 bg-purple-100 text-purple-700 font-medium rounded-lg text-sm hover:bg-purple-200 transition-colors flex items-center gap-2"
          >
            {showAddChapter ? <X size={16} /> : <Plus size={16} />}
            {showAddChapter ? 'Batal Tambah' : 'Tambah Chapter'}
          </button>
        </div>

        {showAddChapter && (
          <div className="mb-8 p-6 bg-purple-50 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-900 mb-4">Form Tambah Chapter Baru</h4>
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">No. Chapter *</label>
                <input type="number" value={newChapterNumber} onChange={e => setNewChapterNumber(e.target.value)} className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="1.5" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Judul Chapter</label>
                <input type="text" value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Awal mula..." />
              </div>
            </div>

            <label className="border-2 border-dashed border-purple-300 bg-white rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition-colors mb-4 group">
              <UploadCloud size={48} className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-purple-900 font-medium text-lg">Pilih Gambar Panel Chapter</p>
              <input type="file" multiple className="hidden" accept="image/*" onChange={handleNewChapterFilesChange} />
            </label>

            {newChapterPreviews.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2 font-medium">
                  <span>Total: {newChapterPreviews.length} Panel</span>
                  <button onClick={() => { setNewChapterFiles([]); setNewChapterPreviews([]); }} className="text-red-500">Hapus Semua</button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {newChapterPreviews.map((p, idx) => (
                    <div key={idx} className="relative group aspect-[3/4] bg-gray-200 rounded overflow-hidden">
                      <img src={p.url} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white font-bold mb-4 absolute">#{idx + 1}</span>
                        <button onClick={() => removeNewChapterFile(idx)} className="bg-red-500 text-white p-1 rounded-full"><X size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button 
                onClick={handleAddChapterSubmit}
                disabled={isAddingChapter}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                {isAddingChapter ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Chapter Baru
              </button>
            </div>
          </div>
        )}

        {chapters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600 text-sm w-24">Chapter</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Judul</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Tanggal Rilis</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {chapters.map((chap) => (
                  <tr key={chap.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-purple-600">Ch. {chap.number}</td>
                    <td className="p-4 text-gray-800 font-medium">{chap.title}</td>
                    <td className="p-4 text-gray-500 text-sm">{new Date(chap.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => navigate(`/edit-chapter/${id}/${chap.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Edit size={16} /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteChapter(chap.id)}
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
          <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
            Belum ada chapter untuk komik ini.
          </div>
        )}
      </div>
    </div>
  );
}
