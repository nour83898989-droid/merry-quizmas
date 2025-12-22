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
  title: "Quiz App - Merry Quizmas! 🎄",
  description: "Play holiday quizzes and win crypto rewards this Christmas season! Create and play quizzes, compete with friends on Farcaster and Base.",
  openGraph: {
    title: "Quiz App - Merry Quizmas! 🎄",
    description: "Play holiday quizzes and win crypto rewards this Christmas season!",
    type: "website",
    images: ["/christmas-banner.svg"],
  },
  other: {
    // Farcaster Mini App meta tags
    "fc:frame": "vNext",
    "fc:frame:image": "https://quiz-app.vercel.app/christmas-banner.svg",
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
