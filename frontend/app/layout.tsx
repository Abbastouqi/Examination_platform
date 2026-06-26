import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, themeScript } from "@/components/theme";

export const metadata: Metadata = {
  title: "PrepGenius — AI Exam Prep for Pakistani Competitive Exams",
  description:
    "AI-powered preparation for FPSC, NTS, PPSC, EST, CSS, PMS and Lecturer exams. Generate MCQs, take mock tests, chat with an AI tutor and track your progress.",
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
