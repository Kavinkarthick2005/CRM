"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { LayoutDashboard, BarChart2, Users, Target, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

interface CampaignStats {
  id: number;
  name: string;
  status: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  created_at?: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(`${CRM_URL}/api/campaigns`);
        if (!res.ok) throw new Error("Failed to fetch campaigns");
        const data = await res.json();
        setCampaigns(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(interval);
  }, [CRM_URL]);

  const StatusBadge = ({ status, failed }: { status: string, failed: number }) => {
    let color = "bg-gray-800 text-gray-300 border-gray-700";
    let icon = "";
    let text = status.charAt(0).toUpperCase() + status.slice(1);
    
    if (status === "completed") {
      if (failed > 0) {
        color = "bg-rose-500/20 text-rose-400 border-rose-500/30";
        icon = "⚠ ";
        text = "Requires Attention";
      } else {
        color = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
        icon = "✓ ";
        text = "Completed";
      }
    } else if (status === "sending") {
      color = "bg-amber-500/20 text-amber-400 border-amber-500/30";
      icon = "⚡ ";
      text = "Sending";
    }

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${color}`}>
        {icon}{text}
      </span>
    );
  };

  // Aggregations
  const totalCampaigns = campaigns.length;
  const totalReached = campaigns.reduce((acc, c) => acc + c.total, 0);

  const bestCampaign = useMemo(() => {
    if (campaigns.length === 0) return null;
    return campaigns.reduce((best, current) => {
      const currentOpenRate = current.delivered > 0 ? current.opened / current.delivered : 0;
      const bestOpenRate = best.delivered > 0 ? best.opened / best.delivered : 0;
      return currentOpenRate > bestOpenRate ? current : best;
    });
  }, [campaigns]);

  // Sparkline data (last 7 days volume)
  const sparklineData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const counts = last7Days.reduce((acc, date) => {
      acc[date] = 0;
      return acc;
    }, {} as Record<string, number>);

    campaigns.forEach(c => {
      if (c.created_at) {
        const date = new Date(c.created_at).toISOString().split("T")[0];
        if (counts[date] !== undefined) {
          counts[date] += 1;
        }
      }
    });

    return last7Days.map(date => ({
      name: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      volume: counts[date]
    }));
  }, [campaigns]);

  return (
    <div className="flex-1 w-full py-8 px-8 animate-fade-in text-white">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Campaigns</h1>
        </div>
        
        <a 
          href={`${CRM_URL}/api/reports/campaigns`}
          download
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl transition-all border border-white/10 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download Report
        </a>
      </div>

      {/* SUMMARY BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#15151a] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-400 text-sm font-medium">Total Campaigns</p>
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white">{isLoading ? "-" : totalCampaigns}</p>
        </div>
        
        <div className="bg-[#15151a] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-400 text-sm font-medium">Total Reached</p>
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">{isLoading ? "-" : totalReached}</p>
        </div>

        <div className="bg-[#15151a] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-400 text-sm font-medium">Best Performing</p>
            <Target className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-white truncate" title={bestCampaign?.name || "None"}>
            {isLoading ? "-" : (bestCampaign?.name || "None")}
          </p>
          {bestCampaign && bestCampaign.delivered > 0 && (
            <p className="text-xs text-emerald-400 mt-1">
              {Math.round((bestCampaign.opened / bestCampaign.delivered) * 100)}% Open Rate
            </p>
          )}
        </div>

        <div className="bg-[#15151a] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <p className="text-gray-400 text-sm font-medium mb-2">Volume (Last 7 Days)</p>
          <div className="h-16 w-full">
            {!isLoading && sparklineData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#6ee7b7' }}
                  />
                  <Line type="monotone" dataKey="volume" stroke="#6ee7b7" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* CAMPAIGNS TABLE */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs font-semibold tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Sent</th>
                <th className="px-6 py-4">Delivered</th>
                <th className="px-6 py-4">Failed</th>
                <th className="px-6 py-4">Opened</th>
                <th className="px-6 py-4">Clicked</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-gray-800 rounded w-3/4"></div></td>
                    <td className="px-6 py-5"><div className="h-6 bg-gray-800 rounded-full w-20"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-800 rounded w-8"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-800 rounded w-8"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-800 rounded w-8"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-800 rounded w-8"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-800 rounded w-8"></div></td>
                    <td className="px-6 py-5 text-right"><div className="h-8 bg-gray-800 rounded w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No campaigns found. Start chatting to create one!
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-200">{camp.name}</td>
                    <td className="px-6 py-4"><StatusBadge status={camp.status} failed={camp.failed} /></td>
                    <td className="px-6 py-4">{camp.sent} / {camp.total}</td>
                    <td className="px-6 py-4 text-emerald-400">{camp.delivered}</td>
                    <td className="px-6 py-4 text-red-400">{camp.failed}</td>
                    <td className="px-6 py-4 text-blue-400">{camp.opened}</td>
                    <td className="px-6 py-4 text-teal-400">{camp.clicked}</td>
                    <td className="px-6 py-4 text-right">
                      {camp.failed > 0 ? (
                        <Link 
                          href={`/campaigns/${camp.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-sm font-medium transition-all text-rose-400 shadow-sm"
                        >
                          ⚠ View Diagnostics
                        </Link>
                      ) : (
                        <Link 
                          href={`/campaigns/${camp.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg text-sm font-medium transition-all text-white shadow-sm"
                        >
                          <BarChart2 size={16} className="text-emerald-400" />
                          View Stats
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {error && (
        <div className="mt-4 p-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
}
