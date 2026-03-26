"use client";
import { useEffect, useState } from "react";
import ThemeSelector from "../components/ThemeSelector";
import { showToast } from "@/context/ToastContext";

const timezones = ["UTC","America/New_York","Europe/London","Asia/Tokyo"];
const languages = ["en","es","fr","de"];

export default function PreferencesPage(){
  const [tz, setTz] = useState( (typeof window !== 'undefined' && localStorage.getItem('timezone')) || 'UTC');
  const [lang, setLang] = useState((typeof window !== 'undefined' && localStorage.getItem('language')) || 'en');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try{
      await fetch('/api/settings/preferences', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ timezone: tz, language: lang }) });
      localStorage.setItem('timezone', tz);
      localStorage.setItem('language', lang);
      showToast('Preferences saved','success');
    }catch(e){
      showToast('Failed to save preferences','error');
    }finally{setSaving(false)}
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="border border-green-500/30 rounded p-4">
        <label className="block text-xs text-green-300 mb-1">Timezone</label>
        <select value={tz} onChange={(e)=>setTz(e.target.value)} className="w-full bg-transparent border border-green-500/30 rounded px-3 py-2 text-green-300">
          {timezones.map(t=> <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="border border-green-500/30 rounded p-4">
        <label className="block text-xs text-green-300 mb-1">Language</label>
        <select value={lang} onChange={(e)=>setLang(e.target.value)} className="w-full bg-transparent border border-green-500/30 rounded px-3 py-2 text-green-300">
          {languages.map(l=> <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <ThemeSelector />

      <div>
        <button type="submit" className="px-4 py-2 border border-green-500/30 rounded">{saving? 'SAVING...':'Save preferences'}</button>
      </div>
    </form>
  )
}
