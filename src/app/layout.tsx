import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Web3Providers from "@/providers/Web3Providers";

const SITE_URL = "https://www.bucket.foundation";
const SITE_NAME = "bucket.foundation";
const TAGLINE = "free to read. paid to cite.";
const DESCRIPTION =
  "A nonprofit canon of foundations — axioms, laws, first principles — carved into stone by the small number of people who can do genius work with AI. Every paper is free to read. Every citation pays the author, over the x402 rail, forever.";
const KEYWORDS = [
  "decentralized research",
  "x402",
  "feed402",
  "open access",
  "scientific citation",
  "nonprofit foundation",
  "story protocol",
  "IP NFT",
  "Base network",
  "canon",
  "axioms",
  "first principles",
  "AI research",
  "primary research",
  "citation protocol",
  "pay-per-cite",
  "open science",
];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EFE8D4" },
    { media: "(prefers-color-scheme: dark)",  color: "#1F1C16" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: KEYWORDS,
  authors: [
    { name: "Gianangelo Dichio", url: "https://github.com/gianyrox" },
    { name: "bucket foundation" },
  ],
  creator: "bucket.foundation",
  publisher: "bucket.foundation (501(c)(3) pending)",
  category: "science",
  classification: "nonprofit research foundation",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: `${SITE_NAME} feed` }],
      "application/json":    [{ url: "/.well-known/feed402.json", title: "feed402 discovery" }],
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    locale: "en_US",
    // opengraph-image.png at src/app/ is auto-wired by Next.js file convention
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    creator: "@gianyrox",
    // twitter-image.png at src/app/ is auto-wired by Next.js file convention
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  other: {
    "mission": "primary research paid-for-once, citeable-forever",
    "license:code": "MIT",
    "license:intent": "CC0",
    "canon:branches": "8",
    "protocol": "feed402 / x402 / Base",
  },
};

// schema.org JSON-LD — Organization + WebSite + CreativeWork (the canon)
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NGO",
      "@id": `${SITE_URL}#org`,
      name: "bucket.foundation",
      alternateName: ["bucket foundation", "bucket"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
      image: `${SITE_URL}/opengraph-image.png`,
      description:
        "A nonprofit canon of foundations — axioms, real math, laws, principles, primary derivations — built by the small number of people who can do genius work with AI.",
      slogan: "free to read. paid to cite.",
      foundingDate: "2022",
      founder: {
        "@type": "Person",
        name: "Gianangelo Dichio",
        url: "https://github.com/gianyrox",
      },
      sameAs: [
        "https://github.com/bucket-foundation",
        "https://github.com/gianyrox/feed402",
        "https://github.com/gianyrox/x402-research-gateway",
      ],
      knowsAbout: [
        "mathematics", "physics", "chemistry", "information theory",
        "biophysics", "cosmology", "philosophy of mind", "earth science",
        "x402 protocol", "decentralized research", "open citation",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#site`,
      url: SITE_URL,
      name: SITE_NAME,
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}#org` },
      inLanguage: "en-US",
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/canon?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "CreativeWork",
      "@id": `${SITE_URL}#canon`,
      name: "The bucket canon",
      url: `${SITE_URL}/canon`,
      description:
        "Eight branches of foundations: mathematics, physics, chemistry, information, biophysics, cosmology, mind, earth.",
      creator: { "@id": `${SITE_URL}#org` },
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}#feed402`,
      name: "feed402 protocol",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}/protocol`,
      description:
        "Open standard for paid research endpoints over x402 on Base. Discover, pay per query, receive a citeable envelope (data + citation + receipt).",
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: "0.002",
        highPrice: "0.010",
        offerCount: 3,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800;900&family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <Web3Providers>
        <body className="stone-bg min-h-screen">
          <Script
            id="ld-org"
            type="application/ld+json"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
          />
          <Header />
          {children}
          <Footer />
        </body>
      </Web3Providers>
    </html>
  );
}
