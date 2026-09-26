import type { Metadata, Viewport } from "next";
import { Geist_Mono, Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Sense — Sense the Market Before It Moves",
  description:
    "Stock Sense is your sixth sense for stocks — an AI-powered market radar with real-time signals, sector heatmaps and cinematic insights.",
  keywords: ["stock sense", "stocks", "AI trading", "market radar", "investing", "finance"],
  icons: {
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#FF8A3D'/><stop offset='0.5' stop-color='#FF6FA5'/><stop offset='1' stop-color='#38B6FF'/></linearGradient></defs><rect width='64' height='64' rx='16' fill='url(#g)'/><path d='M14 40 L24 28 L32 34 L44 16 L52 22' stroke='white' stroke-width='5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>`
      ),
  },
  openGraph: {
    title: "Stock Sense — Sense the Market Before It Moves",
    description: "AI-powered market radar with real-time signals and cinematic insights.",
    siteName: "Stock Sense",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8EC" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0F16" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${grotesk.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
