export function handleApiError(error: unknown, context: string) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`API Error [${context}]: ${message}`);
}

export const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Supernatural', 'Thriller'
];

export const PASTEL_COLORS = {
  primary: '#F8BBD0', // Soft Pink
  secondary: '#E1BEE7', // Soft Purple
  accent: '#B2EBF2', // Soft Cyan
  background: '#FFF9FB', // Very Soft Pinkish White
  surface: '#FFFFFF',
  text: '#4A4A4A',
  muted: '#9E9E9E'
};
