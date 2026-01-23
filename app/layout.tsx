import type { Metadata } from "next";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import { Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { getAuthenticatedUsername } from "@/lib/auth/guard";
import { readUserData } from "@/lib/auth/user-data";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import "./globals.css";

config.autoAddCss = false;

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Folia",
  description: "A filesystem-first knowledge base for living notes and docs.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const username = await getAuthenticatedUsername();
  const userData = username ? await readUserData(username) : {};
  const fallbackTheme = userData.theme;
  const themeClass =
    fallbackTheme === "light" || fallbackTheme === "dark"
      ? `theme-${fallbackTheme}`
      : undefined;

  return (
    <html lang="en" className={themeClass}>
      <body
        className={`${spaceGrotesk.variable} ${fraunces.variable} ${jetBrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
