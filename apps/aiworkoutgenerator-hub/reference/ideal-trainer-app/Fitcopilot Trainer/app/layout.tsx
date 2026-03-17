import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SSOProvider } from './SSOProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Fitcopilot Trainer',
  description: 'AI-powered personal trainer',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className={inter.variable}>
      <body className={inter.className}>
        <SSOProvider>{children}</SSOProvider>
      </body>
    </html>
  );
}
