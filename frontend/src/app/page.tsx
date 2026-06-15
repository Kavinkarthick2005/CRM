"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Send, Bot, User, CheckCircle2, Rocket, BarChart3 } from "lucide-react";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CampaignStats {
  id: number;
  name: string;
  status: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [segmentQuery, setSegmentQuery] = useState<any>(null);
  const [segmentCount, setSegmentCount] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState<string>("");
  const [showSendButton, setShowSendButton] = useState(false);
  const [campaignSentMsg, setCampaignSentMsg] = useState("");
  const [historicalStats, setHistoricalStats] = useState<any>(null);
  
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [failedAgents, setFailedAgents] = useState<string[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<string>("");
  const [isPipelineExpanded, setIsPipelineExpanded] = useState<boolean>(false);
  
  const [latestCampaign, setLatestCampaign] = useState<CampaignStats | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${CRM_URL}/api/campaigns`);
        if (res.ok) {
          const data: CampaignStats[] = await res.json();
          if (data && data.length > 0) {
            setLatestCampaign(data[0]);
          }
        }
      } catch (e) {
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [CRM_URL]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('chat_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('chat_history', JSON.stringify(history));
    }
  }, [history, isMounted]);

  const handleClearChat = () => {
    localStorage.removeItem('chat_history');
    setHistory([]);
    setSegmentQuery(null);
    setSegmentCount(null);
    setMessageDraft("");
    setShowSendButton(false);
    setCampaignSentMsg("");
    setHistoricalStats(null);
    setConfidenceScore(null);
    setFailedAgents([]);
    setPipelineStatus("");
    setIsPipelineExpanded(false);
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, segmentCount, messageDraft, campaignSentMsg, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${CRM_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          conversation_history: history,
        })
      });

      if (!res.ok) throw new Error("Failed to communicate with AI");

      const data = await res.json();
      
      setHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
      
      if (data.segment_query) setSegmentQuery(data.segment_query);
      if (data.segment_count !== null && data.segment_count !== undefined) setSegmentCount(data.segment_count);
      if (data.message_draft) setMessageDraft(data.message_draft);
      if (data.confidence_score !== undefined) setConfidenceScore(data.confidence_score);
      if (data.failed_agents !== undefined) setFailedAgents(data.failed_agents);
      if (data.status !== undefined) setPipelineStatus(data.status);
      
      if (data.action === "send" || (data.segment_count !== null && data.message_draft)) {
        setShowSendButton(true);
        fetch(`${CRM_URL}/api/dashboard/funnel`)
          .then(r => r.json())
          .then(setHistoricalStats)
          .catch(console.error);
      }
      
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!segmentQuery || !messageDraft) {
      toast.error("Missing segment or message draft.");
      return;
    }
    
    setIsSending(true);
    try {
      // Find original prompt to generate name
      const firstUserMsg = history.find(m => m.role === "user")?.content || "New Campaign";
      
      let campaignName = `Campaign - ${new Date().toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      })}`;

      try {
        const nameRes = await fetch(`${CRM_URL}/api/chat/name`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: firstUserMsg })
        });
        if (nameRes.ok) {
          const nameData = await nameRes.json();
          campaignName = nameData.name;
        }
      } catch (e) {
        // Fallback silently to date string
      }

      const createRes = await fetch(`${CRM_URL}/api/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          segment_query: segmentQuery,
          message_text: messageDraft,
          channel: "sms" 
        })
      });

      if (!createRes.ok) throw new Error("Failed to create campaign");
      const campaignData = await createRes.json();

      const sendRes = await fetch(`${CRM_URL}/api/campaigns/${campaignData.id}/send`, {
        method: "POST"
      });

      if (!sendRes.ok) throw new Error("Failed to dispatch campaign");
      
      const sendData = await sendRes.json();
      
      setCampaignSentMsg(`🚀 Campaign sent to ${sendData.segment_size} customers`);
      setShowSendButton(false);
      setSegmentQuery(null);
      setSegmentCount(null);
      setMessageDraft("");
      setHistoricalStats(null);
      setConfidenceScore(null);
      setFailedAgents([]);
      setPipelineStatus("");
      setIsPipelineExpanded(false);
      setHistory([]); 
      toast.success("Campaign dispatched!");
      
    } catch (e: any) {
      toast.error(e.message || "Failed to send campaign");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex w-full h-[calc(100vh-4rem)]">
      <div className="flex-1 flex flex-col border-r border-gray-800 relative">
        
        {isMounted && history.length > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={handleClearChat}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-3 py-1.5 rounded-md border border-gray-700 transition-colors shadow-sm"
            >
              Clear Chat
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pt-14">
          
          {isMounted && history.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <Bot size={48} className="mb-4 text-indigo-400" />
              <h2 className="text-xl font-semibold mb-2">Welcome to Xeno AI Assistant</h2>
              <p className="max-w-md">
                Describe the audience you want to reach and the message you want to send. 
                For example: "Send a 10% off sms to churned VIPs."
              </p>
            </div>
          )}

          {history.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Bot size={16} className="text-indigo-400" />
                </div>
              )}
              <div className={`p-4 max-w-[80%] rounded-2xl ${
                msg.role === "user" 
                  ? "bg-indigo-600 text-white rounded-tr-sm" 
                  : "bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                  <User size={16} className="text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <Bot size={16} className="text-indigo-400" />
              </div>
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}

          {segmentCount !== null && !isLoading && !campaignSentMsg && (
            <div className="ml-12 mr-12 bg-gray-800/50 border border-green-500/30 p-4 rounded-xl flex items-center gap-3 shadow-sm">
              <CheckCircle2 className="text-green-400" size={24} />
              <span className="text-green-100 font-medium">✓ {segmentCount} customers match this segment</span>
            </div>
          )}

          {confidenceScore !== null && !isLoading && !campaignSentMsg && (
            <div className="ml-12 mr-12 bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-3">
                {confidenceScore >= 80 && <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>}
                {confidenceScore >= 50 && confidenceScore < 80 && <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>}
                {confidenceScore < 50 && <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>}
                <span className="text-gray-200 font-medium">AI Confidence: {confidenceScore}%</span>
                <span className="text-gray-400 text-sm border-l border-gray-600 pl-3">
                  {confidenceScore >= 80 ? "High quality targeting" : 
                   confidenceScore >= 50 ? "Good targeting, some assumptions made" : 
                   "Used fallback targeting, review before sending"}
                </span>
              </div>
              
              <div className="mt-3">
                <button 
                  onClick={() => setIsPipelineExpanded(!isPipelineExpanded)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  {isPipelineExpanded ? "▼ Hide Pipeline Status" : "▶ Show Pipeline Status"}
                </button>
                
                {isPipelineExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      {failedAgents.includes('intent') ? <span className="text-red-400">⚠️</span> : <span className="text-green-400">✅</span>} 
                      Intent parsed
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      {failedAgents.includes('segment') ? <span className="text-red-400">⚠️</span> : <span className="text-green-400">✅</span>} 
                      Segment built
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      {failedAgents.includes('message') ? <span className="text-red-400">⚠️</span> : <span className="text-green-400">✅</span>} 
                      Message generated
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className="text-green-400">✅</span> Validated
                    </div>
                    {pipelineStatus === "recovered" && (
                      <div className="col-span-2 flex items-center gap-2 text-yellow-400 text-xs mt-1">
                        🔄 Recovered via secondary LLM node
                      </div>
                    )}
                    {pipelineStatus === "emergency_fallback" && (
                      <div className="col-span-2 flex items-center gap-2 text-red-400 text-xs mt-1">
                        🚨 Emergency safe defaults activated
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {messageDraft && !isLoading && !campaignSentMsg && (
            <div className="ml-12 mr-12">
              <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
                Message Draft
              </label>
              <textarea 
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-y shadow-inner"
              />
            </div>
          )}

          {showSendButton && historicalStats && !isLoading && !campaignSentMsg && (
            <div className="ml-12 mr-12 bg-gray-900/80 border border-indigo-500/30 p-6 rounded-xl shadow-lg mb-4">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="text-indigo-400" size={18} />
                Campaign Performance Simulator
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                
                <div>
                  <div className="text-sm text-gray-400 mb-1">Expected Reach</div>
                  <div className="text-xl font-bold text-white mb-2">{segmentCount}</div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div className="bg-gray-400 h-1.5 rounded-full w-full"></div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Expected Delivery</div>
                  <div className="text-xl font-bold text-green-400 mb-2">
                    {Math.round((historicalStats.sent > 0 ? historicalStats.delivered / historicalStats.sent : 0.95) * 100)}%
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(historicalStats.sent > 0 ? historicalStats.delivered / historicalStats.sent : 0.95) * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Expected Open Rate</div>
                  <div className="text-xl font-bold text-blue-400 mb-2">
                    {Math.round((historicalStats.delivered > 0 ? historicalStats.opened / historicalStats.delivered : 0.40) * 100)}%
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${(historicalStats.delivered > 0 ? historicalStats.opened / historicalStats.delivered : 0.40) * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-1">Expected Click Rate</div>
                  <div className="text-xl font-bold text-teal-400 mb-2">
                    {Math.round((historicalStats.opened > 0 ? historicalStats.clicked / historicalStats.opened : 0.15) * 100)}%
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div className="bg-teal-400 h-1.5 rounded-full" style={{ width: `${(historicalStats.opened > 0 ? historicalStats.clicked / historicalStats.opened : 0.15) * 100}%` }}></div>
                  </div>
                </div>

              </div>
              <p className="text-xs text-gray-500 mt-4 italic">
                *Predictions are based on historical averages of similar campaigns.
              </p>
            </div>
          )}

          {showSendButton && !isLoading && !campaignSentMsg && (
            <div className="ml-12 mr-12 flex justify-end">
              <button 
                onClick={handleSendCampaign}
                disabled={isSending}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Rocket size={18} />
                )}
                {isSending ? "Sending..." : "Send Campaign"}
              </button>
            </div>
          )}

          {campaignSentMsg && (
            <div className="ml-12 mr-12 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 p-6 rounded-xl flex items-center justify-center text-center shadow-sm">
              <span className="text-green-400 font-bold text-lg flex items-center gap-2">
                <Rocket size={24} />
                {campaignSentMsg}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your audience and message..."
              className="w-full bg-gray-800 border border-gray-700 rounded-full px-6 py-4 pr-16 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading || isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isSending}
              className="absolute right-2 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      <div className="w-80 bg-gray-900/50 p-6 flex flex-col border-l border-gray-800 overflow-y-auto">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="text-indigo-400" size={20} />
          <h2 className="font-semibold text-gray-200">Live Status</h2>
        </div>
        
        {latestCampaign ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
            <div className="mb-4">
              <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Most Recent Campaign</div>
              <div className="text-white font-medium truncate">{latestCampaign.name}</div>
              <div className="mt-2 inline-block px-2 py-1 bg-gray-900 rounded text-xs font-medium border border-gray-700 text-gray-300">
                Status: <span className={latestCampaign.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>{latestCampaign.status}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-700">
              <div>
                <div className="flex justify-between text-sm mb-1 text-gray-300">
                  <span>Delivered</span>
                  <span className="font-medium">{latestCampaign.delivered} / {latestCampaign.total}</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${latestCampaign.total > 0 ? (latestCampaign.delivered / latestCampaign.total) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1 text-gray-300">
                  <span>Opened</span>
                  <span className="font-medium">{latestCampaign.opened}</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${latestCampaign.delivered > 0 ? (latestCampaign.opened / latestCampaign.delivered) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1 text-gray-300">
                  <span>Clicked</span>
                  <span className="font-medium">{latestCampaign.clicked}</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-purple-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${latestCampaign.opened > 0 ? (latestCampaign.clicked / latestCampaign.opened) * 100 : 0}%` }}></div>
                </div>
              </div>
              
              {latestCampaign.failed > 0 && (
                <div className="pt-2">
                  <div className="text-sm text-red-400">
                    Failed: {latestCampaign.failed}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm text-center mt-10">
            No campaigns yet. Send your first campaign to see live stats!
          </div>
        )}
      </div>
    </div>
  );
}
