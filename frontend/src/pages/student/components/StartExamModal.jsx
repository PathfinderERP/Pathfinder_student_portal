import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, ArrowRight, ShieldCheck, X } from 'lucide-react';

const StartExamModal = ({ isOpen, onClose, onConfirm, test, isDarkMode }) => {
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    // Filter non-alphanumeric and limit to 6
    const handleInputChange = (e) => {
        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (val.length <= 6) {
            setCode(val);
            setError('');
        }
    };

    // Auto-focus the hidden input
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen || !test) return null;

    const isComplete = code.length === 6;

    const handleConfirm = async () => {
        if (!isComplete) return;

        setIsVerifying(true);
        setError('');
        try {
            await onConfirm(code);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid Access Code');
            // Shake effect or clear? 
            // setCode(''); // Optional: clear on error
        } finally {
            setIsVerifying(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Ultra-modern Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" 
                onClick={onClose} 
            />
            
            {/* Modern Modal Card */}
            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
                
                {/* Header Decoration */}
                <div className={`h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600`} />

                <div className="p-8">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-4 ${isDarkMode ? 'bg-indigo-500/10 ring-indigo-500/5 text-indigo-400' : 'bg-indigo-50 ring-indigo-50 text-indigo-600'}`}>
                            <ShieldCheck size={28} />
                        </div>
                        
                        <div>
                            <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Secure Exam Access
                            </h2>
                            <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Entering: {test.name || 'New Test'}
                            </p>
                        </div>
                    </div>

                    {/* Modern 6-Digit OTP-style Input */}
                    <div className="mt-10 space-y-6">
                        <div className="relative flex flex-col items-center">
                            <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Enter 6-Digit Code
                            </p>
                            
                            {/* Visual Boxes */}
                            <div className="flex gap-2 sm:gap-3" onClick={() => inputRef.current?.focus()}>
                                {[...Array(6)].map((_, index) => {
                                    const isActive = index === code.length;
                                    return (
                                        <div 
                                            key={index}
                                            className={`w-10 h-14 sm:w-12 sm:h-16 flex items-center justify-center rounded-xl border-2 text-xl sm:text-2xl font-black transition-all duration-300 pointer-events-none relative
                                                ${code[index] 
                                                    ? 'border-indigo-600 bg-indigo-600/5 text-indigo-600' 
                                                    : isDarkMode ? 'border-white/5 bg-white/5 text-slate-700' : 'border-slate-100 bg-slate-50 text-slate-300'
                                                }
                                                ${isActive ? 'border-indigo-500 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : ''}
                                            `}
                                        >
                                            {code[index] || (isActive ? (
                                                <span className="text-indigo-500 animate-[blink_1s_infinite] font-light">|</span>
                                            ) : '•')}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actual Hidden Input */}
                            <input
                                ref={inputRef}
                                type="text"
                                value={code}
                                onChange={handleInputChange}
                                className="absolute inset-0 opacity-0 cursor-default"
                                maxLength={6}
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-red-500/10 border border-red-500/20 animate-in fade-in slide-in-from-top-1">
                                <X size={14} className="text-red-500" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                                    {error}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`p-6 flex gap-4 ${isDarkMode ? 'bg-black/40' : 'bg-slate-50/50 border-t border-slate-100'}`}>
                    <button
                        onClick={onClose}
                        disabled={isVerifying}
                        className={`flex-1 py-4 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                            isDarkMode 
                                ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' 
                                : 'bg-white border-2 border-slate-100 text-slate-500 hover:border-slate-300'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isVerifying || !isComplete}
                        className={`flex-1 py-4 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 disabled:grayscale disabled:opacity-30 disabled:cursor-not-allowed
                            ${isComplete 
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700' 
                                : isDarkMode ? 'bg-white/5 text-slate-600' : 'bg-slate-100 text-slate-400'
                            }`}
                    >
                        {isVerifying ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>
                                <span>Start Test</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const styles = `
@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
`;

// Add styles to head mapping
if (typeof document !== 'undefined') {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = styles;
    document.head.appendChild(styleTag);
}

export default StartExamModal;
