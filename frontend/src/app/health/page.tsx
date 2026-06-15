"use client";

import { useState, useEffect } from "react";
import { Activity, Database, Server, Clock, ServerCog, Bot, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://127.0.0.1:8000";

export default function SystemHealthPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${CRM_URL}/api/health`);
        const data = await res.json();
        setHealthData(data);
      } catch (error) {
        console.error("Health check failed", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !healthData) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const getStatusIcon = (status: string) => {
    if (status === "healthy" || status === "connected" || status === "active") {
      return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    }
    if (status === "mocked" || status === "degraded") {
      return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
    return <XCircle className="w-5 h-5 text-rose-400" />;
  };

  return (
    <div className="flex-1 w-full py-8 px-8 animate-fade-in text-gray-200">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
          <Activity size={24} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">System Health</h1>
        {healthData && (
          <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium border ${
            healthData.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            {healthData.status.toUpperCase()}
          </span>
        )}
      </div>

      {!healthData ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 text-center text-rose-400 shadow-sm">
          Could not connect to the WhisperFlow backend. Please verify that the API is running on {CRM_URL}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <h2 className="font-semibold text-white">Uptime</h2>
              </div>
              {getStatusIcon('healthy')}
            </div>
            <div className="text-3xl font-bold text-white">{formatUptime(healthData.uptime_seconds)}</div>
            <p className="text-xs text-gray-500 mt-2">Time since last backend restart</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-white">Database</h2>
              </div>
              {getStatusIcon(healthData.database.status)}
            </div>
            <div className="text-xl font-bold text-white capitalize">{healthData.database.status}</div>
            <p className="text-xs text-gray-500 mt-2">PostgreSQL connection status</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <ServerCog className="w-5 h-5 text-purple-400" />
                <h2 className="font-semibold text-white">Task Queue</h2>
              </div>
              {getStatusIcon('healthy')}
            </div>
            <div className="text-3xl font-bold text-white">{healthData.queue.pending_jobs}</div>
            <p className="text-xs text-gray-500 mt-2">Pending asynchronous communications</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-amber-400" />
                <h2 className="font-semibold text-white">System Resources</h2>
              </div>
              {getStatusIcon('healthy')}
            </div>
            <div className="flex justify-between mt-2">
              <div>
                <p className="text-sm text-gray-400">CPU</p>
                <div className="text-xl font-bold text-white">{healthData.system.cpu_percent}%</div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">RAM</p>
                <div className="text-xl font-bold text-white">{healthData.system.memory_percent}%</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400" />
                <h2 className="font-semibold text-white">Channel Service</h2>
              </div>
              {getStatusIcon(healthData.channel_service.status)}
            </div>
            <div className="text-xl font-bold text-white capitalize">{healthData.channel_service.status}</div>
            <p className="text-xs text-gray-500 mt-2">External delivery microservice</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-md hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-white">LangGraph Engine</h2>
              </div>
              {getStatusIcon(healthData.langgraph.status)}
            </div>
            <div className="text-xl font-bold text-white capitalize">{healthData.langgraph.status}</div>
            <p className="text-xs text-gray-500 mt-2">Agent intelligence orchestration</p>
          </div>

        </div>
      )}
    </div>
  );
}
