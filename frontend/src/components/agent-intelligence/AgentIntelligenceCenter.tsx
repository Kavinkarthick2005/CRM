"use client";

import React, { useEffect, useState, useRef } from "react";
import AgentGraph from "./AgentGraph";
import AgentTimeline, { TimelineEvent } from "./AgentTimeline";
import AgentMetrics from "./AgentMetrics";
import { Play, Pause, SkipBack, SkipForward, FastForward } from "lucide-react";

interface AgentIntelligenceCenterProps {
  campaignId?: number; // If provided, runs in Replay Mode. If undefined, Demo Mode.
}

export default function AgentIntelligenceCenter({ campaignId }: AgentIntelligenceCenterProps) {
  const [logs, setLogs] = useState<TimelineEvent[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isDemoMode] = useState<boolean>(!campaignId);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDemoData = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/agent-logs/demo");
      const data = await res.json();
      setLogs(data.logs || []);
      setCurrentStep(0);
      setIsPlaying(true);
    } catch (err) {
      console.error("Failed to fetch demo data", err);
    }
  };

  const fetchCampaignData = async (id: number) => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/agent-logs/campaign/${id}`),
        fetch(`http://localhost:8000/api/campaigns/${id}/stats`)
      ]);
      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      let finalLogs: TimelineEvent[] = [];

      const groups = Object.values(logsData.execution_groups || {}) as any[];
      if (groups.length > 0) {
        finalLogs = groups[groups.length - 1];
      }

      // Synthesize campaign delivery outcomes
      const { stats, total } = statsData;
      if (stats) {
        const sent = stats.sent || 0;
        const delivered = stats.delivered || 0;
        const opened = stats.opened || 0;
        const clicked = stats.clicked || 0;
        const totalCustomers = total || 1;

        if (sent > 0 || delivered > 0) {
          finalLogs.push({
            agent_name: "Campaign Sent",
            status: "completed",
            duration_ms: 100,
            confidence_score: Math.round(((sent + delivered) / totalCustomers) * 100),
            action: `Dispatched campaign to ${sent + delivered} customers.`,
            timestamp: new Date().toISOString() // Approximate timeline
          });
        }
        if (delivered > 0) {
          finalLogs.push({
            agent_name: "Messages Delivered",
            status: "completed",
            duration_ms: 100,
            confidence_score: Math.round((delivered / Math.max(1, sent + delivered)) * 100),
            action: `Delivered successfully to ${delivered} recipients.`,
            timestamp: new Date(Date.now() + 1000).toISOString()
          });
        }
        if (opened > 0) {
          finalLogs.push({
            agent_name: "Messages Opened",
            status: "completed",
            duration_ms: 100,
            confidence_score: Math.round((opened / Math.max(1, delivered)) * 100),
            action: `Opened by ${opened} recipients.`,
            timestamp: new Date(Date.now() + 2000).toISOString()
          });
        }
        if (clicked > 0) {
          finalLogs.push({
            agent_name: "Messages Clicked",
            status: "completed",
            duration_ms: 100,
            confidence_score: Math.round((clicked / Math.max(1, opened)) * 100),
            action: `Clicked by ${clicked} recipients.`,
            timestamp: new Date(Date.now() + 3000).toISOString()
          });
        }
      }

      if (finalLogs.length > 0) {
        setLogs(finalLogs);
        setCurrentStep(0);
      }
    } catch (err) {
      console.error("Failed to fetch campaign data", err);
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      fetchDemoData();
      const interval = setInterval(fetchDemoData, 15000);
      return () => clearInterval(interval);
    } else if (campaignId) {
      fetchCampaignData(campaignId);
    }
  }, [isDemoMode, campaignId]);

  useEffect(() => {
    if (isPlaying && currentStep < logs.length) {
      const currentLog = logs[currentStep];
      // Simulated delay based on playback speed.
      // For Demo Mode, we play through at standard speed, or we can use duration_ms.
      // Let's use a fixed pleasant delay to ensure animation visibility, scaled by playbackSpeed.
      const delay = (currentLog.duration_ms || 1000) / playbackSpeed;
      
      timerRef.current = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, Math.max(500 / playbackSpeed, delay)); // Minimum delay to see the visual change
    } else if (currentStep >= logs.length) {
      setIsPlaying(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStep, logs, playbackSpeed]);

  const togglePlay = () => {
    if (currentStep >= logs.length) {
      setCurrentStep(0); // Restart
    }
    setIsPlaying(!isPlaying);
  };

  const stepForward = () => {
    if (currentStep < logs.length) setCurrentStep(c => c + 1);
  };

  const stepBackward = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1, 2, 4];
    const currentIndex = speeds.indexOf(playbackSpeed);
    setPlaybackSpeed(speeds[(currentIndex + 1) % speeds.length]);
  };

  // Derive active nodes and timeline events up to currentStep
  // To show 'executing' state nicely, if we are at step N, node N is executing, nodes < N are their final status
  const activeNodes = logs.map((log, index) => {
    if (index < currentStep) {
      return log; // Final status
    } else if (index === currentStep && isPlaying) {
      return { ...log, status: "executing" };
    } else {
      return { ...log, status: "pending" }; // Not yet reached
    }
  }).filter((log, index) => index <= currentStep);

  const timelineEvents = activeNodes.filter(n => n.status !== "pending").reverse(); // Newest first

  return (
    <div className="space-y-6">
      {!isDemoMode && (
        <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <div>
            <h3 className="text-white font-bold">Campaign Replay Mode</h3>
            <p className="text-gray-400 text-sm">Analyze AI execution pathway</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button onClick={stepBackward} disabled={currentStep === 0} className="p-2 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-50 transition-colors">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={togglePlay} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={stepForward} disabled={currentStep >= logs.length} className="p-2 rounded hover:bg-gray-800 text-gray-400 disabled:opacity-50 transition-colors">
              <SkipForward className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-700 mx-2"></div>
            <button onClick={cycleSpeed} className="flex items-center space-x-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors text-sm">
              <FastForward className="w-4 h-4" />
              <span>{playbackSpeed}x</span>
            </button>
          </div>
        </div>
      )}

      {isDemoMode && <AgentMetrics />}
      
      <div className="flex flex-col gap-6">
        <div className="w-full">
          <AgentGraph activeNodes={activeNodes} />
        </div>
        <div className="w-full">
          <AgentTimeline events={timelineEvents} />
        </div>
      </div>
    </div>
  );
}
