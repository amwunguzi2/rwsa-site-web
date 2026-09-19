import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.rwsa-aerw.ca"),

  title: {
    default: "RWSA – AERW | Rwandan Students' Association at uOttawa",
    template: "%s | RWSA – AERW",
  },

  description:
    "Official website of the Rwandan Students' Association (RWSA – AERW) at the University of Ottawa. Discover our events, community, membership opportunities and initiatives.",

  keywords: [
    "RWSA",
    "AERW",
    "Rwandan Students Association",
    "Association des Étudiants Rwandais",
    "Rwandan students uOttawa",
    "Rwandan students Ottawa",
    "University of Ottawa",
    "Université d'Ottawa",
    "uOttawa",
    "Rwanda",
    "Rwandan community Ottawa",
  ],

  authors: [
    {
      name: "RWSA – AERW",
    },
  ],

  creator: "RWSA – AERW",
  publisher: "RWSA – AERW",

  category: "Student Association",

  openGraph: {
    type: "website",
    locale: "en_CA",
    alternateLocale: "fr_CA",
    siteName: "RWSA – AERW",
    title: "RWSA – AERW | Rwandan Students' Association at uOttawa",
    description:
      "Celebrating Rwandan culture, strengthening our community and connecting Rwandan students at the University of Ottawa.",
  },

  twitter: {
    card: "summary_large_image",
    title: "RWSA – AERW | Rwandan Students' Association at uOttawa",
    description:
      "Celebrating Rwandan culture, strengthening our community and connecting Rwandan students at the University of Ottawa.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}