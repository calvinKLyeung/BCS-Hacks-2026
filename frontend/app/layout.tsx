import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "CampusSwap · UBC Vancouver",
  description: "Give away or sell your stuff to other UBC students.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} ${plex.variable} h-full antialiased`}>
      {/* Extensions like Grammarly add attributes to <body> before React loads. */}
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-5">{children}</main>
      </body>
    </html>
  );
}
