import React from 'react';
import { Settings, Shield, Bell, Moon, Sun, Smartphone, Key, Save } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherSettings = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    const theme = {
        card: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-500' : 'text-slate-500',
        field: isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <div className={`p-8 rounded-[5px] border ${theme.card} flex flex-col md:flex-row md:items-center justify-between gap-6`}>
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${theme.text}`}>System Preferences</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Configure your workspace and security protocols</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20">
                    <Save size={16} /> Save Changes
                </button>
            </div>

            <div className="space-y-6">
                <section className="space-y-4">
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme.text} px-2`}>Appearance</h3>
                    <div className={`p-6 rounded-[5px] border ${theme.card} flex items-center justify-between`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center ${isDarkMode ? 'bg-yellow-400/10 text-yellow-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </div>
                            <div>
                                <h4 className={`text-xs font-black uppercase tracking-tight ${theme.text}`}>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</h4>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Interface Brightness Control</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`px-4 py-2 border rounded-[2px] text-[8px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10' : 'border-indigo-500/50 text-indigo-600 hover:bg-indigo-500/10'}`}
                        >
                            Switch Theme
                        </button>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme.text} px-2`}>Security</h3>
                    <div className={`p-6 rounded-[5px] border ${theme.card} space-y-4`}>
                        <SettingRow icon={<Key size={14} />} label="Two-Factor Auth" desc="Extra security layer via SMS or Email" value="ENABLED" theme={theme} />
                        <SettingRow icon={<Smartphone size={14} />} label="Session Management" desc="Revoke access from other devices" value="OPEN" theme={theme} />
                        <SettingRow icon={<Shield size={14} />} label="Password Policy" desc="Update your credentials periodically" value="UPDATE" theme={theme} />
                    </div>
                </section>
            </div>
        </div>
    );
};

const SettingRow = ({ icon, label, desc, value, theme }) => (
    <div className={`p-4 rounded-[5px] border ${theme.field} flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-cyan-500/30 transition-all`}>
        <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center bg-cyan-500/10 text-cyan-500`}>
                {icon}
            </div>
            <div>
                <h4 className={`text-[10px] font-black uppercase tracking-tight ${theme.text}`}>{label}</h4>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{desc}</p>
            </div>
        </div>
        <button className={`px-4 py-2 border border-cyan-500/30 text-cyan-500 text-[8px] font-black uppercase tracking-widest hover:bg-cyan-500/10 rounded-[2px]`}>
            {value}
        </button>
    </div>
);

export default TeacherSettings;
