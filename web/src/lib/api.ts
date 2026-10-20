const API_BASE_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8080';

export async function fetchAnnouncements() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/announcements`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch announcements from backend:', error);
    return [];
  }
}

export async function fetchAnnouncementDetails(id: string | number) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/announcements/${id}/details`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch announcement ${id} details from backend:`, error);
    return null;
  }
}

export async function fetchComplexesByIds(ids: number[]) {
  if (ids.length === 0) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/complexes?ids=${ids.join(',')}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch complexes by ids from backend:', error);
    return [];
  }
}

export async function fetchComplexDetails(id: string | number) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/complexes/${id}/details`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`Failed to fetch complex ${id} details from backend:`, error);
    return null;
  }
}

export async function fetchSitemapPaths() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/sitemap/paths`, { next: { revalidate: 3600 } });
    if (!res.ok) return { announcements: [], complexes: [] };
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch sitemap paths from backend:', error);
    return { announcements: [], complexes: [] };
  }
}
