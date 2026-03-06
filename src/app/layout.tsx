import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { BottomNav } from "@/components/layout/bottom-nav";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RSNE Inventory",
  description: "Inventory management for Refrigerated Structures of New England",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${plusJakarta.variable} font-sans antialiased`}
      >
        <Providers>
          <main className="pb-16">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
