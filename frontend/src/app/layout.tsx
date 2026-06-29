import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공공맵 - 공공청약 맞춤 정보 지도 서비스",
  description: "SQLite3 기반 공공청약 데이터를 연계하여 전국 청약 공고 일정 및 아파트 공급 단지를 한눈에 확인하는 맞춤형 정보 지도 서비스입니다.",
  verification: {
    google: "YUZHBi2LfMvirt-ywiRdfTD2TOteXHgnjbHczGX2kXo",
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
          type="text/javascript"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}&submodules=geocoder`}
          defer
        />
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
