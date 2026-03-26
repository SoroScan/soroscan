"use client";
import { useState } from "react";
import { showToast } from "@/context/ToastContext";

function passwordStrength(pass: string) {
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return score; // 0..4
}

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // mock API call
      await fetch("/api/settings/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, currentPassword, newPassword, twoFAEnabled }),
      });
      showToast("Account updated", "success");
    } catch (err) {
      showToast("Failed to save account", "error");
    } finally {
      setSaving(false);
    }
  };

  const strength = passwordStrength(newPassword);

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="border border-green-500/30 rounded p-4">
        <label className="block text-xs text-green-300 mb-1">Email</label>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-transparent border border-green-500/30 rounded px-3 py-2 text-green-300" />
      </div>

      <div className="border border-green-500/30 rounded p-4">
        <label className="block text-xs text-green-300 mb-1">Current password</label>
        <input type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} className="w-full bg-transparent border border-green-500/30 rounded px-3 py-2 text-green-300" />

        <label className="block text-xs text-green-300 mt-3 mb-1">New password</label>
        <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="w-full bg-transparent border border-green-500/30 rounded px-3 py-2 text-green-300" />

        <div className="mt-2 text-xs text-green-300">Password strength: {['Very weak','Weak','Okay','Strong','Very strong'][strength]}</div>
      </div>

      <div className="border border-green-500/30 rounded p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-green-300">Two-Factor Authentication</div>
            <div className="text-xs text-green-600">Use an authenticator app to add an extra layer.</div>
          </div>
          <button type="button" onClick={()=>setTwoFAEnabled(t=>!t)} className={`px-3 py-1 rounded border ${twoFAEnabled? 'border-green-400 bg-green-400/10':'border-green-500/30'}`}>{twoFAEnabled? 'ENABLED':'ENABLE'}</button>
        </div>
        {twoFAEnabled && (
          <div className="mt-3 text-xs text-green-600">2FA setup: scan this QR in your authenticator app (placeholder).</div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 border border-green-500/30 rounded">{saving? 'SAVING...':'Save account'}</button>
      </div>
    </form>
  );
}
