import type { Metadata } from "next";
import { Bai_Jamjuree } from "next/font/google";
import "./globals.css";

const fontSans = Bai_Jamjuree({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: {
    default: "Vault — Fast, Modern Desktop YouTube Downloader",
    template: "%s · Vault"
  },
  description:
    "A fast, modern desktop YouTube downloader powered by yt-dlp & FFmpeg. Download videos, audio, and playlists with ease. Cross-platform, open source, privacy-focused.",
  keywords: [
    "youtube downloader",
    "video downloader",
    "yt-dlp",
    "ffmpeg",
    "desktop app",
    "open source",
    "cross-platform",
    "privacy"
  ],
  authors: [{ name: "Kendrick Oppong" }],
  creator: "Kendrick Oppong",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://github.com/Kendrick-Oppong/vault",
    title: "Vault — Fast, Modern Desktop YouTube Downloader",
    description:
      "A fast, modern desktop YouTube downloader powered by yt-dlp & FFmpeg. Download videos, audio, and playlists with ease.",
    siteName: "Vault"
  },
  twitter: {
    card: "summary_large_image",
    title: "Vault — Fast, Modern Desktop YouTube Downloader",
    description:
      "A fast, modern desktop YouTube downloader powered by yt-dlp & FFmpeg. Download videos, audio, and playlists with ease.",
    creator: "@kendrickoppong"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${fontSans.variable} h-full antialiased dark`}
      data-scroll-behavior="smooth"
      lang="en"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
