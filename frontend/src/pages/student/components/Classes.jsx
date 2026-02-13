import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Video, AlertCircle, BookOpen } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const Classes = ({ isDarkMode }) => {
    const { getApiUrl, token } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const apiUrl = getApiUrl();
                const response = await axios.get(`${apiUrl}/api/student/classes/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // Handle various response structures
                console.log("Classes API Response:", response.data);
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

                setClasses(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching classes:", err);
                // Don't show error immediately if it's just empty or 404 (no classes yet)
                if (err.response?.status === 404) {
                    setClasses([]);
                } else {
                    setError("Failed to load class schedule.");
                }
                setLoading(false);
            }
        };

        fetchClasses();
    }, [getApiUrl, token]);

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
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Header */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10">
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
                <Clock size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            {/* Classes List */}
            {classes.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {classes.map((cls, idx) => (
                        <div key={idx} className={`p-6 rounded-[5px] border group hover:border-blue-500/50 transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center text-white shadow-lg 
                                        ${cls.mode === 'ONLINE' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}`}>
                                        {cls.mode === 'ONLINE' ? <Video size={20} /> : <BookOpen size={20} />}
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-black uppercase tracking-tight mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {cls.subject || cls.topic || 'Class Session'}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-medium opacity-60">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={12} /> {cls.date ? new Date(cls.date).toLocaleDateString() : 'TBA'}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={12} /> {cls.time || 'TBA'}
                                            </span>
                                            {cls.teacher && (
                                                <span className="flex items-center gap-1.5">
                                                    <User size={12} /> {cls.teacher}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {cls.mode === 'OFFLINE' && (
                                        <div className={`text-xs font-bold px-3 py-1.5 rounded-[5px] flex items-center gap-2 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                            <MapPin size={12} />
                                            {cls.room || cls.centre || 'Campus'}
                                        </div>
                                    )}
                                    <div className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest ${cls.status === 'COMPLETED' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600') :
                                        cls.status === 'CANCELLED' ? (isDarkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600') :
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
        </div>
    );
};

export default Classes;
