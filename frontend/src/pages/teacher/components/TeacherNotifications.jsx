import React from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherNotifications = () => {
    const { isDarkMode } = useTheme();

    const theme = {
        card: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-500' : 'text-slate-500',
        border: isDarkMode ? 'border-white/5' : 'border-slate-100'
    };

    const alerts = [
        { type: 'info', title: 'Curriculum Update', msg: 'New study materials uploaded by Admin for NEET-A batch.', time: '2h ago' },
        { type: 'warn', title: 'System Maintenance', msg: 'ERP server will be offline for 30 min at midnight.', time: '5h ago' },
        { type: 'success', title: 'Attendance Finalized', msg: 'Feb attendance metrics have been successfully verified.', time: '1d ago' },
        { type: 'info', title: 'New Message', msg: 'HOD Academic sent a private memo to all faculty members.', time: '2d ago' },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <div className={`p-8 rounded-[5px] border ${theme.card} flex items-center justify-between`}>
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${theme.text}`}>Interrupts & Alerts</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">System communication and faculty notifications</p>
                </div>
                <button className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500 hover:text-cyan-400">Mark all as read</button>
            </div>

            <div className="space-y-4">
                {alerts.map((alert, i) => (
                    <div key={i} className={`p-5 rounded-[5px] border ${theme.card} relative overflow-hidden group hover:border-cyan-500/30 transition-all cursor-pointer`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.type === 'warn' ? 'bg-rose-500' : alert.type === 'success' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></div>
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 ${alert.type === 'warn' ? 'text-rose-500' : alert.type === 'success' ? 'text-emerald-500' : 'text-cyan-500'}`}>
                                {alert.type === 'info' && <Info size={18} />}
                                {alert.type === 'warn' && <AlertTriangle size={18} />}
                                {alert.type === 'success' && <CheckCircle size={18} />}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-center">
                                    <h4 className={`text-[11px] font-black uppercase tracking-tight ${theme.text}`}>{alert.title}</h4>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                        <Clock size={10} /> {alert.time}
                                    </span>
                                </div>
                                <p className={`text-[10px] font-bold leading-relaxed ${theme.subtext}`}>{alert.msg}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeacherNotifications;
