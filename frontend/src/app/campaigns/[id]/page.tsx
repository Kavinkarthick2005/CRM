"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Rocket, Users, Target, Activity } from "lucide-react";
import Link from "next/link";

interface Comm {
  id: number;
  customer_id: number;
  status: string;
  timestamp: string;
}

interface CampaignDetail {
  id: number;
  name: string;
  status: string;
  channel: string;
  message_text: string;
  segment_query: any;
  total: number;
  stats: {
    queued: number;
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
  };
  communications: Comm[];
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id;
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:8000";

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const res = await fetch(`${CRM_URL}/api/campaigns/${id}/stats`);
        if (res.ok) {
          const detail = await res.json();
          setData(detail);
        }
      } catch (e) {
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDetail();
    const interval = setInterval(fetchDetail, 5000);
    return () => clearInterval(interval);
  }, [id, CRM_URL]);

  if (isLoading) {
    return (
      <div className="w-full py-8 max-w-6xl mx-auto flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full py-8 max-w-6xl mx-auto text-center text-gray-500">
        Campaign not found.
      </div>
    );
  }

  const { stats, total } = data;
  const deliveryRate = total > 0 ? (stats.delivered / total) * 100 : 0;
  const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
  const clickRate = stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0;

  return (
    <div className="w-full py-8 max-w-6xl mx-auto space-y-8">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
        <ArrowLeft size={16} />
        Back to Campaigns
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{data.name}</h1>
          <div className="flex items-center gap-3">
            <div className="inline-block px-3 py-1 bg-gray-800 rounded-full text-sm font-medium border border-gray-700 text-gray-300">
              Status: <span className={data.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>{data.status}</span>
            </div>
            <div className="inline-block px-3 py-1 bg-gray-800 rounded-full text-sm font-medium border border-gray-700 text-gray-300">
              Channel: <span className="text-indigo-400 uppercase">{data.channel || "SMS"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Segment & Message Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Segment Criteria</h3>
          <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-900 p-4 rounded-xl border border-gray-800">
            {JSON.stringify(data.segment_query || {}, null, 2)}
          </pre>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl shadow-sm">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Message Content</h3>
          <div className="text-gray-300 bg-gray-900 p-4 rounded-xl border border-gray-800 italic">
            "{data.message_text}"
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-gray-400 mb-2">
            <Users size={20} />
            <span className="font-medium text-sm uppercase tracking-wider">Targeted</span>
          </div>
          <div className="text-4xl font-bold text-white">{total}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-green-400 mb-2">
            <Rocket size={20} />
            <span className="font-medium text-sm uppercase tracking-wider text-green-500/80">Delivered</span>
          </div>
          <div className="text-4xl font-bold text-green-400">{stats.delivered}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-blue-400 mb-2">
            <Target size={20} />
            <span className="font-medium text-sm uppercase tracking-wider text-blue-500/80">Opened</span>
          </div>
          <div className="text-4xl font-bold text-blue-400">{stats.opened}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-purple-400 mb-2">
            <Activity size={20} />
            <span className="font-medium text-sm uppercase tracking-wider text-purple-500/80">Clicked</span>
          </div>
          <div className="text-4xl font-bold text-purple-400">{stats.clicked}</div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl space-y-8">
        <h2 className="text-xl font-bold text-white mb-6">Funnel Conversion</h2>
        
        <div>
          <div className="flex justify-between text-sm mb-2 text-gray-300 font-medium">
            <span>Delivery Rate</span>
            <span className="text-green-400">{deliveryRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div className="bg-green-500 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${deliveryRate}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2 text-gray-300 font-medium">
            <span>Open Rate (from Delivered)</span>
            <span className="text-blue-400">{openRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div className="bg-blue-400 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${openRate}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2 text-gray-300 font-medium">
            <span>Click Rate (from Opened)</span>
            <span className="text-purple-400">{clickRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div className="bg-purple-400 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${clickRate}%` }}></div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Communications Log</h2>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs font-semibold tracking-wider sticky top-0 border-b border-gray-800 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4">Comm ID</th>
                <th className="px-6 py-4">Customer ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.communications.map((comm) => (
                <tr key={comm.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 text-gray-400 font-mono">#{comm.id}</td>
                  <td className="px-6 py-4 text-gray-400 font-mono">#{comm.customer_id}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      comm.status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                      comm.status === 'opened' ? 'bg-blue-500/10 text-blue-400' :
                      comm.status === 'clicked' ? 'bg-purple-500/10 text-purple-400' :
                      comm.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {comm.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">
                    {new Date(comm.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
