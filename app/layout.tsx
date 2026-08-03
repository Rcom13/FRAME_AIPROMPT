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
  title: "FRAME｜AI 故事、图片与 3D 姿态创作工作台",
  description: "从剧情分镜、图片提示词到真实图片生成与 3D 人物姿态设计，让创意直接进入 AI 生产流程。",
  openGraph: {
    title: "FRAME｜AI CREATIVE OS",
    description: "AI 剧情 · 图片提示词 · 图片生成 · 3D 姿态设计",
    images: ["https://story-forge-cn.rjins.chatgpt.site/og-v2.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "FRAME｜AI CREATIVE OS",
    description: "AI 剧情 · 图片提示词 · 图片生成 · 3D 姿态设计",
    images: ["https://story-forge-cn.rjins.chatgpt.site/og-v2.png"],
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
