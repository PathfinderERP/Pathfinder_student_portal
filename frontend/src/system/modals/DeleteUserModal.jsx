import React from 'react';
import { Trash2 } from 'lucide-react';

const DeleteUserModal = ({ user, isDarkMode, isOpen, onClose, onConfirm, isActionLoading }) => {
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            <div className={`relative w-full max-w-md p-8 rounded-[2.5rem] border shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                        <Trash2 size={40} strokeWidth={2.5} />
                    </div>

                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Delete <span className="text-red-500">Account</span>?</h2>
                        <p className={`text-sm font-medium opacity-70 leading-relaxed px-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            This user will no longer exist in the system. Are you really want to delete the <span className="text-red-500 font-bold">"{user.username}"</span> user?
                        </p>
                    </div>

                    <div className="flex flex-col w-full gap-3 pt-4">
                        <button
                            onClick={onConfirm}
                            disabled={isActionLoading}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isActionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Yes, Delete User"}
                        </button>
                        <button
                            onClick={onClose}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteUserModal;
