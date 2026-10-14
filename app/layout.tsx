import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logos Relational",
  description: "Hebrew & Greek word and verse study through a relational-gospel lens",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
