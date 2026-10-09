import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prévision du trafic aérien",
  description: "Mémoire de Master 2 IA & Smart Tech (UIDT), Mamadou BA",
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
