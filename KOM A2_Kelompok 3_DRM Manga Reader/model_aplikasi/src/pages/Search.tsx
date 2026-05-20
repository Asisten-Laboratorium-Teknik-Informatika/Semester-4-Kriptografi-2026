import React, { useState, useEffect } from 'react';
import { Comic } from '../types';
import ComicCard from '../components/ComicCard';
import { GENRES, handleApiError } from '../utils';
import { Search as SearchIcon, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [results, setResults] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setOffline(true);
        setResults([]);
        setLoading(false);
        return;
      }

      setOffline(false);
      setLoading(true);
      try {
        setResults(await api.searchComics(searchTerm, selectedGenres));
      } catch (err) {
        handleApiError(err, 'search');
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, selectedGenres]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-pastel-heading mb-6">Search</h1>
        
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-pastel-muted" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, author..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-pastel-light text-sm text-pastel-text outline-none focus:ring-1 ring-pastel-pink transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl transition-all ${
              showFilters || selectedGenres.length > 0 ? 'bg-pastel-pink text-white shadow-sm' : 'bg-pastel-light text-pastel-muted'
            }`}
          >
            <Filter size={20} />
          </button>
        </div>
      </header>

      {offline && (
        <div className="pastel-card p-5 text-center">
          <p className="text-sm font-bold text-pastel-heading">Search is unavailable offline.</p>
          <p className="text-xs text-pastel-muted mt-1">Reconnect to search the online library.</p>
        </div>
      )}

      {!offline && <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pastel-card p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-pastel-heading">Filter by Genre</h3>
                {selectedGenres.length > 0 && (
                  <button 
                    onClick={() => setSelectedGenres([])}
                    className="text-xs text-pastel-pink font-bold flex items-center gap-1"
                  >
                    Clear <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedGenres.includes(genre)
                        ? 'bg-pastel-pink text-white'
                        : 'bg-pastel-light text-pastel-text hover:opacity-75'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>}

      {!offline && <section>
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-4 h-4 bg-pastel-pink rounded-full"
            />
          </div>
        ) : (
          <>
            <p className="text-xs font-bold text-pastel-muted uppercase tracking-widest mb-6 px-1">
              {results.length} {results.length === 1 ? 'Result' : 'Results'} found
            </p>
            <div className="grid grid-cols-2 gap-3">
              {results.map((comic) => (
                <ComicCard key={comic.id} comic={comic} />
              ))}
            </div>
            {results.length === 0 && (
              <div className="text-center py-20">
                <p className="text-pastel-muted italic text-sm">No comics match your search.</p>
              </div>
            )}
          </>
        )}
      </section>}
    </div>
  );
}
