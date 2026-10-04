import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prévision du trafic aérien",
  description: "Mémoire M2 IA & Smart Tech — Mamadou BA, UIDT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
