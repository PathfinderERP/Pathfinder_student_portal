import React, { useState, useCallback, useEffect } from 'react';
import { Search, ArrowLeft, RefreshCw, Info, Clock, Calculator, List, Plus, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, LayoutGrid, Filter, BookOpen, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
0
const AssignExistingTest = ({ packageData, onBack, onAssigned }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [availableTests, setAvailableTests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [masterLoading, setMasterLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [assigningId, setAssigningId] = useState(null);

    // Master Data State
    const [sessions, setSessions] = useState([]);
    const [classLevels, setClassLevels] = useState([]);
    const [targetExams, setTargetExams] = useState([]);

    // Filter State
    const [filterSession, setFilterSession] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterTargetExam, setFilterTargetExam] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPageInput, setJumpPageInput] = useState('');

    const fetchMasterData = useCallback(async () => {
        setMasterLoading(true);
        const apiUrl = getApiUrl();
        const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };

        try {
            // Fetch individual data with separate try-catch to avoid one failure blocking all
            const fetchSessions = async () => {
                try {
                    const res = await axios.get(`${apiUrl}/api/master-data/sessions/`, config);
                    setSessions(Array.isArray(res.data) ? res.data : (res.data.results || []));
                } catch (e) { console.error("Sessions fetch failed", e); }
            };
            const fetchClasses = async () => {
                try {
                    const res = await axios.get(`${apiUrl}/api/master-data/classes/`, config);
                    setClassLevels(Array.isArray(res.data) ? res.data : (res.data.results || []));
                } catch (e) { console.error("Classes fetch failed", e); }
            };
            const fetchExams = async () => {
                try {
                    const res = await axios.get(`${apiUrl}/api/master-data/target-exams/`, config);
                    setTargetExams(Array.isArray(res.data) ? res.data : (res.data.results || []));
                } catch (e) { console.error("Target exams fetch failed", e); }
            };

            await Promise.allSettled([fetchSessions(), fetchClasses(), fetchExams()]);
        } catch (err) {
            console.error("Fetch master data master call failed", err);
        } finally {
            setMasterLoading(false);
        }
    }, [getApiUrl, token]);

    const fetchAvailableTests = useCallback(async () => {
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/tests/`, config);

            // Filter tests that are not already in this package
            const currentPkgId = packageData?._id || packageData?.id;
            const unassigned = response.data.filter(t => {
                const testPkgId = t.package?.id || t.package?._id || t.package;
                return String(testPkgId) !== String(currentPkgId);
            });

            setAvailableTests(unassigned);
        } catch (err) {
            console.error("Failed to fetch tests", err);
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token, packageData]);

    useEffect(() => {
        fetchAvailableTests();
        fetchMasterData();
    }, [fetchAvailableTests, fetchMasterData]);

    const handleAssign = async (testId) => {
        try {
            setAssigningId(testId);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/tests/${testId}/`, { package: packageData?._id || packageData?.id }, config);
            onAssigned();
        } catch (err) {
            console.error("Assign failed", err);
            alert("Failed to assign test.");
        } finally {
            setAssigningId(null);
        }
    };

    const filteredTests = availableTests.filter(t => {
        const matchesSearch = (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.code || '').toLowerCase().includes(searchQuery.toLowerCase());

        const tSession = t.session?.id || t.session?._id || t.session;
        const tClass = t.class_level?.id || t.class_level?._id || t.class_level;
        const tTargetExam = t.target_exam?.id || t.target_exam?._id || t.target_exam;

        const matchesSession = filterSession ? String(tSession) === String(filterSession) : true;
        const matchesClass = filterClass ? String(tClass) === String(filterClass) : true;
        const matchesTargetExam = filterTargetExam ? String(tTargetExam) === String(filterTargetExam) : true;

        return matchesSearch && matchesSession && matchesClass && matchesTargetExam;
    });

    const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
    const paginatedTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpPageInput);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setJumpPageInput('');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className={`p-10 rounded-[2.5rem] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className={`p-4 rounded-2xl transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/5' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'}`}>
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-green-500/20">
                                    {packageData?.name || 'Package'}
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Assign <span className="text-green-500">Existing Test</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Select from the system-wide test library to add to this package.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={fetchAvailableTests}
                        disabled={loading}
                        className={`p-4 rounded-2xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-blue-400 border border-white/5' : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100'}`}
                    >
                        <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="relative group md:col-span-2">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className={`w-full pl-14 pr-6 py-4 rounded-2xl border-2 outline-none font-bold transition-all ${isDarkMode
                                ? 'bg-white/5 border-white/5 text-white focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5'
                                : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5'
                                }`}
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                            value={filterSession}
                            onChange={(e) => { setFilterSession(e.target.value); setCurrentPage(1); }}
                            disabled={masterLoading}
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode
                                ? 'bg-[#10141D] border-white/5 text-white focus:border-green-500/50 [&>option]:bg-[#10141D]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-green-500/50'
                                }`}
                        >
                            <option value="">{masterLoading ? 'Loading...' : 'All Sessions'}</option>
                            {sessions.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="relative">
                        <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                            value={filterClass}
                            onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1); }}
                            disabled={masterLoading}
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode
                                ? 'bg-[#10141D] border-white/5 text-white focus:border-green-500/50 [&>option]:bg-[#10141D]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-green-500/50'
                                }`}
                        >
                            <option value="">{masterLoading ? 'Loading...' : 'All Classes'}</option>
                            {classLevels.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="relative">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <select
                            value={filterTargetExam}
                            onChange={(e) => { setFilterTargetExam(e.target.value); setCurrentPage(1); }}
                            disabled={masterLoading}
                            className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode
                                ? 'bg-[#10141D] border-white/5 text-white focus:border-green-500/50 [&>option]:bg-[#10141D]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-green-500/50'
                                }`}
                        >
                            <option value="">{masterLoading ? 'Loading...' : 'All Exams'}</option>
                            {targetExams.map(t => <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Test List Table */}
            <div className={`rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                                <th className="py-6 px-8">Test Information</th>
                                <th className="py-6 px-8 text-center">Exam Configuration</th>
                                <th className="py-6 px-8 text-center">Duration</th>
                                <th className="py-6 px-8 text-center">Features</th>
                                <th className="py-6 px-8 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-20 text-center">
                                        <RefreshCw size={40} className="animate-spin mx-auto text-blue-500 opacity-20" />
                                    </td>
                                </tr>
                            ) : paginatedTests.length > 0 ? paginatedTests.map((test) => (
                                <tr key={test.id || test._id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                    <td className="py-8 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                <List size={24} />
                                            </div>
                                            <div>
                                                <p className="font-black text-lg tracking-tight group-hover:text-green-500 transition-colors leading-none mb-2">{test.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        CODE: {test.code}
                                                    </span>
                                                    {test.package_name && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                                            CURR: {test.package_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-8 px-8 text-center">
                                        <div className="inline-flex flex-col gap-1">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                                                {test.target_exam_details?.name || 'N/A'}
                                            </span>
                                            <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                                                {test.exam_type_details?.name || 'Standard'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-8 px-8 text-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-500/5 border border-slate-500/10">
                                            <Clock size={14} className="text-orange-500" />
                                            <span className="text-sm font-black tracking-tighter">{test.duration} MIN</span>
                                        </div>
                                    </td>
                                    <td className="py-8 px-8 text-center">
                                        <div className="flex justify-center gap-3">
                                            {test.has_calculator && (
                                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shadow-sm" title="Calculator Enabled">
                                                    <Calculator size={16} />
                                                </div>
                                            )}
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shadow-sm" title="Detailed Config">
                                                <Info size={16} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-8 px-8 text-right">
                                        <button
                                            onClick={() => handleAssign(test.id || test._id)}
                                            disabled={assigningId === (test.id || test._id)}
                                            className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-90 flex items-center gap-2 ml-auto ${assigningId === (test.id || test._id)
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 shadow-lg'
                                                }`}
                                        >
                                            {assigningId === (test.id || test._id) ? (
                                                <RefreshCw size={14} className="animate-spin" />
                                            ) : (
                                                <Plus size={14} strokeWidth={3} />
                                            )}
                                            <span>Assign Test</span>
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-4">
                                            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                                <AlertCircle size={40} className="text-slate-300" />
                                            </div>
                                            <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">No tests found matching criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className={`p-6 border-t flex flex-col md:flex-row justify-between items-center gap-6 ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Rows per page:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className={`px-3 py-1.5 rounded-lg border-2 outline-none text-xs font-bold ${isDarkMode ? 'bg-[#10141D] border-white/5 text-white' : 'bg-white border-slate-100 text-slate-800'}`}
                        >
                            {[5, 10, 20, 50].map(val => <option key={val} value={val}>{val}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-xl transition-all ${currentPage === 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-blue-500/10 text-blue-500'}`}
                        >
                            <ChevronFirst size={18} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-xl transition-all ${currentPage === 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-blue-500/10 text-blue-500'}`}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <span className="text-xs font-black text-blue-500">{currentPage}</span>
                            <span className="text-xs font-bold opacity-30">/</span>
                            <span className="text-xs font-bold opacity-50">{totalPages || 1}</span>
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className={`p-2 rounded-xl transition-all ${currentPage === totalPages || totalPages === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-blue-500/10 text-blue-500'}`}
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className={`p-2 rounded-xl transition-all ${currentPage === totalPages || totalPages === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-blue-500/10 text-blue-500'}`}
                        >
                            <ChevronLast size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleJumpToPage} className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Jump to:</span>
                        <input
                            type="number"
                            value={jumpPageInput}
                            onChange={(e) => setJumpPageInput(e.target.value)}
                            placeholder="Page #"
                            className={`w-20 px-3 py-1.5 rounded-lg border-2 outline-none text-xs font-bold transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 text-white focus:border-blue-500' : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500'}`}
                        />
                        <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-90">
                            <ChevronRight size={16} strokeWidth={3} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AssignExistingTest;
