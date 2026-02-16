import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, MapPin, User, Video, AlertCircle, BookOpen, RefreshCw, X, FileText, Info, Hash } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const Classes = ({ isDarkMode, cache, setCache }) => {
    const { getApiUrl, token } = useAuth();

    // Use cached data if available, otherwise local state
    const [classes, setClasses] = useState(cache?.loaded ? cache.data : []);
    const [loading, setLoading] = useState(!cache?.loaded);
    const [error, setError] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);

    const fetchClasses = useCallback(async (isBackground = false) => {
        if (!token) return;

        try {
            if (!isBackground) setLoading(true);

            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/student/classes/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Handle various response structures
            let data = [];
            if (Array.isArray(response.data)) {
                data = response.data;
            } else if (response.data?.classes && Array.isArray(response.data.classes)) {
                data = response.data.classes;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (response.data?.schedule && Array.isArray(response.data.schedule)) {
                data = response.data.schedule;
            }

            // Deep compare to avoid unnecessary updates
            const prevData = cache?.loaded ? cache.data : classes;
            const isDataSame = JSON.stringify(data) === JSON.stringify(prevData);

            if (!isDataSame) {
                console.log("Classes updated from ERP");
                setClasses(data);

                // Update parent cache only if changed
                if (setCache) {
                    setCache({ data: data, loaded: true });
                }
            }

            if (!isBackground) setLoading(false);

        } catch (err) {
            console.error("Error fetching classes:", err);
            // Don't show error immediately if it's just empty or 404 (no classes yet)
            if (err.response?.status === 404) {
                const isDataSame = JSON.stringify([]) === JSON.stringify(cache?.data || []);
                if (!isDataSame) {
                    setClasses([]);
                    if (setCache) setCache({ data: [], loaded: true });
                }
            } else {
                if (!isBackground) setError("Failed to load class schedule.");
            }
            if (!isBackground) setLoading(false);
        }
    }, [getApiUrl, token, cache, setCache, classes]);

    useEffect(() => {
        if (!cache?.loaded) {
            fetchClasses(false); // Initial load
        } else {
            fetchClasses(true); // Background sync on mount/tab switch
        }
    }, [fetchClasses, cache?.loaded]);

    // Format Date Helper
    const formatDate = (dateString) => {
        if (!dateString) return 'TBA';
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 animate-pulse">
                <Calendar size={48} className="text-indigo-500 mb-4" />
                <p className="font-black uppercase tracking-widest text-xs opacity-50">Syncing Schedule...</p>
            </div>
        );
    }

    if (error) {
        const isPermissionError = error.includes("403") || error.includes("Forbidden");
        return (
            <div className={`p-8 rounded-[5px] border ${isPermissionError ? 'bg-orange-500/5 border-orange-500/20' : (isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100')} flex items-center gap-4`}>
                <AlertCircle className={isPermissionError ? "text-orange-500" : "text-red-500"} size={24} />
                <div>
                    <h3 className={`text-sm font-black uppercase ${isPermissionError ? "text-orange-500" : "text-red-500"}`}>
                        {isPermissionError ? "Access Restricted" : "Attention"}
                    </h3>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {isPermissionError
                            ? "Unable to sync class schedule directly from ERP due to permission restrictions. Please check the Study Planner for tasks."
                            : error}
                    </p>
                    <button
                        onClick={() => fetchClasses(false)}
                        className={`mt-2 text-xs font-bold underline ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                        Try Refreshing
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Header */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="px-3 py-1 rounded-[5px] bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                    Academic Schedule
                                </div>
                            </div>
                            <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                My Classes
                            </h2>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Upcoming live sessions, offline batches, and timetable.
                            </p>
                        </div>
                        <button
                            onClick={() => fetchClasses(false)}
                            disabled={loading}
                            className={`p-2 rounded-full transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            title="Sync now"
                        >
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
                <Clock size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            {/* Classes List */}
            {classes.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {classes.map((cls, idx) => (
                        <div
                            key={cls._id || idx}
                            onClick={() => setSelectedClass(cls)}
                            className={`p-6 rounded-[5px] border group hover:border-blue-500/50 transition-all cursor-pointer ${isDarkMode ? 'bg-white/[0.02] border-white/5 hover:bg-white/5' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center text-white shadow-lg shrink-0
                                        ${cls.classMode === 'Online' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}`}>
                                        {cls.classMode === 'Online' ? <Video size={20} /> : <BookOpen size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {cls.subjectId?.subjectName || cls.subject || 'Class Session'}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-white/10 text-white/70 border-white/10' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {cls.className}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium opacity-60">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={12} /> {formatDate(cls.date)}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={12} /> {cls.startTime} - {cls.endTime}
                                            </span>
                                            {cls.teacherId?.name && (
                                                <span className="flex items-center gap-1.5">
                                                    <User size={12} /> {cls.teacherId.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 md:self-center self-end">
                                    <div className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest ${cls.status === 'Completed' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600') :
                                            cls.status === 'Cancelled' ? (isDarkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600') :
                                                cls.status === 'Ongoing' ? (isDarkMode ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'bg-orange-50 text-orange-600 animate-pulse') :
                                                    (isDarkMode ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600')
                                        }`}>
                                        {cls.status || 'SCHEDULED'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`py-20 text-center rounded-[5px] border-2 border-dashed ${isDarkMode ? 'border-white/5 bg-white/[0.01]' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex flex-col items-center gap-4 opacity-30">
                        <Calendar size={60} />
                        <div className="space-y-1">
                            <p className="font-black uppercase tracking-[0.2em] text-sm">No classes scheduled</p>
                            <p className="text-xs font-bold">Check back later for updates</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Selected Class Detail Modal - Using Portal to escape parent transforms */}
            {selectedClass && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div
                        className={`w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden ${isDarkMode ? 'bg-[#1e293b] text-white border border-white/10' : 'bg-white text-slate-900'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">
                                    Class Details
                                </h3>
                                <p className={`text-xs font-bold uppercase tracking-wider opacity-60`}>
                                    {selectedClass.className}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100 text-slate-500'}`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content - Scrollable if needed */}
                        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                {/* Primary Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-2 mb-2 opacity-60">
                                            <BookOpen size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Subject</span>
                                        </div>
                                        <p className="font-bold text-sm leading-tight">
                                            {selectedClass.subjectId?.subjectName || 'N/A'}
                                        </p>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-2 mb-2 opacity-60">
                                            <Info size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
                                        </div>
                                        <p className={`font-bold text-sm ${selectedClass.status === 'Completed' ? 'text-emerald-500' :
                                                selectedClass.status === 'Ongoing' ? 'text-orange-500' :
                                                    selectedClass.status === 'Cancelled' ? 'text-red-500' :
                                                        'text-blue-500'
                                            }`}>
                                            {selectedClass.status || 'Scheduled'}
                                        </p>
                                    </div>
                                </div>

                                {/* Detailed Lists */}
                                <div className="space-y-4">
                                    {/* Timing */}
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                            <Clock size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black uppercase tracking-wide mb-1 opacity-80">Timing</h4>
                                            <div className="text-sm font-medium space-y-1">
                                                <p>{formatDate(selectedClass.date)}</p>
                                                <p>{selectedClass.startTime} - {selectedClass.endTime}</p>
                                                {selectedClass.actualStartTime && (
                                                    <p className="text-xs opacity-60 mt-1">
                                                        Started at: {new Date(selectedClass.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Faculty */}
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                            <User size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black uppercase tracking-wide mb-1 opacity-80">Faculty</h4>
                                            <div className="text-sm font-medium">
                                                <p>{selectedClass.teacherId?.name || 'Assigned Staff'}</p>
                                                {selectedClass.teacherId?.email && (
                                                    <p className="text-xs opacity-60">{selectedClass.teacherId.email}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location/Mode */}
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                                            <MapPin size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black uppercase tracking-wide mb-1 opacity-80">Class Information</h4>
                                            <div className="text-sm font-medium space-y-1">
                                                <p>{selectedClass.classMode || 'Offline'}</p>
                                                {selectedClass.classMode === 'Offline' && (
                                                    <p className="text-xs opacity-60">Centre ID: {selectedClass.centreId}</p>
                                                )}
                                                <p className="text-xs opacity-60">Session: {selectedClass.session}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className={`p-4 border-t flex justify-end ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Classes;
