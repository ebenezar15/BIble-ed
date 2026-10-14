import type { Metadata, Viewport } from "next";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/noto-serif-hebrew/400.css";
import "@fontsource/noto-serif-hebrew/600.css";
import "@fontsource/gentium-plus/400.css";
import "@fontsource/gentium-plus/700.css";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { PresetStyles } from "@/components/theme/PresetStyles";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";

export const metadata: Metadata = {
  title: { default: "Logos Relational", template: "%s · Logos Relational" },
  description: "Hebrew and Greek word and verse study through a relational-gospel lens",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <PresetStyles />
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
