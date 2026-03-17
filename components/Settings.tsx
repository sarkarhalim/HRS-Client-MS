
import React from 'react';

interface AppConfig {
  agencyName: string;
  primaryColor: string;
  showRevenueChart: boolean;
  enableAiInsights: boolean;
}

interface SettingsProps {
  config: AppConfig;
  onUpdate: (newConfig: AppConfig) => void;
}

const Settings: React.FC<SettingsProps> = ({ config, onUpdate }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    onUpdate({ ...config, [name]: val });
  };

  const inputClass = "w-full max-w-md px-4 py-2 bg-white border border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-950 font-medium";

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Branding & Profile</h3>
          <p className="text-sm text-slate-500">Customize how your consultancy appears to clients and staff.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Agency Brand Name</label>
            <input 
              type="text"
              name="agencyName"
              value={config.agencyName}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g., HRS Consultancy"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Primary App Theme</label>
            <select 
              name="primaryColor"
              value={config.primaryColor}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="blue">Consultancy Blue (Professional)</option>
              <option value="indigo">Global Indigo (Modern)</option>
              <option value="slate">Midnight Slate (Premium)</option>
              <option value="emerald">Growth Emerald (Fast-track)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">Module Preferences</h3>
          <p className="text-sm text-slate-500">Enable or disable specific dashboard components.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-bold text-slate-900">Revenue Analytics Chart</p>
              <p className="text-xs text-slate-500">Show monthly financial growth bars on the dashboard.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="showRevenueChart"
                checked={config.showRevenueChart} 
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-bold text-slate-900">AI Intelligence Reports</p>
              <p className="text-xs text-slate-500">Enable Gemini-powered business analysis module.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="enableAiInsights"
                checked={config.enableAiInsights} 
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl">
        <h4 className="font-bold text-rose-800 mb-2 flex items-center gap-2"><span>⚠️</span> Danger Zone</h4>
        <p className="text-sm text-rose-700 mb-4 font-medium">Resetting local data will remove all temporary client records created in this session.</p>
        <button 
          onClick={() => { window.location.reload(); }}
          className="bg-rose-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors shadow-sm"
        >
          Reset Session Database
        </button>
      </div>
    </div>
  );
};

export default Settings;
