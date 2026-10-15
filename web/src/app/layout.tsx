import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from 'next/script';
import { AuthProvider } from '@/contexts/AuthContext';

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "공공청약 지도 | 플리즈홈",
  description: "전국 LH, SH, GH 공공임대주택 청약 정보를 지도에서 한눈에 확인하세요.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "플리즈홈",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  verification: {
    google: "YUZHBi2LfMvirt-ywiRdfTD2TOteXHgnjbHczGX2kXo",
    other: {
      "naver-site-verification": ["045576967489592d1d44c5b60a8c7bfc9204eafd"],
    },
  },
  other: {
    "google-adsense-account": "ca-pub-7402127086926987",
    "mobile-web-app-capable": "yes",
  },
  
  openGraph: {
    title: "공공청약 지도 | 플리즈홈",
    description: "전국 LH, SH, GH 공공임대주택 청약 정보를 지도에서 한눈에 확인하세요.",
    url: "https://pleasehome.com",
    siteName: "플리즈홈",
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
    name: '플리즈홈',
    alternateName: ['PleaseHome', '공공청약 지도'],
    url: 'https://pleasehome.com',
    description: '전국 LH, SH, GH 공공임대주택 청약 정보를 지도에서 한눈에 확인하세요.',
    publisher: {
      '@type': 'Organization',
      name: '플리즈홈',
      url: 'https://pleasehome.com',
    },
  };

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Google Fonts Link */}
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
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
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7402127086926987"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  },
                  function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  }
                );
              });
            }
          `}
        </Script>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
