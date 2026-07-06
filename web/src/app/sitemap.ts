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
    // 1. 공고 상세 경로 추가
    const announcements = db.prepare('SELECT id FROM announcements').all() as { id: number }[];
    
    const announcementRoutes = announcements.map((ann) => ({
      url: `${baseUrl}/announcements/details/${ann.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // 2. 단지 상세 경로 추가 (SEO 유입 극대화)
    const complexes = db.prepare('SELECT id FROM complexes').all() as { id: number }[];

    const complexRoutes = complexes.map((comp) => ({
      url: `${baseUrl}/complexes/${comp.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...routes, ...announcementRoutes, ...complexRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return routes;
  }
}

