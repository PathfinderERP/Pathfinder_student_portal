import React from 'react';
import { Clock } from 'lucide-react';

const LoginHistory = ({ loginHistory, isDarkMode }) => {
    return (
        <div className={`p-10 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-100 border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex items-center gap-3 mb-8">
                <div className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                    <Clock size={20} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Recent Login <span className="text-orange-500">History</span></h3>
            </div>
            <div className="space-y-4">
                {loginHistory.length > 0 ? loginHistory.map((log, i) => (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-[5px] border transition-all group ${isDarkMode ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]' : 'bg-slate-100 border-slate-200/50 hover:bg-slate-200'}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[5px] bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/5">
                                <Clock size={18} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="font-black text-base tracking-tight text-white/90">{log.time}</p>
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em]">Verified Login</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-1.5 rounded-[5px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                        </div>
                    </div>
                )) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
                        <div className="w-16 h-16 rounded-[5px] bg-white/5 flex items-center justify-center mb-4">
                            <Clock size={32} />
                        </div>
                        <p className="font-bold">No Login History</p>
                        <p className="text-xs">Your recent logins will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginHistory;
