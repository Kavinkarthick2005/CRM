import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import { MessageSquare, LayoutDashboard } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Xeno CRM",
  description: "AI-Native Mini CRM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-gray-50 min-h-screen flex flex-col`}>
        <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                X
              </div>
              <span className="font-bold text-xl tracking-tight text-white">Xeno CRM</span>
            </div>
            
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <MessageSquare size={16} />
                Chat
              </Link>
              <Link href="/campaigns" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <LayoutDashboard size={16} />
                Campaigns
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex-1 w-full flex">
          {children}
        </div>
        
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid #374151',
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
