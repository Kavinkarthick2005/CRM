"use client";

import { useState, useEffect, useMemo, use } from "react";
import { ArrowLeft, Rocket, Users, Target, Activity } from "lucide-react";
import Link from "next/link";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import AgentIntelligenceCenter from "@/components/agent-intelligence/AgentIntelligenceCenter";

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

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
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
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
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
  const engagementScore = Math.min(100, (deliveryRate * 0.2) + (openRate * 0.4) + (clickRate * 1.5));

  const radarData = [
    { subject: 'Delivery Rate', A: deliveryRate, fullMark: 100 },
    { subject: 'Open Rate', A: openRate, fullMark: 100 },
    { subject: 'Click Rate', A: clickRate, fullMark: 100 },
    { subject: 'Engagement Score', A: engagementScore, fullMark: 100 },
  ];

  return (
    <div className="flex-1 w-full py-8 max-w-6xl mx-auto space-y-8 px-8 animate-fade-in">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
        <ArrowLeft size={16} />
        Back to Campaigns
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{data.name}</h1>
          <div className="flex items-center gap-3 mt-4">
            <div className="inline-block px-3 py-1 bg-gray-800 rounded-full text-sm font-medium border border-gray-700 text-gray-300">
              Status: <span className={data.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>{data.status}</span>
            </div>
            <div className="inline-block px-3 py-1 bg-gray-800 rounded-full text-sm font-medium border border-gray-700 text-gray-300">
              Channel: <span className="text-emerald-400 uppercase">{data.channel || "SMS"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${CRM_URL}/api/reports/campaign/${id}`}
            download
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white font-medium shadow-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export Report
          </a>
          <button 
            onClick={() => {
              document.getElementById('agent-replay-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium shadow-md transition-colors"
          >
            View Agent Replay →
          </button>
        </div>
      </div>

      {/* Primary Stats Grid */}
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
          <div className="flex items-center gap-3 text-teal-400 mb-2">
            <Activity size={20} />
            <span className="font-medium text-sm uppercase tracking-wider text-teal-500/80">Clicked</span>
          </div>
          <div className="text-4xl font-bold text-teal-400">{stats.clicked}</div>
        </div>
      </div>

      {/* Replay Mode: Agent Intelligence Center */}
      <div id="agent-replay-section" className="mt-8 pt-4">
        <AgentIntelligenceCenter campaignId={parseInt(id)} />
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Radar Chart (Health Snapshot) */}
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl flex flex-col items-center justify-center lg:col-span-1">
          <h2 className="text-xl font-bold text-white w-full text-center mb-4">Campaign Health Snapshot</h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Radar name="Metrics" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-500 text-center mt-2">Overall Engagement Score: <span className="font-bold text-emerald-400">{engagementScore.toFixed(0)}</span>/100</p>
        </div>

        {/* Funnel Conversion */}
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-xl lg:col-span-2 space-y-8 flex flex-col justify-center">
          <h2 className="text-xl font-bold text-white mb-2">Funnel Conversion</h2>
          
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
              <span className="text-teal-400">{clickRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div className="bg-teal-400 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${clickRate}%` }}></div>
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
                      comm.status === 'clicked' ? 'bg-teal-500/10 text-teal-400' :
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
