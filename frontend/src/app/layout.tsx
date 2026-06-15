import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import { MessageSquare, LayoutDashboard, Activity } from "lucide-react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import LogoutButton from "../components/LogoutButton";
import { CurrencyProvider } from "@/context/CurrencyContext";
import CurrencySelector from "@/components/CurrencySelector";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WhisperFlow",
  description: "AI-Native Mini CRM",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-gray-50 min-h-screen flex flex-col`}>
        <CurrencyProvider>
        <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
          <div className="w-full px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                W
              </div>
              <span className="font-bold text-xl tracking-tight text-white">WhisperFlow</span>
            </div>
            
            <nav className="flex items-center gap-6 text-sm font-medium">
              {session && (
                <>
                  <Link href="/dashboard" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                  <Link href="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <MessageSquare size={16} />
                    AI Chat
                  </Link>
                  <Link href="/customers" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <Activity size={16} />
                    Customers
                  </Link>
                  <Link href="/segments" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <Activity size={16} />
                    Segments
                  </Link>
                  <Link href="/campaigns" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <MessageSquare size={16} />
                    Campaigns
                  </Link>
                  <Link href="/automations" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <Activity size={16} />
                    Automations
                  </Link>
                  <Link href="/reports" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <Activity size={16} />
                    Reports
                  </Link>
                  <Link href="/health" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <Activity size={16} />
                    System Health
                  </Link>
                  <div className="w-px h-6 bg-gray-700 mx-2"></div>
                  <CurrencySelector />
                  <LogoutButton />
                </>
              )}
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
        </CurrencyProvider>
      </body>
    </html>
  );
}
