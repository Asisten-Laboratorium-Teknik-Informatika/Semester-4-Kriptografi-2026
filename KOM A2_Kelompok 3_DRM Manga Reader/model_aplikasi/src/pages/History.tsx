import React, { useEffect, useState } from 'react';
import { HistoryWithComic } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, BookOpen, ChevronRight, Trash2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { handleApiError } from '../utils';
import { api } from '../services/api';

export default function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryWithComic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setHistory(await api.history());
      } catch (err) {
        handleApiError(err, 'history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    try {
      await api.deleteHistory(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      handleApiError(err, `history/${id}`);
    }
  };

  const filteredHistory = history.filter(item => {
    if (!selectedDate) return true;
    return item.lastReadAt.startsWith(selectedDate);
  });

  if (loading) return (
    <div className="flex justify-center py-20">
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="w-4 h-4 bg-pastel-pink rounded-full"
      />
    </div>
  );

  if (!user) return (
    <div className="pastel-card p-10 text-center">
      <BookOpen className="mx-auto mb-4 text-pastel-muted opacity-50" size={40} />
      <p className="text-sm font-medium mb-6">Sign in to track your reading history.</p>
      <Link to="/login" className="bg-pastel-pink text-white px-8 py-3 rounded-xl font-bold inline-block">
        Sign In
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-pastel-heading mb-2">History</h1>
          <div className="flex items-center gap-2">
            <div className="bg-pastel-cardbg border border-pastel-border flex items-center px-3 py-1.5 rounded-lg text-sm text-pastel-text">
              <Calendar size={14} className="mr-2 text-pastel-muted" />
              <input 
                type="date" 
                className="bg-transparent outline-none cursor-pointer" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            {selectedDate && (
              <button onClick={() => setSelectedDate('')} className="text-xs text-pastel-pink font-bold px-2">Clear</button>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-4">
        <AnimatePresence>
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                layout
              >
                <Link 
                  to={item.comic ? (item.chapterId ? `/read/${item.comicId}/${item.chapterId}` : `/comic/${item.comicId}`) : '#'} 
                  className="pastel-card p-4 flex gap-3 items-center group active:scale-95 transition-all"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-pastel-border/50 border border-pastel-border flex-shrink-0">
                    {item.comic?.coverUrl && (
                      <img 
                        src={item.comic.coverUrl} 
                        alt={item.comic.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-xs truncate group-hover:text-pastel-pink transition-colors">
                      {item.comic?.title || 'Unknown Comic'}
                    </h3>
                    {item.chapter && (
                      <p className="text-[11px] font-medium text-pastel-heading/80 mt-0.5 truncate">
                        Chapter {item.chapter.number} {item.chapter.title ? `- ${item.chapter.title}` : ''}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5 text-pastel-muted">
                      <span className="text-[10px] font-medium">
                        Last read: {new Date(item.lastReadAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteItem(e, item.id)}
                    className="p-2 text-pastel-muted hover:text-pastel-orange hover:bg-pastel-orange/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </Link>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-center py-20 grayscale opacity-40"
            >
              <Clock size={48} className="mx-auto mb-4" />
              <p className="text-sm font-medium">
                {selectedDate ? 'No history for this date.' : 'Your history is empty.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
