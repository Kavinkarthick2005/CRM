"use client";

import { useEffect, useState } from "react";

export default function CampaignCard() {
  const [progress, setProgress] = useState(0);

  // Mock progress animation for aesthetic preview
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 1));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex gap-4 items-start w-full justify-end">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl rounded-tr-none shadow-lg w-full max-w-[80%] hover:border-violet-500/50 transition-colors duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 border border-violet-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">SMS Campaign Prepared</h3>
              <p className="text-slate-400 text-sm">Targeting VIPs &gt; $500 spend</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
            Sending...
          </span>
        </div>

        {/* Segment Details & Draft */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
            <div className="text-slate-400 text-xs mb-1 uppercase tracking-wider font-semibold">Segment Size</div>
            <div className="text-3xl font-light text-white">1,248 <span className="text-sm text-slate-500">users</span></div>
          </div>
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
            <div className="text-slate-400 text-xs mb-2 uppercase tracking-wider font-semibold">Message Draft</div>
            <p className="text-sm text-slate-300 italic">
              "Hi {'{name}'}, enjoy 20% off as one of our VIPs! Use code VIP20 at checkout."
            </p>
          </div>
        </div>

        {/* Live Metrics */}
        <div>
          <div className="flex justify-between text-sm mb-2 text-slate-300">
            <span>Delivery Progress</span>
            <span className="text-violet-400">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden relative">
            <div className="absolute top-0 bottom-0 bg-violet-600 w-full opacity-20 animate-pulse"></div>
            <div 
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 h-2 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-10 bg-white/30 blur-sm"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div className="bg-slate-950 rounded-lg py-2 border border-slate-800/50">
              <div className="text-slate-500 text-xs mb-1">Sent</div>
              <div className="text-white font-medium">1,248</div>
            </div>
            <div className="bg-slate-950 rounded-lg py-2 border border-slate-800/50">
              <div className="text-slate-500 text-xs mb-1">Delivered</div>
              <div className="text-emerald-400 font-medium">1,102</div>
            </div>
            <div className="bg-slate-950 rounded-lg py-2 border border-slate-800/50">
              <div className="text-slate-500 text-xs mb-1">Opened</div>
              <div className="text-blue-400 font-medium">480</div>
            </div>
            <div className="bg-slate-950 rounded-lg py-2 border border-slate-800/50">
              <div className="text-slate-500 text-xs mb-1">Clicked</div>
              <div className="text-fuchsia-400 font-medium">120</div>
            </div>
          </div>
        </div>

      </div>
      
      <div className="w-8 h-8 shrink-0 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]">
        K
      </div>
    </div>
  );
}
