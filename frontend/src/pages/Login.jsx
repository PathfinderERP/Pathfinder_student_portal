import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, AlertCircle, GraduationCap, ArrowRight, BookOpen, Award, Users, Sparkles } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSwapped, setIsSwapped] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const user = await login(username, password);
            if (['superadmin', 'admin', 'staff'].includes(user.user_type)) {
                navigate('/system');
            } else if (user.user_type === 'student') {
                navigate('/student');
            } else if (user.user_type === 'parent') {
                navigate('/parent');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('Invalid username or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-50">
            {/* Split Layout Container */}
            <div className="flex h-full relative">

                {/* Left Side - Branding & Info */}
                <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#FF6B35] via-[#FF8C42] to-[#FFA500] transition-transform duration-700 ease-in-out z-20 ${isSwapped ? 'translate-x-full' : 'translate-x-0'}`}>
                    {/* Background Image */}
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-20"
                        style={{
                            backgroundImage: 'url(/images/login-bg.png)',
                        }}
                    ></div>

                    {/* Animated Blobs */}
                    <div className="absolute inset-0">
                        <div className="absolute top-0 left-0 w-96 h-96 bg-[#FFB84D] rounded-full mix-blend-overlay filter blur-3xl opacity-40 animate-blob"></div>
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FF8C42] rounded-full mix-blend-overlay filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
                        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-[#FF6B35] rounded-full mix-blend-overlay filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full h-full">
                        {/* Logo & Brand */}
                        <div className="animate-fade-in-down">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-2xl">
                                        <GraduationCap size={32} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight">PATHFINDER</h1>
                                        <p className="text-white/90 text-sm font-medium uppercase tracking-wider">Where Aspiration Meets Success</p>
                                    </div>
                                </div>
                                {/* Sign In Toggle Link/Button */}
                                <button
                                    onClick={() => setIsSwapped(!isSwapped)}
                                    className="px-6 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30 hover:bg-white/30 transition-all font-bold text-sm shadow-xl active:scale-95"
                                >
                                    Sign In
                                </button>
                            </div>

                            <h2 className="text-5xl font-bold leading-tight mb-5">
                                Welcome to Your<br />
                                <span className="text-yellow-100">Learning Hub</span>
                            </h2>
                            <p className="text-white/95 text-xl leading-relaxed max-w-lg">
                                Access your courses, track progress, and connect with your community in one place.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-5 animate-fade-in-up">
                            <div className="flex items-center gap-5 bg-white/11 backdrop-blur-md rounded-3xl p-5 border border-white/20 hover:bg-white/20 transition-all group">
                                <div className="p-3 bg-white/25 rounded-2xl group-hover:scale-110 transition-transform">
                                    <BookOpen size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">Interactive Learning</h3>
                                    <p className="text-base text-white/90">Access courses anytime, anywhere</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-5 bg-white/11 backdrop-blur-md rounded-3xl p-5 border border-white/20 hover:bg-white/20 transition-all group">
                                <div className="p-3 bg-white/25 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Award size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">Track Progress</h3>
                                    <p className="text-base text-white/90">Monitor your academic journey</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-5 bg-white/11 backdrop-blur-md rounded-3xl p-5 border border-white/20 hover:bg-white/20 transition-all group">
                                <div className="p-3 bg-white/25 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Users size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">Community Connect</h3>
                                    <p className="text-base text-white/90">Engage with peers and teachers</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className={`w-full lg:w-1/2 flex items-center justify-center bg-slate-50 p-5 relative overflow-hidden transition-transform duration-700 ease-in-out z-10 ${isSwapped ? '-translate-x-full' : 'translate-x-0'}`}>

                    {/* Vibrant Background Blobs for Glass Effect */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-orange-400/20 rounded-full mix-blend-multiply filter blur-[80px] animate-blob"></div>
                        <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] bg-amber-400/20 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-2000"></div>
                        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[#FF6B35]/10 rounded-full mix-blend-multiply filter blur-[60px] animate-blob animation-delay-4000"></div>
                    </div>

                    {/* Mobile Logo */}
                    <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
                        <div className="p-2.5 bg-[#FF6B35] rounded-xl shadow-lg">
                            <GraduationCap className="text-white" size={28} />
                        </div>
                        <span className="text-2xl font-bold text-[#5C2E1F]">PATHFINDER</span>
                    </div>

                    {/* Form Container - Glassmorphism Edition */}
                    <div className="relative z-10 w-full max-w-[600px] animate-fade-in-up">
                        {/* Interactive Glow Behind Card */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#FF6B35] to-[#FFA500] rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                        <div className="relative bg-white/70 backdrop-blur-2xl rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.1)] p-12 border border-white/40 transition-all duration-500 hover:shadow-[0_30px_70px_rgba(255,107,53,0.18)] group">

                            {/* Header with Icon */}
                            <div className="text-center mb-10 relative">
                                <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-xl shadow-orange-500/10 border border-white/50 mb-5 transform hover:rotate-[360deg] hover:scale-110 transition-all duration-700 overflow-hidden p-5 relative group/logo">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-orange-50 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity"></div>
                                    <img
                                        src="/images/icon/favicon.svg"
                                        alt="Pathfinder Logo"
                                        className="w-full h-full object-contain relative z-10"
                                    />
                                </div>
                                <h2 className="text-4xl font-black tracking-tight text-[#5C2E1F] mb-3">Sign In</h2>
                                <div className="flex justify-center">
                                    <div className="h-2 w-16 bg-gradient-to-r from-[#FF6B35] to-transparent rounded-full mb-2"></div>
                                </div>
                                <p className="text-slate-500 text-base font-semibold mt-3">Ready to continue your journey?</p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="mb-8 p-5 rounded-2xl bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-600 flex items-center gap-4 text-base font-bold animate-shake">
                                    <div className="bg-red-500 text-white p-2 rounded-full">
                                        <AlertCircle size={20} />
                                    </div>
                                    {error}
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-8 relative">
                                <div className="space-y-3 group/input">
                                    <label className="text-base font-black text-[#5C2E1F]/60 ml-1.5 block uppercase tracking-widest text-left">Username</label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-[#FF6B35] group-focus-within/input:scale-110 transition-all z-10">
                                            <User size={24} strokeWidth={2.5} />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full bg-white/50 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-14 py-5 text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#FF6B35]/10 focus:border-[#FF6B35]/50 focus:bg-white transition-all font-bold shadow-sm"
                                            placeholder="Your username"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 group/input">
                                    <label className="text-base font-black text-[#5C2E1F]/60 ml-1.5 block uppercase tracking-widest text-left">Password</label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-[#FF6B35] group-focus-within/input:scale-110 transition-all z-10">
                                            <Lock size={24} strokeWidth={2.5} />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/50 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-14 py-5 text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#FF6B35]/10 focus:border-[#FF6B35]/50 focus:bg-white transition-all font-bold shadow-sm"
                                            placeholder="Your password"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-base pt-2 px-1.5">
                                    <label className="flex items-center gap-3 cursor-pointer group/check">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-6 h-6 rounded border-2 border-white/80 bg-white/30 checked:bg-[#FF6B35] checked:border-[#FF6B35] transition-all cursor-pointer"
                                            />
                                            <div className="absolute text-white scale-0 peer-checked:scale-100 transition-transform left-1 top-1 pointer-events-none">
                                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z" /></svg>
                                            </div>
                                        </div>
                                        <span className="text-slate-600 font-bold group-hover/check:text-[#FF6B35] transition-colors">Remember Me</span>
                                    </label>
                                    <a href="#" className="font-black text-[#FF6B35] hover:text-[#FF8C42] transition-colors hover:underline decoration-2 underline-offset-4">Forgot?</a>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full group/btn relative overflow-hidden bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] p-5 rounded-2xl shadow-xl shadow-orange-500/30 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-orange-500/40 active:scale-[0.99] disabled:opacity-70 mt-6"
                                >
                                    <div className="relative z-10 flex items-center justify-center gap-3">
                                        {isLoading ? (
                                            <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span className="text-white font-black uppercase tracking-wider text-xl">Secure Sign In</span>
                                                <ArrowRight size={24} className="text-white group-hover/btn:translate-x-1 transition-transform" strokeWidth={3} />
                                            </>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shine"></div>
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="mt-10 pt-2 text-center">
                                <p className="text-slate-400 text-sm font-bold tracking-tight">
                                    Empowering Tomorrow's Leaders © 2026
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom CSS for animations */}
            <style>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(20px, -50px) scale(1.1); }
                    50% { transform: translate(-20px, 20px) scale(0.9); }
                    75% { transform: translate(50px, 50px) scale(1.05); }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
                    50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
                }
                
                @keyframes fade-in-down {
                    0% {
                        opacity: 0;
                        transform: translateY(-30px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fade-in-up {
                    0% {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
                    20%, 40%, 60%, 80% { transform: translateX(8px); }
                }
                
                .animate-blob {
                    animation: blob 7s infinite;
                }
                
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                
                .animate-fade-in-down {
                    animation: fade-in-down 0.8s ease-out;
                }
                
                .animate-fade-in-up {
                    animation: fade-in-up 1s ease-out;
                }
                
                .animate-shake {
                    animation: shake 0.6s ease-in-out;
                }
                
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    );
};

export default Login;
