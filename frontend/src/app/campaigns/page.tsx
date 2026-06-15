"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, BarChart2 } from "lucide-react";

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

  const StatusBadge = ({ status }: { status: string }) => {
    let color = "bg-gray-800 text-gray-300 border-gray-700";
    if (status === "completed") color = "bg-green-500/20 text-green-400 border-green-500/30";
    if (status === "sending") color = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (status === "draft") color = "bg-gray-800 text-gray-400 border-gray-700";

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${color}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="w-full py-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
          <LayoutDashboard size={24} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Campaigns</h1>
      </div>

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
                    <td className="px-6 py-4"><StatusBadge status={camp.status} /></td>
                    <td className="px-6 py-4">{camp.sent} / {camp.total}</td>
                    <td className="px-6 py-4 text-green-400">{camp.delivered}</td>
                    <td className="px-6 py-4 text-red-400">{camp.failed}</td>
                    <td className="px-6 py-4 text-blue-400">{camp.opened}</td>
                    <td className="px-6 py-4 text-purple-400">{camp.clicked}</td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/campaigns/${camp.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg text-sm font-medium transition-all text-white shadow-sm"
                      >
                        <BarChart2 size={16} className="text-indigo-400" />
                        View Stats
                      </Link>
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
