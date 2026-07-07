import type { Metadata } from "next";
import '@mantine/core/styles.css';
import "./globals.css";
import { MantineProvider } from '@mantine/core';

export const metadata: Metadata = {
  title: "공공청약 지도",
  description: "전국 LH, SH, GH 공공임대주택 청약 정보를 지도에서 한눈에 확인하세요.",
  verification: {
    google: "YUZHBi2LfMvirt-ywiRdfTD2TOteXHgnjbHczGX2kXo",
    other: {
      "naver-site-verification": ["045576967489592d1d44c5b60a8c7bfc9204eafd"],
    },
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
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Google Fonts Link */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7402127086926987"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
        <link rel="canonical" href="https://pleasehome.com/" />
      </head>
      <body suppressHydrationWarning={true}>
        <MantineProvider>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
