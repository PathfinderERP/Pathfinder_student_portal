import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    Search, Filter, RefreshCw, ExternalLink, Globe, MessageSquare, CheckCircle2,
    Clock, AlertTriangle, UserCheck, Shield, Send, Eye, X, ChevronLeft, ChevronRight,
    ArrowUpRight, Link2, Copy, Check, Sparkles, Inbox, HelpCircle, PhoneCall, Mail,
    SlidersHorizontal, Layers, Plus, BookOpen, User, Hash, ArrowRight
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const ExternalPortal = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user } = useAuth();

    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [subjectFilter, setSubjectFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedDoubt, setSelectedDoubt] = useState(null);
    const [copiedKey, setCopiedKey] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [assignTeacher, setAssignTeacher] = useState('');

    // Sample/Default External Inquiries Data
    const [externalDoubts, setExternalDoubts] = useState([
        {
            id: 'EXT-1049',
            student_name: 'Rahul Sharma',
            student_phone: '+91 98765 43210',
            source: 'Web Widget',
            source_icon: Globe,
            subject: 'Physics',
            topic: 'Electromagnetic Induction - Lenz Law',
            question: 'In a solenoid, when the current increases at a rate of 2A/s, how do we determine the exact direction of induced emf using Lenz’s law with magnetic flux linkage?',
            status: 'Pending',
            priority: 'High',
            created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
            assigned_to: null,
            external_ref: 'WEB-SESSION-8842',
            email: 'rahul.s@gmail.com'
        },
        {
            id: 'EXT-1048',
            student_name: 'Ananya Roy',
            student_phone: '+91 98301 22334',
            source: 'WhatsApp Bot',
            source_icon: PhoneCall,
            subject: 'Chemistry',
            topic: 'Organic Chemistry - Aldol Condensation',
            question: 'Why does crossed Aldol condensation between benzaldehyde and acetaldehyde yield primarily cinnamaldehyde instead of self-condensation products?',
            status: 'Assigned',
            priority: 'Medium',
            created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
            assigned_to: 'Dr. P. K. Banerjee (Faculty)',
            external_ref: 'WA-MSG-99201',
            email: 'ananya.roy99@yahoo.com'
        },
        {
            id: 'EXT-1047',
            student_name: 'Vikramaditya Sen',
            student_phone: '+91 91234 56780',
            source: 'External Portal API',
            source_icon: Link2,
            subject: 'Mathematics',
            topic: 'Definite Integration & Properties',
            question: 'Please provide step by step solution for evaluating integral 0 to pi/2 of log(sin x) dx using King’s property.',
            status: 'Resolved',
            priority: 'Low',
            created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
            resolved_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
            assigned_to: 'Prof. S. N. Mukherjee',
            reply_text: 'Use the property integral 0 to 2a f(x) dx = 2 integral 0 to a f(x) dx when f(2a-x)=f(x). The standard result evaluates to -(pi/2)*ln(2).',
            external_ref: 'API-REQ-4011',
            email: 'vikram.sen@outlook.com'
        },
        {
            id: 'EXT-1046',
            student_name: 'Pooja Verma',
            student_phone: '+91 99887 11223',
            source: 'Mobile App SDK',
            source_icon: MessageSquare,
            subject: 'Biology',
            topic: 'Genetics - Mendelian Inheritance',
            question: 'What is the phenotypic and genotypic ratio in case of incomplete dominance in Mirabilis jalapa (4 o’clock plant)?',
            status: 'Pending',
            priority: 'High',
            created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
            assigned_to: null,
            external_ref: 'SDK-CLIENT-3310',
            email: 'pooja.verma@gmail.com'
        },
        {
            id: 'EXT-1045',
            student_name: 'Sourav Ganguly',
            student_phone: '+91 94330 88990',
            source: 'Email Ingestion',
            source_icon: Mail,
            subject: 'Physics',
            topic: 'Rotational Dynamics - Moment of Inertia',
            question: 'How to calculate moment of inertia of a hollow cylinder with thickness t about its central axis?',
            status: 'Assigned',
            priority: 'Medium',
            created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
            assigned_to: 'Prof. K. Ghosh',
            external_ref: 'EML-INBOX-102',
            email: 'sourav.g@gmail.com'
        }
    ]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
    };

    const handleCopyApiKey = () => {
        navigator.clipboard.writeText('ext_live_pk_9941a87b29384c20d7f8e1203');
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    // Filtered data
    const filteredDoubts = useMemo(() => {
        return externalDoubts.filter(item => {
            if (activeTab === 'pending' && item.status !== 'Pending') return false;
            if (activeTab === 'assigned' && item.status !== 'Assigned') return false;
            if (activeTab === 'resolved' && item.status !== 'Resolved') return false;

            if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
            if (sourceFilter !== 'ALL' && item.source !== sourceFilter) return false;
            if (subjectFilter !== 'ALL' && item.subject !== subjectFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = item.student_name?.toLowerCase().includes(q);
                const matchSubject = item.subject?.toLowerCase().includes(q);
                const matchTopic = item.topic?.toLowerCase().includes(q);
                const matchQuestion = item.question?.toLowerCase().includes(q);
                const matchId = item.id?.toLowerCase().includes(q);
                const matchRef = item.external_ref?.toLowerCase().includes(q);
                if (!matchName && !matchSubject && !matchTopic && !matchQuestion && !matchId && !matchRef) {
                    return false;
                }
            }
            return true;
        });
    }, [externalDoubts, activeTab, statusFilter, sourceFilter, subjectFilter, searchQuery]);

    const totalPages = Math.ceil(filteredDoubts.length / itemsPerPage) || 1;
    const paginatedDoubts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredDoubts.slice(start, start + itemsPerPage);
    }, [filteredDoubts, currentPage, itemsPerPage]);

    const stats = useMemo(() => {
        const total = externalDoubts.length;
        const pending = externalDoubts.filter(d => d.status === 'Pending').length;
        const assigned = externalDoubts.filter(d => d.status === 'Assigned').length;
        const resolved = externalDoubts.filter(d => d.status === 'Resolved').length;
        return { total, pending, assigned, resolved };
    }, [externalDoubts]);

    const handleAssignOrResolve = () => {
        if (!selectedDoubt) return;
        setExternalDoubts(prev => prev.map(d => {
            if (d.id === selectedDoubt.id) {
                return {
                    ...d,
                    status: replyText.trim() ? 'Resolved' : (assignTeacher ? 'Assigned' : d.status),
                    assigned_to: assignTeacher || d.assigned_to,
                    reply_text: replyText.trim() || d.reply_text,
                    resolved_at: replyText.trim() ? new Date().toISOString() : d.resolved_at
                };
            }
            return d;
        }));
        setSelectedDoubt(null);
        setReplyText('');
        setAssignTeacher('');
    };

    return (
        <div className={`p-4 md:p-6 space-y-6 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">External Portal</h1>
                            <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage, triage, and solve doubts received from external websites, WhatsApp, mobile SDKs, and partner portals.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                            isDarkMode
                                ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-500' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                            activeTab === 'settings'
                                ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                                : isDarkMode
                                ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
                        }`}
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Portal Integrations</span>
                    </button>
                </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => { setActiveTab('all'); setStatusFilter('ALL'); }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                        activeTab === 'all' && statusFilter === 'ALL'
                            ? isDarkMode ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-500/10' : 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                            : isDarkMode ? 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800' : 'bg-white border-slate-200/80 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total External Doubts</span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{stats.total}</span>
                        <span className="text-xs text-blue-400 font-medium">All Sources</span>
                    </div>
                </div>

                <div
                    onClick={() => { setActiveTab('pending'); setStatusFilter('Pending'); }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                        statusFilter === 'Pending'
                            ? isDarkMode ? 'bg-slate-800/90 border-amber-500 shadow-lg shadow-amber-500/10' : 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                            : isDarkMode ? 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800' : 'bg-white border-slate-200/80 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending Review</span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-500">{stats.pending}</span>
                        <span className="text-xs text-amber-400 font-medium">Action Needed</span>
                    </div>
                </div>

                <div
                    onClick={() => { setActiveTab('assigned'); setStatusFilter('Assigned'); }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                        statusFilter === 'Assigned'
                            ? isDarkMode ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-500/10' : 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                            : isDarkMode ? 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800' : 'bg-white border-slate-200/80 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>In Progress / Assigned</span>
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                            <UserCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-cyan-400">{stats.assigned}</span>
                        <span className="text-xs text-cyan-400 font-medium">With Faculty</span>
                    </div>
                </div>

                <div
                    onClick={() => { setActiveTab('resolved'); setStatusFilter('Resolved'); }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                        statusFilter === 'Resolved'
                            ? isDarkMode ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                            : isDarkMode ? 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800' : 'bg-white border-slate-200/80 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Resolved & Sent</span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-500">{stats.resolved}</span>
                        <span className="text-xs text-emerald-400 font-medium">Delivered</span>
                    </div>
                </div>
            </div>

            {/* Main Tabs / View */}
            {activeTab === 'settings' ? (
                /* Integration / API Configuration Panel */
                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/80' : 'bg-white border-slate-200'} space-y-6`}>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h2 className="text-lg font-bold">External Portal API & Webhooks</h2>
                            <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Connect external student applications, forms, WhatsApp business webhooks, and partner LMS platforms.
                            </p>
                        </div>
                        <button
                            onClick={() => setActiveTab('all')}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 hover:opacity-80"
                        >
                            Back to Doubts
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* API Key Box */}
                        <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-500">
                                <Shield className="w-4 h-4" />
                                <span>Portal Ingestion API Key</span>
                            </div>
                            <p className="text-xs opacity-75">
                                Use this bearer token to authenticate incoming doubt submissions via REST API from your external website or app.
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value="ext_live_pk_9941a87b29384c20d7f8e1203"
                                    className={`flex-1 px-3 py-2 text-xs font-mono rounded-lg border ${
                                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                                    }`}
                                />
                                <button
                                    onClick={handleCopyApiKey}
                                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                                >
                                    {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copiedKey ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        {/* Webhook Endpoint */}
                        <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-500">
                                <Link2 className="w-4 h-4" />
                                <span>Incoming Webhook URL</span>
                            </div>
                            <p className="text-xs opacity-75">
                                Configure your external forms, WhatsApp Cloud API, or CRM to POST doubt payloads to this endpoint.
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value="https://api.pathfinderportal.com/api/external-doubts/webhook/"
                                    className={`flex-1 px-3 py-2 text-xs font-mono rounded-lg border ${
                                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                                    }`}
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText('https://api.pathfinderportal.com/api/external-doubts/webhook/');
                                        alert('Webhook URL copied!');
                                    }}
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Channels List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold uppercase tracking-wider opacity-70">Active Channels & Connectors</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { name: 'Web Widget SDK', status: 'Active', color: 'emerald', count: '12 doubts today' },
                                { name: 'WhatsApp Business API', status: 'Connected', color: 'emerald', count: '8 doubts today' },
                                { name: 'Mobile App Gateway', status: 'Active', color: 'emerald', count: '19 doubts today' },
                                { name: 'Email Ingestion Pipeline', status: 'Active', color: 'blue', count: '4 doubts today' },
                            ].map((ch, idx) => (
                                <div key={idx} className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold">{ch.name}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                                            ch.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        }`}>
                                            {ch.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-[11px] opacity-70">{ch.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* Doubt Query List & Filter */
                <div className={`rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700/80' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
                    {/* Controls Bar */}
                    <div className={`p-4 border-b ${isDarkMode ? 'border-slate-700/80 bg-slate-800/40' : 'border-slate-200 bg-slate-50/50'} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
                        <div className="flex flex-wrap items-center gap-2">
                            {['all', 'pending', 'assigned', 'resolved'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setStatusFilter(tab === 'all' ? 'ALL' : tab.charAt(0).toUpperCase() + tab.slice(1)); setCurrentPage(1); }}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                                        activeTab === tab
                                            ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20'
                                            : isDarkMode
                                            ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Search & Filter Dropdowns */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative min-w-[200px]">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    placeholder="Search external doubts..."
                                    className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all ${
                                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-700 placeholder-slate-400'
                                    }`}
                                />
                            </div>

                            <select
                                value={sourceFilter}
                                onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                                className={`px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none ${
                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                                }`}
                            >
                                <option value="ALL">All Sources</option>
                                <option value="Web Widget">Web Widget</option>
                                <option value="WhatsApp Bot">WhatsApp Bot</option>
                                <option value="External Portal API">External Portal API</option>
                                <option value="Mobile App SDK">Mobile App SDK</option>
                                <option value="Email Ingestion">Email Ingestion</option>
                            </select>

                            <select
                                value={subjectFilter}
                                onChange={(e) => { setSubjectFilter(e.target.value); setCurrentPage(1); }}
                                className={`px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none ${
                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                                }`}
                            >
                                <option value="ALL">All Subjects</option>
                                <option value="Physics">Physics</option>
                                <option value="Chemistry">Chemistry</option>
                                <option value="Mathematics">Mathematics</option>
                                <option value="Biology">Biology</option>
                            </select>
                        </div>
                    </div>

                    {/* Table / List View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className={`border-b font-semibold ${isDarkMode ? 'border-slate-700/80 text-slate-400 bg-slate-900/30' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                                    <th className="py-3 px-4">DOUBT ID</th>
                                    <th className="py-3 px-4">STUDENT & CONTACT</th>
                                    <th className="py-3 px-4">SOURCE CHANNEL</th>
                                    <th className="py-3 px-4">SUBJECT & TOPIC</th>
                                    <th className="py-3 px-4">STATUS</th>
                                    <th className="py-3 px-4">ASSIGNED FACULTY</th>
                                    <th className="py-3 px-4 text-right">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                                {paginatedDoubts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center opacity-60">
                                            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                            <p className="font-medium text-sm">No external doubts found</p>
                                            <p className="text-xs opacity-75">Adjust your filters or search query to see records.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedDoubts.map((item) => {
                                        const SourceIcon = item.source_icon || Globe;
                                        return (
                                            <tr
                                                key={item.id}
                                                className={`transition-colors ${
                                                    isDarkMode ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <td className="py-3 px-4 font-mono font-bold text-cyan-500">
                                                    {item.id}
                                                    <div className="text-[10px] text-slate-400 font-sans">{item.external_ref}</div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="font-semibold">{item.student_name}</div>
                                                    <div className="text-[11px] opacity-70">{item.student_phone || item.email}</div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                                                        isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                    }`}>
                                                        <SourceIcon className="w-3 h-3 text-cyan-500" />
                                                        {item.source}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-4 max-w-xs">
                                                    <div className="font-semibold text-slate-900 dark:text-slate-100">{item.subject}</div>
                                                    <div className="text-[11px] opacity-75 truncate">{item.topic}</div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        item.status === 'Resolved'
                                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                            : item.status === 'Assigned'
                                                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-4 text-[11px]">
                                                    {item.assigned_to ? (
                                                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                            <UserCheck className="w-3.5 h-3.5 text-cyan-500" />
                                                            {item.assigned_to}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Unassigned</span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDoubt(item);
                                                            setReplyText(item.reply_text || '');
                                                            setAssignTeacher(item.assigned_to || '');
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500 text-cyan-500 hover:text-white transition-all inline-flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>View / Triage</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700/80 bg-slate-800/30' : 'border-slate-200 bg-slate-50'} flex items-center justify-between text-xs`}>
                            <span className="opacity-70">
                                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredDoubts.length)} of {filteredDoubts.length} external inquiries
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                    className="p-1.5 rounded-lg border disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-2 font-semibold">{currentPage} / {totalPages}</span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                    className="p-1.5 rounded-lg border disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal for View / Triage / Reply */}
            {selectedDoubt && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                        {/* Modal Header */}
                        <div className={`p-5 border-b ${isDarkMode ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold flex items-center gap-2">
                                        <span>External Doubt: {selectedDoubt.id}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            selectedDoubt.status === 'Resolved'
                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                        }`}>
                                            {selectedDoubt.status}
                                        </span>
                                    </h3>
                                    <p className="text-xs opacity-70">Source: {selectedDoubt.source} ({selectedDoubt.external_ref})</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedDoubt(null)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                            {/* Student & Subject Info Card */}
                            <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ${
                                isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                                <div>
                                    <span className="opacity-60 block">Student</span>
                                    <span className="font-bold">{selectedDoubt.student_name}</span>
                                </div>
                                <div>
                                    <span className="opacity-60 block">Contact</span>
                                    <span className="font-bold">{selectedDoubt.student_phone || selectedDoubt.email}</span>
                                </div>
                                <div>
                                    <span className="opacity-60 block">Subject</span>
                                    <span className="font-bold text-cyan-500">{selectedDoubt.subject}</span>
                                </div>
                                <div>
                                    <span className="opacity-60 block">Topic</span>
                                    <span className="font-bold truncate block">{selectedDoubt.topic}</span>
                                </div>
                            </div>

                            {/* Question text */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider opacity-75">Student's Question / Query</label>
                                <div className={`p-4 rounded-xl border text-sm leading-relaxed ${
                                    isDarkMode ? 'bg-slate-800/80 border-slate-700/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}>
                                    {selectedDoubt.question}
                                </div>
                            </div>

                            {/* Assign Teacher */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider opacity-75">Assign to Faculty / Teacher</label>
                                <select
                                    value={assignTeacher}
                                    onChange={(e) => setAssignTeacher(e.target.value)}
                                    className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                                    }`}
                                >
                                    <option value="">-- Select Teacher to Assign --</option>
                                    <option value="Dr. P. K. Banerjee (Faculty)">Dr. P. K. Banerjee (Chemistry)</option>
                                    <option value="Prof. S. N. Mukherjee">Prof. S. N. Mukherjee (Mathematics)</option>
                                    <option value="Prof. K. Ghosh">Prof. K. Ghosh (Physics)</option>
                                    <option value="Dr. Anirban Das">Dr. Anirban Das (Biology)</option>
                                </select>
                            </div>

                            {/* Reply / Resolution Text */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider opacity-75">Solution / Response to External Student</label>
                                <textarea
                                    rows={4}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type response to be dispatched back to student via external portal / SMS / email / webhook..."
                                    className={`w-full p-3.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50'} flex items-center justify-end gap-2.5`}>
                            <button
                                onClick={() => setSelectedDoubt(null)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                                    isDarkMode ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignOrResolve}
                                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>{replyText.trim() ? 'Save & Dispatch Response' : 'Update Assignment'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExternalPortal;
