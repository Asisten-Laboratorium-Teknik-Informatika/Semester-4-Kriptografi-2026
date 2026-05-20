export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
}

export interface Comic {
  id: string;
  title: string;
  description: string;
  author: string;
  genres: string[];
  coverUrl: string;
  status: 'ongoing' | 'completed';
  rating: number;
}

export interface Chapter {
  id: string;
  comicId: string;
  number: number;
  title: string;
  images: string[];
  pages?: PageDescriptor[];
  pageCount?: number;
  createdAt: string;
}

export interface PageDescriptor {
  id: string;
  pageIndex: number;
  mimeType: string;
  streamUrl: string;
}

export interface DownloadGrantPage {
  id: string;
  pageIndex: number;
  mimeType: string;
  encryptedUrl: string;
  keyBase64: string;
  ivBase64: string;
}

export interface Favorite {
  id: string;
  userId: string;
  comicId: string;
  addedAt: string;
}

export interface HistoryItem {
  id: string;
  userId: string;
  comicId: string;
  chapterId: string;
  lastReadAt: string;
}

export interface HistoryWithComic extends HistoryItem {
  comic?: Comic;
  chapter?: Chapter;
}

export interface AndroidDRMBridge {
  getApiBaseUrl(): string;
  downloadChapter(payloadJson: string): string;
  isChapterDownloaded(comicId: string, chapterId: string): boolean;
  removeChapter(comicId: string, chapterId: string): boolean;
  getOfflinePage(comicId: string, chapterId: string, pageIndex: number): string;
  getDownloadedChapters(comicId: string): string;
  getDownloads(): string;
}

declare global {
  interface Window {
    AndroidDRM?: AndroidDRMBridge;
  }
}
