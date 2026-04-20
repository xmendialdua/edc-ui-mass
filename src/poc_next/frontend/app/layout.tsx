import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POC Next - EDC Dashboard",
  description: "Modern EDC Dashboard built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
