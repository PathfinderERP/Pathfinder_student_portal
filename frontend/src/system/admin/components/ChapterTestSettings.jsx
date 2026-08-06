import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

export default function ChapterTestSettings() {
    const { getApiUrl, token } = useAuth();
    const { isDarkMode } = useTheme();
    const [settings, setSettings] = useState({ id: 1, positive_marks: 1.0, negative_marks: 0.0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${getApiUrl()}/api/master-data/chapter-test-settings/`, config);
            if (response.data && response.data.length > 0) {
                setSettings(response.data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch chapter test settings:", error);
            toast.error("Failed to load settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            if (settings.id) {
                await axios.put(`${getApiUrl()}/api/master-data/chapter-test-settings/${settings.id}/`, settings, config);
            } else {
                await axios.post(`${getApiUrl()}/api/master-data/chapter-test-settings/`, settings, config);
            }
            toast.success("Settings saved successfully!");
        } catch (error) {
            console.error("Failed to save chapter test settings:", error);
            toast.error("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className={`p-8 text-center rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <Loader2 className="animate-spin mx-auto mb-4 text-orange-500" size={32} />
                <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading settings...</p>
            </div>
        );
    }

    return (
        <div className={`p-8 rounded-[5px] border shadow-xl max-w-2xl mx-auto mt-10 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex items-center gap-4 mb-8 border-b pb-6 dark:border-white/10 border-slate-100">
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                    <Target size={28} />
                </div>
                <div>
                    <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Chapter Test Settings</h2>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Configure the global marking scheme for all practice chapter tests.</p>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Positive Marks (per correct answer)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={settings.positive_marks}
                        onChange={(e) => setSettings({ ...settings, positive_marks: parseFloat(e.target.value) || 0 })}
                        className={`w-full p-4 rounded-[5px] border font-bold text-lg outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                </div>

                <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Negative Marks (deduction per incorrect answer)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={settings.negative_marks}
                        onChange={(e) => setSettings({ ...settings, negative_marks: parseFloat(e.target.value) || 0 })}
                        className={`w-full p-4 rounded-[5px] border font-bold text-lg outline-none transition-all focus:ring-2 focus:ring-red-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-8 py-3 rounded-[5px] font-bold text-sm tracking-wider uppercase transition-all duration-300 bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
