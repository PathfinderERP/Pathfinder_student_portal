import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Brain, Sparkles, Target, Zap,
    MessageSquare, ChevronRight, Lightbulb,
    Bot, ShieldCheck,
    ZapOff, BookOpen, Send, User,
    RotateCcw, Loader2, RefreshCw, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const AIInsights = ({ isDarkMode }) => {
    const { token, getApiUrl } = useAuth();

    // ── Highlights State ────────────────────────────────────────────────────
    const [highlights, setHighlights] = useState([]);
    const [growthTip, setGrowthTip] = useState('');
    const [roadmap, setRoadmap] = useState({ concept_mastery: 0, time_efficiency: 0, exam_readiness: 0 });
    const [insightsLoading, setInsightsLoading] = useState(true);
    const [insightsError, setInsightsError] = useState('');

    // ── Chat State ──────────────────────────────────────────────────────────
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: "Hello! I'm your Personal AI Academic Coach. I can help you with subject doubts, revision strategies, and study planning — all tailored to your exam preparation. What would you like to work on today?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    // ── Auto-scroll chat ────────────────────────────────────────────────────
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Fetch Insights ──────────────────────────────────────────────────────
    const fetchInsights = useCallback(async (forceRefresh = false) => {
        if (!token || !getApiUrl) return;
        setInsightsLoading(true);
        setInsightsError('');
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(
                `${apiUrl}/api/student/ai-mentor/insights/${forceRefresh ? '?refresh=true' : ''}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = res.data;
            setHighlights(data.highlights || []);
            setGrowthTip(data.growth_tip || '');
            setRoadmap(data.roadmap || { concept_mastery: 65, time_efficiency: 50, exam_readiness: 60 });
        } catch (err) {
            setInsightsError(err.response?.data?.error || 'Could not load AI insights. Please try again.');
        } finally {
            setInsightsLoading(false);
        }
    }, [token, getApiUrl]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    // ── Send Chat Message ────────────────────────────────────────────────────
    const handleSend = async (e) => {
        e.preventDefault();
        const msg = input.trim();
        if (!msg || isChatLoading) return;

        const userMsg = { role: 'user', text: msg };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsChatLoading(true);

        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(
                `${apiUrl}/api/student/ai-mentor/chat/`,
                {
                    message: msg,
                    // Send last 10 messages as chat history (excluding the one we just sent)
                    messages: messages.slice(-10),
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const reply = res.data.reply || 'I could not generate a response. Please try again.';
            setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: '⚠️ I encountered a connection issue. Please check your internet and try again.'
            }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([{
            role: 'assistant',
            text: "Hello! I'm your Personal AI Academic Coach. I can help you with subject doubts, revision strategies, and study planning — all tailored to your exam preparation. What would you like to work on today?"
        }]);
    };

    const iconMap = { Sparkles, ZapOff, Target, Zap, Brain };

    // ── Icon picker by tag ───────────────────────────────────────────────────
    const getHighlightIcon = (index) => {
        const icons = [Sparkles, ZapOff, Target];
        return icons[index] || Sparkles;
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
                        <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            AI Insights & Coach
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Harnessing the power of neural patterns to decode your learning behavior.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchInsights(true)}
                            disabled={insightsLoading}
                            title="Refresh Insights"
                            className={`p-2.5 rounded-[5px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'}`}
                        >
                            <RefreshCw size={16} className={insightsLoading ? 'animate-spin' : ''} />
                        </button>
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

                    {insightsError ? (
                        <div className={`p-5 rounded-[5px] border flex items-start gap-3 ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                            <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-xs font-bold text-red-500">{insightsError}</p>
                        </div>
                    ) : insightsLoading ? (
                        [0, 1, 2].map(i => (
                            <div key={i} className={`p-6 rounded-[5px] border animate-pulse ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                                <div className={`w-10 h-10 rounded-[5px] mb-4 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                <div className={`h-3 rounded w-3/4 mb-3 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                <div className={`h-2 rounded w-full mb-2 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                <div className={`h-2 rounded w-4/5 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                            </div>
                        ))
                    ) : (
                        highlights.map((insight, i) => {
                            const Icon = getHighlightIcon(i);
                            return (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -5 }}
                                    className={`p-6 rounded-[5px] border relative group transition-all duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}
                                >
                                    <div className={`w-10 h-10 rounded-[5px] mb-4 flex items-center justify-center ${insight.color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                        <Icon size={20} />
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
                                </motion.div>
                            );
                        })
                    )}

                    {/* Growth Tip */}
                    {!insightsLoading && !insightsError && (
                        <div className={`p-6 rounded-[5px] border-2 border-dashed ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <Lightbulb className="text-orange-500" size={18} />
                                <p className="text-[10px] font-black uppercase tracking-widest">Growth Tip</p>
                            </div>
                            <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                                {growthTip || 'Loading your personalised growth tip...'}
                            </p>
                        </div>
                    )}
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
                                    <span className="text-[9px] font-bold uppercase">Academic Guardrails Active • Powered by Gemini</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleReset}
                            title="Reset Conversation"
                            className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-[5px] transition-all opacity-40 hover:opacity-100"
                        >
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
                                        <div className={`p-4 rounded-[5px] text-xs font-bold leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user'
                                            ? (isDarkMode ? 'bg-indigo-600 text-white shadow-indigo-600/10' : 'bg-indigo-600 text-white shadow-indigo-600/20')
                                            : (isDarkMode ? 'bg-white/[0.03] text-slate-300 border border-white/5' : 'bg-slate-50 text-slate-700 border border-slate-100')
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Typing Indicator */}
                            {isChatLoading && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                                    <div className="flex gap-4 max-w-[85%]">
                                        <div className="w-8 h-8 shrink-0 rounded-[5px] bg-gradient-to-br from-orange-500 to-indigo-600 text-white flex items-center justify-center">
                                            <Bot size={16} />
                                        </div>
                                        <div className={`p-4 rounded-[5px] border flex items-center gap-2 ${isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                            <Loader2 size={14} className="animate-spin text-indigo-500" />
                                            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Thinking...</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSend} className={`p-5 border-t ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask your AI coach anything about your studies..."
                                disabled={isChatLoading}
                                className={`flex-grow px-5 py-3 rounded-[5px] border-2 outline-none font-bold text-xs transition-all disabled:opacity-60 ${isDarkMode
                                    ? 'bg-[#0A0D12] border-white/5 text-white focus:border-indigo-500/50'
                                    : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500/50'
                                    }`}
                            />
                            <button
                                type="submit"
                                disabled={isChatLoading || !input.trim()}
                                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-indigo-600 text-white rounded-[5px] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/10 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                            >
                                {isChatLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={3} />}
                                <span className="hidden md:inline">{isChatLoading ? 'Sending' : 'Send'}</span>
                            </button>
                        </div>
                        <div className="flex gap-4 mt-3">
                            <span className="text-[8px] font-black uppercase opacity-30 tracking-widest">Suggested:</span>
                            {['Weak Chapters', 'Revision Plan', 'Daily Goal', 'Exam Tips'].map((s) => (
                                <button
                                    type="button"
                                    key={s}
                                    onClick={() => setInput(s)}
                                    disabled={isChatLoading}
                                    className="text-[8px] font-black uppercase tracking-widest hover:text-indigo-500 transition-colors opacity-40 hover:opacity-100 disabled:cursor-not-allowed"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>
            </div>

            {/* Strategic AI Roadmap */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 rounded-[5px] bg-indigo-500/10 text-indigo-500">
                        <BookOpen size={20} strokeWidth={2.5} />
                    </div>
                    <h3 className={`font-black uppercase tracking-tight text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Strategic AI Roadmap</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { title: 'Concept Mastery', key: 'concept_mastery', color: 'bg-indigo-500', textColor: 'text-indigo-500' },
                        { title: 'Time Efficiency', key: 'time_efficiency', color: 'bg-orange-500', textColor: 'text-orange-500' },
                        { title: 'Exam Readiness', key: 'exam_readiness', color: 'bg-blue-500', textColor: 'text-blue-500' },
                    ].map((item) => {
                        const val = roadmap[item.key] ?? 0;
                        const status = val >= 75 ? 'Strong' : val >= 50 ? 'In Progress' : 'Critical Area';
                        return (
                            <div key={item.key} className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                                        <p className={`text-[10px] font-bold ${item.textColor}`}>{status}</p>
                                    </div>
                                    <p className="text-xl font-black">
                                        {insightsLoading ? <span className={`text-sm ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>—</span> : `${val}%`}
                                    </p>
                                </div>
                                <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                    <motion.div
                                        className={`h-full ${item.color} rounded-full`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${val}%` }}
                                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AIInsights;
