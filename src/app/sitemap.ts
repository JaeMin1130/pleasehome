import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  // 추후 도메인이 확정되면 아래의 베이스 URL을 변경해주시면 됩니다.
  const baseUrl = 'https://your-domain.com';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
