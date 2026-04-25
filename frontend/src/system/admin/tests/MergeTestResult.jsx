import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    FileSearch, Search, RefreshCw, Users, Merge, X, ChevronLeft, ChevronRight,
    Filter, Layers, Trophy, Medal, ArrowLeft, Loader2, Download
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const MergeTestResult = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    // ─── Test List State ───────────────────────────────────────────────────────
    const [tests, setTests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [testFilter, setTestFilter] = useState('all');
    const [selectedSession, setSelectedSession] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTests, setSelectedTests] = useState([]);

    // ─── Merge / Leaderboard State ─────────────────────────────────────────────
    const [isMerging, setIsMerging] = useState(false);
    const [mergeResult, setMergeResult] = useState(null); // { tests: [], leaderboard: [] }
    const [leaderboardSearch, setLeaderboardSearch] = useState('');
    const [lbPage, setLbPage] = useState(1);
    const [lbPerPage] = useState(20);

    const axiosConfig = () => ({ headers: { Authorization: `Bearer ${token}` } });

    const fetchTests = async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/`, axiosConfig());
            const data = res.data;
            const testList = Array.isArray(data) ? data : (data.results || []);
            setTests(testList);
        } catch (err) {
            console.error('Error fetching tests:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchTests(); }, []);

    // ─── Filter/Pagination Logic ───────────────────────────────────────────────
    const sessions = useMemo(() => {
        const unique = Array.from(new Set(tests.map(t => t.session_details?.name).filter(Boolean)));
        return unique.sort();
    }, [tests]);

    const filteredTests = useMemo(() => {
        return tests.filter(test => {
            const matchesSearch = test.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                test.code?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = testFilter === 'all' ||
                (testFilter === 'completed' && test.is_completed) ||
                (testFilter === 'in_progress' && !test.is_completed);
            const matchesSession = selectedSession === 'all' ||
                test.session_details?.name === selectedSession;
            return matchesSearch && matchesStatus && matchesSession;
        });
    }, [tests, searchTerm, testFilter, selectedSession]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, testFilter, selectedSession]);

    const pageCount = Math.ceil(filteredTests.length / itemsPerPage);
    const currentTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // ─── Table Drag Scroll ─────────────────────────────────────────────────────
    const tableContainerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const handleMouseDown = (e) => { setIsDragging(true); setStartX(e.pageX - tableContainerRef.current.offsetLeft); setScrollLeft(tableContainerRef.current.scrollLeft); };
    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e) => { if (!isDragging) return; e.preventDefault(); const x = e.pageX - tableContainerRef.current.offsetLeft; tableContainerRef.current.scrollLeft = scrollLeft - (x - startX) * 2; };

    // ─── Selection ─────────────────────────────────────────────────────────────
    const handleSelectTest = (testId) => {
        setSelectedTests(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
    };

    // ─── Merge API Call ────────────────────────────────────────────────────────
    const handleMergeResults = async () => {
        if (selectedTests.length < 2) {
            alert('Please select at least 2 tests to merge.');
            return;
        }
        setIsMerging(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.post(
                `${apiUrl}/api/tests/merge_results/`,
                { test_ids: selectedTests },
                axiosConfig()
            );
            setMergeResult(res.data);
            setLbPage(1);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to merge results. Please try again.';
            alert(msg);
        } finally {
            setIsMerging(false);
        }
    };

    // ─── Leaderboard Filtering ─────────────────────────────────────────────────
    const filteredLeaderboard = useMemo(() => {
        if (!mergeResult?.leaderboard) return [];
        const q = leaderboardSearch.toLowerCase();
        if (!q) return mergeResult.leaderboard;
        return mergeResult.leaderboard.filter(r =>
            r.name?.toLowerCase().includes(q) || r.enroll?.toLowerCase().includes(q)
        );
    }, [mergeResult, leaderboardSearch]);

    const lbPageCount = Math.ceil(filteredLeaderboard.length / lbPerPage);
    const currentLb = filteredLeaderboard.slice((lbPage - 1) * lbPerPage, lbPage * lbPerPage);

    const rankColor = (rank) => {
        if (rank === 1) return 'text-yellow-400';
        if (rank === 2) return 'text-slate-300';
        if (rank === 3) return 'text-orange-400';
        return isDarkMode ? 'text-slate-500' : 'text-slate-400';
    };
    const rankBg = (rank) => {
        if (rank === 1) return isDarkMode ? 'bg-yellow-400/10 border-yellow-400/20' : 'bg-yellow-50 border-yellow-200';
        if (rank === 2) return isDarkMode ? 'bg-slate-400/10 border-slate-400/20' : 'bg-slate-50 border-slate-200';
        if (rank === 3) return isDarkMode ? 'bg-orange-400/10 border-orange-400/20' : 'bg-orange-50 border-orange-200';
        return '';
    };

    // ─── CSV Export ────────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        if (!mergeResult) return;
        const paperHeaders = mergeResult.tests.map(t => t.name);
        const headers = ['Rank', 'Enroll No', 'Student Name', ...paperHeaders, 'Total Score'];
        const rows = mergeResult.leaderboard.map(row => [
            row.rank,
            `"${row.enroll}"`,
            `"${row.name}"`,
            ...mergeResult.tests.map(t => row.papers?.[t.id] ?? 'AB'),
            row.total
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'merged_result.csv'; a.click();
    };

    // ══════════════════════════════════════════════════════════════════════════
    // LEADERBOARD VIEW
    // ══════════════════════════════════════════════════════════════════════════
    if (mergeResult) {
        const paperCount = mergeResult.tests.length;
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
                {/* Leaderboard Header */}
                <div className={`p-8 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => { setMergeResult(null); setSelectedTests([]); setLeaderboardSearch(''); }}
                                className={`p-2.5 rounded-[5px] border transition-all hover:scale-110 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white'}`}
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <h2 className="text-3xl font-black tracking-tight mb-1 uppercase">
                                    Merged <span className="text-orange-500">Leaderboard</span>
                                </h2>
                                <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {mergeResult.tests.map(t => t.name).join(' + ')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search leaderboard */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={15} />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    value={leaderboardSearch}
                                    onChange={e => { setLeaderboardSearch(e.target.value); setLbPage(1); }}
                                    className={`pl-9 pr-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none w-52 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                />
                            </div>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-[5px] bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                            >
                                <Download size={14} /> Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Stats strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Papers Merged</p>
                            <p className="text-2xl font-black text-orange-500">{paperCount}</p>
                        </div>
                        <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Students</p>
                            <p className="text-2xl font-black">{mergeResult.leaderboard.length}</p>
                        </div>
                        <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Topper Score</p>
                            <p className="text-2xl font-black text-yellow-400">{mergeResult.leaderboard[0]?.total ?? '—'}</p>
                        </div>
                        <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Avg Score</p>
                            <p className="text-2xl font-black text-blue-400">
                                {mergeResult.leaderboard.length
                                    ? (mergeResult.leaderboard.reduce((s, r) => s + r.total, 0) / mergeResult.leaderboard.length).toFixed(1)
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Leaderboard Table */}
                <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    <th className="py-5 px-6 w-16">Rank</th>
                                    <th className="py-5 px-6">Enroll No</th>
                                    <th className="py-5 px-6">Student Name</th>
                                    {mergeResult.tests.map(t => (
                                        <th key={t.id} className="py-5 px-6 text-center whitespace-nowrap">
                                            <span className="block">{t.name}</span>
                                            <span className="font-mono text-[9px] opacity-60 normal-case tracking-wider">{t.code}</span>
                                        </th>
                                    ))}
                                    <th className="py-5 px-6 text-center text-orange-500">Total Score</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                {filteredLeaderboard.length === 0 ? (
                                    <tr>
                                        <td colSpan={4 + paperCount} className="py-20 text-center opacity-30">
                                            <div className="flex flex-col items-center gap-3">
                                                <Trophy size={48} />
                                                <p className="text-sm font-black uppercase tracking-[0.2em]">No Results Found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : currentLb.map((row) => (
                                    <tr
                                        key={row.student_id}
                                        className={`transition-all ${rankBg(row.rank)} ${!rankBg(row.rank) && (isDarkMode ? 'hover:bg-white/2' : 'hover:bg-blue-50/30')}`}
                                    >
                                        {/* Rank */}
                                        <td className="py-5 px-6">
                                            <div className={`flex items-center justify-center w-9 h-9 rounded-[5px] font-black text-sm ${rankColor(row.rank)} ${row.rank <= 3 ? (isDarkMode ? 'bg-white/10' : 'bg-white shadow-sm') : ''}`}>
                                                {row.rank <= 3 ? (
                                                    row.rank === 1 ? <Trophy size={18} className="text-yellow-400" /> :
                                                        row.rank === 2 ? <Medal size={18} className="text-slate-300" /> :
                                                            <Medal size={18} className="text-orange-400" />
                                                ) : row.rank}
                                            </div>
                                        </td>
                                        {/* Enroll */}
                                        <td className="py-5 px-6">
                                            <span className="font-mono text-xs font-black opacity-70">{row.enroll || '—'}</span>
                                        </td>
                                        {/* Name */}
                                        <td className="py-5 px-6">
                                            <span className="text-xs font-black uppercase tracking-tight">{row.name}</span>
                                        </td>
                                        {/* Per-paper scores */}
                                        {mergeResult.tests.map(t => (
                                            <td key={t.id} className="py-5 px-6 text-center">
                                                {row.papers?.[t.id] !== undefined ? (
                                                    <span className={`px-3 py-1.5 rounded-[5px] text-xs font-black ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                                        {row.papers[t.id]}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-black opacity-30 uppercase">AB</span>
                                                )}
                                            </td>
                                        ))}
                                        {/* Total */}
                                        <td className="py-5 px-6 text-center">
                                            <span className={`px-4 py-2 rounded-[5px] text-sm font-black ${row.rank === 1 ? 'bg-yellow-400/20 text-yellow-400' : row.rank === 2 ? 'bg-slate-400/20 text-slate-300' : row.rank === 3 ? 'bg-orange-400/20 text-orange-400' : (isDarkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600')}`}>
                                                {row.total}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Leaderboard Pagination */}
                    {filteredLeaderboard.length > lbPerPage && (
                        <div className={`px-8 py-5 border-t flex justify-between items-center gap-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                            <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Showing <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{(lbPage - 1) * lbPerPage + 1}</span> – <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{Math.min(lbPage * lbPerPage, filteredLeaderboard.length)}</span> of {filteredLeaderboard.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setLbPage(p => Math.max(1, p - 1))} disabled={lbPage === 1} className={`p-2 rounded-[5px] transition-all ${lbPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}><ChevronLeft size={16} /></button>
                                <span className="text-xs font-black opacity-60">{lbPage} / {lbPageCount}</span>
                                <button onClick={() => setLbPage(p => Math.min(lbPageCount, p + 1))} disabled={lbPage === lbPageCount} className={`p-2 rounded-[5px] transition-all ${lbPage === lbPageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}><ChevronRight size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TEST SELECTION VIEW
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className={`p-8 rounded-[5px] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            Merge <span className="text-orange-500">Test Result</span>
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Combine multi-paper exams (e.g. JEE Adv Paper 1 + Paper 2) into a unified leaderboard
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or code"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`pl-10 pr-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-4 w-56 ${isDarkMode ? 'bg-white/5 border-white/10 focus:ring-blue-500/10' : 'bg-slate-50 border-slate-200 focus:ring-blue-500/5'}`}
                            />
                        </div>

                        {/* Session Filter */}
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <Layers size={16} />
                            </div>
                            <select
                                value={selectedSession}
                                onChange={(e) => setSelectedSession(e.target.value)}
                                className={`px-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
                            >
                                <option value="all">All Sessions</option>
                                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <Filter size={16} />
                            </div>
                            <select
                                value={testFilter}
                                onChange={(e) => setTestFilter(e.target.value)}
                                className={`px-4 py-2.5 rounded-[5px] border text-xs font-bold outline-none transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}
                            >
                                <option value="all">Every Test</option>
                                <option value="completed">Completed Only</option>
                                <option value="in_progress">Pending Only</option>
                            </select>
                        </div>

                        <button
                            onClick={fetchTests}
                            className={`p-2.5 rounded-[5px] border transition-all active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-white border-slate-200 text-blue-500 hover:bg-blue-50'}`}
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Selection Banner */}
                {selectedTests.length > 0 && (
                    <div className={`mt-6 p-4 rounded-[5px] border ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-4">
                                <span className={`px-3 py-1.5 rounded-[5px] text-orange-500 font-black text-sm ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                                    {selectedTests.length} Test{selectedTests.length > 1 ? 's' : ''} Selected
                                </span>
                                <div className="flex gap-2 flex-wrap">
                                    {tests.filter(t => selectedTests.includes(t.id)).map(t => (
                                        <span key={t.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[10px] font-black uppercase ${isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-slate-700 shadow-sm border border-slate-200'}`}>
                                            {t.name}
                                            <button onClick={() => handleSelectTest(t.id)} className="opacity-50 hover:opacity-100 hover:text-red-500 transition-colors">
                                                <X size={11} strokeWidth={3} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedTests([])}
                                    className={`text-xs font-bold flex items-center gap-1 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    <X size={14} /> Clear All
                                </button>
                                <button
                                    onClick={handleMergeResults}
                                    disabled={isMerging || selectedTests.length < 2}
                                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isMerging ? <Loader2 size={13} className="animate-spin" /> : <Merge size={13} />}
                                    {isMerging ? 'Merging...' : 'Generate Leaderboard'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Test Selection Table */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div
                    ref={tableContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`overflow-x-auto ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-5 px-6 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedTests.length === filteredTests.length && filteredTests.length > 0}
                                        onChange={(e) => setSelectedTests(e.target.checked ? filteredTests.map(t => t.id) : [])}
                                        className="w-4 h-4 rounded accent-orange-500"
                                    />
                                </th>
                                <th className="py-5 px-6">#</th>
                                <th className="py-5 px-6">Test Name</th>
                                <th className="py-5 px-6">Test Code</th>
                                <th className="py-5 px-6 text-center">Session</th>
                                <th className="py-5 px-6 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="py-8 px-6">
                                            <div className={`h-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                        </td>
                                    </tr>
                                ))
                            ) : currentTests.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="opacity-20 flex flex-col items-center gap-3">
                                            <FileSearch size={48} />
                                            <p className="text-sm font-black uppercase tracking-[0.2em]">No Tests Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentTests.map((test, index) => (
                                <tr
                                    key={test.id}
                                    className={`group transition-all cursor-pointer ${selectedTests.includes(test.id)
                                        ? (isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50')
                                        : (isDarkMode ? 'hover:bg-white/2' : 'hover:bg-blue-50/30')}`}
                                    onClick={() => handleSelectTest(test.id)}
                                >
                                    <td className="py-5 px-6">
                                        <input
                                            type="checkbox"
                                            checked={selectedTests.includes(test.id)}
                                            onChange={() => handleSelectTest(test.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 rounded accent-orange-500"
                                        />
                                    </td>
                                    <td className="py-5 px-6 text-xs font-black opacity-30">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <span className="text-xs font-black uppercase tracking-tight">{test.name}</span>
                                            <span className="text-[9px] font-bold opacity-40 px-2 py-0.5 rounded-md bg-slate-500/5 whitespace-nowrap">
                                                {test.session_details?.name} • {test.class_level_details?.name} • {Array.isArray(test.target_exam_details) ? (test.target_exam_details.length > 3 ? `${test.target_exam_details.slice(0, 3).map(te => te.name).join(', ')} + ${test.target_exam_details.length - 3} test` : test.target_exam_details.map(te => te.name).join(', ')) : (test.target_exam_details?.name || '-')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-[5px] text-xs font-bold font-mono tracking-widest border border-purple-500/20">
                                            {test.code}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <span className={`px-3 py-1 rounded-[5px] text-[10px] font-bold ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                            {test.session_details?.name} • {test.class_level_details?.name} • {Array.isArray(test.target_exam_details) ? (test.target_exam_details.length > 3 ? `${test.target_exam_details.slice(0, 3).map(te => te.name).join(', ')} + ${test.target_exam_details.length - 3} test` : test.target_exam_details.map(te => te.name).join(', ')) : (test.target_exam_details?.name || '-')}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-center">
                                        <span className={`px-3 py-1 rounded-[5px] text-[10px] font-bold ${test.is_completed
                                            ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                            : (isDarkMode ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-600')}`}>
                                            {test.is_completed ? 'Completed' : 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {filteredTests.length > 0 && (
                    <div className={`px-8 py-5 border-t flex flex-col sm:flex-row justify-between items-center gap-6 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className={`bg-transparent text-xs font-black outline-none cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                                >
                                    {[5, 10, 20, 50].map(val => <option key={val} value={val} className={isDarkMode ? 'bg-[#0F131A]' : 'bg-white'}>{val}</option>)}
                                </select>
                            </div>
                            <div className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Showing <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{(currentPage - 1) * itemsPerPage + 1}</span> to <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{Math.min(currentPage * itemsPerPage, filteredTests.length)}</span> of <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{filteredTests.length}</span> results
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={`px-3 py-2 rounded-[5px] text-[10px] font-black uppercase transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}>First</button>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}><ChevronLeft size={16} /></button>
                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                                    let pageNum;
                                    if (pageCount <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= pageCount - 2) pageNum = pageCount - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                    return (
                                        <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-8 h-8 rounded-[5px] text-xs font-black transition-all ${currentPage === pageNum ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : `hover:bg-orange-500/10 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}`}>{pageNum}</button>
                                    );
                                })}
                            </div>
                            <button onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount} className={`p-2 rounded-[5px] transition-all ${currentPage === pageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}><ChevronRight size={16} /></button>
                            <button onClick={() => setCurrentPage(pageCount)} disabled={currentPage === pageCount} className={`px-3 py-2 rounded-[5px] text-[10px] font-black uppercase transition-all ${currentPage === pageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}>Last</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MergeTestResult;
