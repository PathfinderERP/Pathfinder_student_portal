import React, { useState } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';

const PasswordResetModal = ({ user, isDarkMode, isOpen, onClose, onReset, isActionLoading }) => {
    const [newPass, setNewPass] = useState('');
    const [showPass, setShowPass] = useState(false);

    if (!isOpen || !user) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onReset(user, newPass);
        setNewPass('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-300">
            <div className={`w-full max-w-md p-8 rounded-[2.5rem] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-600/30">
                        <Key size={24} strokeWidth={3} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Reset <span className="text-orange-500">Password</span></h3>
                        <p className="text-xs font-bold opacity-50">Set a new access key for {user.username}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">New Password</label>
                        <div className="relative">
                            <input
                                required
                                type={showPass ? "text" : "password"}
                                value={newPass}
                                onChange={e => setNewPass(e.target.value)}
                                style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                className={`w-full p-4 pr-12 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}
                                    autofill:transition-colors autofill:duration-[5000000ms]`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'}`}
                            >
                                {showPass ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isActionLoading}
                            type="submit"
                            className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isActionLoading ? 'Saving...' : 'Confirm Reset'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordResetModal;
