import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { UserPlus, User, Mail, Lock, Briefcase, AlertCircle, Sun, Moon, ArrowLeft, Send } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        user_type: 'student'
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await axios.post('http://127.0.0.1:3001/api/register/', formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 overflow-hidden relative ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>

            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 animate-pulse ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-300'}`}></div>
                <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 animate-pulse delay-700 ${isDarkMode ? 'bg-purple-500' : 'bg-purple-300'}`}></div>
            </div>

            {/* Theme Toggle Floating */}
            <button
                onClick={toggleTheme}
                className={`fixed top-6 right-6 p-3 rounded-2xl shadow-xl transition-all z-50 border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
                {isDarkMode ? <Sun size={20} className="fill-current" /> : <Moon size={20} className="fill-slate-600" />}
            </button>

            {/* Back Button */}
            <Link
                to="/login"
                className={`fixed top-6 left-6 p-3 rounded-2xl transition-all z-50 flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Back to Login</span>
            </Link>

            {/* Register Card */}
            <div className="relative w-full max-w-[900px] flex flex-col md:flex-row bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-fade-in-up">

                {/* Left Side - Visual/Promo */}
                <div className={`md:w-5/12 p-10 flex flex-col justify-between relative overflow-hidden ${isDarkMode ? 'bg-indigo-600/10' : 'bg-indigo-600'}`}>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/30 shadow-xl">
                            <UserPlus size={32} className="text-white" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-4xl font-black text-white leading-tight mb-4">
                            Start Your<br />Success<br />Journey.
                        </h1>
                        <p className="text-indigo-100/80 text-sm leading-relaxed max-w-[200px]">
                            Join thousands of students and parents managing their academic life seamlessly.
                        </p>
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 mt-8">
                        <div className="flex items-center gap-3 text-white/90">
                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                            <span className="text-xs font-bold uppercase tracking-wider">Fast & Secure</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/90">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            <span className="text-xs font-bold uppercase tracking-wider">Cloud Sync</span>
                        </div>
                    </div>

                    {/* Decorative Rings */}
                    <div className="absolute top-1/2 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl -mr-32 -mt-32"></div>
                </div>

                {/* Right Side - Form */}
                <div className={`md:w-7/12 p-8 md:p-12 ${isDarkMode ? 'bg-slate-900/40' : 'bg-white/40'}`}>
                    <div className="mb-8">
                        <h2 className="text-3xl font-black mb-2">Create Account</h2>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Fill in your details to get started.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 text-sm font-bold animate-shake">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest pl-1 opacity-60">Username</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        name="username"
                                        type="text"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 transition-all outline-none text-sm font-bold
                                            ${isDarkMode
                                                ? 'bg-slate-800/50 border-slate-700/50 focus:border-indigo-500/50 focus:bg-slate-800'
                                                : 'bg-white/50 border-slate-100 focus:border-indigo-500/50 focus:bg-white'}`}
                                        placeholder="johndoe"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest pl-1 opacity-60">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 transition-all outline-none text-sm font-bold
                                            ${isDarkMode
                                                ? 'bg-slate-800/50 border-slate-700/50 focus:border-indigo-500/50 focus:bg-slate-800'
                                                : 'bg-white/50 border-slate-100 focus:border-indigo-500/50 focus:bg-white'}`}
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest pl-1 opacity-60">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 transition-all outline-none text-sm font-bold
                                        ${isDarkMode
                                            ? 'bg-slate-800/50 border-slate-700/50 focus:border-indigo-500/50 focus:bg-slate-800'
                                            : 'bg-white/50 border-slate-100 focus:border-indigo-500/50 focus:bg-white'}`}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pb-2">
                            <label className="text-xs font-black uppercase tracking-widest pl-1 opacity-60">I am a...</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'student', label: 'Student', icon: GraduationCap },
                                    { value: 'parent', label: 'Parent', icon: Users },
                                    { value: 'staff', label: 'Staff', icon: Briefcase },
                                    { value: 'admin', label: 'Admin', icon: Lock },
                                ].map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, user_type: type.value })}
                                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all text-left group
                                            ${formData.user_type === type.value
                                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 shadow-lg shadow-indigo-500/20'
                                                : isDarkMode ? 'border-slate-800 bg-slate-800/30 text-slate-400 hover:border-slate-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
                                    >
                                        <div className={`p-1.5 rounded-lg transition-colors ${formData.user_type === type.value ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                            <type.icon size={16} />
                                        </div>
                                        <span className="text-sm font-bold">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full relative overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 mt-4 group/btn`}
                        >
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                {isLoading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span className="uppercase tracking-widest text-sm">Create Account</span>
                                        <Send size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Already have an account?{' '}
                            <Link to="/login" className="text-indigo-500 hover:text-indigo-400 font-black decoration-2 underline-offset-4 hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
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

export default Register;
