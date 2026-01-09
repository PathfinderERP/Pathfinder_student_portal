import React, { useState } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { UserPlus, User, Mail, Lock, Briefcase, AlertCircle, X, CheckCircle2 } from 'lucide-react';

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
    const { isDarkMode } = useTheme();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        user_type: 'student'
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await axios.post('http://127.0.0.1:3001/api/register/', formData);
            setIsSuccess(true);
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
                setIsSuccess(false);
                setFormData({ username: '', email: '', password: '', user_type: 'student' });
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Creation failed.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`relative w-full max-w-md rounded-[2.5rem] shadow-2xl border p-8 md:p-10 transition-all duration-300 transform animate-in zoom-in-95 slide-in-from-bottom-4
                ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-black/50' : 'bg-white border-slate-100 shadow-slate-200'}`}>

                <button
                    onClick={onClose}
                    className={`absolute top-6 right-6 p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-50 text-slate-400 hover:text-slate-900'}`}
                >
                    <X size={20} />
                </button>

                {isSuccess ? (
                    <div className="py-12 flex flex-col items-center text-center animate-in zoom-in">
                        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={48} />
                        </div>
                        <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>User Created!</h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>The new account is ready for use.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <h2 className={`text-2xl font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Add New User</h2>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Establish new credentials for the portal.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 text-sm font-bold animate-shake">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5 group">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Username</label>
                                <div className="relative">
                                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-600 group-focus-within:text-indigo-500' : 'text-slate-300 group-focus-within:text-indigo-500'}`} size={18} />
                                    <input
                                        name="username"
                                        type="text"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 transition-all outline-none text-sm font-bold
                                            ${isDarkMode
                                                ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-indigo-500/50 focus:bg-slate-800'
                                                : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-indigo-500/50 focus:bg-white'}`}
                                        placeholder="Username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 group">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Email</label>
                                <div className="relative">
                                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-600 group-focus-within:text-indigo-500' : 'text-slate-300 group-focus-within:text-indigo-500'}`} size={18} />
                                    <input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 transition-all outline-none text-sm font-bold
                                            ${isDarkMode
                                                ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-indigo-500/50 focus:bg-slate-800'
                                                : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-indigo-500/50 focus:bg-white'}`}
                                        placeholder="Email address"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 group">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Password</label>
                                <div className="relative">
                                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-600 group-focus-within:text-indigo-500' : 'text-slate-300 group-focus-within:text-indigo-500'}`} size={18} />
                                    <input
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 transition-all outline-none text-sm font-bold
                                            ${isDarkMode
                                                ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-indigo-500/50 focus:bg-slate-800'
                                                : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-indigo-500/50 focus:bg-white'}`}
                                        placeholder="Create password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 group pb-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Role</label>
                                <div className="relative">
                                    <Briefcase className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-600 group-focus-within:text-indigo-500' : 'text-slate-300 group-focus-within:text-indigo-500'}`} size={18} />
                                    <select
                                        name="user_type"
                                        value={formData.user_type}
                                        onChange={handleChange}
                                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 transition-all outline-none text-sm font-bold appearance-none
                                            ${isDarkMode
                                                ? 'bg-slate-800/50 border-slate-700/50 text-white focus:border-indigo-500/50 focus:bg-slate-800'
                                                : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-indigo-500/50 focus:bg-white'}`}
                                    >
                                        <option value="student">Student</option>
                                        <option value="parent">Parent</option>
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 group/btn`}
                            >
                                {isLoading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="uppercase tracking-widest text-sm">Create User</span>
                                        <UserPlus size={18} className="transition-transform group-hover/btn:scale-110" />
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out infinite alternate;
                    animation-iteration-count: 2;
                }
            `}</style>
        </div>
    );
};

export default CreateUserModal;
