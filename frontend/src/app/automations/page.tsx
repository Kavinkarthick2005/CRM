"use client";

import { useState, useEffect } from "react";
import { Bot, Sparkles, Plus, Play, Clock, CheckCircle2, ChevronRight, Activity } from "lucide-react";

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://127.0.0.1:8000";

interface Automation {
  id: number;
  name: string;
  group_name: string;
  trigger_type: string;
  action_type: string;
  is_active: boolean;
  times_fired: number;
  last_triggered_at: string | null;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`${CRM_URL}/api/automations`);
      const data = await res.json();
      setAutomations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    setParsing(true);
    try {
      const parseRes = await fetch(`${CRM_URL}/api/automations/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const parsedData = await parseRes.json();
      
      if (!parsedData.group_id) {
         alert("Could not determine the group from the prompt.");
         return;
      }
      
      const createRes = await fetch(`${CRM_URL}/api/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsedData.name || "AI Generated Rule",
          group_id: parsedData.group_id,
          trigger_type: parsedData.trigger_type || "inactivity",
          conditions: parsedData.conditions || {},
          action_type: parsedData.action_type || "email",
          action_payload: parsedData.action_payload || {}
        })
      });
      
      if (createRes.ok) {
        setPrompt("");
        fetchAutomations();
      } else {
        alert("Failed to create automation.");
      }
    } catch (e) {
      console.error(e);
      alert("Error parsing automation rule.");
    } finally {
      setParsing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const totalFired = automations.reduce((acc, a) => acc + a.times_fired, 0);

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto py-8 px-8 animate-fade-in text-gray-200">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Automations</h1>
            <p className="text-gray-400 text-sm mt-1">Trigger-based workflows and intelligent campaigns.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg text-sm">
            <p className="text-gray-500">Automations Fired</p>
            <p className="text-xl font-bold text-white">{totalFired}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg text-sm">
            <p className="text-gray-500">Active Triggers</p>
            <p className="text-xl font-bold text-emerald-400">{automations.filter(a => a.is_active).length}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#15151a] border border-gray-800 rounded-2xl p-6 shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
          <Sparkles className="w-48 h-48 text-indigo-500" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-400" />
          AI Trigger Builder
        </h2>
        <div className="flex gap-4 relative z-10">
          <input 
            type="text" 
            placeholder="e.g. Whenever VIP customers haven't purchased for 30 days, send them a personalized email."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <button 
            onClick={handleCreate}
            disabled={parsing || !prompt.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            {parsing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Plus size={18} />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-[#15151a] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <h2 className="font-semibold text-white">Active Rules</h2>
        </div>
        
        {automations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No automations created yet. Use the AI builder above to create one.
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {automations.map((auto) => (
              <div key={auto.id} className="p-6 hover:bg-gray-800/30 transition-colors flex items-center justify-between">
                <div className="flex gap-4 items-start">
                  <div className={`mt-1 p-2 rounded-lg ${auto.is_active ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-gray-800 text-gray-500'}`}>
                    <Play size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{auto.name}</h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                      <span className="bg-gray-800 px-2 py-0.5 rounded text-xs font-medium border border-gray-700">{auto.group_name}</span>
                      <span className="flex items-center gap-1"><ChevronRight size={14} className="text-gray-600"/> <span className="capitalize">{auto.trigger_type.replace("_", " ")}</span></span>
                      <span className="flex items-center gap-1"><ChevronRight size={14} className="text-gray-600"/> <span className="capitalize">{auto.action_type.replace("_", " ")}</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-right">
                    <p className="text-gray-500 mb-1">Times Fired</p>
                    <p className="font-bold text-white text-lg">{auto.times_fired}</p>
                  </div>
                  <div className="text-right w-32">
                    <p className="text-gray-500 mb-1">Last Run</p>
                    <p className="font-medium text-gray-300 flex items-center justify-end gap-1">
                      {auto.last_triggered_at ? (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          {new Date(auto.last_triggered_at).toLocaleDateString()}
                        </>
                      ) : (
                        <>
                          <Clock size={14} className="text-gray-500" />
                          Never
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
