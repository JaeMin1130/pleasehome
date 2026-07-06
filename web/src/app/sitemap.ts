import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://pleasehome.com';

  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ];

  try {
    const announcements = db.prepare('SELECT id FROM announcements').all() as { id: number }[];
    
    const announcementRoutes = announcements.map((ann) => ({
      url: `${baseUrl}/announcements/details/${ann.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...routes, ...announcementRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return routes;
  }
}
