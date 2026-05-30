"use client";
import { useEffect, useState } from "react";

type BillingInfo = {
  plan: string;
  paymentMethod: string;
  nextInvoice: string;
  amount: string;
};

const DEFAULT_BILLING: BillingInfo = {
  plan: "Developer",
  paymentMethod: "Visa •••• 4242",
  nextInvoice: "Jun 30, 2026",
  amount: "$49.00",
};

export default function BillingOverview() {
  const [billing, setBilling] = useState<BillingInfo>(DEFAULT_BILLING);
  const [plan, setPlan] = useState(DEFAULT_BILLING.plan);
  const [paymentMethod, setPaymentMethod] = useState(DEFAULT_BILLING.paymentMethod);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("billingInfo");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as BillingInfo;
        setBilling(parsed);
        setPlan(parsed.plan);
        setPaymentMethod(parsed.paymentMethod);
      } catch {
        // ignore invalid billing data
      }
    }
  }, []);

  const handleSaveBilling = () => {
    const nextBilling: BillingInfo = {
      ...billing,
      plan,
      paymentMethod,
    };
    localStorage.setItem("billingInfo", JSON.stringify(nextBilling));
    setBilling(nextBilling);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="border border-green-500/30 rounded-xl p-5 bg-[#08102a]/80">
      <h2 className="text-green-400 text-sm font-mono mb-3">[ BILLING ]</h2>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-green-500/10 bg-[#09132f]/80 p-4">
            <p className="text-green-600 text-xs uppercase tracking-[0.2em] mb-2">Current plan</p>
            <p className="text-green-300 font-mono text-sm">{billing.plan}</p>
          </div>
          <div className="rounded-lg border border-green-500/10 bg-[#09132f]/80 p-4">
            <p className="text-green-600 text-xs uppercase tracking-[0.2em] mb-2">Next invoice</p>
            <p className="text-green-300 font-mono text-sm">{billing.nextInvoice}</p>
          </div>
          <div className="rounded-lg border border-green-500/10 bg-[#09132f]/80 p-4">
            <p className="text-green-600 text-xs uppercase tracking-[0.2em] mb-2">Amount due</p>
            <p className="text-green-300 font-mono text-sm">{billing.amount}</p>
          </div>
          <div className="rounded-lg border border-green-500/10 bg-[#09132f]/80 p-4">
            <p className="text-green-600 text-xs uppercase tracking-[0.2em] mb-2">Payment method</p>
            <p className="text-green-300 font-mono text-sm">{billing.paymentMethod}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 items-center">
            <label className="text-green-300 text-sm font-mono">Plan</label>
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              className="w-full max-w-xs rounded-lg border border-green-500/30 bg-transparent px-3 py-2 font-mono text-sm text-green-300 focus:outline-none focus:border-green-400"
            >
              {['Developer', 'Business', 'Enterprise'].map((option) => (
                <option key={option} value={option} className="bg-[#0a0e27] text-green-300">
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 items-center">
            <label className="text-green-300 text-sm font-mono">Payment method</label>
            <input
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="w-full max-w-xs rounded-lg border border-green-500/30 bg-transparent px-3 py-2 font-mono text-sm text-green-300 focus:outline-none focus:border-green-400"
            />
          </div>
        </div>

        <button
          onClick={handleSaveBilling}
          className="w-full rounded-lg border border-green-500/30 px-4 py-2 text-sm font-mono text-green-400 hover:border-green-400 hover:bg-green-400/10 transition-colors"
        >
          {saved ? '✓ SAVED' : 'SAVE BILLING SETTINGS'}
        </button>
      </div>
    </div>
  );
}
