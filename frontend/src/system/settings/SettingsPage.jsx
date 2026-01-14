import React from 'react';

const SettingsPage = ({ isDarkMode }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <h2 className="text-3xl font-black tracking-tight mb-8 uppercase">System <span className="text-orange-500">Settings</span></h2>

                <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Portal Name</label>
                            <input type="text" defaultValue="Pathfinder Student Portal" className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Support Email</label>
                            <input type="text" defaultValue="support@pathfinder.com" className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <h3 className="text-sm font-black uppercase tracking-widest mb-6 opacity-70">Security & Access</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Public Registration', desc: 'Allow students to create accounts without admin approval', enabled: true },
                                { label: 'Dark Mode Default', desc: 'Force dark theme for new users', enabled: false },
                                { label: 'System Maintenance', desc: 'Put the portal into read-only mode for updates', enabled: false }
                            ].map((setting, i) => (
                                <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                                    <div>
                                        <p className="font-bold text-sm">{setting.label}</p>
                                        <p className="text-[11px] opacity-60 font-medium">{setting.desc}</p>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${setting.enabled ? 'bg-orange-600' : 'bg-slate-300'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${setting.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="pt-6">
                        <button className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30">Save All Changes</button>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/5' : 'bg-white border-slate-100'}`}>
                    <h3 className="text-xl font-bold mb-6">Backup Status</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <p className="text-xs font-bold opacity-70">Database connected</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <p className="text-xs font-bold opacity-70">Daily backup complete</p>
                        </div>
                        <p className="text-[10px] opacity-40 italic pt-4">Last backup: 46 minutes ago</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
