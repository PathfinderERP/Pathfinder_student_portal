import React, { useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

const StartExamModal = ({ isOpen, onClose, onConfirm, test, isDarkMode }) => {
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !test) return null;

    const handleConfirm = async () => {
        if (!code.trim()) {
            setError('Please enter the access code.');
            return;
        }

        setIsVerifying(true);
        setError('');
        try {
            await onConfirm(code);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid start code. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            
            {/* Modal Content */}
            <div className={`relative w-full max-w-md rounded-[5px] shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                {/* Header with Icon */}
                <div className="p-8 pb-4 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
                        <AlertCircle className="text-orange-500" size={32} />
                    </div>
                    
                    <h2 className={`text-xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Confirmation to start the exam ?
                    </h2>
                    
                    <p className={`text-sm font-bold opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Are you free for next {test.duration || 180}min
                    </p>
                </div>

                {/* Input Body */}
                <div className="px-8 py-4">
                    <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Type your Start Code
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value);
                                setError('');
                            }}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            disabled={isVerifying}
                            className={`w-full py-3 px-4 rounded-[5px] border text-center font-black tracking-[0.5em] text-lg outline-none transition-all ${
                                error 
                                    ? 'border-red-500 bg-red-500/5 text-red-500' 
                                    : isDarkMode 
                                        ? 'bg-[#10141D] border-white/10 focus:border-blue-500/50 text-white placeholder:text-slate-700' 
                                        : 'bg-slate-50 border-slate-200 focus:border-blue-400 focus:bg-white text-slate-800 placeholder:text-slate-300'
                            }`}
                        />
                        {error && (
                            <p className="text-[10px] font-bold text-red-500 mt-1 animate-in fade-in slide-in-from-top-1">
                                {error}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className={`p-6 flex gap-4 ${isDarkMode ? 'bg-white/5' : 'bg-slate-50/50'}`}>
                    <button
                        onClick={onClose}
                        disabled={isVerifying}
                        className={`flex-1 py-3 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${
                            isDarkMode 
                                ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' 
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isVerifying}
                        className="flex-1 py-3 bg-red-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/30 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            'OK'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StartExamModal;
