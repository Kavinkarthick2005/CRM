"use client";

import React, { useEffect, useState } from "react";
import { Activity, Clock, RefreshCw, CheckCircle, ShieldAlert } from "lucide-react";

interface MetricsData {
  avg_execution_time: number;
  fallback_rate: string;
  recovery_activations: number;
  avg_confidence: string;
  success_rate: string;
}

export default function AgentMetrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:8000";
    // In a real app, this would poll the /api/agent-logs/metrics endpoint
    fetch(`${CRM_URL}/api/agent-logs/metrics`)
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch((err) => console.error("Failed to load agent metrics", err));
  }, []);

  if (!metrics) {
    return <div className="animate-pulse bg-gray-800/50 h-24 rounded-xl w-full border border-gray-700/50"></div>;
  }

  const metricItems = [
    { label: "Avg Execution", value: `${metrics.avg_execution_time}ms`, icon: Clock, color: "text-blue-400" },
    { label: "Fallback Rate", value: metrics.fallback_rate, icon: Activity, color: "text-amber-400" },
    { label: "Recovery Activations", value: metrics.recovery_activations, icon: RefreshCw, color: "text-purple-400" },
    { label: "Avg Confidence", value: metrics.avg_confidence, icon: ShieldAlert, color: "text-emerald-400" },
    { label: "Success Rate", value: metrics.success_rate, icon: CheckCircle, color: "text-green-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {metricItems.map((item, idx) => (
        <div key={idx} className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 flex flex-col justify-center items-start relative overflow-hidden group">
          <div className="flex items-center space-x-2 mb-2">
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{item.label}</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {item.value}
          </div>
          
          {/* Subtle gradient background effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        </div>
      ))}
    </div>
  );
}
