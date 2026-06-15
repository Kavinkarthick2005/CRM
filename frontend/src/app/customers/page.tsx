"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Download, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  channel_preference: string;
  tags: string;
  total_spend: number;
  total_orders: number;
  last_order_at: string | null;
  status: "active" | "at_risk" | "churned";
}

export default function CustomersPage() {
  const { formatCurrency } = useCurrency();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [tag, setTag] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });
      if (search) params.append("search", search);
      if (channel !== "all") params.append("channel", channel);
      if (tag !== "all") params.append("tag", tag);
      if (status !== "all") params.append("status", status);

      const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${CRM_URL}/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCustomers(data.data);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, channel, tag, status, sortBy, sortOrder]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (channel !== "all") params.append("channel", channel);
    if (tag !== "all") params.append("tag", tag);
    if (status !== "all") params.append("status", status);

    const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "http://127.0.0.1:8000";
    const url = `${CRM_URL}/api/reports/customers?${params.toString()}`;
    window.location.href = url;
  };

  return (
    <div className="flex-1 w-full min-h-screen bg-[#0d0d12] text-white p-8 animate-fade-in pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#15151a] p-8 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -z-10" />
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">Customers</h1>
            <p className="text-gray-400">Manage and understand your audience.</p>
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl transition-all border border-white/10 font-medium"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* FILTERS */}
        <div className="bg-[#15151a] p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Filters & Search</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative col-span-1 md:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            
            <select 
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 appearance-none"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (&lt;30d)</option>
              <option value="at_risk">At Risk (31-60d)</option>
              <option value="churned">Churned (&gt;60d)</option>
            </select>

            <select 
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 appearance-none"
              value={channel}
              onChange={(e) => { setChannel(e.target.value); setPage(1); }}
            >
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            
            <select 
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 appearance-none"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            >
              <option value="id">Sort by Join Date</option>
              <option value="total_spend">Sort by Spend</option>
              <option value="total_orders">Sort by Orders</option>
              <option value="last_order_at">Sort by Last Activity</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-[#15151a] rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-white/5 text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Channel</th>
                  <th className="p-4 font-medium">Orders</th>
                  <th className="p-4 font-medium">Total Spend</th>
                  <th className="p-4 font-medium">Last Order</th>
                  <th className="p-4 font-medium">Tags</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4"><div className="h-10 bg-white/5 rounded-lg w-48" /></td>
                      <td className="p-4"><div className="h-6 bg-white/5 rounded-full w-20" /></td>
                      <td className="p-4"><div className="h-6 bg-white/5 rounded-md w-16" /></td>
                      <td className="p-4"><div className="h-6 bg-white/5 rounded-md w-10" /></td>
                      <td className="p-4"><div className="h-6 bg-white/5 rounded-md w-16" /></td>
                      <td className="p-4"><div className="h-6 bg-white/5 rounded-md w-24" /></td>
                      <td className="p-4"><div className="h-6 bg-white/5 rounded-md w-32" /></td>
                      <td className="p-4 text-right"><div className="h-8 bg-white/5 rounded-lg w-24 inline-block" /></td>
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="w-12 h-12 text-gray-600 mb-4" />
                        <p className="text-lg">No customers found.</p>
                        <p className="text-sm">Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4">
                        <div className="font-medium text-gray-200">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.email}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          c.status === 'at_risk' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {c.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />}
                          {c.status === 'active' ? 'Active' : c.status === 'at_risk' ? 'At Risk' : 'Churned'}
                        </span>
                      </td>
                      <td className="p-4 capitalize text-gray-300">{c.channel_preference}</td>
                      <td className="p-4 text-gray-300">{c.total_orders}</td>
                      <td className="p-4 font-medium text-emerald-400">{formatCurrency(c.total_spend)}</td>
                      <td className="p-4 text-gray-400">
                        {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {c.tags ? c.tags.split(',').map(t => (
                            <span key={t} className="px-2 py-0.5 bg-white/5 rounded-md text-xs text-gray-300 capitalize border border-white/5">
                              {t.trim()}
                            </span>
                          )) : <span className="text-gray-600">-</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Link 
                          href={`/customers/${c.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium transition-colors border border-indigo-500/20 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* PAGINATION */}
          <div className="p-4 border-t border-white/5 flex items-center justify-between bg-black/20">
            <div className="text-sm text-gray-400">
              Showing <span className="font-medium text-white">{customers.length === 0 ? 0 : (page - 1) * limit + 1}</span> to <span className="font-medium text-white">{Math.min(page * limit, total)}</span> of <span className="font-medium text-white">{total}</span> customers
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-colors border border-white/5"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || total === 0}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:pointer-events-none transition-colors border border-white/5"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
