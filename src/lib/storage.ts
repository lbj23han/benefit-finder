import { UserProfile } from '@/types';

const PROFILE_KEY = 'benefit_finder_profile';
const BOOKMARKS_KEY = 'benefit_finder_bookmarks';

export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROFILE_KEY);
}

export function getBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addBookmark(id: string): void {
  if (typeof window === 'undefined') return;
  const bookmarks = getBookmarks();
  if (!bookmarks.includes(id)) {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bookmarks, id]));
  }
}

export function removeBookmark(id: string): void {
  if (typeof window === 'undefined') return;
  const bookmarks = getBookmarks();
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks.filter((b) => b !== id)));
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().includes(id);
}
