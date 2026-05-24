import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Fleetonomics VMS · NLNG",
  description: "Vehicle monitoring and fleet operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-vms-canvas font-sans text-[0.9375rem] leading-relaxed text-zinc-200 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
