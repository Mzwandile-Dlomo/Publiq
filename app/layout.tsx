import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";

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

export const metadata: Metadata = {
  title: "Publiq",
  description: "",
  icons: {
    icon: "/publiq.png",
    apple: "/publiq.png",
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
        <Toaster />
      </body>
    </html>
  );
}
