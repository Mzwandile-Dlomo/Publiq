import type { Metadata, Viewport } from "next";
import { Fraunces, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { PWARegister } from "@/components/pwa-register";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Publiq",
  description: "Publish everywhere — schedule and distribute content across platforms.",
  manifest: "/manifest.json",
  icons: {
    icon: "/publiq.png",
    apple: "/publiq.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Publiq",
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
        className={`${sora.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}
      >
        <NextSSRPlugin
          routerConfig={extractRouterConfig(ourFileRouter)}
        />
        <Navbar />
        {children}
        <div className="md:hidden">
          <BottomNav />
        </div>
        <Toaster />
        <PWARegister />
      </body>
    </html>
  );
}
