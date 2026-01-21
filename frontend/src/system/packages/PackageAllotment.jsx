import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RefreshCw, Search, Plus, Pencil, X, ShieldCheck, BellRing, Target, Layers } from 'lucide-react';

const PackageAllotment = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [packages, setPackages] = useState([]);
    const [sections, setSections] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Filter & Pagination state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterExam, setFilterExam] = useState('');
    const [filterSession, setFilterSession] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPageInput, setJumpPageInput] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedSections, setSelectedSections] = useState([]);
    const [sectionSearch, setSectionSearch] = useState('');

    // Table Scroll state
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Alert state
    const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

    const triggerAlert = (message, type = 'success') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    };

    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const [teRes, sRes, sessRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/sections/`, config),
                axios.get(`${apiUrl}/api/master-data/sessions/`, config)
            ]);
            setTargetExams(teRes.data);
            setSections(sRes.data);
            setSessions(sessRes.data);
        } catch (err) {
            console.error("Fetch master data failed", err);
        }
    }, [getApiUrl, token]);

    const fetchPackages = useCallback(async () => {
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/packages/`, config);
            setPackages(response.data);
        } catch (err) {
            console.error("Fetch packages failed", err);
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchPackages();
        fetchMasterData();
    }, [fetchPackages, fetchMasterData]);

    const handleOpenModal = (pkg) => {
        setSelectedPackage(pkg);
        setSelectedSections(pkg.allotted_sections || []);
        setSectionSearch('');
        setIsModalOpen(true);
    };

    const handleSaveAllotment = async () => {
        if (!selectedPackage) return;
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/packages/${selectedPackage._id}/`, {
                allotted_sections: selectedSections
            }, config);

            triggerAlert("Package allotment updated successfully!");
            setIsModalOpen(false);
            fetchPackages();
        } catch (err) {
            console.error("Save allotment failed", err);
            triggerAlert("Failed to update allotment", "error");
        } finally {
            setIsActionLoading(false);
        }
    };

    const togglePackageStatus = async (pkg) => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/packages/${pkg._id}/`, { is_published: !pkg.is_published }, config);
            fetchPackages();
        } catch (err) {
            console.error("Toggle status failed", err);
        }
    };

    const toggleSectionSelection = (sectionId) => {
        if (selectedSections.includes(sectionId)) {
            setSelectedSections(selectedSections.filter(id => id !== sectionId));
        } else {
            setSelectedSections([...selectedSections, sectionId]);
        }
    };

    const filteredPackages = packages.filter(pkg => {
        const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pkg.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesExam = filterExam ? pkg.exam_type === filterExam : true;
        const matchesSession = filterSession ? pkg.session === filterSession : true;
        return matchesSearch && matchesExam && matchesSession;
    });

    const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);
    const paginatedPackages = filteredPackages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpPageInput);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setJumpPageInput('');
        }
    };

    // Horizontal Scroll Handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className={`p-10 rounded-[2.5rem] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 bg-cyan-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-cyan-500/20">
                                ERP Distribution
                            </div>
                            <h2 className="text-3xl font-black tracking-tight uppercase">
                                Package <span className="text-cyan-500">Allotment</span>
                            </h2>
                        </div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Allot packages to student sections or batches form ERP.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchPackages}
                            disabled={loading}
                            className={`p-3 rounded-xl transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className={`w-full pl-12 pr-4 py-3 rounded-2xl border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                ? 'bg-white/5 border-white/5 text-white focus:border-cyan-500/50 focus:ring-cyan-500/5'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-cyan-500/50 focus:ring-cyan-500/5'
                                }`}
                        />
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        <select
                            value={filterExam}
                            onChange={(e) => { setFilterExam(e.target.value); setCurrentPage(1); }}
                            className={`px-4 py-3 rounded-2xl border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode
                                ? 'bg-[#1A1F2B] border-white/5 text-white focus:border-cyan-500/50 [&>option]:bg-[#1A1F2B]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-cyan-500/50'
                                }`}
                        >
                            <option value="">All Exams</option>
                            {targetExams.map(exam => (
                                <option key={exam.id} value={exam.id} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>{exam.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterSession}
                            onChange={(e) => { setFilterSession(e.target.value); setCurrentPage(1); }}
                            className={`px-4 py-3 rounded-2xl border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode
                                ? 'bg-[#1A1F2B] border-white/5 text-white focus:border-cyan-500/50 [&>option]:bg-[#1A1F2B]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-cyan-500/50'
                                }`}
                        >
                            <option value="">All Sessions</option>
                            {sessions.map(session => (
                                <option key={session.id} value={session.id} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>{session.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table Area */}
                <div
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`overflow-x-auto custom-scrollbar transition-all ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    <table className="w-full text-left border-separate border-spacing-y-3 min-w-[1000px]">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <th className="pb-4 px-6">#</th>
                                <th className="pb-4 px-6">Name</th>
                                <th className="pb-4 px-6">Code</th>
                                <th className="pb-4 px-6 text-center">Exam Type</th>
                                <th className="pb-4 px-6 text-center">Session</th>
                                <th className="pb-4 px-6 text-center">Section</th>
                                <th className="pb-4 px-6 text-center">Active</th>
                                <th className="pb-4 px-6 text-center">Allot</th>
                            </tr>
                        </thead>
                        <tbody className="">
                            {paginatedPackages.length > 0 ? paginatedPackages.map((pkg, index) => (
                                <tr key={pkg._id} className={`group ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50 shadow-sm'} transition-all duration-300`}>
                                    <td className="py-4 px-6 text-xs font-bold opacity-60 first:rounded-l-2xl">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="py-4 px-6 text-sm font-extrabold tracking-tight">{pkg.name}</td>
                                    <td className="py-4 px-6 text-sm font-bold opacity-70 uppercase tracking-widest">{pkg.code}</td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                                            {pkg.exam_type_details?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-xs font-medium opacity-60 text-center">{pkg.session_details?.name || 'N/A'}</td>
                                    <td className="py-4 px-6 text-center">
                                        <div className="flex flex-wrap justify-center gap-1">
                                            {pkg.allotted_sections_details?.length > 0 ? pkg.allotted_sections_details.map(s => (
                                                <span key={s.id} className="text-[10px] font-bold opacity-70 bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                    {s.name}
                                                </span>
                                            )) : (
                                                <span className="text-[10px] italic opacity-30">No section allotted</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <button onClick={() => togglePackageStatus(pkg)} className="active:scale-95 transition-all">
                                            <div className={`w-10 h-5.5 mx-auto rounded-full p-1 transition-colors duration-300 flex items-center ${pkg.is_published ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                                <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform duration-300 ${pkg.is_published ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                                            </div>
                                        </button>
                                    </td>
                                    <td className="py-4 px-6 text-center last:rounded-r-2xl">
                                        <button
                                            onClick={() => handleOpenModal(pkg)}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                                        >
                                            <Pencil size={12} />
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className="py-32 text-center opacity-50 font-medium italic bg-white/5 rounded-[2.5rem]">
                                        <div className="flex flex-col items-center gap-4">
                                            <Layers size={48} />
                                            <p className="font-black uppercase tracking-[0.2em] text-sm">No Packages found for allotment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-100 dark:border-white/5 pt-8">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Show</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className={`px-3 py-2 rounded-xl border-2 outline-none font-black text-[10px] transition-all cursor-pointer ${isDarkMode
                                ? 'bg-[#1A1F2B] border-white/5 text-white focus:border-cyan-500/50 [&>option]:bg-[#1A1F2B]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-cyan-500/50'
                                }`}
                        >
                            {[5, 10, 20, 50].map(val => (
                                <option key={val} value={val} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>{val} Rows</option>
                            ))}
                        </select>
                        <span className="text-xs font-bold opacity-50 uppercase tracking-widest">per page</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
                        >
                            Prev
                        </button>
                        <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all ${currentPage === page
                                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/40'
                                        : 'hover:bg-white/10 opacity-50 hover:opacity-100'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
                        >
                            Next
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Jump to</span>
                        <form onSubmit={handleJumpToPage} className="relative">
                            <input
                                type="number"
                                value={jumpPageInput}
                                onChange={(e) => setJumpPageInput(e.target.value)}
                                placeholder="Page #"
                                className={`w-20 px-3 py-2 rounded-xl border-2 outline-none font-black text-[10px] transition-all text-center ${isDarkMode
                                    ? 'bg-white/5 border-white/5 text-white focus:border-cyan-500/50'
                                    : 'bg-white border-slate-100 text-slate-800 focus:border-cyan-500/50'
                                    }`}
                            />
                        </form>
                    </div>
                </div>
            </div>

            {/* Allotment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#1A1F2B]' : 'bg-white'}`}>
                        {/* Modal Header */}
                        <div className="bg-orange-500 p-8 flex justify-between items-center text-white">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Allocate Sections</h3>
                                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">
                                    Package: {selectedPackage?.name}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            {/* Section Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search student sections..."
                                    value={sectionSearch}
                                    onChange={(e) => setSectionSearch(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 outline-none font-bold transition-all focus:border-orange-500 ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                                />
                            </div>

                            {/* Section Grid */}
                            <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                                {sections.filter(s => s.name.toLowerCase().includes(sectionSearch.toLowerCase()) || (s.subject_code || s.code).toLowerCase().includes(sectionSearch.toLowerCase())).map(section => {
                                    const isSelected = selectedSections.includes(section.id);
                                    return (
                                        <div
                                            key={section.id}
                                            onClick={() => toggleSectionSelection(section.id)}
                                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] ${isSelected
                                                ? 'bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/10'
                                                : isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className={`text-xs font-black uppercase tracking-tight ${isSelected ? 'text-orange-500' : ''}`}>{section.name}</p>
                                                    <p className="text-[9px] font-bold opacity-40 mt-0.5">{section.subject_code || section.code}</p>
                                                </div>
                                                {isSelected && <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-center flex-col items-center gap-4">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                    {selectedSections.length} Sections Selected
                                </p>
                                <button
                                    onClick={handleSaveAllotment}
                                    disabled={isActionLoading}
                                    className="px-12 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-3"
                                >
                                    {isActionLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Confirm Allotment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Alert */}
            {alert.show && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-10 duration-500 w-[90%] max-w-sm">
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md ${alert.type === 'success'
                        ? 'bg-emerald-500/90 border-emerald-400 text-white'
                        : 'bg-red-500/90 border-red-400 text-white'
                        }`}>
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                            {alert.type === 'success' ? <ShieldCheck size={22} /> : <BellRing size={22} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5 text-white">Notification</p>
                            <p className="text-sm font-bold tracking-tight text-white">{alert.message}</p>
                        </div>
                        <button onClick={() => setAlert(prev => ({ ...prev, show: false }))} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
                            <X size={18} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackageAllotment;
