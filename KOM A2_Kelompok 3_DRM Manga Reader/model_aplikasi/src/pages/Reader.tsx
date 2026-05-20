import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chapter, Comic } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, useScroll, useSpring } from 'motion/react';
import { List, ArrowLeft, Settings, BookOpen, SkipBack, SkipForward, Smartphone, MessageSquare } from 'lucide-react';
import { handleApiError } from '../utils';
import { isChapterDownloaded, getOfflineChapterRecord, getOfflineImageUrls } from '../services/offlineStorage';
import { api } from '../services/api';

export default function Reader() {
  const { comicId, chapterId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [comic, setComic] = useState<Comic | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showControls, setShowControls] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const fetchData = async () => {
      if (!comicId || !chapterId) return;
      setLoading(true);
      setErrorMessage('');
      try {
        const isOffline = await isChapterDownloaded(chapterId, comicId);
        if (isOffline) {
          const offlineRecord = await getOfflineChapterRecord(comicId, chapterId);
          if (offlineRecord) {
            setComic(offlineRecord.comic);
            setChapter(offlineRecord.chapter);
            setImages(await getOfflineImageUrls(offlineRecord.chapter));
            setLoading(false);

            if (user && navigator.onLine) {
              api.saveHistory(comicId, chapterId).catch((err) => handleApiError(err, `history/${comicId}/${chapterId}`));
            }
            return;
          }
        }

        const [comicData, chData] = await Promise.all([
          api.comic(comicId),
          api.chapter(comicId, chapterId),
        ]);
        setComic(comicData);
        setChapter(chData);

        if (user) {
          await api.saveHistory(comicId, chapterId);
        }
        
        if (chData) {
           if (isOffline) {
              const offlineUrls = await getOfflineImageUrls(chData);
              setImages(offlineUrls);
           } else {
              setImages(chData.pages?.map((page) => page.streamUrl) || chData.images);
           }
        }
        
      } catch (err) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setErrorMessage('This chapter is not available offline. Download it before disconnecting.');
        } else {
          setErrorMessage(err instanceof Error ? err.message : 'Unable to load chapter.');
        }
        handleApiError(err, `read/${comicId}/${chapterId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [comicId, chapterId, user]);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    if (clickTimeout.current) {
      // Double tap
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      setZoomLevel(prev => (prev === 1 ? 2 : 1));
    } else {
      // Single tap
      clickTimeout.current = setTimeout(() => {
        let clientY = 0;
        if ('touches' in e) {
          clientY = e.changedTouches[0].clientY;
        } else {
          clientY = (e as React.MouseEvent).clientY;
        }

        const windowH = window.innerHeight;
        if (clientY > windowH * 0.2 && clientY < windowH * 0.8) {
          setShowControls(prev => !prev);
        } else {
          setShowControls(prev => !prev);
        }
        clickTimeout.current = null;
      }, 300);
    }
  };

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
    </div>
  );
  if (!chapter) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-900 px-8 text-center text-white">
      <div>
        <BookOpen size={48} className="mx-auto mb-4 text-white/40" />
        <p className="text-sm font-semibold">{errorMessage || 'Chapter not found'}</p>
        <button onClick={() => navigate('/downloads')} className="mt-6 rounded-xl bg-white/10 px-5 py-3 text-xs font-bold">
          Open Downloads
        </button>
      </div>
    </div>
  );

  return (
    <div className={`bg-black min-h-screen w-full relative touch-manipulation ${zoomLevel > 1 ? 'overflow-x-auto' : 'overflow-x-hidden'}`} onClick={handleInteraction}>
      {/* Top Bar */}
      <motion.div 
        animate={{ y: showControls ? 0 : -100 }}
        className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-md px-4 py-5 z-[90] flex items-center gap-4 border-b border-white/10 shadow-lg"
      >
        <button onClick={() => navigate(`/comic/${comicId}`)} className="text-white hover:text-pastel-pink transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-base truncate">{comic?.title}</h2>
          <p className="text-white/60 text-[11px] font-medium tracking-wide">Chapter {chapter.number}: {chapter.title}</p>
        </div>
        <button className="text-white hover:text-pastel-pink transition-colors">
          <List size={22} />
        </button>
      </motion.div>

      {/* Images Container - Webtoon Style */}
      <div 
        className="flex flex-col items-center bg-black"
        style={{ 
          width: zoomLevel === 1 ? '100%' : '200%', 
          transformOrigin: 'top left',
          transition: 'width 0.3s ease'
        }}
      >
        {images.length > 0 ? (
          <>
            {images.map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                alt={`Page ${idx + 1}`} 
                className="w-full h-auto select-none block m-0 p-0"
                style={{ display: 'block' }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            ))}
            
            {/* End of Chapter Indicator */}
            <div className="w-full py-20 flex flex-col items-center justify-center text-white/40 space-y-4 bg-zinc-900 border-t border-white/5">
              <div className="w-12 h-1 rounded-full bg-white/20"></div>
              <p className="text-lg font-bold tracking-widest text-white/60">END OF CHAPTER</p>
              <p className="text-sm">No more pages</p>
              <div className="w-12 h-1 rounded-full bg-white/20 mt-2"></div>
            </div>
          </>
        ) : (
          <div className="py-40 text-center text-white/50 space-y-4 w-full">
            <BookOpen size={48} className="mx-auto" />
            <p>No pages found for this chapter.</p>
          </div>
        )}
      </div>

      {/* Bottom Bar Controls */}
      <motion.div 
        animate={{ y: showControls ? 0 : 200 }}
        className="fixed bottom-0 left-0 right-0 z-[90] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        {/* Main Control Row */}
        <div className="bg-zinc-900/95 backdrop-blur-md px-6 py-4 flex justify-between items-center border-t border-white/10 gap-6">
          <button className="text-white hover:text-pastel-pink transition-colors disabled:opacity-30">
             <SkipBack size={26} fill="currentColor" />
          </button>
          
          {/* Progress Indicator */}
          <div className="flex-1 flex items-center gap-4">
             <span className="text-white/80 text-xs font-bold">1</span>
             <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden relative">
                <motion.div className="absolute top-0 left-0 bottom-0 bg-pastel-pink rounded-full origin-left" style={{ scaleX }} />
             </div>
             <span className="text-white/80 text-xs font-bold">{images.length > 0 ? images.length : '-'}</span>
          </div>

          <button className="text-white hover:text-pastel-pink transition-colors disabled:opacity-30">
             <SkipForward size={26} fill="currentColor" />
          </button>
        </div>

        {/* Secondary Tools Row */}
        <div className="bg-black py-3 px-8 flex justify-around items-center border-t border-white/5">
           <button className="text-white/50 hover:text-white transition-colors flex flex-col items-center gap-1.5">
             <Smartphone size={20} />
             <span className="text-[9px] uppercase font-bold tracking-wider">Rotate</span>
           </button>
           <button className="text-white/50 hover:text-white transition-colors flex flex-col items-center gap-1.5">
             <MessageSquare size={20} />
             <span className="text-[9px] uppercase font-bold tracking-wider">Comments</span>
           </button>
           <button className="text-white/50 hover:text-white transition-colors flex flex-col items-center gap-1.5">
             <Settings size={20} />
             <span className="text-[9px] uppercase font-bold tracking-wider">Settings</span>
           </button>
        </div>
      </motion.div>
    </div>
  );
}

