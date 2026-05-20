import { API_BASE_URL, getStoredUser } from './api';
import { Chapter, Comic } from '../types';

interface BridgeResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface OfflinePageResult {
  mimeType: string;
  base64: string;
}

interface DownloadRecord {
  comic: Comic;
  chapters: Chapter[];
}

function parseResult<T>(raw: string): BridgeResult<T> {
  try {
    return JSON.parse(raw) as BridgeResult<T>;
  } catch {
    return { ok: false, error: 'Invalid AndroidDRM response.' };
  }
}

export function hasAndroidDRM() {
  return typeof window !== 'undefined' && !!window.AndroidDRM;
}

export const saveComicForOffline = async (_comic: Comic) => {
  return;
};

export const downloadChapter = async (comic: Comic, chapter: Chapter, onProgress?: (percent: number) => void) => {
  if (!window.AndroidDRM) {
    throw new Error('AndroidDRM bridge is not available.');
  }

  const raw = window.AndroidDRM.downloadChapter(JSON.stringify({
    apiBaseUrl: API_BASE_URL,
    userId: getStoredUser()?.uid || '',
    comic,
    chapterId: chapter.id,
  }));
  const result = parseResult(raw);
  if (!result.ok) {
    throw new Error(result.error || 'Download failed.');
  }

  onProgress?.(100);
};

export const removeChapterOffline = async (comicId: string, chapterId: string) => {
  if (!window.AndroidDRM) return;
  const ok = window.AndroidDRM.removeChapter(comicId, chapterId);
  if (!ok) {
    throw new Error('Unable to remove offline chapter.');
  }
};

export const getDownloadedChapters = async (comicId: string): Promise<Chapter[]> => {
  if (!window.AndroidDRM) return [];

  const result = parseResult<Chapter[]>(window.AndroidDRM.getDownloadedChapters(comicId));
  if (!result.ok) return [];
  return result.data || [];
};

export const isChapterDownloaded = async (chapterId: string, comicId?: string) => {
  if (!window.AndroidDRM || !comicId) return false;
  return window.AndroidDRM.isChapterDownloaded(comicId, chapterId);
};

export const getOfflineImageUrls = async (chapter: Chapter): Promise<string[]> => {
  if (!window.AndroidDRM) return [];

  const pageCount = chapter.pageCount || chapter.pages?.length || chapter.images.length;
  const urls: string[] = [];

  for (let i = 0; i < pageCount; i++) {
    const result = parseResult<OfflinePageResult>(
      window.AndroidDRM.getOfflinePage(chapter.comicId, chapter.id, i)
    );
    if (!result.ok || !result.data) {
      throw new Error(result.error || `Unable to read offline page ${i + 1}.`);
    }
    urls.push(`data:${result.data.mimeType};base64,${result.data.base64}`);
  }

  return urls;
};

export const getOfflineComics = async (): Promise<Comic[]> => {
  if (!window.AndroidDRM) return [];

  const result = parseResult<DownloadRecord[]>(window.AndroidDRM.getDownloads());
  if (!result.ok || !result.data) return [];
  return result.data.map((item) => item.comic);
};

export const getOfflineDownloadRecords = async (): Promise<DownloadRecord[]> => {
  if (!window.AndroidDRM) return [];

  const result = parseResult<DownloadRecord[]>(window.AndroidDRM.getDownloads());
  if (!result.ok || !result.data) return [];
  return result.data;
};

export const getOfflineChapterRecord = async (
  comicId: string,
  chapterId: string
): Promise<{ comic: Comic; chapter: Chapter } | null> => {
  const downloads = await getOfflineDownloadRecords();
  const record = downloads.find((item) => item.comic.id === comicId);
  if (!record) return null;

  const chapter = record.chapters.find((item) => item.id === chapterId);
  if (!chapter) return null;

  return { comic: record.comic, chapter };
};
