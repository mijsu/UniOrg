import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "College of Trades and Technology Organization Platform",
  description: "Modern platform for managing student organizations at College of Trades and Technology. Built with TypeScript, Tailwind CSS, and shadcn/ui.",
  keywords: ["CTT", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "organization management", "React"],
  authors: [{ name: "College of Trades and Technology" }],
  icons: {
    icon: "/pasted_image_1769349751607.png",
  },
  openGraph: {
    title: "College of Trades and Technology Organization Platform",
    description: "Platform for managing student organizations and activities",
    siteName: "College of Trades & Technology",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "College of Trades and Technology Organization Platform",
    description: "Platform for managing student organizations and activities",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
