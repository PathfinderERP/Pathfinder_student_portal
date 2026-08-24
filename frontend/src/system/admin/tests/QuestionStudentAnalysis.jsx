import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    ArrowLeft, 
    Loader2, 
    AlertCircle, 
    FileSpreadsheet, 
    X, 
    Maximize2, 
    Minimize2,
    ChevronLeft,
    ChevronRight,
    Compass
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

// Static status styles to avoid runtime style allocations
const STATUS_STYLES = {
    CA: 'bg-emerald-500 text-white',
    IA: 'bg-rose-500 text-white',
    PA: 'bg-amber-500 text-white',
    NA_DARK: 'bg-white/5 text-transparent border border-white/5',
    NA_LIGHT: 'bg-slate-50 text-transparent border border-slate-200',
};

// Memoized row component with content-visibility virtualization for 60fps performance
const MatrixRow = React.memo(({ row, isDarkMode, sectionEndIndices }) => {
    return (
        <tr 
            style={{ contentVisibility: 'auto', containIntrinsicSize: '52px' }}
            className={`border-b ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50/80'}`}
        >
            {/* Student Name */}
            <td className={`sticky left-0 z-30 w-[220px] min-w-[220px] p-0 border-r ${
                isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}>
                <div className="h-[52px] flex flex-col justify-center px-5">
                    <span className={`text-xs font-bold tracking-wide truncate pr-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>{row.student_name}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Verified Profile</span>
                </div>
            </td>

            {/* Reg. ID */}
            <td className={`sticky left-[220px] z-30 w-[130px] min-w-[130px] p-0 text-center border-r ${
                isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}>
                <div className="h-[52px] flex items-center justify-center px-2">
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border max-w-full truncate ${
                        isDarkMode ? 'text-slate-400 bg-white/5 border-white/10' : 'text-slate-600 bg-slate-100 border-slate-200'
                    }`}>
                        {row.enrollment_number}
                    </span>
                </div>
            </td>

            {/* Student Center */}
            <td className={`sticky left-[350px] z-30 w-[150px] min-w-[150px] p-0 text-center border-r ${
                isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}>
                <div className="h-[52px] flex items-center justify-center px-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border max-w-full truncate ${
                        isDarkMode ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-cyan-700 bg-cyan-50 border-cyan-200'
                    }`}>
                        {row.student_center || 'N/A'}
                    </span>
                </div>
            </td>

            {/* Question Matrix Cells */}
            {row.results.map((res, qIdx) => {
                const isLastInSection = sectionEndIndices.has(qIdx + 1);
                const styleClass = res === 'CA' ? STATUS_STYLES.CA :
                    res === 'IA' ? STATUS_STYLES.IA :
                    res === 'PA' ? STATUS_STYLES.PA :
                    (isDarkMode ? STATUS_STYLES.NA_DARK : STATUS_STYLES.NA_LIGHT);

                return (
                    <td 
                        key={qIdx} 
                        className={`w-[52px] min-w-[52px] max-w-[52px] p-0 text-center ${
                            isLastInSection 
                                ? (isDarkMode ? 'border-r-2 border-white/20' : 'border-r-2 border-slate-300') 
                                : (isDarkMode ? 'border-r border-white/5' : 'border-r border-slate-100')
                        }`}
                    >
                        <div className="h-[52px] flex items-center justify-center">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-[10px] ${styleClass}`}>
                                {res !== 'NA' ? res : ''}
                            </div>
                        </div>
                    </td>
                );
            })}
        </tr>
    );
});

const QuestionStudentAnalysis = ({ testId, testName, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [pageSize, setPageSize] = useState('50'); // '50' | '100' | 'All'
    const [currentPage, setCurrentPage] = useState(1);
    
    const tableContainerRef = useRef(null);
    const activeFetchKeysRef = useRef(new Set());

    useEffect(() => {
        const fetch = async () => {
            const fetchKey = `qs-analysis-${testId}`;
            if (activeFetchKeysRef.current.has(fetchKey)) return;

            setIsLoading(true);
            activeFetchKeysRef.current.add(fetchKey);
            try {
                const apiUrl = getApiUrl();
                const res = await axios.get(
                    `${apiUrl}/api/tests/${testId}/question_student_analysis/`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load analysis.');
            } finally {
                setIsLoading(false);
                activeFetchKeysRef.current.delete(fetchKey);
            }
        };
        fetch();
    }, [testId]);

    // Handle ESC key to exit fullscreen smoothly
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);

    // Table scrolling helpers
    const scrollTableHorizontal = useCallback((direction) => {
        if (tableContainerRef.current) {
            const amount = direction === 'left' ? -350 : 350;
            tableContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    }, []);

    const scrollToSection = useCallback((sectionIndex) => {
        if (!tableContainerRef.current || !data?.sections_info) return;
        let questionsBefore = 0;
        for (let i = 0; i < sectionIndex; i++) {
            questionsBefore += data.sections_info[i].count;
        }
        const targetScrollLeft = questionsBefore * 52;
        tableContainerRef.current.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }, [data?.sections_info]);

    const handleExport = useCallback(() => {
        if (!data) return;
        const csvRows = [];
        const headers = ['Student Name', 'Enrollment', 'Student Center', ...Array.from({ length: data.questions_count }, (_, i) => `Q${i + 1}`)];
        csvRows.push(headers.join(','));

        data.matrix.forEach(row => {
            const studentCenter = row.student_center || row.centre_name || row.centre_code || 'N/A';
            const values = [
                `"${(row.student_name || '').replace(/"/g, '""')}"`,
                `"${(row.enrollment_number || '').replace(/"/g, '""')}"`,
                `"${(studentCenter).replace(/"/g, '""')}"`,
                ...row.results
            ];
            csvRows.push(values.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Analysis_${data.test_name}.csv`;
        a.click();
    }, [data]);

    // Precalculate section break indices for O(1) checks
    const sectionEndIndices = useMemo(() => {
        const set = new Set();
        if (!data?.sections_info) return set;
        let currentTotal = 0;
        for (let sec of data.sections_info) {
            currentTotal += sec.count;
            set.add(currentTotal);
        }
        return set;
    }, [data?.sections_info]);

    const questionNumbers = useMemo(() => {
        return Array.from({ length: data?.questions_count || 0 }, (_, i) => i + 1);
    }, [data?.questions_count]);

    // Paginated / sliced matrix data for supercharged rendering performance
    const displayedMatrix = useMemo(() => {
        if (!data?.matrix) return [];
        if (pageSize === 'All') return data.matrix;
        const size = parseInt(pageSize, 10) || 50;
        const start = (currentPage - 1) * size;
        return data.matrix.slice(start, start + size);
    }, [data?.matrix, pageSize, currentPage]);

    const totalPages = useMemo(() => {
        if (!data?.matrix || pageSize === 'All') return 1;
        const size = parseInt(pageSize, 10) || 50;
        return Math.max(1, Math.ceil(data.matrix.length / size));
    }, [data?.matrix, pageSize]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={40} className="animate-spin text-green-500" />
            <p className="text-sm font-black uppercase tracking-widest opacity-60">Building Analysis Matrix...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={44} className="text-red-500" />
            <p className="font-black uppercase tracking-widest text-sm opacity-60">{error}</p>
            <button onClick={onBack} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-[5px] text-xs font-black uppercase">Go Back</button>
        </div>
    );

    const mainContent = (
        <div
            style={isFullscreen ? {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999999,
                margin: 0,
                borderRadius: 0,
            } : {}}
            className={`
                flex flex-col
                ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}
                ${isFullscreen
                    ? 'fixed inset-0 z-[99999999] w-screen h-screen m-0 p-0 rounded-none border-none shadow-none'
                    : 'relative rounded-3xl border border-slate-200 dark:border-white/10 h-[calc(100vh-140px)] min-h-[580px] shadow-2xl overflow-hidden'
                }
            `}
        >
            {/* Header */}
            <div className={`flex flex-wrap items-center justify-between px-6 py-3.5 border-b relative z-50 gap-4 ${
                isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
            }`}>
                <div className="flex items-center gap-4">
                    {!isFullscreen && (
                        <button
                            onClick={onBack}
                            className={`group flex items-center justify-center w-9 h-9 rounded-xl border transition-all active:scale-90 ${
                                isDarkMode ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                        >
                            <ArrowLeft size={17} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${
                                isDarkMode ? 'text-blue-400' : 'text-blue-600'
                            }`}>Performance Analysis</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                        <h2 className={`text-base md:text-lg font-bold tracking-tight truncate max-w-md lg:max-w-xl ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                        }`}>
                            {testName || data?.test_name}
                        </h2>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Compact Legend */}
                    <div className={`hidden lg:flex items-center gap-4 px-3.5 py-1.5 rounded-xl border ${
                        isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                    }`}>
                        {[
                            { label: 'CA', color: 'bg-emerald-500', title: 'Correct' },
                            { label: 'IA', color: 'bg-rose-500', title: 'Wrong' },
                            { label: 'PA', color: 'bg-amber-500', title: 'Partial' },
                            { label: 'NA', color: isDarkMode ? 'bg-slate-700' : 'bg-slate-200', title: 'Unattempted' }
                        ].map((l) => (
                            <div key={l.label} className="flex items-center gap-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                    <strong className={isDarkMode ? 'text-white mr-0.5' : 'text-slate-900 mr-0.5'}>{l.label}:</strong> {l.title}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Scroll Controls & Actions */}
                    <div className="flex items-center gap-2">
                        {/* Horizontal Scroll Buttons */}
                        <div className={`flex items-center p-0.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                            <button
                                onClick={() => scrollTableHorizontal('left')}
                                title="Scroll Questions Left"
                                className={`p-1.5 rounded-lg transition-all ${
                                    isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                }`}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => scrollTableHorizontal('right')}
                                title="Scroll Questions Right"
                                className={`p-1.5 rounded-lg transition-all ${
                                    isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                                }`}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Fullscreen Button */}
                        <button
                            onClick={toggleFullscreen}
                            className={`p-2 flex items-center justify-center rounded-xl transition-all border ${
                                isDarkMode ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                            title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                        </button>

                        {/* Export CSV Button */}
                        <button
                            onClick={handleExport}
                            className={`group flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-blue-500/20`}
                        >
                            <FileSpreadsheet size={14} />
                            <span>Export</span>
                        </button>

                        {/* Close/Back Button */}
                        <button
                            onClick={onBack}
                            title="Close Analysis"
                            className={`p-2 flex items-center justify-center rounded-xl transition-all border ${
                                isDarkMode ? 'hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border-white/10 hover:border-rose-500/20' : 'hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200 hover:border-rose-200'
                            }`}
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Section Navigator Bar */}
            {data?.sections_info && data.sections_info.length > 0 && (
                <div className={`px-6 py-2 border-b flex items-center gap-3 overflow-x-auto text-xs ${
                    isDarkMode ? 'bg-slate-950 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                        <Compass size={13} className="text-blue-500" />
                        <span>Jump to Section:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {data.sections_info.map((sec, sIdx) => (
                            <button
                                key={sIdx}
                                onClick={() => scrollToSection(sIdx)}
                                className={`px-3 py-0.5 rounded-lg text-[11px] font-bold transition-all shrink-0 border ${
                                    isDarkMode 
                                        ? 'bg-slate-800 hover:bg-blue-600 hover:text-white border-white/10 text-slate-300' 
                                        : 'bg-white hover:bg-blue-600 hover:text-white border-slate-200 text-slate-700 shadow-sm'
                                }`}
                            >
                                {sec.name} ({sec.count}Q)
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Matrix Table Container */}
            <div 
                ref={tableContainerRef}
                className={`flex-1 overflow-auto ${
                    isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                }`}
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: isDarkMode ? '#334155 #0f172a' : '#cbd5e1 #f8fafc'
                }}
            >
                <table className="min-w-max w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-40">
                        {/* Section Header Row */}
                        <tr className={isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}>
                            <th 
                                className={`sticky left-0 top-0 z-50 w-[220px] min-w-[220px] p-0 border-b border-r ${
                                    isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'
                                }`} 
                                rowSpan={2}
                            >
                                <div className="h-full flex items-center px-5 text-left">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`}>Student Identity</span>
                                </div>
                            </th>
                            <th 
                                className={`sticky left-[220px] top-0 z-50 w-[130px] min-w-[130px] p-0 border-b border-r ${
                                    isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'
                                }`} 
                                rowSpan={2}
                            >
                                <div className="h-full flex items-center justify-center">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`}>Reg. ID</span>
                                </div>
                            </th>
                            <th 
                                className={`sticky left-[350px] top-0 z-50 w-[150px] min-w-[150px] p-0 border-b border-r ${
                                    isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'
                                }`} 
                                rowSpan={2}
                            >
                                <div className="h-full flex items-center justify-center">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`}>Student Center</span>
                                </div>
                            </th>
                            {data?.sections_info?.map((sec, sIdx) => (
                                <th
                                    key={sIdx}
                                    colSpan={sec.count}
                                    className={`p-0 border-b ${
                                        isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'
                                    } ${sIdx !== data.sections_info.length - 1 ? (isDarkMode ? 'border-r-2 border-white/20' : 'border-r-2 border-slate-300') : ''}`}
                                >
                                    <div className="h-[34px] flex items-center justify-center">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${
                                            isDarkMode ? 'text-white/60' : 'text-slate-600'
                                        }`}>{sec.name}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                        {/* Question Number Row */}
                        <tr className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>
                            {questionNumbers.map((n) => {
                                const isLastInSection = sectionEndIndices.has(n);
                                return (
                                    <th
                                        key={n}
                                        className={`w-[52px] min-w-[52px] max-w-[52px] p-0 border-b ${
                                            isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200'
                                        } ${isLastInSection ? (isDarkMode ? 'border-r-2 border-white/20' : 'border-r-2 border-slate-300') : (isDarkMode ? 'border-r border-white/5' : 'border-r border-slate-100')}`}
                                    >
                                        <div className="h-[34px] flex items-center justify-center">
                                            <span className={`text-xs font-black ${
                                                isDarkMode ? 'text-white/90' : 'text-slate-700'
                                            }`}>{n}</span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedMatrix.map((row, idx) => (
                            <MatrixRow
                                key={row.enrollment_number || idx}
                                row={row}
                                isDarkMode={isDarkMode}
                                sectionEndIndices={sectionEndIndices}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary Bar with Pagination Controls */}
            <div className={`h-11 border-t flex flex-wrap items-center px-6 justify-between shrink-0 gap-3 ${
                isDarkMode ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>Dataset: Finalized</span>
                    </div>
                    <div className="w-px h-3 bg-slate-300 dark:bg-white/10" />
                    <span>Total Students: {data?.matrix?.length || 0}</span>
                    <div className="w-px h-3 bg-slate-300 dark:bg-white/10" />
                    <span>Questions: {data?.questions_count || 0}</span>
                </div>

                {/* Rows per page & Page Jump */}
                <div className="flex items-center gap-3 text-xs font-bold">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase">
                        <span className="opacity-60">Rows:</span>
                        {['50', '100', 'All'].map(size => (
                            <button
                                key={size}
                                onClick={() => {
                                    setPageSize(size);
                                    setCurrentPage(1);
                                }}
                                className={`px-2 py-0.5 rounded transition-all ${
                                    pageSize === size
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>

                    {pageSize !== 'All' && totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="px-2 py-0.5 rounded border disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                ‹ Prev
                            </button>
                            <span className="text-[10px] px-1 font-mono">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className="px-2 py-0.5 rounded border disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Next ›
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (isFullscreen && typeof document !== 'undefined') {
        return createPortal(mainContent, document.body);
    }

    return mainContent;
};

export default QuestionStudentAnalysis;
