import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { getSession } from "@/app/actions/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FlexFlow Production System",
  description: "Premium Production Management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-background flex`} suppressHydrationWarning={true}>
        {session && <Sidebar user={session} />}
        <main className={`flex-1 max-h-screen overflow-y-auto ${session ? 'p-8' : ''} relative`}>
          {session && (
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px] pointer-events-none" />
          )}
          <div className="relative z-10 w-full h-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
