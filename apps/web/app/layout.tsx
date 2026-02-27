import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "FokusFeed OSS",
  description: "Personalized digest and live feed powered by real Twitter/X API data"
};

const swBootScript =
  process.env.NODE_ENV === "production"
    ? `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {})); }`
    : `if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister())).catch(() => {}); }`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: swBootScript }} />
        <div className="app-shell">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}
