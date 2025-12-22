import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FarcasterProvider } from "@/components/providers/farcaster-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = "https://merry-quizmas.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Merry Quizmas 🎄",
    description: "Play holiday quizzes and win crypto rewards this Christmas season! Create and play quizzes, compete with friends on Farcaster and Base.",
    icons: {
      icon: `${baseUrl}/icon.png`,
      apple: `${baseUrl}/icon.png`,
    },
    openGraph: {
      title: "Merry Quizmas 🎄",
      description: "Play holiday quizzes and win crypto rewards this Christmas season!",
      url: baseUrl,
      siteName: "Merry Quizmas",
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "Merry Quizmas - Holiday Quiz Game",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Merry Quizmas 🎄",
      description: "Play holiday quizzes and win crypto rewards this Christmas season!",
      images: [`${baseUrl}/og-image.png`],
    },
    other: {
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: `${baseUrl}/christmas-banner.png`,
        button: {
          title: "🎄 Play Quiz",
          action: {
            type: "launch_frame",
            name: "Merry Quizmas",
            url: baseUrl,
            splashImageUrl: `${baseUrl}/splash.png`,
            splashBackgroundColor: "#0d0d0d",
          },
        },
      }),
    },
  };
}

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
        <FarcasterProvider>
          {children}
        </FarcasterProvider>
      </body>
    </html>
  );
}
