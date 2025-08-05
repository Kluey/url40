'use client';
import { Geist, Geist_Mono } from "next/font/google";
import { Provider } from 'react-redux';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 dark:bg-slate-900 transition-colors duration-300`}
      >
        
        {children}
        
      </body>
    </html>
  );
}
