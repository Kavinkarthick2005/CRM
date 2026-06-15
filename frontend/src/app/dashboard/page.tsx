"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Users, Send, CheckCircle, MousePointerClick, ArrowRight, Activity, AlertTriangle, Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import AgentIntelligenceCenter from "@/components/agent-intelligence/AgentIntelligenceCenter";
import AudienceGalaxy from "@/components/AudienceGalaxy";
import { useCurrency } from "@/context/CurrencyContext";

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://127.0.0.1:8000";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const SEGMENT_COLORS = ["#10b981", "#f59e0b", "#ef4444"]; // Active, At Risk, Churned

export default function Dashboard() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [segments, setSegments] = useState<any>({ active: 0, at_risk: 0, churned: 0, vip: 0 });
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [atRiskCustomers, setAtRiskCustomers] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          overviewRes, activityRes, funnelRes, channelsRes, 
          segmentsRes, campaignsRes, customersRes, insightsRes
        ] = await Promise.all([
          fetch(`${CRM_URL}/api/dashboard/overview`).then(r => r.json()),
          fetch(`${CRM_URL}/api/dashboard/activity`).then(r => r.json()),
          fetch(`${CRM_URL}/api/dashboard/funnel`).then(r => r.json()),
          fetch(`${CRM_URL}/api/dashboard/channels`).then(r => r.json()),
          fetch(`${CRM_URL}/api/dashboard/segments`).then(r => r.json()),
          fetch(`${CRM_URL}/api/dashboard/recent-campaigns`).then(r => r.json()),
          fetch(`${CRM_URL}/api/dashboard/at-risk-customers`).then(r => r.json()),
          fetch(`${CRM_URL}/api/dashboard/insights`).then(r => r.json()),
        ]);

        setOverview(overviewRes);
        setActivity(activityRes);
        
        // Transform funnel object to array for BarChart
        setFunnel([
          { name: "Sent", value: funnelRes.sent },
          { name: "Delivered", value: funnelRes.delivered },
          { name: "Opened", value: funnelRes.opened },
          { name: "Clicked", value: funnelRes.clicked },
        ]);
        
        setChannels(channelsRes);
        
        setSegments({
          active: segmentsRes.active || 0,
          at_risk: segmentsRes.at_risk || 0,
          churned: segmentsRes.churned || 0,
          vip: segmentsRes.vip || 0,
        });
        
        setRecentCampaigns(campaignsRes);
        setAtRiskCustomers(customersRes);
        setInsights(insightsRes);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleDraftCampaign = (name: string, days: number) => {
    router.push(`/?prompt=Send a win-back message to ${encodeURIComponent(name)} who hasn't ordered in ${days} days.`);
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 space-y-8 overflow-auto">
        <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">Analytics Overview</h1>
        
        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse h-32"></div>
          ))}
        </div>
        
        {/* Charts Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse h-80"></div>
          ))}
        </div>
        
        {/* Tables Skeletons */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse h-64"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-auto space-y-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
      </div>

      {/* 1. OVERVIEW */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Total Customers</h3>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Users size={18}/></div>
            </div>
            <p className="text-3xl font-bold text-white">{overview?.total_customers}</p>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Campaigns Sent</h3>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500"><Send size={18}/></div>
            </div>
            <p className="text-3xl font-bold text-white">{overview?.campaigns_sent}</p>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Messages Delivered</h3>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle size={18}/></div>
            </div>
            <p className="text-3xl font-bold text-white">{overview?.messages_delivered}</p>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Overall Open Rate</h3>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500"><MousePointerClick size={18}/></div>
            </div>
            <p className="text-3xl font-bold text-white">{overview?.overall_open_rate}%</p>
          </div>
        </div>
      </section>

      {/* 2. AGENT INTELLIGENCE */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Agent Intelligence</h2>
        <AgentIntelligenceCenter />
      </section>

      {/* 3. AUDIENCE HEALTH */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Audience Health</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md relative overflow-hidden">
            <h2 className="text-lg font-bold text-white mb-2">Audience Galaxy</h2>
            <p className="text-sm text-gray-400 mb-4">Force-directed representation of customer engagement</p>
            <div className="h-64 w-full">
              <AudienceGalaxy segments={segments} />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={18} />
                Customers At Risk
              </h2>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider sticky top-0">
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Days Inactive</th>
                    <th className="px-6 py-4 font-medium">Total Spend</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {atRiskCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm text-white font-medium">{customer.name}</div>
                        <div className="text-xs text-gray-400">{customer.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-500">
                          {customer.days_inactive} days
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{formatCurrency(customer.total_spend)}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDraftCampaign(customer.name, customer.days_inactive)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                        >
                          Draft Campaign <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {atRiskCustomers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                        No at-risk customers found. Great job!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CAMPAIGN PERFORMANCE */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Campaign Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md">
            <h2 className="text-lg font-bold text-white mb-6">Campaign Activity (30 Days)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Line type="monotone" dataKey="messages_sent" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md">
            <h2 className="text-lg font-bold text-white mb-6">Delivery Funnel</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    cursor={{fill: '#374151', opacity: 0.4}}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30}>
                    {funnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-md">
            <h2 className="text-lg font-bold text-white mb-6">Channel Distribution</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channels} dataKey="count" nameKey="channel" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {channels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Recent Campaigns</h2>
              <button onClick={() => router.push('/campaigns')} className="text-sm text-emerald-500 hover:text-emerald-400 font-medium">View All →</button>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider sticky top-0">
                    <th className="px-6 py-4 font-medium">Campaign</th>
                    <th className="px-6 py-4 font-medium">Channel</th>
                    <th className="px-6 py-4 font-medium">Delivery</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {recentCampaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-white font-medium">{c.campaign_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{c.channel}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{c.delivery_rate}%</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          c.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 5. RECOMMENDATIONS */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Recommendations</h2>
        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-xl p-6 border border-emerald-800/50 shadow-md">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="text-emerald-400" size={20} />
            WhisperFlow Insights Engine
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-5 border border-gray-700 flex flex-col justify-between hover:border-emerald-500/50 transition-colors shadow-sm">
                <p className="text-sm text-gray-200 mb-4">{insight.text}</p>
                <button 
                  onClick={() => router.push(`/?prompt=${encodeURIComponent(insight.prompt)}`)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Take Action <ArrowRight size={14} />
                </button>
              </div>
            ))}
            {insights.length === 0 && (
              <p className="text-gray-400 text-sm">No insights available at this time.</p>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
