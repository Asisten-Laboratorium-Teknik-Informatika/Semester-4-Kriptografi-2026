import React, { useEffect, useState } from 'react';
import { Comic } from '../types';
import { useAuth } from '../context/AuthContext';
import ComicCard from '../components/ComicCard';
import { motion } from 'motion/react';
import { BookOpen, Heart } from 'lucide-react';
import { handleApiError } from '../utils';
import { api } from '../services/api';

export default function Library() {
  const { user } = useAuth();
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (user) {
          setComics(await api.favorites());
        } else {
          setComics(await api.comics());
        }
      } catch (err) {
        handleApiError(err, 'library');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-10 h-10 border-4 border-pastel-pink border-t-transparent rounded-full"
      />
    </div>
  );

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-pastel-heading mb-2">My Library</h1>
        <p className="text-pastel-muted text-sm">Discover and manage your collection</p>
      </header>

      {comics.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4 mt-6">
            <Heart className="text-pastel-pink fill-pastel-pink" size={20} />
            <h2 className="text-lg font-bold text-pastel-heading">{user ? 'Favorites' : 'Latest Comics'}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {comics.map((comic) => (
              <ComicCard key={comic.id} comic={comic} />
            ))}
          </div>
        </section>
      )}

      {comics.length === 0 && (
        <div className="pastel-card p-10 text-center">
          <BookOpen className="mx-auto mb-4 text-pastel-muted opacity-50" size={40} />
          <p className="text-sm text-pastel-muted">{user ? 'Your library is completely empty.' : 'No comics found.'}</p>
        </div>
      )}
    </div>
  );
}
