import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Save, Loader2, ArrowLeft, UploadCloud } from 'lucide-react';

export default function EditChapter() {
  const { comicId, chapterId } = useParams<{ comicId: string, chapterId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  
  const [existingPages, setExistingPages] = useState<any[]>([]);
  const [deletedPageIds, setDeletedPageIds] = useState<string[]>([]);
  
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<{url: string, name: string}[]>([]);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        const res = await fetch(`/api.php?action=chapter&comic_id=${comicId}&chapter_id=${chapterId}`);
        const result = await res.json();

        if (result.ok && result.data) {
          const chap = result.data;
          setNumber(chap.number.toString());
          setTitle(chap.title);
          setExistingPages(chap.pages || []);
        } else {
          setError('Chapter tidak ditemukan.');
        }
      } catch (err) {
        setError('Gagal mengambil data chapter.');
      } finally {
        setLoading(false);
      }
    };
    fetchChapter();
  }, [comicId, chapterId]);

  const handleNewFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const addedFiles = Array.from(files);
      const addedPreviews = addedFiles.map(file => ({
        url: URL.createObjectURL(file),
        name: file.name,
      }));
      setNewFiles(prev => [...prev, ...addedFiles]);
      setNewPreviews(prev => [...prev, ...addedPreviews]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDeleteExisting = (pageId: string) => {
    console.log("Panel clicked! ID:", pageId);
    if (deletedPageIds.includes(pageId)) {
      setDeletedPageIds(prev => prev.filter(id => id !== pageId));
    } else {
      setDeletedPageIds(prev => [...prev, pageId]);
    }
  };

  const handleUpdate = async () => {
    console.log("Simpan Perubahan clicked!");
    if (!number) {
      alert("Nomor chapter kosong");
      setStatus({ type: 'error', message: 'Nomor chapter tidak boleh kosong.' });
      return;
    }

    setIsUpdating(true);
    setStatus({ type: null, message: '' });

    try {
      const formData = new FormData();
      formData.append('chapter_id', chapterId || '0');
      formData.append('chapter_number', number);
      formData.append('chapter_title', title);
      formData.append('deleted_page_ids', deletedPageIds.join(','));
      
      const token = localStorage.getItem('admin_token') || '';
      formData.append('admin_token', token);
      
      newFiles.forEach((file) => formData.append('new_pages[]', file));

      const res = await fetch('/admin_update_chapter.php', {
        method: 'POST',
        body: formData,
      });

      console.log("Fetch response received", res.status);
      const result = await res.json();
      console.log("Fetch JSON:", result);

      if (result.ok) {
        setStatus({ type: 'success', message: 'Chapter berhasil diperbarui!' });
        // Refresh page after a short delay
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus({ type: 'error', message: result.error || 'Gagal update chapter.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Koneksi ke server gagal saat update chapter.' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-purple-600" size={32} /></div>;
  if (error) return <div className="text-red-500 text-center p-12">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/edit/${comicId}`)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Edit Data Chapter</h2>
            <p className="text-gray-500 text-sm">Ubah info chapter dan kelola panel gambar.</p>
          </div>
        </div>
        <button 
          onClick={handleUpdate}
          disabled={isUpdating}
          className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
            isUpdating ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
          } text-white shadow-lg shadow-purple-200`}
        >
          {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

      {status.type && (
        <div className={`p-4 rounded-xl border ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {status.message}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Informasi Chapter</h3>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Chapter</label>
            <input type="number" step="0.1" value={number} onChange={e => setNumber(e.target.value)} className="w-32 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Chapter</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Panel Yang Sudah Ada</h3>
        <p className="text-sm text-gray-500 mb-4">Pilih panel yang ingin kamu Hapus dari chapter ini. (Kotak merah = Akan dihapus).</p>
        
        {existingPages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {existingPages.map((page, idx) => {
              const isDeleted = deletedPageIds.includes(page.id);
              return (
                <div 
                  key={page.id} 
                  onClick={() => toggleDeleteExisting(page.id)}
                  className={`relative cursor-pointer group aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                    isDeleted ? 'border-red-500 scale-95 opacity-50' : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <img src={page.streamUrl} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="bg-black/70 text-white px-2 py-1 rounded text-xs font-bold mb-2">Panel {idx + 1}</span>
                    {isDeleted && <span className="bg-red-500 text-white font-bold px-2 py-1 rounded text-sm">AKAN DIHAPUS</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 italic">Tidak ada panel di chapter ini.</p>
        )}
      </div>

      <div className="bg-purple-50 p-6 rounded-xl shadow-sm border border-purple-100 space-y-4">
        <h3 className="text-lg font-bold text-purple-900 mb-2">Tambah Panel Baru</h3>
        <p className="text-sm text-purple-700 mb-4">Gambar baru akan otomatis diletakkan di bagian paling akhir chapter.</p>
        
        <label className="border-2 border-dashed border-purple-300 bg-white rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition-colors mb-4 group">
          <UploadCloud size={48} className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
          <p className="text-purple-900 font-medium text-lg">Pilih Gambar Tambahan</p>
          <input type="file" multiple className="hidden" accept="image/*" onChange={handleNewFilesChange} />
        </label>

        {newPreviews.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span>Tambahan: {newPreviews.length} Panel</span>
              <button onClick={() => { setNewFiles([]); setNewPreviews([]); }} className="text-red-500 font-bold">Hapus Tambahan</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {newPreviews.map((p, idx) => (
                <div key={idx} className="relative group aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden border border-purple-200">
                  <img src={p.url} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <button onClick={() => removeNewFile(idx)} className="bg-red-500 text-white p-2 rounded-full shadow-lg"><X size={16}/></button>
                  </div>
                  <span className="absolute bottom-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">Baru +{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
