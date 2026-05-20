import React, { useEffect, useState } from 'react';
import { getOfflineDownloadRecords, removeChapterOffline } from '../services/offlineStorage';
import { Comic, Chapter } from '../types';
import { Link } from 'react-router-dom';
import { Download, ChevronLeft, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Downloads() {
  const [downloads, setDownloads] = useState<{ comic: Comic, chapters: Chapter[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      setDownloads(await getOfflineDownloadRecords());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (comicId: string, chapterId: string) => {
    await removeChapterOffline(comicId, chapterId);
    await loadDownloads();
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-pastel-heading">Downloads</h1>
          <p className="text-pastel-muted text-sm">Read offline anytime</p>
        </div>
      </header>

      {downloads.length === 0 ? (
        <div className="pastel-card p-10 text-center">
          <Download className="mx-auto mb-4 text-pastel-muted opacity-50" size={40} />
          <p className="text-sm text-pastel-muted mb-4">No downloaded chapters found.</p>
          <Link to="/" className="text-pastel-pink font-bold text-sm">Explore Comics</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {downloads.map(({ comic, chapters }) => (
            <div key={comic.id} className="pastel-card p-5">
              <Link to={`/comic/${comic.id}`} className="flex items-center gap-4 mb-4">
                <img src={comic.coverUrl} alt="" className="w-12 h-12 object-cover rounded-xl" />
                <h3 className="font-bold text-sm">{comic.title}</h3>
              </Link>
              
              <div className="space-y-2">
                {chapters.map(chapter => (
                  <div key={chapter.id} className="flex items-center justify-between p-3 bg-pastel-bg rounded-xl">
                    <Link to={`/read/${comic.id}/${chapter.id}`} className="flex-1">
                      <p className="text-xs font-bold">Chapter {chapter.number}</p>
                      <p className="text-[10px] text-pastel-muted">{chapter.title}</p>
                    </Link>
                    <button 
                      onClick={() => handleRemove(comic.id, chapter.id)}
                      className="p-2 text-pastel-orange hover:bg-pastel-border rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
