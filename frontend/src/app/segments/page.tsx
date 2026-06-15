"use client";

import { useState, useEffect } from "react";
import { Users, AlertCircle, TrendingDown, Bot, Layers } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import Link from "next/link";

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://127.0.0.1:8000";

interface Segment {
  id: number;
  name: string;
  description: string;
  group_type: string;
  member_count: number;
  ltv: number;
  health: {
    active: number;
    at_risk: number;
    churned: number;
  };
  active_triggers: number;
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetch(`${CRM_URL}/api/segments`)
      .then(res => res.json())
      .then(data => {
        setSegments(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto py-8 px-8 animate-fade-in text-gray-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
              <Layers size={24} />
            </div>
            Audience Segments
          </h1>
          <p className="text-gray-400">Company groups and behavioral cohorts.</p>
        </div>
        <Link href="/automations" className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors shadow-lg">
          Create Automation
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {segments.map((segment) => (
          <div key={segment.id} className="bg-[#15151a] border border-gray-800 rounded-2xl p-6 shadow-lg hover:border-gray-700 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Layers className="w-24 h-24" />
            </div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-white">{segment.name}</h2>
                <span className="inline-block px-2 py-0.5 mt-2 bg-gray-800 rounded text-xs font-medium uppercase text-gray-400 border border-gray-700">
                  {segment.group_type}
                </span>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1 border border-emerald-500/20">
                <Users size={14} />
                {segment.member_count}
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-6 h-10 relative z-10">{segment.description || "No description provided."}</p>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Lifetime Value</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(segment.ltv)}</p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Health Status</p>
                <div className="flex flex-col gap-1 mt-1">
                  {segment.health.at_risk > 0 && (
                    <p className="text-xs font-medium text-amber-400 flex items-center gap-1">
                      <AlertCircle size={12} /> {segment.health.at_risk} At Risk
                    </p>
                  )}
                  {segment.health.churned > 0 && (
                    <p className="text-xs font-medium text-rose-400 flex items-center gap-1">
                      <TrendingDown size={12} /> {segment.health.churned} Churned
                    </p>
                  )}
                  {segment.health.at_risk === 0 && segment.health.churned === 0 && (
                    <p className="text-xs font-medium text-emerald-400">Healthy</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-between items-center relative z-10">
              <div className={`flex items-center gap-2 text-sm font-medium ${segment.active_triggers > 0 ? 'text-indigo-400' : 'text-gray-500'}`}>
                <Bot size={16} />
                {segment.active_triggers} Active Automations
              </div>
              <Link href="/automations" className="text-gray-400 hover:text-white transition-colors text-sm">
                View →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
