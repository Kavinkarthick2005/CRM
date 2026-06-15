"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Currency = "INR" | "USD" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatCurrency: (usdAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>("INR");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("whisperflow_currency") as Currency;
    if (stored && ["INR", "USD", "EUR"].includes(stored)) {
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("whisperflow_currency", c);
  };

  const formatCurrency = (usdAmount: number) => {
    if (!mounted) return `₹${(usdAmount * 83).toLocaleString()}`; // SSR fallback
    
    let amount = usdAmount;
    let symbol = "$";
    
    if (currency === "INR") {
      amount = usdAmount * 83;
      symbol = "₹";
    } else if (currency === "EUR") {
      amount = usdAmount * (83 / 90);
      symbol = "€";
    }

    return `${symbol}${Math.round(amount).toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
