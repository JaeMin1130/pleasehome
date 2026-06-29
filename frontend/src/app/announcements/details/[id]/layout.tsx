import React from 'react';
import './detail-layout.css';

export default function AnnouncementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="announcement-detail-layout">
      {children}
    </div>
  );
}
