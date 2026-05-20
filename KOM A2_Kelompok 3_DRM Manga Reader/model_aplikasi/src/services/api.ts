import { Chapter, Comic, HistoryWithComic, UserProfile } from '../types';

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const getBaseHost = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
};

function resolveApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const androidApiBaseUrl = window.AndroidDRM?.getApiBaseUrl?.();
    if (androidApiBaseUrl) return androidApiBaseUrl;
  }

  const fallback = `http://${getBaseHost()}/manga_api/api.php`;
  if (!configuredBase) return fallback;

  if (typeof window === 'undefined') return configuredBase;

  const host = window.location.hostname;
  if (
    host &&
    host !== 'localhost' &&
    host !== '127.0.0.1' &&
    configuredBase.includes('://localhost/')
  ) {
    return configuredBase.replace('://localhost/', `://${host}/`);
  }

  return configuredBase;
}

export const API_BASE_URL = resolveApiBaseUrl();

const userKey = 'manga-user';
const apiCachePrefix = 'manga-api-cache';

function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function getStoredUser(): UserProfile | null {
  const raw = localStorage.getItem(userKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    localStorage.removeItem(userKey);
    return null;
  }
}

export function setStoredUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(userKey, JSON.stringify(user));
  } else {
    localStorage.removeItem(userKey);
  }
}

function withAction(action: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(API_BASE_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function cacheKey(action: string, params: Record<string, string | number | undefined>, userId?: string) {
  const normalizedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');

  return `${apiCachePrefix}:${userId || 'guest'}:${action}:${normalizedParams}`;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T };
    return parsed.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify({
    cachedAt: new Date().toISOString(),
    data,
  }));
}

export function fixImageUrl(url: string | undefined): string {
  if (!url) return '';

  if (url.startsWith('data:')) return url;

  const apiUrl = new URL(API_BASE_URL);
  const apiOrigin = apiUrl.origin;
  let fixedUrl = url;

  if (fixedUrl.startsWith('http://localhost/backend/')) {
    fixedUrl = fixedUrl.replace('http://localhost/backend/', `${apiOrigin}/manga_api/`);
  }

  if (fixedUrl.startsWith('http://localhost/') || fixedUrl.startsWith('http://127.0.0.1/')) {
    const parsed = new URL(fixedUrl);
    return `${apiOrigin}${parsed.pathname}${parsed.search}`;
  }

  if (fixedUrl.startsWith('http://') || fixedUrl.startsWith('https://')) {
    return fixedUrl;
  }

  const baseUrl = API_BASE_URL.replace(/\/api\.php.*$/, '/');
  return `${baseUrl}${fixedUrl.startsWith('/') ? fixedUrl.substring(1) : fixedUrl}`;
}

function fixImageUrlsDeep(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(fixImageUrlsDeep);
  const result: any = {};
  for (const key in obj) {
    if ((key === 'coverUrl' || key === 'streamUrl' || key === 'encryptedUrl') && typeof obj[key] === 'string') {
      result[key] = fixImageUrl(obj[key]);
    } else if (key === 'images' && Array.isArray(obj[key])) {
      result[key] = obj[key].map((url: any) => typeof url === 'string' ? fixImageUrl(url) : url);
    } else {
      result[key] = fixImageUrlsDeep(obj[key]);
    }
  }
  return result;
}

async function request<T>(action: string, options: RequestInit = {}, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const user = getStoredUser();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('ngrok-skip-browser-warning', '1');
  const method = (options.method || 'GET').toUpperCase();
  const canUseCache = method === 'GET' && action !== 'search';
  const key = cacheKey(action, params, user?.uid);

  if (canUseCache && isOffline()) {
    const cached = readCache<T>(key);
    if (cached !== null) return cached;
    throw new Error('Offline data is not available yet.');
  }

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (user?.uid) {
    headers.set('X-User-Id', user.uid);
  }

  let response: Response;
  try {
    response = await fetch(withAction(action, params), {
      ...options,
      headers,
    });
  } catch (error) {
    if (canUseCache) {
      const cached = readCache<T>(key);
      if (cached !== null) return cached;
    }
    throw error;
  }

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Unexpected API response (${response.status})`);
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `API request failed (${response.status})`);
  }

  const data = fixImageUrlsDeep(payload.data) as T;
  if (canUseCache) {
    writeCache(key, data);
  }

  return data;
}

export const api = {
  login(email: string, password: string) {
    return request<UserProfile>('login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(email: string, password: string, displayName: string) {
    return request<UserProfile>('register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  profile() {
    return request<UserProfile>('profile');
  },

  comics() {
    return request<Comic[]>('comics');
  },

  searchComics(q: string, genres: string[]) {
    if (isOffline()) {
      return Promise.reject(new Error('Search is unavailable offline.'));
    }
    return request<Comic[]>('search', {}, { q, genres: genres.join(',') });
  },

  comic(id: string) {
    return request<Comic>('comic', {}, { id });
  },

  chapters(comicId: string) {
    return request<Chapter[]>('chapters', {}, { comic_id: comicId });
  },

  chapter(comicId: string, chapterId: string) {
    return request<Chapter>('chapter', {}, { comic_id: comicId, chapter_id: chapterId });
  },

  favorites() {
    return request<Comic[]>('favorites');
  },

  addFavorite(comicId: string) {
    return request<{ favorite: boolean }>('favorite', {
      method: 'POST',
      body: JSON.stringify({ comicId }),
    });
  },

  removeFavorite(comicId: string) {
    return request<{ favorite: boolean }>('favorite', { method: 'DELETE' }, { comic_id: comicId });
  },

  history() {
    return request<HistoryWithComic[]>('history');
  },

  saveHistory(comicId: string, chapterId: string) {
    return request<{ saved: boolean }>('history', {
      method: 'POST',
      body: JSON.stringify({ comicId, chapterId }),
    });
  },

  deleteHistory(id: string) {
    return request<{ deleted: boolean }>('history', { method: 'DELETE' }, { id });
  },
};
