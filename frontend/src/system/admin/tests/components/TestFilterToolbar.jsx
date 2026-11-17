import React, { useMemo } from 'react';
import Select from 'react-select';
import { Search, X, RotateCcw, SlidersHorizontal, Filter, Calendar, CalendarDays } from 'lucide-react';

export const TestFilterToolbar = ({
    searchTerm,
    setSearchTerm,
    startDate = '',
    setStartDate = null,
    endDate = '',
    setEndDate = null,
    dateFilterType = 'any',
    setDateFilterType = null,
    applyDatePreset = null,
    formatDateDisplay = null,
    showDateFilter = true,
    sessionOptions = [],
    selectedSessions = [],
    setSelectedSessions,
    targetExamOptions = [],
    selectedTargetExams = [],
    setSelectedTargetExams,
    classLevelOptions = [],
    selectedClassLevels = [],
    setSelectedClassLevels,
    centreOptions = [],
    selectedCentres = [],
    setSelectedCentres,
    statusOptions = null,
    selectedStatus = null,
    setSelectedStatus = null,
    completionOptions = [],
    selectedCompletion,
    setSelectedCompletion,
    activeFiltersCount = 0,
    onClearAll,
    totalCount = 0,
    filteredCount = 0,
    isDarkMode = false,
    headerTitle = "Filters & Sorting",
    headerSubtitle = "Refine tests by session, target exam, class, centres, or state",
    customActions = null,
}) => {
    const customSelectStyles = useMemo(() => ({
        control: (provided, state) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#10141D' : '#ffffff',
            borderColor: state.isFocused 
                ? (isDarkMode ? '#3b82f6' : '#2563eb') 
                : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
            borderRadius: '5px',
            padding: '1px 2px',
            minHeight: '38px',
            boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
            '&:hover': {
                borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
            },
            cursor: 'pointer',
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#10141D' : '#ffffff',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            borderRadius: '5px',
            zIndex: 9999,
        }),
        menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
        menuList: (provided) => ({
            ...provided,
            padding: '4px',
            maxHeight: '220px',
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
                ? (isDarkMode ? '#2563eb' : '#3b82f6')
                : state.isFocused
                    ? (isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9')
                    : 'transparent',
            color: state.isSelected
                ? '#ffffff'
                : (isDarkMode ? '#f1f5f9' : '#1e293b'),
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: '4px',
            padding: '8px 12px',
            margin: '2px 0',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: isDarkMode ? '#1d4ed8' : '#2563eb',
                color: '#fff',
            }
        }),
        placeholder: (provided) => ({
            ...provided,
            color: isDarkMode ? '#94a3b8' : '#64748b',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDarkMode ? '#f8fafc' : '#0f172a',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
            border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe',
            borderRadius: '4px',
            margin: '2px',
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: isDarkMode ? '#93c5fd' : '#1d4ed8',
            fontSize: '10px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '2px 6px',
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: isDarkMode ? '#93c5fd' : '#1d4ed8',
            cursor: 'pointer',
            ':hover': {
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
                color: '#ef4444',
            },
        }),
        input: (provided) => ({
            ...provided,
            color: isDarkMode ? '#f8fafc' : '#0f172a',
            fontSize: '11px',
            fontWeight: '700',
        }),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (provided) => ({
            ...provided,
            color: isDarkMode ? '#64748b' : '#94a3b8',
            padding: '4px',
            ':hover': {
                color: isDarkMode ? '#f8fafc' : '#0f172a',
            }
        }),
        clearIndicator: (provided) => ({
            ...provided,
            color: isDarkMode ? '#64748b' : '#94a3b8',
            padding: '4px',
            ':hover': {
                color: '#ef4444',
            }
        }),
    }), [isDarkMode]);

    const hasDateFilterRow = Boolean(showDateFilter && setStartDate);

    const gridColsClass = hasDateFilterRow
        ? (statusOptions
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5")
        : (statusOptions 
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6");

    return (
        <div className={`p-6 rounded-[5px] border shadow-xl mb-6 transition-all ${
            isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'
        }`}>
            {/* Header / Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                        <Filter size={18} />
                    </div>
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {headerTitle}
                        </h3>
                        <p className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {headerSubtitle}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={onClearAll}
                            className={`px-4 py-2.5 rounded-[5px] border text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                isDarkMode
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                    : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                            }`}
                            title="Reset all applied filters"
                        >
                            <RotateCcw size={14} /> Clear Filters ({activeFiltersCount})
                        </button>
                    )}

                    {customActions}
                </div>
            </div>

            {/* Primary Search & Date Range Toolbar (When Date Filter Enabled) */}
            {hasDateFilterRow && (
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-lg">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 z-10" size={15} />
                        <input
                            type="text"
                            placeholder="Search name / code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-8 py-2 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-2 h-[38px] ${
                                isDarkMode 
                                    ? 'bg-[#10141D] border-white/10 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-500' 
                                    : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/10 placeholder:text-slate-400 shadow-sm'
                            }`}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Date Range Filter Controls */}
                    <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-[5px] border transition-all ${
                        startDate || endDate 
                            ? (isDarkMode ? 'bg-orange-500/5 border-orange-500/30' : 'bg-orange-50/60 border-orange-200')
                            : (isDarkMode ? 'bg-[#0B0F17] border-white/10' : 'bg-slate-50 border-slate-200')
                    }`}>
                        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-500">
                            <Calendar size={14} />
                            <span className="hidden sm:inline">Date Range:</span>
                        </div>

                        {/* From Date */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">From</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`px-2 py-1 rounded-[4px] border text-xs font-bold outline-none transition-all h-[32px] ${
                                    isDarkMode
                                        ? 'bg-[#10141D] border-white/10 text-white focus:border-orange-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-orange-500 shadow-sm'
                                }`}
                                title="From Date"
                            />
                        </div>

                        {/* To Date */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">To</span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => setEndDate && setEndDate(e.target.value)}
                                className={`px-2 py-1 rounded-[4px] border text-xs font-bold outline-none transition-all h-[32px] ${
                                    isDarkMode
                                        ? 'bg-[#10141D] border-white/10 text-white focus:border-orange-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:border-orange-500 shadow-sm'
                                }`}
                                title="To Date"
                            />
                        </div>

                        {/* Date Filter Target Selector */}
                        {setDateFilterType && (
                            <select
                                value={dateFilterType}
                                onChange={(e) => setDateFilterType(e.target.value)}
                                className={`px-2 py-1 rounded-[4px] border text-[10px] font-black uppercase outline-none cursor-pointer h-[32px] ${
                                    isDarkMode
                                        ? 'bg-[#10141D] border-white/10 text-slate-300 focus:border-orange-500'
                                        : 'bg-white border-slate-200 text-slate-700 focus:border-orange-500 shadow-sm'
                                }`}
                                title="Filter target: Schedule date, created date, or both"
                            >
                                <option value="any">Schedule / Created</option>
                                <option value="schedule">Schedule Date</option>
                                <option value="created">Created Date</option>
                            </select>
                        )}

                        {/* Quick Presets */}
                        {applyDatePreset && (
                            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => applyDatePreset('today')}
                                    className={`px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider transition-all ${
                                        isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyDatePreset('week')}
                                    className={`px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider transition-all ${
                                        isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                >
                                    Week
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyDatePreset('month')}
                                    className={`px-2 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-wider transition-all ${
                                        isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                >
                                    Month
                                </button>

                                {(startDate || endDate) && (
                                    <button
                                        type="button"
                                        onClick={() => { setStartDate(''); if (setEndDate) setEndDate(''); }}
                                        className="p-1 rounded-[4px] text-rose-500 hover:bg-rose-500/10 transition-all"
                                        title="Clear Date Range"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Filter Dropdowns Grid */}
            <div className={`grid ${gridColsClass} gap-3 ${hasDateFilterRow ? "pt-3" : "pt-4 border-t border-dashed border-slate-200 dark:border-white/10"}`}>
                {/* Search Input (only when no date filter row) */}
                {!hasDateFilterRow && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 z-10" size={15} />
                        <input
                            type="text"
                            placeholder="Search name / code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-8 py-2 rounded-[5px] border text-xs font-bold outline-none transition-all focus:ring-2 h-[38px] ${
                                isDarkMode 
                                    ? 'bg-[#10141D] border-white/10 text-white focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-500' 
                                    : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/10 placeholder:text-slate-400 shadow-sm'
                            }`}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Session Multi-Select */}
                {setSelectedSessions && (
                    <div className="min-w-[140px]">
                        <Select
                            isMulti
                            options={sessionOptions}
                            value={selectedSessions}
                            onChange={(val) => setSelectedSessions(val || [])}
                            placeholder="Sessions..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>
                )}

                {/* Target Exam Multi-Select */}
                {setSelectedTargetExams && (
                    <div className="min-w-[140px]">
                        <Select
                            isMulti
                            options={targetExamOptions}
                            value={selectedTargetExams}
                            onChange={(val) => setSelectedTargetExams(val || [])}
                            placeholder="Target Exams..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>
                )}

                {/* Class Level Multi-Select */}
                {setSelectedClassLevels && (
                    <div className="min-w-[130px]">
                        <Select
                            isMulti
                            options={classLevelOptions}
                            value={selectedClassLevels}
                            onChange={(val) => setSelectedClassLevels(val || [])}
                            placeholder="Classes..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>
                )}

                {/* Centre Multi-Select */}
                {setSelectedCentres && (
                    <div className="min-w-[140px]">
                        <Select
                            isMulti
                            options={centreOptions}
                            value={selectedCentres}
                            onChange={(val) => setSelectedCentres(val || [])}
                            placeholder="Centres..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>
                )}

                {/* Allotment Status Select (Optional) */}
                {statusOptions && setSelectedStatus && (
                    <div className="min-w-[130px]">
                        <Select
                            options={statusOptions}
                            value={selectedStatus}
                            onChange={(val) => setSelectedStatus(val || { value: '', label: 'All Status' })}
                            placeholder="Status..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>
                )}

                {/* Completion / State Select */}
                {setSelectedCompletion && (
                    <div className="min-w-[130px]">
                        <Select
                            options={completionOptions}
                            value={selectedCompletion}
                            onChange={(val) => setSelectedCompletion(val || { value: '', label: 'All State' })}
                            placeholder="State..."
                            styles={customSelectStyles}
                            classNamePrefix="react-select"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            isClearable={false}
                        />
                    </div>
                )}
            </div>

            {/* Filter Summary Footer */}
            <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold pt-3 border-t ${
                isDarkMode ? 'text-slate-400 border-white/5' : 'text-slate-600 border-slate-100'
            }`}>
                <div className="flex items-center gap-2 flex-wrap">
                    <SlidersHorizontal size={14} className="text-orange-500" />
                    <span>Showing <strong className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{filteredCount}</strong> of <strong className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalCount}</strong> tests</span>

                    {(startDate || endDate) && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            <CalendarDays size={12} />
                            {startDate ? (formatDateDisplay ? formatDateDisplay(startDate, true) : startDate) : 'Any'} → {endDate ? (formatDateDisplay ? formatDateDisplay(endDate, true) : endDate) : 'Any'}
                            {setStartDate && (
                                <button
                                    onClick={() => { setStartDate(''); if (setEndDate) setEndDate(''); }}
                                    className="ml-1 hover:text-rose-500 transition-colors"
                                    title="Remove date filter"
                                >
                                    <X size={11} />
                                </button>
                            )}
                        </span>
                    )}
                </div>
                {activeFiltersCount > 0 && (
                    <span className="text-[11px] font-bold text-orange-500 uppercase tracking-wider bg-orange-500/10 px-2.5 py-1 rounded-[4px]">
                        {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied
                    </span>
                )}
            </div>
        </div>
    );
};

export default TestFilterToolbar;
