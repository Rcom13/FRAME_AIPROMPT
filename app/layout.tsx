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
  title: "FRAME｜AI 视频剧情与分镜工作台",
  description: "将灵感快速转化为剧情大纲、分镜脚本与 AI 视频生成提示词。",
  openGraph: {
    title: "FRAME｜让灵感，成为影片。",
    description: "AI 剧情 · 分镜 · 视频提示词",
    images: ["https://story-forge-cn.rjins.chatgpt.site/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "FRAME｜让灵感，成为影片。",
    description: "AI 剧情 · 分镜 · 视频提示词",
    images: ["https://story-forge-cn.rjins.chatgpt.site/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
