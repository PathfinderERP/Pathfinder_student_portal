import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Package, Search, Plus, Filter, ArrowLeft, Edit2, Trash2, CheckCircle, Clock, X, Upload, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PackageRegistry = ({ onBack }) => {
    const { isDarkMode } = useTheme();
    // Dummy Data to match the screenshot
    // Data State
    const [packages, setPackages] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    const { getApiUrl, token } = useAuth();

    // Modal & Form State
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formValues, setFormValues] = useState({
        name: '',
        code: '',
        examType: '', // Map to target_exam
        session: '',
        description: '',
        image: null
    });

    // Master Data State
    const [targetExams, setTargetExams] = useState([]);
    const [sessions, setSessions] = useState([]);

    // Image Preview Modal State
    const [previewImage, setPreviewImage] = useState(null);

    // Filter & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterExam, setFilterExam] = useState('');
    const [filterSession, setFilterSession] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPageInput, setJumpPageInput] = useState('');

    // Fetch Master Data on Modal Open
    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };

            const [targetRes, sessionRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/master-data/sessions/`, config)
            ]);

            setTargetExams(targetRes.data);
            setSessions(sessionRes.data);
        } catch (err) {
            console.error("Failed to fetch master data", err);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    const handleOpenModal = (pkg = null) => {
        if (pkg) {
            setIsEditing(true);
            setEditId(pkg._id);
            setFormValues({
                name: pkg.name,
                code: pkg.code,
                examType: pkg.exam_type,
                session: pkg.session,
                description: pkg.description || '',
                image: null, // Keep existing image if null
                currentImage: pkg.image // Store current image url for reference if needed
            });
        } else {
            setIsEditing(false);
            setEditId(null);
            setFormValues({ name: '', code: '', examType: '', session: '', description: '', image: null });
        }
        setIsModalOpen(true);
    };

    // Fetch Packages
    const fetchPackages = useCallback(async () => {
        try {
            setLoadingData(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/packages/`, config);
            setPackages(response.data);
        } catch (err) {
            console.error("Failed to fetch packages", err.response?.data || err.message);
        } finally {
            setLoadingData(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    // Filtering & Pagination Logic
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

    const toggleStatus = useCallback(async (pkg) => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/packages/${pkg._id}/`, { is_completed: !pkg.is_completed }, config);
            fetchPackages();
        } catch (err) {
            console.error("Failed to toggle status", err);
        }
    }, [getApiUrl, token, fetchPackages]);

    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

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

    const handleDelete = useCallback(async (id) => {
        // 1. Message BEFORE delete (Confirmation)
        if (!window.confirm("ARE YOU SURE? This action will permanently remove this package from the active list.")) return;

        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };

            await axios.delete(`${apiUrl}/api/packages/${id}/`, config);

            // 2. Message AFTER delete (Success)
            alert("DONE! The package has been deleted successfully.");

            fetchPackages();
        } catch (err) {
            console.error("Failed to delete package", err);
            alert("ERROR: Could not delete the package. Please try again.");
        }
    }, [getApiUrl, token, fetchPackages]);

    const handleSubmit = useCallback(async (e) => {
        if (e) e.preventDefault();

        if (!formValues.name || !formValues.code) {
            alert("Please fill in the Package Name and Code.");
            return;
        }

        setIsLoading(true);

        try {
            const apiUrl = getApiUrl();
            const config = {
                headers: {
                    'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            };

            const formData = new FormData();
            formData.append('name', formValues.name);
            formData.append('code', formValues.code);
            formData.append('description', formValues.description);
            formData.append('exam_type', formValues.examType);
            formData.append('session', formValues.session);
            if (formValues.image) formData.append('image', formValues.image);

            if (isEditing) {
                await axios.patch(`${apiUrl}/api/packages/${editId}/`, formData, config);
                alert("SUCCESS: Package updated successfully!");
            } else {
                await axios.post(`${apiUrl}/api/packages/`, formData, config);
                alert("SUCCESS: New package created successfully!");
            }

            setIsModalOpen(false);
            fetchPackages();
            setFormValues({ name: '', code: '', examType: '', session: '', description: '', image: null });
            setIsEditing(false);
            setEditId(null);
        } catch (err) {
            console.error("Failed to save package", err.response?.data || err.message);
            alert(`Failed to save package: ${JSON.stringify(err.response?.data || err.message)}`);
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token, formValues, isEditing, editId, fetchPackages]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className={`p-10 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className={`p-4 rounded-[5px] transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                            >
                                <ArrowLeft size={24} strokeWidth={3} />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="px-3 py-1 bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/20">
                                    Package Management
                                </div>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    All <span className="text-purple-500">Packages</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage and configure your test packages.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchPackages}
                            disabled={loadingData}
                            className={`p-3 rounded-[5px] transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={20} className={loadingData ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => handleOpenModal()} className="px-6 py-3 bg-green-600 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-green-600/20">
                            <Plus size={16} strokeWidth={3} />
                            <span>Add Package +</span>
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
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                ? 'bg-white/5 border-white/5 text-white focus:border-blue-500/50 focus:ring-blue-500/5'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50 focus:ring-blue-500/5'
                                }`}
                        />
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        <select
                            value={filterExam}
                            onChange={(e) => { setFilterExam(e.target.value); setCurrentPage(1); }}
                            className={`px-4 py-3 rounded-[5px] border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode
                                ? 'bg-[#1A1F2B] border-white/5 text-white focus:border-blue-500/50 [&>option]:bg-[#1A1F2B]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50'
                                }`}
                        >
                            <option value="" className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>All Exams</option>
                            {targetExams.map(exam => (
                                <option key={exam.id} value={exam.id} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>{exam.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterSession}
                            onChange={(e) => { setFilterSession(e.target.value); setCurrentPage(1); }}
                            className={`px-4 py-3 rounded-[5px] border-2 outline-none font-bold cursor-pointer transition-all ${isDarkMode
                                ? 'bg-[#1A1F2B] border-white/5 text-white focus:border-blue-500/50 [&>option]:bg-[#1A1F2B]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50'
                                }`}
                        >
                            <option value="" className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>All Sessions</option>
                            {sessions.map(session => (
                                <option key={session.id} value={session.id} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>{session.name}</option>
                            ))}
                        </select>

                        {(searchQuery || filterExam || filterSession) && (
                            <button
                                onClick={() => { setSearchQuery(''); setFilterExam(''); setFilterSession(''); setCurrentPage(1); }}
                                className="px-4 py-3 bg-red-500/10 text-red-500 rounded-[5px] font-bold text-xs hover:bg-red-500/20 transition-all"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Section */}
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
                                <th className="pb-4 px-6">Exam Type</th>
                                <th className="pb-4 px-6">Session</th>
                                <th className="pb-4 px-6">Image</th>
                                <th className="pb-4 px-6 text-center">Content Status</th>
                                <th className="pb-4 px-6 text-center">Test Status</th>
                                <th className="pb-4 px-6 text-center">Mark Completed</th>
                                <th className="pb-4 px-6 text-center">Edit</th>
                                <th className="pb-4 px-6 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="">
                            {loadingData ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-6"><div className={`h-3 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`h-4 w-40 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`h-4 w-16 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`w-8 h-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`h-5 w-5 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`h-5 w-5 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`h-5 w-10 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6 last:rounded-r-2xl"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    </tr>
                                ))
                            ) : paginatedPackages.length > 0 ? paginatedPackages.map((pkg, index) => (
                                <tr key={pkg._id} className={`group ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-white hover:bg-slate-50 shadow-sm'} transition-all duration-300`}>
                                    <td className="py-4 px-6 text-xs font-bold opacity-60 first:rounded-l-2xl">{(currentPage - 1) * itemsPerPage + index + 1}</td>

                                    <td className="py-4 px-6">
                                        <div className="font-extrabold text-sm tracking-tight">{pkg.name}</div>
                                    </td>

                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-black tracking-widest ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                            {pkg.code}
                                        </span>
                                    </td>

                                    <td className="py-4 px-6 text-xs font-bold opacity-70">{pkg.exam_type_details?.name || 'N/A'}</td>

                                    <td className="py-4 px-6 text-xs font-medium opacity-60">{pkg.session_details?.name || 'N/A'}</td>

                                    <td className="py-4 px-6">
                                        <div
                                            onClick={() => pkg.image && setPreviewImage({ url: pkg.image, name: pkg.name })}
                                            className={`w-8 h-8 rounded-[5px] flex items-center justify-center text-[10px] font-bold overflow-hidden cursor-pointer transition-transform active:scale-90 hover:ring-2 hover:ring-purple-500 shadow-sm ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}
                                            title="Click to view full image"
                                        >
                                            {pkg.image ? (
                                                <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover" />
                                            ) : 'Img'}
                                        </div>
                                    </td>

                                    <td className="py-4 px-6 text-center">
                                        <div className="flex justify-center">
                                            {pkg.content_status ?
                                                <CheckCircle className="text-green-500" size={18} strokeWidth={2.5} /> :
                                                <Clock className="text-orange-500" size={18} strokeWidth={2.5} />
                                            }
                                        </div>
                                    </td>

                                    <td className="py-4 px-6 text-center">
                                        <div className="flex justify-center">
                                            {pkg.test_status ?
                                                <CheckCircle className="text-green-500" size={18} strokeWidth={2.5} /> :
                                                <Clock className="text-orange-500" size={18} strokeWidth={2.5} />
                                            }
                                        </div>
                                    </td>

                                    <td className="py-4 px-6 text-center">
                                        <button onClick={() => toggleStatus(pkg)} className="group active:scale-95 transition-all">
                                            <div className={`w-10 h-5.5 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center ${pkg.is_completed ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${pkg.is_completed ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                                            </div>
                                        </button>
                                    </td>

                                    <td className="py-4 px-6 text-center">
                                        <button onClick={() => handleOpenModal(pkg)} className="p-1 rounded-[5px] text-blue-500 hover:bg-blue-500/10 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                    </td>

                                    <td className="py-4 px-6 text-center last:rounded-r-2xl">
                                        <button onClick={() => handleDelete(pkg._id)} className="p-1 rounded-[5px] text-red-500 hover:bg-red-500/10 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="11" className="py-12 text-center opacity-50 font-medium italic bg-white/5 rounded-[5px]">No packages found.</td>
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
                            className={`px-3 py-2 rounded-[5px] border-2 outline-none font-black text-[10px] transition-all cursor-pointer ${isDarkMode
                                ? 'bg-[#1A1F2B] border-white/5 text-white focus:border-blue-500/50 [&>option]:bg-[#1A1F2B]'
                                : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50'
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
                            className={`px-4 py-2 rounded-[5px] font-bold text-xs transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
                        >
                            Prev
                        </button>

                        <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-[5px]">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 rounded-[5px] font-black text-[10px] transition-all ${currentPage === page
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40'
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
                            className={`px-4 py-2 rounded-[5px] font-bold text-xs transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
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
                                className={`w-20 px-3 py-2 rounded-[5px] border-2 outline-none font-black text-[10px] transition-all text-center ${isDarkMode
                                    ? 'bg-white/5 border-white/5 text-white focus:border-blue-500/50'
                                    : 'bg-white border-slate-100 text-slate-800 focus:border-blue-500/50'
                                    }`}
                            />
                        </form>
                    </div>
                </div>
            </div>

            {/* Add Package Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className={`w-full max-w-lg rounded-[5px] shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-[#1A1F2B]' : 'bg-white'}`}>

                        {/* Orange Header */}
                        <div className="bg-orange-500 p-6 flex items-center justify-between shrink-0">
                            <h3 className="text-xl font-bold text-white tracking-wide">{isEditing ? 'Edit Package Details' : 'Enter Package Details'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Content */}
                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">

                            {/* Package Name */}
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={formValues.name}
                                    onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                                    placeholder=" "
                                    className={`peer w-full px-4 py-3.5 rounded-[5px] border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                        ? 'bg-transparent border-white/10 text-white focus:border-blue-500 focus:ring-blue-500/10'
                                        : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500/10'
                                        }`}
                                />
                                <label className={`absolute left-4 transition-all duration-200 pointer-events-none 
                                    top-0 -translate-y-full text-xs 
                                    peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm 
                                    peer-focus:top-0 peer-focus:-translate-y-full peer-focus:text-xs peer-focus:text-blue-500 
                                    ${isDarkMode ? 'text-slate-500 bg-[#1A1F2B] px-1 peer-focus:text-blue-400' : 'text-slate-400 bg-white px-1'}`}>
                                    Enter Package Name *
                                </label>
                            </div>

                            {/* Code */}
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={formValues.code}
                                    onChange={(e) => setFormValues({ ...formValues, code: e.target.value })}
                                    placeholder=" "
                                    className={`peer w-full px-4 py-3.5 rounded-[5px] border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                        ? 'bg-transparent border-white/10 text-white focus:border-blue-500 focus:ring-blue-500/10'
                                        : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500/10'
                                        }`}
                                />
                                <label className={`absolute left-4 transition-all duration-200 pointer-events-none 
                                    top-0 -translate-y-full text-xs 
                                    peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm 
                                    peer-focus:top-0 peer-focus:-translate-y-full peer-focus:text-xs peer-focus:text-blue-500 
                                    ${isDarkMode ? 'text-slate-500 bg-[#1A1F2B] px-1 peer-focus:text-blue-400' : 'text-slate-400 bg-white px-1'}`}>
                                    Enter Code *
                                </label>
                            </div>

                            {/* Exam Type - Dropdown */}
                            <div className="relative">
                                <select
                                    value={formValues.examType}
                                    onChange={(e) => setFormValues({ ...formValues, examType: e.target.value })}
                                    className={`w-full px-4 py-3.5 rounded-[5px] border-2 outline-none font-bold appearance-none cursor-pointer transition-all ${isDarkMode
                                        ? 'bg-[#1A1F2B] border-white/10 text-white focus:border-blue-500 [&>option]:bg-[#1A1F2B]'
                                        : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500'
                                        }`}
                                >
                                    <option value="" disabled className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>Select Exam Type</option>
                                    {targetExams.map(exam => (
                                        <option key={exam.id} value={exam.id} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>
                                            {exam.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>

                            {/* Course Session - Dropdown */}
                            <div className="relative">
                                <label className={`block text-xs font-bold mb-2 uppercase tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Select Course Session *</label>
                                <div className="relative">
                                    <select
                                        value={formValues.session}
                                        onChange={(e) => setFormValues({ ...formValues, session: e.target.value })}
                                        className={`w-full px-4 py-3.5 rounded-[5px] border-2 outline-none font-bold appearance-none cursor-pointer transition-all ${isDarkMode
                                            ? 'bg-[#1A1F2B] border-white/10 text-white focus:border-blue-500 [&>option]:bg-[#1A1F2B]'
                                            : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500'
                                            }`}
                                    >
                                        <option value="" disabled className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>Select Session</option>
                                        {sessions.map(session => (
                                            <option key={session.id} value={session.id} className={isDarkMode ? 'bg-[#1A1F2B] text-white' : ''}>
                                                {session.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className={`p-4 rounded-[5px] border-2 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                <textarea
                                    value={formValues.description}
                                    onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                                    placeholder="Description *"
                                    rows="4"
                                    className="w-full bg-transparent outline-none font-medium placeholder:text-slate-400 resize-none"
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <h4 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Select Image</h4>
                                <div className="flex items-center gap-3 mb-4">
                                    <label className={`cursor-pointer px-4 py-2 rounded-[5px] border-2 font-bold text-sm transition-all shadow-sm active:scale-95 ${isDarkMode ? 'border-white/20 hover:bg-white/5 text-slate-300' : 'border-slate-300 hover:bg-slate-50 text-slate-600'}`}>
                                        Choose File
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => setFormValues({ ...formValues, image: e.target.files[0] })}
                                        />
                                    </label>
                                    <span className="text-sm font-medium opacity-50 italic">
                                        {formValues.image ? formValues.image.name : 'No file chosen'}
                                    </span>
                                </div>

                                {/* Image Preview */}
                                {(formValues.image || formValues.currentImage) && (
                                    <div className={`w-full h-48 rounded-[5px] border-2 border-dashed flex items-center justify-center overflow-hidden relative ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                        <img
                                            src={formValues.image ? URL.createObjectURL(formValues.image) : formValues.currentImage}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Add Button */}
                            <div className="pt-4 flex justify-center">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className={`px-12 py-3 rounded-[5px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${formValues.name && formValues.code
                                        ? (isDarkMode ? 'bg-white text-slate-900' : 'bg-orange-500 text-white hover:bg-orange-600')
                                        : (isDarkMode ? 'bg-white/10 text-white/20' : 'bg-slate-300 text-slate-900 cursor-not-allowed')
                                        } ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        isEditing ? 'Update' : 'Add'
                                    )}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {/* Image Preview Modal (Lightbox) */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95 group"
                    >
                        <X size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>

                    <div className="relative max-w-5xl w-full h-[80vh] flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <img
                            src={previewImage.url}
                            alt={previewImage.name}
                            className="max-w-full max-h-full object-contain rounded-[5px] shadow-2xl shadow-black/50"
                        />
                        <div className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-white font-bold text-sm tracking-wide">
                            {previewImage.name}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackageRegistry;
