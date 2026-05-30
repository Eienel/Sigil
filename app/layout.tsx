import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Sigil, verifiable provenance on Sui",
  description:
    "Sigil lets people and AI agents leave a tamper proof mark on what they create. Content is stored on Walrus and attested on Sui through Tatum.",
};

export const viewport: Viewport = {
  themeColor: "#f6f2ea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Set the theme class before paint to avoid a flash of the wrong mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sigil-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-[100dvh] antialiased">
        <Providers>
          <SiteNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
