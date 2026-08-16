import type { Metadata } from "next";
import "./globals.css";
import Script from 'next/script';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: "공공청약 지도",
  description: "전국 LH, SH, GH 공공임대주택 청약 정보를 지도에서 한눈에 확인하세요.",
  verification: {
    google: "YUZHBi2LfMvirt-ywiRdfTD2TOteXHgnjbHczGX2kXo",
    other: {
      "naver-site-verification": ["045576967489592d1d44c5b60a8c7bfc9204eafd"],
    },
  },
  other: {
    "google-adsense-account": "ca-pub-7402127086926987",
  },
  
  openGraph: {
    title: "공공청약 지도",
    description: "전국 LH, SH, GH 공공임대주택 청약 정보를 지도에서 한눈에 확인하세요.",
    url: "https://pleasehome.com",
    siteName: "공공맵",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PleaseHome (플리즈홈)',
    alternateName: ['공공청약 지도', '플리즈홈'],
    url: 'https://pleasehome.com',
    description: '전국 LH, SH, GH 공공임대주택 청약 정보를 지도에서 한눈에 확인하세요.',
    publisher: {
      '@type': 'Organization',
      name: 'PleaseHome',
      url: 'https://pleasehome.com',
    },
  };

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Google Fonts Link */}
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
        <link rel="canonical" href="https://pleasehome.com/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning={true}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-08HBBMLTLQ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-08HBBMLTLQ');
          `}
        </Script>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
