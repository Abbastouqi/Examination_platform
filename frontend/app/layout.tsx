import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, themeScript } from "@/components/theme";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const TITLE = "PrepGenius — AI Exam Prep for Pakistani Competitive Exams";
const DESCRIPTION =
  "AI-powered preparation for FPSC, NTS, PPSC, EST, CSS, PMS and Lecturer exams. Generate MCQs, take mock tests, chat with an AI tutor and track your progress.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "PrepGenius",
  keywords: [
    "CSS",
    "FPSC",
    "PPSC",
    "NTS",
    "FGEI",
    "PMS",
    "exam preparation Pakistan",
    "MCQs",
    "mock tests",
    "AI tutor",
  ],
  authors: [{ name: "PrepGenius" }],
  creator: "PrepGenius",
  publisher: "PrepGenius",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "PrepGenius",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before paint to avoid a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
