import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { Comic } from '../types';

interface ComicCardProps {
  comic: Comic;
  key?: React.Key;
}

export default function ComicCard({ comic }: ComicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={`/comic/${comic.id}`} className="group block h-full">
        <div className="relative aspect-[3/4] bg-pastel-light rounded-2xl p-3 flex flex-col justify-end shadow-sm border border-pastel-border overflow-hidden group-hover:border-pastel-pink transition-colors">
          <img
            src={comic.coverUrl}
            alt={comic.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
          
          <div className="absolute top-2 right-2 bg-pastel-cardbg/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 z-20">
            <Star size={12} className="fill-pastel-orange text-pastel-orange" />
            <span className="text-[10px] font-bold text-pastel-heading">{comic.rating.toFixed(1)}</span>
          </div>
          {comic.status === 'completed' && (
            <div className="absolute top-2 left-2 bg-pastel-cardbg/90 backdrop-blur px-2 py-1 rounded-lg z-20">
              <span className="text-[10px] font-bold text-pastel-teal uppercase">End</span>
            </div>
          )}
          
          <div className="relative z-20">
            <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight">
              {comic.title}
            </h3>
            <p className="text-[10px] text-white/80 mt-1 line-clamp-1">{comic.author}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
