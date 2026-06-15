"use client";

import React from "react";
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export interface TimelineEvent {
  timestamp: string;
  agent_name: string;
  action?: string;
  notes?: string;
  duration_ms: number | null;
  status: string; // 'completed', 'executing', 'failed'
  fallback_used?: boolean;
}

interface AgentTimelineProps {
  events: TimelineEvent[];
}

export default function AgentTimeline({ events }: AgentTimelineProps) {
  const getBadge = (status: string, fallback_used?: boolean) => {
    if (status === "executing") {
      return (
        <span className="flex items-center space-x-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Executing</span>
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="flex items-center space-x-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full border border-red-500/20">
          <XCircle className="w-3 h-3" />
          <span>Failed</span>
        </span>
      );
    }
    if (fallback_used) {
      return (
        <span className="flex items-center space-x-1 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" />
          <span>Fallback Used</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
        <CheckCircle className="w-3 h-3" />
        <span>Completed</span>
      </span>
    );
  };

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
  };

  const getActionText = (agentName: string, status: string, notes?: string) => {
    if (notes) return notes;
    if (status === "executing") return "Analyzing context and executing logic...";
    
    switch (agentName) {
      case "Intent Agent": return "Extracted target audience and campaign objective.";
      case "RAG Agent": return "Retrieved customer statistics and context.";
      case "Segment Agent": return "Generated customer segment filters.";
      case "Message Agent": return "Drafted campaign message.";
      case "Validator Agent": return "Verified constraints and tone.";
      case "Recovery Agent": return "Applied recovery fallback rules.";
      case "Emergency Agent": return "Triggered emergency safe defaults.";
      default: return "Executed internal logic.";
    }
  };

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 overflow-y-auto">
      <h3 className="text-lg font-semibold text-white mb-6">Execution Timeline</h3>
      
      <div className="space-y-6">
        {events.length === 0 ? (
          <div className="text-gray-500 text-sm italic">Waiting for execution data...</div>
        ) : (
          events.map((evt, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative pl-6 pb-6 border-l border-gray-700 last:border-transparent last:pb-0"
            >
              <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
              
              <div className="flex justify-between items-start mb-1">
                <div className="text-sm font-bold text-white">{evt.agent_name}</div>
                <div className="text-xs text-gray-500 font-mono">{formatTime(evt.timestamp)}</div>
              </div>
              
              <div className="text-sm text-gray-400 mb-2">
                {evt.action || getActionText(evt.agent_name, evt.status, evt.notes)}
              </div>
              
              <div className="flex items-center space-x-3 mt-2">
                {getBadge(evt.status, evt.fallback_used)}
                {evt.duration_ms && (
                  <span className="text-xs text-gray-500 font-mono">{evt.duration_ms} ms</span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
