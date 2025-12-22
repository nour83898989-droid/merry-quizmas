import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Merry Quizmas 🎄",
  description: "Play holiday quizzes and win crypto rewards this Christmas season! Create and play quizzes, compete with friends on Farcaster and Base.",
  openGraph: {
    title: "Merry Quizmas 🎄",
    description: "Play holiday quizzes and win crypto rewards this Christmas season!",
    type: "website",
    images: ["/og-image.png"],
  },
  other: {
    // Farcaster Mini App meta tags
    "fc:frame": "vNext",
    "fc:frame:image": "https://merry-quizmas.vercel.app/christmas-banner.png",
    "fc:frame:image:aspect_ratio": "1.91:1",
    "fc:frame:button:1": "🎄 Play Quiz",
    "fc:frame:button:1:action": "launch_frame",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
