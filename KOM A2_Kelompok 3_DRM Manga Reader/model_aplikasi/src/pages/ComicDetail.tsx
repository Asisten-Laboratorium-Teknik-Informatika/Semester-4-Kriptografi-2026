import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Comic, Chapter } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Heart, Play, Search, Download, CheckCircle } from 'lucide-react';
import { handleApiError } from '../utils';
import { downloadChapter, removeChapterOffline, getDownloadedChapters } from '../services/offlineStorage';
import { api } from '../services/api';

export default function ComicDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [comic, setComic] = useState<Comic | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapterSearch, setChapterSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const [downloadedChapters, setDownloadedChapters] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [comicData, chapterData] = await Promise.all([
          api.comic(id),
          api.chapters(id),
        ]);
        setComic(comicData);
        setChapters(chapterData);

        const offline = await getDownloadedChapters(id);
        setDownloadedChapters(new Set(offline.map(c => c.id)));

        if (user) {
          const favorites = await api.favorites();
          setIsFavorite(favorites.some((favorite) => favorite.id === id));
        } else {
          setIsFavorite(false);
        }
      } catch (err) {
        handleApiError(err, `comic/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!user || !id) return;
    try {
      if (isFavorite) {
        await api.removeFavorite(id);
        setIsFavorite(false);
      } else {
        await api.addFavorite(id);
        setIsFavorite(true);
      }
    } catch (err) {
      handleApiError(err, 'favorite toggle');
    }
  };

  const handleDownloadToggle = async (e: React.MouseEvent, chapter: Chapter) => {
    e.preventDefault();
    e.stopPropagation();
    if (!comic) return;

    if (downloadedChapters.has(chapter.id)) {
      try {
        setDownloadError('');
        await removeChapterOffline(comic.id, chapter.id);
        setDownloadedChapters(prev => {
          const next = new Set(prev);
          next.delete(chapter.id);
          return next;
        });
      } catch (e) {
        console.error(e);
        setDownloadError('Remove download failed');
      }
    } else {
      setDownloading(chapter.id);
      setDownloadProgress(0);
      setDownloadError('');
      try {
        await downloadChapter(comic, chapter, setDownloadProgress);
        setDownloadedChapters(prev => new Set(prev).add(chapter.id));
      } catch (e) {
        console.error(e);
        setDownloadError(e instanceof Error ? e.message : 'Download failed');
      } finally {
        setDownloading(null);
        setDownloadProgress(0);
      }
    }
  };

  if (loading) return null;
  if (!comic) return <div className="text-center py-20">Comic not found</div>;

  const filteredChapters = chapters.filter(c => 
    c.title.toLowerCase().includes(chapterSearch.toLowerCase()) || 
    c.number.toString().includes(chapterSearch)
  );

  return (
    <div className="-mx-6 -mt-8 pb-12 bg-pastel-detailbg text-pastel-detailtext min-h-screen flex flex-col transition-colors duration-300">
      {/* Header / Hero */}
      <div className="pt-8 px-6 relative mb-4">
        <div className="flex justify-between items-center z-10 mb-6">
          <Link to="/" className="p-2 bg-pastel-cardbg/20 hover:bg-pastel-cardbg/30 backdrop-blur rounded-xl shadow-sm transition-colors text-pastel-detailtext">
            <ChevronLeft size={24} />
          </Link>
        </div>

        <div className="relative">
          <div className="w-full aspect-square md:aspect-video bg-pastel-light rounded-3xl overflow-hidden shadow-xl border-4 border-pastel-cardbg/20">
            <img 
              src={comic.coverUrl} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
          <button 
            onClick={toggleFavorite}
            disabled={!user}
            className={`absolute -bottom-4 right-6 w-14 h-14 border-4 border-pastel-detailbg rounded-full flex items-center justify-center shadow-lg transition-colors ${
              isFavorite ? 'bg-pastel-cardbg text-pastel-pink' : 'bg-pastel-orange text-white'
            }`}
            title={user ? 'Toggle favorite' : 'Sign in to favorite'}
          >
            <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
          </button>
        </div>
      </div>

      <div className="px-6 space-y-4">
        <div>
          <h1 className="text-3xl font-black mb-1 leading-tight">{comic.title}</h1>
          <p className="text-xs text-pastel-detailtext/90">
            By {comic.author} • ⭐ {comic.rating.toFixed(1)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-bold ${
            comic.status === 'ongoing' ? 'bg-pastel-green text-green-800 dark:text-green-900' : 'bg-pastel-blue text-blue-800 dark:text-blue-900'
          }`}>
            {comic.status}
          </span>
          {comic.genres.map(g => (
            <span key={g} className="px-2 py-1 bg-pastel-cardbg/20 rounded-lg text-[10px] font-medium backdrop-blur-sm">
              {g}
            </span>
          ))}
        </div>

        <div className="bg-pastel-cardbg/10 backdrop-blur-md rounded-2xl p-4">
          <p className="text-xs leading-relaxed opacity-95">
            {comic.description}
          </p>
        </div>

        <div className="pb-4">
          <Link 
            to={chapters.length > 0 ? `/read/${comic.id}/${chapters[chapters.length - 1].id}` : '#'}
            className="w-full inline-flex items-center justify-center gap-2 bg-pastel-cardbg text-pastel-pink px-8 py-3.5 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:bg-opacity-90 transition-all active:scale-95"
          >
            <Play size={18} className="fill-current" />
            Start Reading
          </Link>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="flex-1 bg-pastel-cardbg rounded-t-[2.5rem] mt-2 pt-8 pb-6 px-6 text-pastel-text shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-bold text-sm uppercase tracking-wider text-pastel-heading">Chapter List</h4>
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-lg transition-colors ${showSearch ? 'bg-pastel-pink text-white' : 'bg-pastel-light text-pastel-text hover:opacity-80'}`}
          >
            <Search size={16} />
          </button>
        </div>

        {downloadError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {downloadError}
          </div>
        )}

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="relative mb-4">
                <input 
                  type="text"
                  placeholder="Chapter No..."
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-pastel-light border-none focus:ring-1 focus:ring-pastel-pink outline-none text-xs"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          {filteredChapters.map((chapter, idx) => {
            const isDownloaded = downloadedChapters.has(chapter.id);
            const isDownloading = downloading === chapter.id;
            const progressLabel = isDownloading && downloadProgress > 0 ? `${downloadProgress}%` : '';

            return (
              <Link 
                key={chapter.id}
                to={`/read/${comic.id}/${chapter.id}`}
                className={`p-3 rounded-xl flex justify-between items-center transition-all active:scale-[0.98] ${
                  idx % 2 === 0 ? 'bg-pastel-light border border-transparent hover:border-pastel-pink' : 'bg-pastel-cardbg border border-pastel-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-pastel-heading">Chapter {chapter.number}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] opacity-60 font-medium">
                    {progressLabel || new Date(chapter.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                  </span>
                  <button 
                    onClick={(e) => handleDownloadToggle(e, chapter)}
                    className="p-1 rounded-full hover:bg-pastel-border transition-colors text-pastel-heading"
                  >
                    {isDownloading ? (
                      <div className="relative w-4 h-4 text-pastel-pink flex items-center justify-center">
                        <svg className="animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : isDownloaded ? (
                      <CheckCircle size={16} className="text-pastel-green" />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>
                </div>
              </Link>
            );
          })}
          {filteredChapters.length === 0 && (
            <div className="text-center py-6 text-stone-400 text-xs italic bg-pastel-light rounded-xl">
              No chapters match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
