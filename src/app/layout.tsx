import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Investment Research Agent",
  description:
    "Autonomous multi-agent investment research pipeline — INVEST/PASS decisions powered by real-time data and Google Gemini.",
  keywords: ["investment research", "AI", "stock analysis", "LangGraph", "Gemini"],
  openGraph: {
    title: "AI Investment Research Agent",
    description: "Autonomous multi-agent investment research pipeline",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NavbarWrapper />
        {children}
      </body>
    </html>
  );
}
