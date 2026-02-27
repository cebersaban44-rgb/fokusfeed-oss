import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FokusFeed OSS",
  description: "Personalized digest and live feed with deterministic fallback"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {})); }`
          }}
        />
        <div className="app-shell">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}
