import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
    ArrowLeft, 
    Loader2, 
    AlertCircle, 
    BookOpen, 
    CheckCircle2, 
    XCircle, 
    MinusCircle, 
    Clock, 
    FileText, 
    Filter, 
    ChevronDown, 
    Check, 
    X, 
    Search,
    RotateCcw,
    Building2,
    GraduationCap
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

// ────────────────────────────────────────────────────────────────────
// Clean batch name helper
// ────────────────────────────────────────────────────────────────────
const cleanBatch = (val) => {
    if (!val) return 'N/A';
    if (Array.isArray(val)) return val.join(', ') || 'N/A';
    let s = String(val).trim();
    if (s.startsWith('[') && s.endsWith(']')) {
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed.join(', ') || 'N/A';
        } catch (e) {
            // fallback
        }
        s = s.replace(/[\[\]"']/g, '').trim();
    }
    return s || 'N/A';
};

// ────────────────────────────────────────────────────────────────────
// Interactive SVG Pie Chart with Centre-wise & Batch-wise Hover Tooltip
// ────────────────────────────────────────────────────────────────────
const PieChart = ({ 
    data, 
    size = 150, 
    isDarkMode, 
    hoveredItem, 
    setHoveredItem 
}) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return (
        <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full border-4 border-dashed border-slate-300/30">
            <span className="text-[10px] font-black opacity-30 uppercase tracking-widest text-center">No<br />Data</span>
        </div>
    );

    let cumulative = 0;
    const radius = size / 2;
    const cx = radius;
    const cy = radius;
    const r = radius - 6;

    const slices = data.map(d => {
        const pct = total > 0 ? d.value / total : 0;
        const start = cumulative;
        cumulative += pct;
        return { ...d, start, end: cumulative, pct };
    }).filter(d => d.pct > 0);

    const polarToCartesian = (cx, cy, r, angle) => {
        const rad = (angle - 90) * (Math.PI / 180);
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };

    const arcPath = (cx, cy, r, startPct, endPct) => {
        const s = polarToCartesian(cx, cy, r, startPct * 360);
        const e = polarToCartesian(cx, cy, r, endPct * 360);
        const large = (endPct - startPct) > 0.5 ? 1 : 0;
        return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
    };

    const activeSlice = hoveredItem ? slices.find(s => s.label === hoveredItem.label) || hoveredItem : null;
    const [isPinned, setIsPinned] = useState(false);
    const containerRef = useRef(null);
    const closeTimeoutRef = useRef(null);

    const handleMouseEnter = (s) => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        setHoveredItem(s);
    };

    const handleMouseLeave = () => {
        if (isPinned) return;
        closeTimeoutRef.current = setTimeout(() => {
            setHoveredItem(null);
        }, 300); // 300ms bridge window allowing user to smoothly enter the popup
    };

    const handleCardMouseEnter = () => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };

    const togglePin = (s) => {
        if (isPinned && activeSlice?.label === s.label) {
            setIsPinned(false);
            setHoveredItem(null);
        } else {
            setIsPinned(true);
            setHoveredItem(s);
        }
    };

    const handleClose = (e) => {
        e.stopPropagation();
        setIsPinned(false);
        setHoveredItem(null);
    };

    return (
        <div 
            ref={containerRef}
            className="relative inline-flex items-center justify-center" 
            onMouseLeave={handleMouseLeave}
        >
            <svg 
                width={size} 
                height={size} 
                viewBox={`0 0 ${size} ${size}`}
                className="overflow-visible select-none"
            >
                {slices.map((s, i) => {
                    const isHovered = activeSlice?.label === s.label;
                    return (
                        <path
                            key={s.label || i}
                            d={arcPath(cx, cy, r, s.start, s.end)}
                            fill={s.color}
                            stroke={isHovered ? '#ffffff' : 'rgba(0,0,0,0.15)'}
                            strokeWidth={isHovered ? 2.5 : 1}
                            className="transition-all duration-200 cursor-pointer"
                            style={{
                                opacity: activeSlice ? (isHovered ? 1 : 0.35) : 1,
                                transformOrigin: `${cx}px ${cy}px`,
                                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                            }}
                            onMouseEnter={() => handleMouseEnter(s)}
                            onClick={() => togglePin(s)}
                        />
                    );
                })}
                {/* Center hole for donut aesthetic */}
                <circle 
                    cx={cx} 
                    cy={cy} 
                    r={r * 0.42} 
                    fill={isDarkMode ? '#10141D' : '#ffffff'} 
                    stroke="rgba(0,0,0,0.08)" 
                    strokeWidth={1} 
                    className="pointer-events-none"
                />
            </svg>

            {/* Fully Scrollable & Interactive Breakdown Card (Anchored to the left of the Pie Chart) */}
            {activeSlice && (activeSlice.value > 0) && (
                <div 
                    onMouseEnter={handleCardMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className={`absolute right-full mr-3.5 top-1/2 -translate-y-1/2 z-50 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl w-72 pointer-events-auto animate-in fade-in zoom-in-95 duration-150 ${
                        isDarkMode 
                            ? 'bg-slate-900/95 border-white/20 text-white shadow-black/90' 
                            : 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl'
                    }`}
                >
                    {/* Tooltip Header with Pin/Close Controls */}
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-white/10 mb-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: activeSlice.color }} />
                        <span className="text-[11px] font-black uppercase tracking-wider truncate">{activeSlice.label}</span>
                        <span className="text-xs font-black ml-auto text-emerald-500 dark:text-emerald-400">
                            {activeSlice.value} <span className="text-[10px] font-bold opacity-60">({((activeSlice.value / total) * 100).toFixed(1)}%)</span>
                        </span>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-all ml-1"
                            title="Close"
                        >
                            <X size={12} />
                        </button>
                    </div>

                    {/* Centre-wise Breakdown (Scrollable) */}
                    <div className="space-y-1 mb-2.5">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-blue-500 dark:text-blue-400">
                            <span className="flex items-center gap-1">
                                <Building2 size={10} />
                                <span>Centre-wise</span>
                            </span>
                            <span className="opacity-60 text-[8px]">
                                {Object.keys(activeSlice.byCentre || {}).length} centres
                            </span>
                        </div>
                        {activeSlice.byCentre && Object.keys(activeSlice.byCentre).length > 0 ? (
                            <div 
                                className="max-h-32 overflow-y-auto space-y-1 pr-1.5 overscroll-contain" 
                                style={{ scrollbarWidth: 'thin' }}
                            >
                                {Object.entries(activeSlice.byCentre).map(([centre, count]) => (
                                    <div key={centre} className={`flex items-center justify-between text-[10px] font-bold px-2 py-1 rounded-lg ${
                                        isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
                                    }`}>
                                        <span className="truncate opacity-90 max-w-[170px]">{centre}</span>
                                        <span className="font-mono font-black ml-2 px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-500 dark:text-blue-400 shrink-0">
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[9px] opacity-40 italic">No centre data</p>
                        )}
                    </div>

                    {/* Batch-wise Breakdown (Scrollable) */}
                    <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-white/10">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                            <span className="flex items-center gap-1">
                                <GraduationCap size={10} />
                                <span>Batch-wise</span>
                            </span>
                            <span className="opacity-60 text-[8px]">
                                {Object.keys(activeSlice.byBatch || {}).length} batches
                            </span>
                        </div>
                        {activeSlice.byBatch && Object.keys(activeSlice.byBatch).length > 0 ? (
                            <div 
                                className="max-h-32 overflow-y-auto space-y-1 pr-1.5 overscroll-contain" 
                                style={{ scrollbarWidth: 'thin' }}
                            >
                                {Object.entries(activeSlice.byBatch).map(([batch, count]) => (
                                    <div key={batch} className={`flex items-center justify-between text-[10px] font-bold px-2 py-1 rounded-lg ${
                                        isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
                                    }`}>
                                        <span className="truncate opacity-90 max-w-[170px]">{batch}</span>
                                        <span className="font-mono font-black ml-2 px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 shrink-0">
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[9px] opacity-40 italic">No batch data</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────
// Horizontal bar (for compact counts)
// ────────────────────────────────────────────────────────────────────
const Bar = ({ value, total, color }) => {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[9px] font-black w-7 text-right opacity-70">{pct.toFixed(0)}%</span>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────
// Multi-Select Dropdown Component
// ────────────────────────────────────────────────────────────────────
const MultiSelectDropdown = ({ 
    label, 
    icon: Icon, 
    options = [], 
    selectedValues = [], 
    onChange, 
    isDarkMode 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const pluralLabel = label === 'Batch' ? 'Batches' : `${label}s`;

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm]);

    const isAllSelected = options.length > 0 && selectedValues.length === options.length;

    const toggleOption = (val) => {
        if (selectedValues.includes(val)) {
            onChange(selectedValues.filter(item => item !== val));
        } else {
            onChange([...selectedValues, val]);
        }
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            onChange([]);
        } else {
            onChange([...options]);
        }
    };

    const handleClear = () => {
        onChange([]);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                    selectedValues.length > 0
                        ? (isDarkMode ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700')
                        : (isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')
                }`}
            >
                {Icon && <Icon size={12} className={selectedValues.length > 0 ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : 'opacity-50'} />}
                <span className="truncate max-w-[100px] sm:max-w-[130px]">
                    {selectedValues.length === 0
                        ? `All ${pluralLabel}`
                        : `${label}: ${selectedValues.length}`}
                </span>
                {selectedValues.length > 0 && (
                    <span className={`px-1 py-0.1 rounded-full text-[9px] font-black ${
                        isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'
                    }`}>
                        {selectedValues.length}
                    </span>
                )}
                <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`absolute top-full right-0 mt-1 w-64 rounded-xl border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
                    isDarkMode ? 'bg-slate-900 border-white/15 shadow-black/80' : 'bg-white border-slate-200 shadow-xl'
                }`}>
                    {/* Search & Actions Header */}
                    <div className={`p-2.5 border-b space-y-1.5 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40" />
                            <input
                                type="text"
                                placeholder={`Search ${label}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-7 pr-2 py-1 rounded-md text-xs font-bold outline-none border transition-all ${
                                    isDarkMode ? 'bg-slate-800 border-white/10 text-white placeholder-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                                }`}
                            />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold px-1">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className={`hover:underline transition-all ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                            >
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                            </button>
                            {selectedValues.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="text-rose-500 hover:underline transition-all"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-48 overflow-y-auto p-1 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
                        {filteredOptions.length === 0 ? (
                            <div className="py-4 text-center text-xs opacity-40 font-bold">
                                No {label} found
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = selectedValues.includes(opt);
                                return (
                                    <div
                                        key={opt}
                                        onClick={() => toggleOption(opt)}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                            isSelected
                                                ? (isDarkMode ? 'bg-blue-600/20 text-blue-300' : 'bg-blue-50 text-blue-700')
                                                : (isDarkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-100')
                                        }`}
                                    >
                                        <span className="truncate pr-2">{opt}</span>
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                            isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : (isDarkMode ? 'border-white/20 bg-slate-800' : 'border-slate-300 bg-white')
                                        }`}>
                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────
// Individual Question Card with Dedicated Filters
// ────────────────────────────────────────────────────────────────────
const QuestionCard = ({
    q,
    qi,
    sectionName,
    availableCentres,
    availableBatches,
    isDarkMode,
    pieColors
}) => {
    // Per-question multi-select filter state
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [hoveredSlice, setHoveredSlice] = useState(null);

    // 1. Dynamically calculate available centres based on the selected batch(es)
    const dynamicAvailableCentres = useMemo(() => {
        const results = q.student_results || [];
        if (!results.length) {
            return (availableCentres || []).filter(c => c && c !== 'N/A');
        }

        const reqBatches = selectedBatches.map(b => b.trim().toLowerCase());
        const centresSet = new Set();

        for (let item of results) {
            const cVal = (item.c || '').trim();
            const bVal = cleanBatch(item.b).trim().toLowerCase();

            if (reqBatches.length > 0 && !reqBatches.includes(bVal)) {
                continue;
            }
            if (cVal && cVal !== 'N/A' && cVal !== 'None' && cVal !== 'null') {
                centresSet.add(cVal);
            }
        }

        if (centresSet.size === 0 && selectedBatches.length === 0) {
            return (availableCentres || []).filter(c => c && c !== 'N/A');
        }

        return Array.from(centresSet).sort();
    }, [q.student_results, selectedBatches, availableCentres]);

    // 2. Dynamically calculate available batches based on the selected centre(s)
    const dynamicAvailableBatches = useMemo(() => {
        const results = q.student_results || [];
        if (!results.length) {
            return (availableBatches || []).map(cleanBatch).filter(b => b && b !== 'N/A');
        }

        const reqCentres = selectedCentres.map(c => c.trim().toLowerCase());
        const batchesSet = new Set();

        for (let item of results) {
            const cVal = (item.c || 'N/A').trim().toLowerCase();
            const bVal = cleanBatch(item.b).trim();

            if (reqCentres.length > 0 && !reqCentres.includes(cVal)) {
                continue;
            }
            if (bVal && bVal !== 'N/A' && bVal !== 'None' && bVal !== 'null') {
                batchesSet.add(bVal);
            }
        }

        if (batchesSet.size === 0 && selectedCentres.length === 0) {
            return (availableBatches || []).map(cleanBatch).filter(b => b && b !== 'N/A');
        }

        return Array.from(batchesSet).sort();
    }, [q.student_results, selectedCentres, availableBatches]);

    // Automatically remove selected centres that are no longer present in the newly selected batch(es)
    useEffect(() => {
        if (selectedCentres.length > 0 && dynamicAvailableCentres.length > 0) {
            const validSelected = selectedCentres.filter(c => dynamicAvailableCentres.includes(c));
            if (validSelected.length !== selectedCentres.length) {
                setSelectedCentres(validSelected);
            }
        }
    }, [dynamicAvailableCentres, selectedCentres]);

    // Automatically remove selected batches that are no longer present in the newly selected centre(s)
    useEffect(() => {
        if (selectedBatches.length > 0 && dynamicAvailableBatches.length > 0) {
            const validSelected = selectedBatches.filter(b => dynamicAvailableBatches.includes(b));
            if (validSelected.length !== selectedBatches.length) {
                setSelectedBatches(validSelected);
            }
        }
    }, [dynamicAvailableBatches, selectedBatches]);

    // Calculate dynamic stats + Centre-wise & Batch-wise breakdowns for hover tooltip
    const computedStats = useMemo(() => {
        const results = q.student_results || [];
        const reqCentres = selectedCentres.map(c => c.trim().toLowerCase());
        const reqBatches = selectedBatches.map(b => b.trim().toLowerCase());

        const statusDetails = {
            CA: { count: 0, byCentre: {}, byBatch: {} },
            IA: { count: 0, byCentre: {}, byBatch: {} },
            PA: { count: 0, byCentre: {}, byBatch: {} },
            NA: { count: 0, byCentre: {}, byBatch: {} },
        };

        let total = 0;

        for (let item of results) {
            const cVal = (item.c || 'N/A').trim();
            const bVal = cleanBatch(item.b).trim();

            const cLower = cVal.toLowerCase();
            const bLower = bVal.toLowerCase();

            if (reqCentres.length > 0 && !reqCentres.includes(cLower)) continue;
            if (reqBatches.length > 0 && !reqBatches.includes(bLower)) continue;

            total++;
            const s = item.s || 'NA';
            const target = statusDetails[s] || statusDetails.NA;
            target.count++;
            
            const centreKey = (cVal && cVal !== 'N/A' && cVal !== 'None' && cVal !== 'null') ? cVal : 'Unassigned Centre';
            const batchKey = (bVal && bVal !== 'N/A' && bVal !== 'None' && bVal !== 'null') ? bVal : 'Unassigned Batch';

            target.byCentre[centreKey] = (target.byCentre[centreKey] || 0) + 1;
            target.byBatch[batchKey] = (target.byBatch[batchKey] || 0) + 1;
        }

        return {
            total,
            CA: statusDetails.CA,
            IA: statusDetails.IA,
            PA: statusDetails.PA,
            NA: statusDetails.NA,
        };
    }, [q, selectedCentres, selectedBatches]);

    const pieData = useMemo(() => [
        { 
            label: 'Correct Attempt', 
            value: computedStats.CA.count, 
            byCentre: computedStats.CA.byCentre, 
            byBatch: computedStats.CA.byBatch, 
            color: pieColors.correct 
        },
        { 
            label: 'Incorrect Attempt', 
            value: computedStats.IA.count, 
            byCentre: computedStats.IA.byCentre, 
            byBatch: computedStats.IA.byBatch, 
            color: pieColors.incorrect 
        },
        { 
            label: 'Partial Attempt', 
            value: computedStats.PA.count, 
            byCentre: computedStats.PA.byCentre, 
            byBatch: computedStats.PA.byBatch, 
            color: pieColors.partial 
        },
        { 
            label: 'Not Attempt', 
            value: computedStats.NA.count, 
            byCentre: computedStats.NA.byCentre, 
            byBatch: computedStats.NA.byBatch, 
            color: pieColors.not_attempted 
        },
    ], [computedStats, pieColors]);

    const attended = computedStats.total - computedStats.NA.count;
    const pctAttended = computedStats.total > 0 ? ((attended / computedStats.total) * 100).toFixed(1) : 0;
    const hasActiveFilters = selectedCentres.length > 0 || selectedBatches.length > 0;

    const handleReset = () => {
        setSelectedCentres([]);
        setSelectedBatches([]);
    };

    return (
        <div className={`rounded-2xl border relative shadow-lg transition-all hover:shadow-xl ${
            isDarkMode ? 'bg-[#10141D] border-white/10 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-100'
        }`}>
            {/* Question Header Strip with Filters Right Inside */}
            <div className={`px-6 py-3.5 border-b flex items-center justify-between flex-wrap gap-3 ${
                isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/80 border-slate-200'
            }`}>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500">
                        Question No: {qi + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                        {sectionName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                        isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                        {q.type.replace('_', ' ')}
                    </span>
                </div>

                {/* Per-Question Filter Controls */}
                <div className="flex items-center gap-2 flex-wrap ml-auto">
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider opacity-60">
                        <Filter size={11} className="text-blue-500" />
                        <span>Filter:</span>
                    </div>

                    {/* Centre Filter - Dynamically populated according to selected Batch(es) */}
                    <MultiSelectDropdown
                        label="Centre"
                        icon={Building2}
                        options={dynamicAvailableCentres}
                        selectedValues={selectedCentres}
                        onChange={setSelectedCentres}
                        isDarkMode={isDarkMode}
                    />

                    {/* Batch Filter - Dynamically populated according to selected Centre(s) */}
                    <MultiSelectDropdown
                        label="Batch"
                        icon={GraduationCap}
                        options={dynamicAvailableBatches}
                        selectedValues={selectedBatches}
                        onChange={setSelectedBatches}
                        isDarkMode={isDarkMode}
                    />

                    {/* Reset Question Filter */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleReset}
                            title="Reset this question's filters"
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all border border-rose-500/20"
                        >
                            <RotateCcw size={13} />
                        </button>
                    )}

                    {/* Marks & Attendance Badge */}
                    <div className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-widest pl-2 border-l border-slate-300 dark:border-white/10">
                        <span className="text-emerald-400">+{q.correct_marks} Max</span>
                        <span className="text-rose-400">-{q.negative_marks} Neg</span>
                        <span className="opacity-70 font-mono">{pctAttended}% Attended</span>
                    </div>
                </div>
            </div>

            {/* Sub-bar showing selected centres / batches and total students */}
            {hasActiveFilters && (
                <div className={`px-6 py-2.5 border-b flex items-center justify-between flex-wrap gap-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200 ${
                    isDarkMode ? 'bg-slate-900/60 border-white/5' : 'bg-blue-50/40 border-blue-100'
                }`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-60 mr-1">Active:</span>
                        {selectedCentres.map(c => (
                            <span
                                key={`c-${c}`}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                                    isDarkMode ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' : 'bg-white border-blue-200 text-blue-700 shadow-xs'
                                }`}
                            >
                                <Building2 size={10} className="opacity-60" />
                                <span>Centre: {c}</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCentres(selectedCentres.filter(item => item !== c))}
                                    className="hover:text-rose-500 transition-colors ml-0.5"
                                >
                                    <X size={11} />
                                </button>
                            </span>
                        ))}
                        {selectedBatches.map(b => (
                            <span
                                key={`b-${b}`}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                                    isDarkMode ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-white border-indigo-200 text-indigo-700 shadow-xs'
                                }`}
                            >
                                <GraduationCap size={10} className="opacity-60" />
                                <span>Batch: {b}</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedBatches(selectedBatches.filter(item => item !== b))}
                                    className="hover:text-rose-500 transition-colors ml-0.5"
                                >
                                    <X size={11} />
                                </button>
                            </span>
                        ))}
                    </div>

                    {/* Total Students count for this question filter */}
                    <div className="flex items-center gap-2.5">
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                            isDarkMode ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                        }`}>
                            <span className="opacity-70">Total Students:</span>
                            <span className="text-xs font-black">{computedStats.total}</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-[10px] font-bold text-rose-500 hover:underline px-1"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Content + Chart Row */}
            <div className="flex flex-col lg:flex-row gap-0">
                {/* Left Side: Question content & options */}
                <div className={`flex-1 px-6 py-5 border-r ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                    <div
                        className={`text-sm leading-relaxed font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} [&_img]:max-w-xs [&_img]:rounded`}
                        dangerouslySetInnerHTML={{ __html: q.content || '<span class="opacity-30 italic">No question text</span>' }}
                    />

                    {/* Options (for Choice questions) */}
                    {q.options && q.options.length > 0 && (
                        <div className="mt-7 space-y-3.5">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-500/20 to-transparent" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 whitespace-nowrap">Options</span>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-500/20 to-transparent" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {q.options.map((opt, idx) => (
                                    <div
                                        key={opt.id}
                                        className={`group flex items-start gap-3.5 p-3.5 rounded-xl border transition-all duration-200 ${opt.isCorrect
                                            ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200 shadow-sm')
                                            : (isDarkMode ? 'bg-white/2 border-white/5 hover:bg-white/5' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50')
                                        }`}
                                    >
                                        <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border transition-all ${opt.isCorrect
                                            ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                                            : (isDarkMode ? 'bg-white/5 border-white/10 opacity-40' : 'bg-white border-slate-200 opacity-50')
                                        }`}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <div className="flex-1">
                                            <div
                                                className={`text-xs font-bold leading-relaxed ${opt.isCorrect ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-700') : (isDarkMode ? 'text-slate-400' : 'text-slate-600')}`}
                                                dangerouslySetInnerHTML={{ __html: opt.content }}
                                            />
                                        </div>
                                        {opt.isCorrect && (
                                            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-500 shrink-0">
                                                <CheckCircle2 size={13} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Solution / Explanation */}
                    {q.solution && (
                        <div className="mt-6 pt-6 border-t border-dashed border-slate-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                                    <FileText size={14} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Explanation / Solution</span>
                            </div>
                            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50/50 border-amber-100'}`}>
                                <div
                                    className={`text-xs leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} [&_img]:max-w-xs [&_img]:rounded`}
                                    dangerouslySetInnerHTML={{ __html: q.solution }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Numerical/Integer Answer */}
                    {(q.type === 'NUMERICAL' || q.type === 'INTEGER_TYPE') && q.answer_from !== null && (
                        <div className="mt-6 pt-6 border-t border-dashed border-slate-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Clock size={14} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Correct Answer Range</span>
                            </div>
                            <div className={`p-4 rounded-xl border flex items-center justify-between ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                                <p className="text-lg font-black text-blue-500">
                                    {q.answer_from} <span className="text-xs font-bold opacity-40 mx-2">to</span> {q.answer_to}
                                </p>
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white text-blue-600 border border-blue-100'}`}>
                                    Numerical Key
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Pie Chart + Filtered Breakdown */}
                <div className="lg:w-80 shrink-0 px-6 py-5 flex flex-col items-center justify-center gap-4">
                    <PieChart 
                        data={pieData} 
                        size={150} 
                        isDarkMode={isDarkMode} 
                        hoveredItem={hoveredSlice} 
                        setHoveredItem={setHoveredSlice} 
                    />

                    {/* Breakdown list with bidirectional hover trigger */}
                    <div className="w-full space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-1">
                            <span className="opacity-50">
                                {hasActiveFilters ? `Filtered (${computedStats.total})` : 'Breakdown'}
                            </span>
                            <span className="opacity-50 font-mono">Count</span>
                        </div>
                        {[
                            { 
                                label: 'Correct', 
                                sliceLabel: 'Correct Attempt', 
                                value: computedStats.CA.count, 
                                byCentre: computedStats.CA.byCentre, 
                                byBatch: computedStats.CA.byBatch, 
                                color: pieColors.correct, 
                                bg: isDarkMode ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100' 
                            },
                            { 
                                label: 'Incorrect', 
                                sliceLabel: 'Incorrect Attempt', 
                                value: computedStats.IA.count, 
                                byCentre: computedStats.IA.byCentre, 
                                byBatch: computedStats.IA.byBatch, 
                                color: pieColors.incorrect, 
                                bg: isDarkMode ? 'bg-rose-500/5 border-rose-500/10' : 'bg-rose-50 border-rose-100' 
                            },
                            { 
                                label: 'Partial', 
                                sliceLabel: 'Partial Attempt', 
                                value: computedStats.PA.count, 
                                byCentre: computedStats.PA.byCentre, 
                                byBatch: computedStats.PA.byBatch, 
                                color: pieColors.partial, 
                                bg: isDarkMode ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50 border-amber-100' 
                            },
                            { 
                                label: 'Not Attempted', 
                                sliceLabel: 'Not Attempt', 
                                value: computedStats.NA.count, 
                                byCentre: computedStats.NA.byCentre, 
                                byBatch: computedStats.NA.byBatch, 
                                color: pieColors.not_attempted, 
                                bg: isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100' 
                            },
                        ].map(item => {
                            const isHovered = hoveredSlice?.label === item.sliceLabel;
                            return (
                                <div 
                                    key={item.label} 
                                    onMouseEnter={() => setHoveredSlice({ 
                                        label: item.sliceLabel, 
                                        value: item.value, 
                                        byCentre: item.byCentre, 
                                        byBatch: item.byBatch, 
                                        color: item.color 
                                    })}
                                    onMouseLeave={() => setHoveredSlice(null)}
                                    className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${item.bg} ${
                                        isHovered ? (isDarkMode ? 'ring-2 ring-blue-400 bg-white/10' : 'ring-2 ring-blue-500 bg-blue-50/80') : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                                            <span className="text-[9px] font-black uppercase tracking-wider opacity-80">{item.label}</span>
                                        </div>
                                        <span className="text-xs font-black">{item.value}</span>
                                    </div>
                                    <Bar value={item.value} total={computedStats.total} color={item.color} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────
const QuestionAnalysis = ({ testId, testName, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState(0);

    const activeFetchKeysRef = useRef(new Set());

    useEffect(() => {
        const fetch = async () => {
            const fetchKey = `q-analysis-${testId}`;
            if (activeFetchKeysRef.current.has(fetchKey)) return;

            setIsLoading(true);
            setError(null);
            activeFetchKeysRef.current.add(fetchKey);
            try {
                const apiUrl = getApiUrl();
                const res = await axios.get(
                    `${apiUrl}/api/tests/${testId}/question_analysis/`,
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

    const PIE_COLORS = {
        correct: '#10b981',
        incorrect: '#f43f5e',
        partial: '#f59e0b',
        not_attempted: '#94a3b8',
    };

    // ── Loading ──────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-8">
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={`p-2.5 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><ArrowLeft size={18} /></button>
                    <div>
                        <h2 className="text-2xl font-black uppercase">Question <span className="text-emerald-500">Analysis</span></h2>
                        <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{testName}</p>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-center gap-4 py-24 opacity-60">
                <Loader2 size={40} className="animate-spin text-emerald-500" />
                <p className="text-sm font-black uppercase tracking-widest">Computing question statistics...</p>
            </div>
        </div>
    );

    // ── Error ────────────────────────────────────────────────────────
    if (error) return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-8">
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={`p-2.5 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><ArrowLeft size={18} /></button>
                    <h2 className="text-2xl font-black uppercase">Question <span className="text-emerald-500">Analysis</span></h2>
                </div>
            </div>
            <div className="flex flex-col items-center gap-3 py-20 opacity-60">
                <AlertCircle size={44} className="text-red-500" />
                <p className="font-black uppercase tracking-widest text-sm">{error}</p>
            </div>
        </div>
    );

    const sections = data?.sections || [];
    const currentSection = sections[activeSection] || {};
    const questions = currentSection.questions || [];
    const totalStudents = data?.total_attempted ?? (questions[0]?.total ?? 0);
    const availableCentres = data?.available_centres || [];
    const availableBatches = data?.available_batches || [];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">

            {/* ── Top Header (Clean Test Header) ────────────────── */}
            <div className={`p-8 rounded-2xl border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                                isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-900 hover:text-white'
                            }`}
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                Question <span className="text-emerald-500">Analysis</span>
                            </h2>
                            <p className={`text-xs font-bold mt-1 uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {data.test_name} &nbsp;·&nbsp; ({data.test_code}) &nbsp;·&nbsp; {data.duration} mins
                            </p>
                        </div>
                    </div>

                    {/* Overall stats bar */}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-wider">
                        <div className={`px-4 py-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="opacity-50">Total Attempted</span>&nbsp;
                            <span className="text-sm font-black text-emerald-500">{totalStudents}</span>
                        </div>
                        <div className={`px-4 py-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="opacity-50">Questions</span>&nbsp;
                            <span className="text-sm font-black">{questions.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Section Tabs ────────────────────────────────────── */}
            {sections.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {sections.map((sec, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveSection(i)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeSection === i
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                : (isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50')
                                }`}
                        >
                            {sec.name}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Legend ─────────────────────────────────────────── */}
            <div className={`p-4 rounded-xl border flex flex-wrap items-center gap-5 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>
                {[
                    { label: 'Correct Attempt', color: PIE_COLORS.correct },
                    { label: 'Incorrect Attempt', color: PIE_COLORS.incorrect },
                    { label: 'Partial Attempt', color: PIE_COLORS.partial },
                    { label: 'Not Attempt', color: PIE_COLORS.not_attempted },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-70">{item.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Question Cards with Per-Question Centre and Dynamic Batch Filters ──── */}
            {questions.length === 0 ? (
                <div className={`p-16 rounded-2xl border text-center ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className="opacity-20 flex flex-col items-center gap-3">
                        <BookOpen size={48} />
                        <p className="text-sm font-black uppercase tracking-[0.2em]">No Questions Found</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    {questions.map((q, qi) => (
                        <QuestionCard
                            key={q.id}
                            q={q}
                            qi={qi}
                            sectionName={currentSection.name}
                            availableCentres={availableCentres}
                            availableBatches={availableBatches}
                            isDarkMode={isDarkMode}
                            pieColors={PIE_COLORS}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuestionAnalysis;
