import type { Metadata, Viewport } from "next";
import { Geist, Patrick_Hand, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const title = "zenithsui — wireframes that know they're wireframes";
const description =
  "An infinite canvas of real UI components that all render like you sketched them on a napkin. Wireframes that know they're wireframes.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fbfaf5",
};

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-sketch",
  weight: "400",
  subsets: ["latin"],
});

// The canvas's serif — a text face rather than a display one, because it has to
// hold up at 12px inside a wireframe's caption, not just in a headline.
const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "https://zenithsui.sh";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "zenithsui",
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "zenithsui",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${patrickHand.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <script
          id="chunk-reload-handler"
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e && e.message && /Failed to load chunk|Loading chunk .* failed/i.test(e.message)) {
                  var last = sessionStorage.getItem('chunk_reload_ts');
                  var now = Date.now();
                  if (!last || now - Number(last) > 8000) {
                    sessionStorage.setItem('chunk_reload_ts', String(now));
                    window.location.reload();
                  }
                }
              });
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}

