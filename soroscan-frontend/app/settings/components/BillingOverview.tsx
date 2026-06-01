"use client";

import { useState } from "react";

interface BillingInfo {
  plan: string;
  paymentMethod: string;
}

export default function BillingOverview() {
  const [billing] = useState<BillingInfo>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("billing_info");
      if (stored) {
        try { 
          return JSON.parse(stored) as BillingInfo; 
        } catch { 
          return { plan: "Free", paymentMethod: "None" };
        }
      }
    }
    return { plan: "Free", paymentMethod: "None" };
  });

  return (
    <div className="p-4 border border-green-500/20 bg-[#061120]/60 rounded-2xl">
      <h2 className="text-lg font-bold text-green-400 mb-2">Billing Overview</h2>
      <p className="text-sm text-green-300">Plan: {billing.plan}</p>
      <p className="text-sm text-green-300">Payment: {billing.paymentMethod}</p>
    </div>
  );
}
