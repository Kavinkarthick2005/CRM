"use client";

import { useState } from "react";

export default function ChatInput() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    // TODO: wire up API call here
    setTimeout(() => {
      setMessage("");
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="fixed bottom-0 w-full bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-10 pb-6 px-4">
      <div className="max-w-4xl mx-auto">
        <form 
          onSubmit={handleSubmit}
          className="relative group flex items-center"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your campaign..."
            className="relative w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-400 rounded-full px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition shadow-lg"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-violet-600 text-white rounded-full hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 transition"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
