import { MetadataRoute } from 'next';
import { fetchSitemapPaths } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    const { announcements, complexes } = await fetchSitemapPaths();

    // 1. 공고 상세 경로 추가
    const announcementRoutes = announcements.map((id: number) => ({
      url: `${baseUrl}/announcements/details/${id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // 2. 단지 상세 경로 추가 (SEO 유입 극대화)
    const complexRoutes = complexes.map((id: number) => ({
      url: `${baseUrl}/complexes/${id}`,
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

