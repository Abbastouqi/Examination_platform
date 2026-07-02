import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PrepGenius — AI Exam Prep",
    short_name: "PrepGenius",
    description:
      "AI-powered preparation for FPSC, NTS, PPSC, EST, CSS, PMS and Lecturer exams.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1020",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
