"use client";

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Mail, MessageSquare, Phone, Tag, Clock,
  Calendar, DollarSign, ShoppingBag, Activity, Send,
  Package, ChevronRight, CheckCircle2, Navigation, Download
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/context/CurrencyContext';

interface ProfileData {
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string;
    channel_preference: string;
    tags: string;
    created_at: string;
    stats: {
      total_orders: number;
      total_spend: number;
      avg_order_value: number;
      days_inactive: number;
      status: string;
    }
  };
  orders: {
    id: number;
    amount: number;
    items: { name: string; quantity: number }[];
    date: string;
  }[];
  communications: {
    campaign_name: string;
    channel: string;
    status: string;
    sent_at: string;
    updated_at: string;
  }[];
  timeline: {
    type: string;
    date: string;
    title: string;
    details: string;
  }[];
}

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_CRM_URL}/api/customers/${id}`);
        if (!res.ok) throw new Error("Failed to fetch customer profile");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 w-full min-h-screen bg-[#0d0d12] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 w-full min-h-screen bg-[#0d0d12] flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Customer Not Found</h2>
          <Link href="/customers" className="text-indigo-400 hover:text-indigo-300">← Back to Directory</Link>
        </div>
      </div>
    );
  }

  const { customer, orders, communications, timeline } = data;

  const handleSendCampaign = () => {
    const prompt = `Create a campaign for ${customer.name} based on their recent activity. They are a ${customer.tags || 'valued'} customer.`;
    router.push(`/?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <div className="flex-1 w-full min-h-screen bg-[#0d0d12] text-white p-8 animate-fade-in pb-20">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* TOP NAVIGATION */}
        <div>
          <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Customers
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    customer.stats.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    customer.stats.status === 'at_risk' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {customer.stats.status === 'active' ? 'Active' : customer.stats.status === 'at_risk' ? 'At Risk' : 'Churned'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {customer.email}</span>
                  {customer.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {customer.phone}</span>}
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Member since {new Date(customer.created_at).getFullYear()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`${process.env.NEXT_PUBLIC_CRM_URL || "http://127.0.0.1:8000"}/api/reports/customer/${id}`}
                download
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-3 rounded-xl transition-all border border-white/10 font-medium whitespace-nowrap"
              >
                <Download className="w-4 h-4" /> Download Report
              </a>
              <button 
                onClick={handleSendCampaign}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl transition-all font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] whitespace-nowrap"
              >
                <Send className="w-4 h-4" /> Send Campaign →
              </button>
            </div>
          </div>
        </div>

        {/* TAGS ROW */}
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300">
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Prefers <span className="capitalize font-medium text-white">{customer.channel_preference}</span>
          </span>
          {customer.tags && customer.tags.split(',').map(t => (
            <span key={t} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 capitalize">
              <Tag className="w-3.5 h-3.5 text-gray-400" /> {t.trim()}
            </span>
          ))}
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#15151a] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ShoppingBag className="w-16 h-16" /></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-white">{customer.stats.total_orders}</p>
          </div>
          <div className="bg-[#15151a] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign className="w-16 h-16" /></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Lifetime Spend</p>
            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(customer.stats.total_spend)}</p>
          </div>
          <div className="bg-[#15151a] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity className="w-16 h-16" /></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Avg Order Value</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(customer.stats.avg_order_value)}</p>
          </div>
          <div className="bg-[#15151a] p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock className="w-16 h-16" /></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Days Inactive</p>
            <p className="text-3xl font-bold text-white">{customer.stats.days_inactive}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* MAIN COLUMN: Orders & Campaigns */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* ORDERS TABLE */}
            <div className="bg-[#15151a] rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Package className="w-5 h-5 text-indigo-400" /> Order History</h3>
              </div>
              {orders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No orders available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-black/20 text-gray-400 border-b border-white/5">
                        <th className="p-4 font-medium">Order ID</th>
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Items</th>
                        <th className="p-4 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-white/[0.02]">
                          <td className="p-4 font-mono text-gray-400">#{o.id}</td>
                          <td className="p-4 text-gray-300">{new Date(o.date).toLocaleDateString()}</td>
                          <td className="p-4 text-gray-400 text-xs">
                            {o.items ? o.items.map(i => `${i.quantity}x ${i.name}`).join(", ") : "-"}
                          </td>
                          <td className="p-4 text-right font-medium text-emerald-400">{formatCurrency(o.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* CAMPAIGN HISTORY */}
            <div className="bg-[#15151a] rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Send className="w-5 h-5 text-indigo-400" /> Campaign History</h3>
              </div>
              {communications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No campaign activity yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-black/20 text-gray-400 border-b border-white/5">
                        <th className="p-4 font-medium">Campaign</th>
                        <th className="p-4 font-medium">Channel</th>
                        <th className="p-4 font-medium">Sent</th>
                        <th className="p-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {communications.map((c, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          <td className="p-4 font-medium text-gray-200">{c.campaign_name}</td>
                          <td className="p-4 capitalize text-gray-400">{c.channel}</td>
                          <td className="p-4 text-gray-400">{new Date(c.sent_at).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              c.status === 'opened' || c.status === 'clicked' ? 'text-emerald-400 bg-emerald-400/10' :
                              c.status === 'delivered' ? 'text-blue-400 bg-blue-400/10' :
                              'text-gray-400 bg-gray-400/10'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Timeline View */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#15151a] p-6 rounded-2xl border border-white/5">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-6"><Navigation className="w-5 h-5 text-indigo-400" /> Customer Timeline</h3>
              
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {timeline.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center">No activity timeline available.</p>
                ) : (
                  timeline.map((event, idx) => (
                    <div key={idx} className="relative flex items-start gap-4">
                      <div className="absolute left-5 -ml-px h-full w-0.5 bg-white/10 -z-10" />
                      <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full border-4 border-[#15151a] flex items-center justify-center ${
                        event.type === 'order' ? 'bg-emerald-500 text-white' :
                        event.type === 'engagement' ? 'bg-indigo-500 text-white' :
                        event.type === 'event' ? 'bg-amber-500 text-white' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {event.type === 'order' ? <ShoppingBag className="w-4 h-4" /> :
                         event.type === 'engagement' ? <CheckCircle2 className="w-4 h-4" /> :
                         event.type === 'event' ? <Tag className="w-4 h-4" /> :
                         <Send className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-4">
                        <div className="text-xs text-gray-500 mb-1">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <h4 className="text-sm font-medium text-white mb-0.5">{event.title}</h4>
                        <p className="text-sm text-gray-400 leading-snug">{event.details}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
