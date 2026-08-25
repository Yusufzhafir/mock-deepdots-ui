import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_ORIGIN || 'http://localhost:3000'),
  title: {
    default: 'Message Inbox Analytics',
    template: '%s · Message Inbox Analytics',
  },
  description: 'Understand inbox reach, message engagement, downstream conversion and experience friction.',
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'Message Inbox Analytics',
    description: 'Reach. Engagement. Conversion. Friction.',
    type: 'website',
    images: [{ url: '/og.png', width: 1730, height: 909, alt: 'Message Inbox Analytics dashboard preview' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Message Inbox Analytics',
    description: 'Reach. Engagement. Conversion. Friction.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
