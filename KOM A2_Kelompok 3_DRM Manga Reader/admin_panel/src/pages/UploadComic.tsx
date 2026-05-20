import { useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, Save, Loader2 } from 'lucide-react';

export default function UploadComic() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [chapterNumber, setChapterNumber] = useState('1');
  const [chapterTitle, setChapterTitle] = useState('');
  const [genres, setGenres] = useState('Action, Fantasy');
  const [rating, setRating] = useState('0');
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  const [panelFiles, setPanelFiles] = useState<File[]>([]);
  const [panelPreviews, setPanelPreviews] = useState<{ url: string; name: string }[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    }
  };

  const handlePanelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const newPreviews = newFiles.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
      }));
      setPanelFiles((prev) => [...prev, ...newFiles]);
      setPanelPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removePanel = (index: number) => {
    setPanelFiles((prev) => prev.filter((_, i) => i !== index));
    setPanelPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setPanelFiles([]);
    setPanelPreviews([]);
  };

  const handleSubmit = async () => {
    if (!title || !author || !coverFile || panelFiles.length === 0) {
      setStatus({ type: 'error', message: 'Harap lengkapi semua data dan upload setidaknya satu panel.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: null, message: '' });

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('author', author);
      formData.append('description', synopsis);
      formData.append('chapter_number', chapterNumber);
      formData.append('chapter_title', chapterTitle || `Chapter ${chapterNumber}`);
      formData.append('genres', genres);
      formData.append('rating', rating);
      const token = localStorage.getItem('admin_token') || '';
      formData.append('admin_token', token);
      formData.append('cover', coverFile);
      
      panelFiles.forEach((file) => {
        formData.append('pages[]', file);
      });

      // Sesuaikan URL ini dengan path di XAMPP Anda
      const apiUrl = '/upload_admin.php';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.ok) {
        setStatus({ type: 'success', message: 'Komik berhasil diupload!' });
      } else {
        setStatus({ type: 'error', message: result.error || 'Terjadi kesalahan saat upload.' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatus({ type: 'error', message: 'Tidak dapat terhubung ke server.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Upload Komik / Chapter Baru</h2>
          <p className="text-gray-500 text-sm">Masukkan data komik dan panel chapter secara lengkap.</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isUploading}
          className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
            isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
          } text-white shadow-lg shadow-purple-200`}
        >
          {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {isUploading ? 'Sedang Menyimpan...' : 'Simpan Data'}
        </button>
      </div>

      {status.type && (
        <div className={`p-4 rounded-xl border ${
          status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Info Komik */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Informasi Komik</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Komik</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
                  placeholder="Masukkan judul..." 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input 
                  type="text" 
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
                  placeholder="Nama Author..." 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genres (Pisahkan dengan koma)</label>
                <input 
                  type="text" 
                  value={genres}
                  onChange={(e) => setGenres(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
                  placeholder="Action, Fantasy, Romance..." 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating Komik (0.0 - 10.0)</label>
                <input 
                  type="number" 
                  min="0"
                  max="10"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
                  placeholder="Beri rating awal..." 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sinopsis</label>
                <textarea 
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none h-32 resize-none transition-all" 
                  placeholder="Ceritakan singkat tentang komik ini..."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Upload Cover */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Cover Image</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative">
              {coverPreview ? (
                <div className="relative">
                  <img src={coverPreview} alt="Cover Preview" className="w-full h-auto rounded-lg object-cover" />
                  <button 
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                    }} 
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer py-8 flex flex-col items-center justify-center">
                  <ImageIcon size={32} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500 font-medium">Klik untuk upload cover</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverChange} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Panel Chapter */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Panel Chapter</h3>
              <div className="flex gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">No. Chapter</label>
                  <input 
                    type="number" 
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(e.target.value)}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Judul Chapter</label>
                  <input 
                    type="text" 
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="Awal mula..." 
                    className="w-48 border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                  />
                </div>
              </div>
            </div>

            <label className="border-2 border-dashed border-purple-300 bg-purple-50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 transition-colors mb-6 group">
              <UploadCloud size={48} className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-purple-900 font-medium text-lg">Pilih Semua Halaman / Panel</p>
              <p className="text-purple-600/70 text-sm mt-1">Bisa pilih banyak gambar sekaligus (JPG, PNG, WEBP)</p>
              <input type="file" multiple className="hidden" accept="image/*" onChange={handlePanelsChange} />
            </label>

            {/* Panel Previews Grid */}
            {panelPreviews.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-500 font-medium border-b border-gray-100 pb-2">
                  <span>Total Panel: {panelPreviews.length} gambar</span>
                  <button onClick={clearAll} className="text-red-500 hover:text-red-600 font-bold">Hapus Semua</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {panelPreviews.map((preview, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-[3/4] bg-gray-100">
                      <img src={preview.url} alt={`Panel ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                        <span className="text-white font-bold text-lg mb-2">#{idx + 1}</span>
                        <button onClick={() => removePanel(idx)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transform scale-90 group-hover:scale-100 transition-transform shadow-lg">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
