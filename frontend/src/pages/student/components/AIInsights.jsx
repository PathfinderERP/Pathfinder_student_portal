import React, { useState } from 'react';
import {
    Brain, Sparkles, Target, Zap,
    MessageSquare, ChevronRight, Lightbulb,
    ArrowUpRight, Bot, ShieldCheck,
    ZapOff, BookOpen, Send, User,
    RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIInsights = ({ isDarkMode }) => {
    const [activeChat, setActiveChat] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am your AI Academic Assistant. Based on your recent Physics mock test, you were exceptional in Mechanics but struggled with wave optics. Would you like a personalized revision plan for that?' }
    ]);
    const [input, setInput] = useState('');

    const insights = [
        {
            title: "Performance Breakthrough",
            desc: "Your accuracy in Calculus has jumped from 65% to 88% in the last 14 days. This puts you in the top 2% of the current batch.",
            icon: Sparkles,
            color: "indigo",
            tag: "Strength"
        },
        {
            title: "Critical Vulnerability",
            desc: "You tend to spend 4.2 minutes on Organic Chemistry MCQs, which is 2x the recommended time. Focus on 'Elimination Techniques'.",
            icon: ZapOff,
            color: "orange",
            tag: "Time Management"
        },
        {
            title: "Predicted Rank Spike",
            desc: "If you maintain your current Mathematics consistency, your WBJEE predicted rank could improve by another 400 positions by next month.",
            icon: Target,
            color: "indigo",
            tag: "Trajectory"
        }
    ];

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setMessages([...messages, userMsg]);
        setInput('');

        // Mock Response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: "That's a great question! For Wave Optics, I recommend starting with Huygens' Principle. I've noted this in your Study Planner for tomorrow at 4 PM."
            }]);
        }, 1000);
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* AI Header */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="px-3 py-1 rounded-[5px] bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                Cognitive Analysis
                            </div>
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2 bg-gradient-to-r from-orange-500 to-indigo-500 bg-clip-text text-transparent">
                            AI Insights & Coach
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Harnessing the power of neural patterns to decode your learning behavior.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center text-white bg-gradient-to-br from-orange-500 to-indigo-600 shadow-xl shadow-orange-500/20`}>
                            <Brain size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                <Sparkles size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: AI Highlights */}
                <div className="xl:col-span-1 space-y-6">
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Neural Highlights
                    </h3>

                    {insights.map((insight, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -5 }}
                            className={`p-6 rounded-[5px] border relative group transition-all duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}
                        >
                            <div className={`w-10 h-10 rounded-[5px] mb-4 flex items-center justify-center ${insight.color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                <insight.icon size={20} />
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {insight.title}
                                </h4>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[5px] ${insight.color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                    {insight.tag}
                                </span>
                            </div>
                            <p className={`text-xs font-medium leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                {insight.desc}
                            </p>

                            <button className={`mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all ${insight.color === 'orange' ? 'text-orange-500' : 'text-indigo-500'}`}>
                                Deep Dive <ChevronRight size={12} />
                            </button>
                        </motion.div>
                    ))}

                    <div className={`p-6 rounded-[5px] border-2 border-dashed ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <Lightbulb className="text-orange-500" size={18} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Growth Tip</p>
                        </div>
                        <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                            "Your memory retention is highest between 6:00 AM and 8:00 AM. Try relocating your Inorganic Chemistry revisions to this window."
                        </p>
                    </div>
                </div>

                {/* Right Column: AI Tutor Chat */}
                <div className={`xl:col-span-2 rounded-[5px] border flex flex-col h-[650px] overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                    {/* Chat Header */}
                    <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-[5px] bg-gradient-to-br from-orange-500 to-indigo-600 flex items-center justify-center text-white">
                                    <Bot size={20} />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#10141D] rounded-full"></div>
                            </div>
                            <div>
                                <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Personal AI Tutor</h4>
                                <div className="flex items-center gap-1.5 opacity-50">
                                    <ShieldCheck size={10} className="text-indigo-500" />
                                    <span className="text-[9px] font-bold uppercase">Learning Companion • Online</span>
                                </div>
                            </div>
                        </div>
                        <button className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-[5px] transition-all opacity-40 hover:opacity-100">
                            <RotateCcw size={18} />
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <AnimatePresence>
                            {messages.map((msg, i) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={i}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 shrink-0 rounded-[5px] flex items-center justify-center ${msg.role === 'user' ? (isDarkMode ? 'bg-white/10 text-indigo-400' : 'bg-slate-100 text-indigo-600') : 'bg-gradient-to-br from-orange-500 to-indigo-600 text-white'}`}>
                                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                        </div>
                                        <div className={`p-4 rounded-[5px] text-xs font-bold leading-relaxed shadow-sm ${msg.role === 'user'
                                                ? (isDarkMode ? 'bg-indigo-600 text-white shadow-indigo-600/10' : 'bg-indigo-600 text-white shadow-indigo-600/20')
                                                : (isDarkMode ? 'bg-white/[0.03] text-slate-300 border border-white/5' : 'bg-slate-50 text-slate-700 border border-slate-100')
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSend} className={`p-5 border-t ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask your AI coach anything about your studies..."
                                className={`flex-grow px-5 py-3 rounded-[5px] border-2 outline-none font-bold text-xs transition-all ${isDarkMode
                                        ? 'bg-[#0A0D12] border-white/5 text-white focus:border-indigo-500/50'
                                        : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500/50'
                                    }`}
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-indigo-600 text-white rounded-[5px] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/10 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Send size={14} strokeWidth={3} />
                                <span className="hidden md:inline">Send</span>
                            </button>
                        </div>
                        <div className="flex gap-4 mt-3">
                            <span className="text-[8px] font-black uppercase opacity-30 tracking-widest">Suggested:</span>
                            {['Weak Chapters', 'Revision Plan', 'Daily Goal'].map((s) => (
                                <button
                                    type="button"
                                    key={s}
                                    onClick={() => setInput(s)}
                                    className="text-[8px] font-black uppercase tracking-widest hover:text-indigo-500 transition-colors opacity-40 hover:opacity-100"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>
            </div>

            {/* Strategic Overview */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 rounded-[5px] bg-indigo-500/10 text-indigo-500">
                        <BookOpen size={20} strokeWidth={2.5} />
                    </div>
                    <h3 className={`font-black uppercase tracking-tight text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Strategic AI Roadmap</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { title: 'Concept Mastery', status: 'In Progress', val: 78, color: 'bg-indigo-500' },
                        { title: 'Time Efficiency', status: 'Critical Area', val: 42, color: 'bg-orange-500' },
                        { title: 'Exam Readiness', status: 'Standard', val: 65, color: 'bg-blue-500' },
                    ].map((item, i) => (
                        <div key={i} className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                                    <p className={`text-[10px] font-bold ${item.color.includes('orange') ? 'text-orange-500' : 'text-indigo-500'}`}>{item.status}</p>
                                </div>
                                <p className="text-xl font-black">{item.val}%</p>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AIInsights;
