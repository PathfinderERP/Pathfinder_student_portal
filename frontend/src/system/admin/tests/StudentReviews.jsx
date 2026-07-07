import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, RefreshCw, Users, FileText, ChevronLeft, ChevronRight, MessageSquare, ArrowLeft, CheckCircle, XCircle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const StudentReviews = ({ isOMR = false }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [tests, setTests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [testFilter, setTestFilter] = useState('all'); 
    const [selectedSession, setSelectedSession] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [reflectionCounts, setReflectionCounts] = useState({});
    
    const [viewMode, setViewMode] = useState('TESTS'); // 'TESTS', 'REVIEWS'
    const [selectedTest, setSelectedTest] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [isReviewsLoading, setIsReviewsLoading] = useState(false);
    const [selectedStudentReview, setSelectedStudentReview] = useState(null);
    const [selectedCenter, setSelectedCenter] = useState('');
    const [selectedCenterFilters, setSelectedCenterFilters] = useState([]);
    const [isCenterFilterOpen, setIsCenterFilterOpen] = useState(false);
    const activeFetchKeysRef = useRef(new Set());

    const groupedReviews = useMemo(() => {
        const grouped = {};
        reviews.forEach(rev => {
            const center = rev.centre_name || 'Unknown Center';
            if (!grouped[center]) grouped[center] = {};
            
            const studentKey = `${rev.student_name} (${rev.enrollment_number})`;
            if (!grouped[center][studentKey]) {
                grouped[center][studentKey] = {
                    student_name: rev.student_name,
                    enrollment_number: rev.enrollment_number,
                    reflections: []
                };
            }
            grouped[center][studentKey].reflections.push(rev);
        });
        
        // Sort reflections by question_number in ascending order
        Object.values(grouped).forEach(center => {
            Object.values(center).forEach(student => {
                student.reflections.sort((a, b) => (a.question_number || 0) - (b.question_number || 0));
            });
        });

        return grouped;
    }, [reviews]);

    const fetchTests = async (forceRefresh = false, silent = false) => {
        const fetchKey = 'test-list';
        if (activeFetchKeysRef.current.has(fetchKey)) return;

        if (forceRefresh) setIsSyncing(true);
        else if (tests.length === 0) setIsLoading(true);

        activeFetchKeysRef.current.add(fetchKey);
        try {
            const apiUrl = getApiUrl();
            const [res, refRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/${forceRefresh ? '?refresh=true' : ''}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${apiUrl}/api/tests/with_reflections/`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: { test_ids: [] } }))
            ]);
            
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setTests(data);
            setReflectionCounts(refRes.data.tests || {});
            
            if (forceRefresh && !silent) toast.success('ERP Data Synchronized Successfully!');
        } catch (err) {
            console.error('Error fetching tests:', err);
            if (forceRefresh && !silent) toast.error('Failed to sync with ERP');
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
            activeFetchKeysRef.current.delete(fetchKey);
        }
    };

    useEffect(() => {
        fetchTests();
    }, []);

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

            const examTypeName = test.exam_type_details?.name?.toLowerCase() || '';
            const isOMRTest = examTypeName.includes('omr');
            const matchesOMR = isOMR ? isOMRTest : !isOMRTest;
            
            const hasReflections = reflectionCounts[String(test.id)] > 0;

            return matchesSearch && matchesStatus && matchesSession && matchesOMR && hasReflections;
        });
    }, [tests, searchTerm, testFilter, selectedSession, isOMR, reflectionCounts]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, testFilter, selectedSession]);

    const pageCount = Math.ceil(filteredTests.length / itemsPerPage);
    const currentTests = filteredTests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleViewReviews = async (test) => {
        setSelectedTest(test);
        setViewMode('REVIEWS');
        setIsReviewsLoading(true);
        setSelectedStudentReview(null);
        setSelectedCenter('');
        setSelectedCenterFilters([]);
        setIsCenterFilterOpen(false);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/tests/${test.id}/student_reflections/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReviews(res.data.reflections || []);
        } catch (err) {
            console.error('Error fetching student reviews:', err);
            toast.error('Failed to load student reviews');
        } finally {
            setIsReviewsLoading(false);
        }
    };

    const stripHtml = (html) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const handleExport = (centerName = null) => {
        let exportData = [];
        
        const centersToExport = centerName 
            ? [centerName]
            : Object.keys(groupedReviews).filter(c => selectedCenterFilters.length === 0 || selectedCenterFilters.includes(c));

        let maxReflections = 0;
        centersToExport.forEach(center => {
            const students = groupedReviews[center];
            if (!students) return;
            Object.values(students).forEach(student => {
                if (student.reflections.length > maxReflections) {
                    maxReflections = student.reflections.length;
                }
            });
        });

        centersToExport.forEach(center => {
            const students = groupedReviews[center];
            if (!students) return;
            
            Object.values(students).forEach(student => {
                let row = {
                    'Test Name': selectedTest?.name || '',
                    'Center': center,
                    'Student Name': student.student_name,
                    'Roll Number': student.enrollment_number,
                    'Total Mistakes': student.reflections.length
                };
                
                for (let i = 0; i < maxReflections; i++) {
                    const rev = student.reflections[i];
                    const num = i + 1;
                    if (rev) {
                        row[`Question No. ${num}`] = rev.question_number || 'N/A';
                        row[`Section ${num}`] = rev.sectionName || 'N/A';
                        row[`Question Type ${num}`] = rev.type || 'N/A';
                        row[`Chapter ${num}`] = rev.chapter || 'N/A';
                        row[`Topic ${num}`] = rev.topic || 'N/A';
                        row[`Negative Marks ${num}`] = rev.negative_marks || 0;
                        row[`Reflection ${num}`] = rev.reflection ? rev.reflection : '';
                    } else {
                        row[`Question No. ${num}`] = '';
                        row[`Section ${num}`] = '';
                        row[`Question Type ${num}`] = '';
                        row[`Chapter ${num}`] = '';
                        row[`Topic ${num}`] = '';
                        row[`Negative Marks ${num}`] = '';
                        row[`Reflection ${num}`] = '';
                    }
                }
                exportData.push(row);
            });
        });

        if (exportData.length === 0) {
            toast.error("No data to export");
            return;
        }

        const wb = XLSX.utils.book_new();

        // Master Data Sheet
        const masterSheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, masterSheet, "Master Data");

        // Add a sheet for each center
        centersToExport.forEach(center => {
            const centerData = exportData.filter(row => row['Center'] === center);
            if (centerData.length > 0) {
                // Excel sheet names have a maximum length of 31 characters and cannot contain certain characters
                const safeCenterName = center.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
                const centerSheet = XLSX.utils.json_to_sheet(centerData);
                // Avoid duplicate sheet names in case of truncation collisions
                let finalSheetName = safeCenterName;
                let counter = 1;
                while (wb.SheetNames.includes(finalSheetName)) {
                    finalSheetName = `${safeCenterName.substring(0, 27)}_${counter}`;
                    counter++;
                }
                XLSX.utils.book_append_sheet(wb, centerSheet, finalSheetName);
            }
        });

        const fileName = `Student_Reflections_${centerName ? centerName.replace(/\s+/g, '_') : 'All_Centers'}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {viewMode === 'TESTS' && (
                <>
                    {/* Header */}
                    <div className={`p-10 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-100 border-slate-200 shadow-slate-200/50'}`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
                                    <MessageSquare className="text-orange-500" size={32} />
                                    <span>STUDENT <span className="text-orange-500">REVIEWS</span></span>
                                </h2>
                                <p className={`text-sm font-medium mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    View student reflections and mistake reviews for {isOMR ? 'OMR' : 'Online'} tests.
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => fetchTests(true)}
                                    disabled={isSyncing}
                                    className={`px-5 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
                                        isSyncing ? 'bg-orange-500/50 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20'
                                    } text-white`}
                                >
                                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                                    {isSyncing ? 'Syncing...' : 'Sync with ERP'}
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Table */}
                    <div className={`rounded-[5px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/20' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className={`border-b text-[10px] uppercase font-black tracking-[0.2em] ${isDarkMode ? 'border-white/5 text-slate-500 bg-white/[0.02]' : 'border-slate-100 text-slate-400 bg-slate-50/50'}`}>
                                        <th className="py-5 px-6 font-black w-16">#</th>
                                        <th className="py-5 px-6 font-black">Test Name</th>
                                        <th className="py-5 px-6 font-black">Test Code</th>
                                        <th className="py-5 px-6 font-black text-center">Reviews</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <RefreshCw size={24} className="animate-spin text-orange-500" />
                                                    <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading Tests...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentTests.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <FileText size={24} className={`opacity-20 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                                                    <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No tests found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentTests.map((test, index) => (
                                        <tr key={test.id} className={`border-b last:border-0 transition-colors ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-50 hover:bg-slate-50/50'}`}>
                                            <td className="py-5 px-6">
                                                <span className={`text-[11px] font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                                    {(currentPage - 1) * itemsPerPage + index + 1}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={`text-[12px] font-black uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{test.name}</span>
                                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{test.session_details?.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <span className={`px-2.5 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-wider border ${isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                                                    {test.code || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex justify-center">
                                                    <button 
                                                        onClick={() => handleViewReviews(test)}
                                                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-2"
                                                    >
                                                        <MessageSquare size={14} /> View Reviews
                                                        {reflectionCounts[String(test.id)] > 0 && (
                                                            <span className="bg-white text-blue-600 px-2 py-0.5 rounded-md shadow-sm ml-1 font-extrabold text-[11px]">
                                                                {reflectionCounts[String(test.id)]}
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
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
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className={`p-2 rounded-[5px] transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="flex items-center gap-1 mx-2">
                                        {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                                            let pageNum;
                                            if (pageCount <= 5) pageNum = i + 1;
                                            else if (currentPage <= 3) pageNum = i + 1;
                                            else if (currentPage >= pageCount - 2) pageNum = pageCount - 4 + i;
                                            else pageNum = currentPage - 2 + i;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded-[5px] text-xs font-black transition-all ${currentPage === pageNum ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : `hover:bg-orange-500/10 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                                        disabled={currentPage === pageCount}
                                        className={`p-2 rounded-[5px] transition-all ${currentPage === pageCount ? 'opacity-30 cursor-not-allowed' : 'hover:bg-orange-500 hover:text-white'} ${isDarkMode ? 'bg-white/5' : 'bg-white border border-slate-200'}`}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {viewMode === 'REVIEWS' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                    {!selectedStudentReview && (
                        <div className={`p-8 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        if (selectedStudentReview) {
                                            setSelectedStudentReview(null);
                                        } else if (selectedCenter) {
                                            setSelectedCenter('');
                                        } else {
                                            setViewMode('TESTS');
                                        }
                                    }}
                                    className={`p-2 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight uppercase">
                                        Student <span className="text-orange-500">Reflections</span>
                                    </h2>
                                    <p className={`text-xs font-bold opacity-40 uppercase tracking-widest mt-1`}>
                                        Test: {selectedTest?.name}
                                        {selectedCenter && !selectedStudentReview ? ` • Center: ${selectedCenter}` : ''}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {(!selectedStudentReview && !selectedCenter && Object.keys(groupedReviews).length > 0) && (
                                    <button 
                                        onClick={() => handleExport(null)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-xs uppercase tracking-widest outline-none transition-colors ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'}`}
                                    >
                                        <Download size={14} />
                                        <span>Export Data</span>
                                    </button>
                                )}
                                
                                {(!selectedStudentReview && selectedCenter) && (
                                    <button 
                                        onClick={() => handleExport(selectedCenter)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-xs uppercase tracking-widest outline-none transition-colors ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'}`}
                                    >
                                        <Download size={14} />
                                        <span>Export Center</span>
                                    </button>
                                )}

                                {!selectedStudentReview && !selectedCenter && Object.keys(groupedReviews).length > 0 && (
                                    <div className="relative">
                                    <button
                                        onClick={() => setIsCenterFilterOpen(!isCenterFilterOpen)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-[5px] border font-black text-xs uppercase tracking-widest outline-none transition-colors ${isDarkMode ? 'bg-[#151B27] border-white/10 text-slate-300 hover:border-orange-500/50' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-500/50'}`}
                                    >
                                        <span>
                                            {selectedCenterFilters.length === 0 
                                                ? 'All Centers' 
                                                : `${selectedCenterFilters.length} Center${selectedCenterFilters.length > 1 ? 's' : ''} Selected`}
                                        </span>
                                        <ChevronDown size={14} className={`transition-transform ${isCenterFilterOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isCenterFilterOpen && (
                                        <div className={`absolute right-0 mt-2 w-64 rounded-md shadow-2xl border overflow-hidden z-50 ${isDarkMode ? 'bg-[#151B27] border-white/10' : 'bg-white border-slate-200'}`}>
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                                <label className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedCenterFilters.length === 0}
                                                        onChange={() => setSelectedCenterFilters([])}
                                                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                                    />
                                                    <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>All Centers</span>
                                                </label>
                                                {Object.keys(groupedReviews).map(center => (
                                                    <label key={center} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedCenterFilters.includes(center)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedCenterFilters(prev => [...prev, center]);
                                                                } else {
                                                                    setSelectedCenterFilters(prev => prev.filter(c => c !== center));
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                                        />
                                                        <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{center}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                    )}

                    {isReviewsLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <RefreshCw size={32} className="animate-spin text-orange-500" />
                            <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading Reflections...</p>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <MessageSquare size={48} className={`opacity-20 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                            <p className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No student reflections found for this test.</p>
                        </div>
                    ) : selectedStudentReview ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setSelectedStudentReview(null)}
                                        className={`p-2 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight uppercase">
                                            {selectedStudentReview.student_name}
                                        </h2>
                                        <p className={`text-xs font-bold opacity-40 uppercase tracking-widest mt-1`}>
                                            {selectedStudentReview.enrollment_number} • {selectedStudentReview.reflections.length} {selectedStudentReview.reflections.length === 1 ? 'Mistake' : 'Mistakes'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                {selectedStudentReview.reflections.map((rev, rIdx) => (
                                    <div key={rIdx} className={`rounded-[8px] border overflow-hidden ${isDarkMode ? 'bg-[#151B27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                                        {/* Header */}
                                        <div className={`flex items-center justify-between px-5 py-3 border-b ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={`text-[12px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    Mistake #{rIdx + 1} {rev.question_number ? <span className="opacity-50 ml-1">(Q.{rev.question_number})</span> : null}
                                                </span>
                                                <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Section : <span className={`font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{rev.sectionName || 'N/A'}</span>
                                                </span>
                                                <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Type : <span className={`font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                        {rev.type === 'SINGLE_CHOICE' ? 'MCQ' :
                                                         rev.type === 'MULTI_CHOICE' ? 'Multiple' :
                                                         rev.type === 'INTEGER_TYPE' ? 'Integer' :
                                                         rev.type === 'NUMERICAL' ? 'Numerical' :
                                                         rev.type || 'N/A'}
                                                    </span>
                                                </span>
                                                <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Chapter : <span className={`font-semibold uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{rev.chapter || 'N/A'}</span>
                                                </span>
                                                <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Topic : <span className={`font-semibold uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{rev.topic || 'N/A'}</span>
                                                </span>
                                            </div>
                                            <div className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Negative Mark : <span className="font-black text-red-500">{rev.negative_marks}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Question Text */}
                                        <div className="px-5 py-4">
                                            <div className={`text-[13px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} dangerouslySetInnerHTML={{ __html: rev.question_content }} />
                                        </div>
                                        
                                        {/* Options */}
                                        <div className="px-5 pb-4 space-y-2">
                                            {rev.type !== 'INTEGER_TYPE' && rev.type !== 'NUMERICAL' && (rev.options || []).map((opt, oi) => {
                                                const optLabel = ['A','B','C','D','E','F'][oi];
                                                const uAnsOpts = Array.isArray(rev.user_answer) 
                                                    ? rev.user_answer.map(x => String(x).toLowerCase().trim()) 
                                                    : (rev.user_answer ? [String(rev.user_answer).toLowerCase().trim()] : []);
                                                
                                                const allOptIds = (rev.options || []).map((o, i) => String(o.id || o._id || i).toLowerCase().trim());
                                                const anyIdMatch = uAnsOpts.some(ans => allOptIds.includes(ans));
                                                const optIdStr = String(opt.id || opt._id || oi).toLowerCase().trim();
                                                
                                                const isYours = anyIdMatch
                                                    ? uAnsOpts.includes(optIdStr)
                                                    : uAnsOpts.some(ans => 
                                                        ans === optIdStr || 
                                                        ans === optLabel?.toLowerCase() || 
                                                        ans === String(oi + 1) ||
                                                        (opt.content && ans === String(opt.content).replace(/(<([^>]+)>)/gi, "").toLowerCase().trim())
                                                    );
                                                
                                                const isCorrectOpt = opt.isCorrect;
                                                
                                                let optStyle = isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100';
                                                if (isYours && isCorrectOpt) optStyle = isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300';
                                                else if (isYours && !isCorrectOpt) optStyle = isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-300';
                                                else if (isCorrectOpt) optStyle = isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200';
                                                
                                                return (
                                                    <div key={opt.id || oi} className={`flex items-center justify-between px-4 py-3 rounded-[6px] border text-[12px] transition-all ${optStyle}`}>
                                                        <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} flex items-start gap-2`}>
                                                            <span className="font-black mt-0.5">{optLabel}.</span>
                                                            <div dangerouslySetInnerHTML={{ __html: opt.content || opt.text }} />
                                                        </span>
                                                        {isYours && isCorrectOpt && <CheckCircle size={16} className="text-emerald-500 shrink-0 ml-4" />}
                                                        {isYours && !isCorrectOpt && <XCircle size={16} className="text-red-500 shrink-0 ml-4" />}
                                                        {!isYours && isCorrectOpt && <CheckCircle size={16} className="text-emerald-500/50 shrink-0 ml-4" />}
                                                    </div>
                                                );
                                            })}
                                            {(rev.type === 'NUMERICAL' || rev.type === 'INTEGER_TYPE') && (
                                                <div className={`p-4 rounded-[6px] border mt-2 ${isDarkMode ? 'bg-white/[0.02] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                                    <div className="flex items-center gap-6 text-[12px] font-semibold">
                                                        <div>Student's Answer: <span className="font-black tracking-widest text-red-500">{rev.user_answer || 'N/A'}</span></div>
                                                        <div>Correct Answer: <span className="font-black tracking-widest text-emerald-500">{rev.answer_from === rev.answer_to ? rev.answer_to : `${rev.answer_from} - ${rev.answer_to}`}</span></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Solution */}
                                        <div className={`px-5 py-4 border-t text-[12px] leading-relaxed ${isDarkMode ? 'border-white/[0.06] text-slate-400 bg-blue-500/5' : 'border-slate-100 text-slate-500 bg-blue-50/50'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 text-[#4871D9]`}>Solution</p>
                                            <div dangerouslySetInnerHTML={{ __html: rev.solution || '<p>No solution provided</p>' }} />
                                        </div>
                                        
                                        {/* Student Reflection */}
                                        <div className={`px-5 py-4 border-t ${isDarkMode ? 'border-white/[0.06] bg-black/20' : 'border-slate-200 bg-slate-50'}`}>
                                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 shadow-sm ${
                                                    isDarkMode 
                                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                        : 'bg-rose-50 text-rose-600 border-rose-200/60'
                                                }`}>
                                                    Student Reflection
                                                </span>
                                            </div>
                                            <div className={`px-4 py-3 rounded-[6px] text-[13px] italic border ${isDarkMode ? 'bg-[#10141D] border-slate-700 text-white shadow-black/20' : 'bg-white border-rose-100 text-slate-800 shadow-slate-200/50'}`}>
                                                "{rev.reflection}"
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-in fade-in duration-300">
                            {!selectedCenter && Object.keys(groupedReviews).length > 0 && (
                                <div className="space-y-6">
                                    <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/60' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                                        <div className="overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                        <th className="py-6 px-6 text-center w-16">#</th>
                                                        <th className="py-6 px-6">Center Name</th>
                                                        <th className="py-6 px-6 text-center">Students</th>
                                                        <th className="py-6 px-6 text-center">Total Mistakes</th>
                                                        <th className="py-6 px-6 text-right pr-10">Show Details</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                                    {Object.entries(groupedReviews)
                                                        .filter(([centerName]) => selectedCenterFilters.length === 0 || selectedCenterFilters.includes(centerName))
                                                        .map(([centerName, students], idx) => {
                                                        const numStudents = Object.keys(students).length;
                                                        const totalMistakes = Object.values(students).reduce((sum, s) => sum + s.reflections.length, 0);
                                                        return (
                                                            <tr 
                                                                key={idx}
                                                                className={`group transition-all cursor-pointer ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-blue-50/20'}`}
                                                                onClick={() => setSelectedCenter(centerName)}
                                                            >
                                                                <td className="py-6 px-6 text-center">
                                                                    <span className={`flex items-center justify-center mx-auto w-8 h-8 rounded-full font-black text-xs ${isDarkMode ? 'bg-slate-500/10 text-slate-400' : 'bg-slate-100 text-slate-700'}`}>
                                                                        {idx + 1}
                                                                    </span>
                                                                </td>
                                                                <td className="py-6 px-6">
                                                                    <span className={`font-extrabold text-sm uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{centerName}</span>
                                                                </td>
                                                                <td className="py-6 px-6 text-center">
                                                                    <span className={`text-xs font-bold font-mono tracking-tighter uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>{numStudents}</span>
                                                                </td>
                                                                <td className="py-6 px-6 text-center">
                                                                    <span className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                        {totalMistakes} {totalMistakes === 1 ? 'Mistake' : 'Mistakes'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-6 px-6 text-right pr-10">
                                                                    <button className={`px-4 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                                                        View
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedCenter && groupedReviews[selectedCenter] && (
                                <div className="space-y-6">
                                    <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/60' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                                        <div className="overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                        <th className="py-6 px-6 text-center"># Rank</th>
                                                        <th className="py-6 px-6">Student Name</th>
                                                        <th className="py-6 px-6 text-center">Roll Number</th>
                                                        <th className="py-6 px-6 text-center">No Of Mistakes</th>
                                                        <th className="py-6 px-6 text-right pr-10">Show Details</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                                    {Object.entries(groupedReviews[selectedCenter]).map(([studentKey, student], idx) => {
                                                        return (
                                                            <React.Fragment key={idx}>
                                                                <tr 
                                                                    className={`group transition-all cursor-pointer ${isDarkMode ? 'hover:bg-white/2' : 'hover:bg-blue-50/20'}`}
                                                                    onClick={() => setSelectedStudentReview(student)}
                                                                >
                                                                    <td className="py-6 px-6 text-center">
                                                                        <span className={`flex items-center justify-center mx-auto w-8 h-8 rounded-full font-black text-xs ${idx < 3 ? 'bg-yellow-500/10 text-yellow-600' : isDarkMode ? 'bg-slate-500/10 text-slate-400' : 'bg-slate-100 text-slate-700'}`}>
                                                                            {idx + 1}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-6 px-6">
                                                                        <span className={`font-extrabold text-sm uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{student.student_name}</span>
                                                                    </td>
                                                                    <td className="py-6 px-6 text-center">
                                                                        <span className={`text-xs font-bold font-mono tracking-tighter uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>{student.enrollment_number}</span>
                                                                    </td>
                                                                    <td className="py-6 px-6 text-center">
                                                                        <span className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                            {student.reflections.length} {student.reflections.length === 1 ? 'Mistake' : 'Mistakes'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-6 px-6 text-right pr-10">
                                                                        <button className={`px-4 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                                                            View
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentReviews;
