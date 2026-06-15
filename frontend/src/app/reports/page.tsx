"use client";

import React, { useState, useEffect } from 'react';
import { Download, Users, Mail, BarChart2, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface DashboardOverview {
  total_customers: number;
  campaigns_sent: number;
  messages_delivered: number;
  overall_open_rate: number;
}

export default function ReportsPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await fetch(`${CRM_URL}/api/dashboard/overview`);
        if (!res.ok) throw new Error("Failed to fetch overview");
        const data = await res.json();
        setOverview(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [CRM_URL]);

  return (
    <div className="flex-1 w-full min-h-screen bg-[#0d0d12] text-white p-8 animate-fade-in pb-20">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-400" /> Reporting Center
          </h1>
          <p className="text-gray-400">Export structured data and analyze performance offline.</p>
        </div>

        {/* METRICS OVERVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#15151a] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users className="w-16 h-16 text-indigo-400" /></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Total Audience</p>
            <p className="text-3xl font-bold text-white">
              {loading ? "-" : overview?.total_customers?.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#15151a] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Mail className="w-16 h-16 text-emerald-400" /></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Campaigns Executed</p>
            <p className="text-3xl font-bold text-white">
              {loading ? "-" : overview?.campaigns_sent?.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#15151a] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileText className="w-16 h-16 text-blue-400" /></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Messages Delivered</p>
            <p className="text-3xl font-bold text-white">
              {loading ? "-" : overview?.messages_delivered?.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#15151a] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><BarChart2 className="w-16 h-16 text-purple-400" /></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Global Open Rate</p>
            <p className="text-3xl font-bold text-emerald-400">
              {loading ? "-" : `${overview?.overall_open_rate}%`}
            </p>
          </div>
        </div>

        {/* EXPORT CENTER */}
        <div>
          <h2 className="text-xl font-bold mb-6">Available Exports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Campaign Performance Report */}
            <div className="bg-[#15151a] p-6 rounded-2xl border border-white/5 flex flex-col justify-between group hover:border-indigo-500/30 transition-all shadow-lg">
              <div className="mb-6">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Campaign Performance</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Download campaign analytics including delivery and engagement performance. Includes audience size, delivery rates, and open/click tracking.
                </p>
              </div>
              
              <a 
                href={`${CRM_URL}/api/reports/campaigns`}
                download
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl font-medium transition-colors shadow-[0_0_20px_rgba(79,70,229,0.2)]"
              >
                <Download className="w-4 h-4" /> Download CSV
              </a>
            </div>

            {/* Customer Report */}
            <div className="bg-[#15151a] p-6 rounded-2xl border border-white/5 flex flex-col justify-between group hover:border-emerald-500/30 transition-all shadow-lg">
              <div className="mb-6">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Complete Customer Roster</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Export customer profiles, engagement status, and activity summaries. Includes lifetime spend, preferred channels, and risk status.
                </p>
              </div>
              
              <a 
                href={`${CRM_URL}/api/reports/customers`}
                download
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-4 rounded-xl font-medium transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                <Download className="w-4 h-4" /> Export All Customers
              </a>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
