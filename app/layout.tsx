import type { Metadata } from "next";
import "./globals.css";
import Navigation from "./components/Navigation";

export const metadata: Metadata = {
  title: "米国株分析ツール - 暴落予測",
  description: "X投稿センチメント分析による暴落予測機能を搭載した米国株分析ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
