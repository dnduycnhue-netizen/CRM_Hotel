import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CRM Chuỗi Khách Sạn',
    short_name: 'CRM KS',
    description: 'Tra cứu và chăm sóc khách toàn chuỗi',
    start_url: '/search',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'vi',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Tìm khách', url: '/search' },
      { name: 'Check-in', url: '/check-in' },
      { name: 'Chờ duyệt', url: '/approvals' },
    ],
  };
}
