"use client";

import React from "react";
import { useCurrency } from "@/context/CurrencyContext";

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as any)}
      className="bg-transparent text-gray-300 hover:text-white font-medium text-sm focus:outline-none cursor-pointer appearance-none outline-none border-none pr-4 relative"
      style={{
        WebkitAppearance: "none",
        MozAppearance: "none",
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" fill=\"white\" viewBox=\"0 0 24 24\"><path d=\"M7 10l5 5 5-5z\"/></svg>')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right center"
      }}
    >
      <option value="INR" className="bg-gray-800 text-white">₹ INR</option>
      <option value="USD" className="bg-gray-800 text-white">$ USD</option>
      <option value="EUR" className="bg-gray-800 text-white">€ EUR</option>
    </select>
  );
}
