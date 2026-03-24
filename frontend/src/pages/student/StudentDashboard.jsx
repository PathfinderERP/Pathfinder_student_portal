import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, User, CheckSquare, FileText,
    TrendingUp, Activity, AlertCircle, BookOpen,
    BarChart2, Brain, Calendar, Users, ChevronRight,
    GraduationCap, Clock, CalendarDays, Flame,
    Target, Book, Zap, Award, LogOut, Bell, Beaker, Compass, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import MyProfile from './components/MyProfile';
import Attendance from './components/Attendance';
import Classes from './components/Classes';
import Exams from './components/Exams';
import Performance from './components/Performance';
import Results from './components/Results';
import Grievances from './components/Grievances';
import SWOTAnalysis from './components/SWOTAnalysis';
import StudyMaterials from './components/StudyMaterials';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import AIInsights from './components/AIInsights';
import StudyPlanner from './components/StudyPlanner';
import NoticeBoard from './components/NoticeBoard';
import Scholarlab from './components/Scholarlab';
import SocialFeed from './components/SocialFeed';

import PortalLayout from '../../components/common/PortalLayout';

const StudentDashboard = () => {
    const { user, logout, token, getApiUrl, loading: authLoading, refreshUser } = useAuth();
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [silentLoading, setSilentLoading] = useState(false);
    const [error, setError] = useState(null);

    // Data Caching for Tabs
    const [classesCache, setClassesCache] = useState({ data: [], loaded: false });
    const [attendanceCache, setAttendanceCache] = useState({ data: null, loaded: false });
    const [studyMaterialsCache, setStudyMaterialsCache] = useState({ data: [], loaded: false });

    // Flag to prevent multiple auto-sync attempts in one session
    const hasAutoSynced = useRef(false);

    // Fetch Student Data from backend API (which proxies to ERP)
    const fetchStudentData = async (forceRefresh = false, silentBackground = false) => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return null;
        }

        // Only show loader if we don't have data yet OR forced (and not manually silenced)
        if ((!studentData || forceRefresh) && !silentBackground) {
            setLoading(true);
        } else if (silentBackground) {
            setSilentLoading(true);
        }

        setError(null);
        try {
            const apiUrl = getApiUrl();
            if (!token) {
                setError("Authentication required. Please log in again.");
                setLoading(false);
                setSilentLoading(false);
                return;
            }

            const response = await axios.get(`${apiUrl}/api/student/erp-data/`, {
                params: { refresh: forceRefresh },
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // If we forced a refresh, also update the global user profile (for name/header)
            if (forceRefresh) {
                await refreshUser();
            }

            if (response.data) {
                // Prevent overwriting rich data with offline fallback
                const isNewDataOffline = response.data.is_offline;
                const hasExistingData = studentData && !studentData.is_offline;

                if (hasExistingData && isNewDataOffline && !forceRefresh) {
                    console.warn("Skipping update: Prevented overwriting valid data with offline fallback");
                } else {
                    setStudentData(response.data);
                }
            }
            return response.data;
        } catch (err) {
            console.error("Error fetching student data:", err);
            // Only set visible error if we don't have data
            if (!studentData) {
                if (err.response?.status === 404) {
                    setError("Your student record could not be found. Please contact support.");
                } else if (err.response?.status === 503) {
                    setError("Unable to connect to Student Records System. Please try again later.");
                } else if (err.response?.status === 401) {
                    setError("Session expired. Please log in again.");
                } else {
                    setError(err.response?.data?.error || "Failed to load student profile.");
                }
            }
            return null;
        } finally {
            setLoading(false);
            setSilentLoading(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            if (authLoading) return;
            if (!user) return;

            const data = await fetchStudentData(false);
            
            // If data is offline/mock and we haven't tried syncing yet this mount, do it now
            if (data?.is_offline && !hasAutoSynced.current) {
                console.log("[Auto-Sync] Offline data detected, triggering background refresh...");
                hasAutoSynced.current = true;
                // Add a small delay so UI doesn't flicker too much
                setTimeout(() => fetchStudentData(true, true), 1200);
            }
        };

        loadInitialData();
    }, [user, token, getApiUrl, authLoading]);

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'Nexus Hub', icon: Compass },
        { name: 'My Profile', icon: User },
        { name: 'Classes', icon: CalendarDays },
        { name: 'Attendance', icon: CheckSquare },
        { name: 'Exams', icon: FileText },
        { name: 'Results', icon: Award },
        { name: 'Performance', icon: TrendingUp },
        { name: 'SWOT Analysis', icon: Target },
        { name: 'Grievances', icon: AlertCircle },
        { name: 'Study Materials', icon: BookOpen },
        { name: 'Scholarlab', icon: Beaker },
        { name: 'Advanced Analytics', icon: BarChart2 },
        { name: 'AI Insights', icon: Brain },
        { name: 'Study Planner', icon: Calendar },
        { name: 'Notice Board', icon: Bell },
    ];

    const sidebarItems = navItems.map(item => ({
        label: item.name,
        icon: item.icon,
        active: activeTab === item.name,
        onClick: () => setActiveTab(item.name)
    }));

    if (loading) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center space-y-6 bg-white text-slate-900`}>
                {/* Logo Container */}
                <div className="flex flex-col items-center animate-fade-in-up">
                    {/* Small Screen Logo (Favicon) */}
                    <img
                        src="/images/icon/favicon.svg"
                        alt="Pathfinder"
                        className="w-16 h-16 md:hidden mb-4 animate-pulse"
                    />
                    {/* Large Screen Logo */}
                    <img
                        src="/images/icon/logo-1.svg"
                        alt="Pathfinder"
                        className="hidden md:block h-20 mb-6"
                    />

                    {/* Dot Loading Animation */}
                    <div className="flex items-center space-x-1.5 mt-2">
                        <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>

                <div className="text-center space-y-3 max-w-2xl px-6">
                    <p className={`text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-slate-400`}>
                        Loading Resources...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !studentData) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0B0F15] text-white' : 'bg-[#F2F5F8] text-slate-900'}`}>
                <div className="text-center max-w-md p-8 rounded-[5px] border border-red-500/20 bg-red-500/5">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                    <h2 className="text-2xl font-black mb-2">Profile Sync Issue</h2>
                    <p className="text-sm opacity-70 mb-6">{error || "Could not match your account with school records."}</p>
                    <button onClick={logout} className="px-6 py-2 bg-red-500 text-white rounded-[5px] font-bold text-sm">Logout</button>
                </div>
            </div>
        );
    }

    // Extract Details safely
    const detailsList = studentData?.student?.studentsDetails || [];
    const basicInfo = detailsList.find(d =>
        (user?.email && d?.studentEmail?.toLowerCase() === user.email.toLowerCase()) ||
        d?.studentEmail?.toLowerCase() === user?.username?.toLowerCase()
    ) || detailsList[0] || {};

    const rollNo = studentData?.admissionNumber || "N/A";
    const classNameValue = studentData?.class?.name || "N/A";

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <DashboardHome isDarkMode={isDarkMode} student={basicInfo} rollNo={rollNo} className={classNameValue} onSync={fetchStudentData} studentData={studentData} silentLoading={silentLoading} />;
            case 'My Profile':
                return <MyProfile isDarkMode={isDarkMode} studentData={studentData} onRefresh={fetchStudentData} silentLoading={silentLoading || loading} />;
            case 'Classes':
                return <Classes isDarkMode={isDarkMode} cache={classesCache} setCache={setClassesCache} />;
            case 'Attendance':
                return <Attendance isDarkMode={isDarkMode} cache={attendanceCache} setCache={setAttendanceCache} />;
            case 'Exams':
                return <Exams isDarkMode={isDarkMode} onRefresh={fetchStudentData} />;
            case 'Results':
                return <Results isDarkMode={isDarkMode} />;
            case 'Performance':
                return <Performance isDarkMode={isDarkMode} />;
            case 'Grievances':
                return <Grievances isDarkMode={isDarkMode} />;
            case 'SWOT Analysis':
                return <SWOTAnalysis isDarkMode={isDarkMode} />;
            case 'Study Materials':
                return <StudyMaterials isDarkMode={isDarkMode} cache={studyMaterialsCache} setCache={setStudyMaterialsCache} />;
            case 'Scholarlab':
                return <Scholarlab isDarkMode={isDarkMode} studentClass={classNameValue} />;
            case 'Advanced Analytics':
                return <AdvancedAnalytics isDarkMode={isDarkMode} />;
            case 'AI Insights':
                return <AIInsights isDarkMode={isDarkMode} />;
            case 'Study Planner':
                return <StudyPlanner isDarkMode={isDarkMode} />;
            case 'Notice Board':
                return <NoticeBoard isDarkMode={isDarkMode} />;
            case 'Nexus Hub':
                return <SocialFeed isDarkMode={isDarkMode} />;

            default:
                return (
                    <div className={`flex flex-col items-center justify-center h-[60vh] text-center p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5 text-slate-500' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <div className={`w-20 h-20 rounded-[5px] mb-6 flex items-center justify-center ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <Book size={40} className="opacity-50" />
                        </div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeTab}</h2>
                        <p>This module is currently under development.</p>
                    </div>
                );
        }
    };

    const syncIndicator = silentLoading && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-[5px] border animate-pulse transition-all duration-500
            ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
            <RefreshCw size={12} className="animate-spin" />
            <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">Enriching Profile...</span>
        </div>
    );

    return (
        <PortalLayout
            title={activeTab}
            subtitle="Student Learning Portal"
            sidebarItems={sidebarItems}
            headerActions={syncIndicator}
        >
            {renderContent()}
        </PortalLayout>
    );
};

// -- DASHBOARD HOME COMPONENT --
const DashboardHome = ({ isDarkMode, student, rollNo, className, onSync, studentData, silentLoading }) => {
    const isPending = studentData?.sync_status === 'pending';
    const isActuallySyncing = isPending || silentLoading;

    const stats = [
        { label: 'ATTENDANCE RATE', value: '92%', subtext: '37 of 40 classes | 3 absences', trend: '+1.2%', trendUp: true, color: 'blue', icon: Activity },
        { label: 'CURRENT GPA', value: '8.5/10', subtext: 'Rank: 5th of 60 students', trend: '+0.3', trendUp: true, color: 'indigo', icon: GraduationCap },
        { label: 'NEXT EXAM', value: 'PHYSICS', subtext: '5 days | 10:00 AM - 1:00 PM', pill: 'Preparation: 75%', color: 'orange', icon: CalendarDays },
        { label: 'STUDY STREAK', value: '12 days', subtext: 'Keep it up!', pill: 'Avg: 2.5 hrs/day', color: 'purple', icon: Flame },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            {isPending && (
                <div className={`p-4 rounded-[5px] border flex items-center justify-between transition-all duration-500 shadow-sm
                    ${isDarkMode ? 'border-blue-500/30 bg-blue-500/5 shadow-blue-500/5' : 'border-blue-200 bg-blue-50 shadow-blue-100/50'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-[5px] ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'}`}>
                            <Activity size={20} className={`text-blue-500 ${isActuallySyncing ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                            <p className={`text-xs font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                {isActuallySyncing ? 'Synchronization in Progress' : 'Profile Optimization Recommended'}
                            </p>
                            <p className={`text-xs font-bold ${isDarkMode ? 'text-white/60' : 'text-slate-600'}`}>
                                {isActuallySyncing 
                                    ? "We're currently enriching your profile with the latest school records. This will happen silently in the background."
                                    : "Some advanced details are currently simplified. Tap sync to refresh from school servers."}
                            </p>
                        </div>
                    </div>
                    {!silentLoading && (
                        <button
                            onClick={() => onSync(true)}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-[5px] hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            <RefreshCw size={14} className={isActuallySyncing ? 'animate-spin' : ''} />
                            {isActuallySyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    )}
                </div>
            )}

            {/* Premium Dynamic Header - Midnight Navy Edition */}
            <div className={`relative overflow-hidden rounded-[5px] border shadow-2xl transition-all duration-700 p-8 sm:p-12 mb-10
                ${isDarkMode 
                    ? 'bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e293b] border-white/5 shadow-black/40' 
                    : 'bg-gradient-to-br from-[#0B1120] via-[#10192D] to-[#1E293B] border-slate-200 shadow-slate-900/10'}`}>
                
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                {/* Subtle Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-0.5 w-12 bg-orange-500 rounded-full"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-400">Student Intelligence Hub</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1] mb-4 antialiased">
                            Welcome Back, <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">{(student?.studentName || "Student").split(' ')[0]}!</span>
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg font-medium text-white/70 max-w-xl leading-relaxed">
                            Your comprehensive learning snapshot is ready. We've analyzed your progress and prepared <span className="text-white font-bold underline decoration-orange-500/50 underline-offset-4">AI-powered insights</span> for your goals today.
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-8">
                            <button
                                onClick={() => onSync(true)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-[5px] border border-white/10 backdrop-blur-md transition-all active:scale-95 group shadow-lg"
                            >
                                <RefreshCw size={14} className={`group-hover:rotate-180 transition-transform duration-500 ${silentLoading ? 'animate-spin' : ''}`} />
                                Force ERP Refresh
                            </button>
                            <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                                <Clock size={12} />
                                Last sync: Just now
                            </div>
                        </div>
                    </div>

                    {/* Profile Card Refined */}
                    <div className="flex flex-col items-center lg:items-end gap-6 shrink-0">
                        <div className={`p-1 rounded-[5px] backdrop-blur-3xl shadow-2xl transition-all duration-500 hover:scale-[1.02]
                            ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white/10 border border-white/20'}`}>
                            <div className={`flex items-center gap-4 px-6 py-4 rounded-[4px] min-w-[280px]
                                ${isDarkMode ? 'bg-slate-900/40' : 'bg-white/5'}`}>
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-[5px] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-xl font-black text-white shadow-lg ring-4 ring-white/10">
                                        {(student?.studentName || "S").match(/\b(\w)/g)?.join('').slice(0, 2) || "S"}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#1E3A8A] flex items-center justify-center shadow-md">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-white font-black text-lg tracking-tight">{(student?.studentName || "Student")}</span>
                                    <div className="flex items-center gap-2 text-white/50">
                                        <span className="text-[10px] font-black uppercase tracking-widest">Enrollment</span>
                                        <span className="w-1 h-1 rounded-full bg-orange-500/50"></span>
                                        <span className="text-xs font-bold font-mono text-orange-400">{rollNo}</span>
                                    </div>
                                    <div className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 bg-white/5 py-1 px-3 rounded-full w-fit">
                                        Class: {className}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Stats Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className={`p-4 sm:p-6 rounded-[5px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group
                        ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>

                        <div className={`mb-4 flex items-center justify-between`}>
                            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>
                                {stat.label}
                            </h3>
                            <div className={`p-2 rounded-[5px] ${stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                                stat.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' :
                                    stat.color === 'orange' ? 'bg-orange-500/10 text-orange-500' :
                                        'bg-purple-500/10 text-purple-500'
                                }`}>
                                <stat.icon size={16} />
                            </div>
                        </div>

                        <div className={`text-3xl font-black tracking-tight mb-2 ${stat.color === 'blue' ? 'text-blue-500' :
                            stat.color === 'indigo' ? 'text-indigo-500' :
                                stat.color === 'orange' ? 'text-orange-500' :
                                    'text-purple-500'
                            }`}>
                            {stat.value}
                        </div>

                        <p className={`text-xs font-medium mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {stat.subtext}
                        </p>

                        {(stat.trend || stat.pill) && (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold
                                ${isDarkMode ? 'bg-white/5' : 'bg-slate-50 text-slate-600'}`}>
                                {stat.trend && (
                                    <>
                                        <TrendingUp size={12} className={stat.trendUp ? 'text-emerald-500' : 'text-red-500'} />
                                        <span>{stat.trend}</span>
                                        <span className="opacity-50 font-normal ml-1">vs last month</span>
                                    </>
                                )}
                                {stat.pill && <span>{stat.pill}</span>}
                            </div>
                        )}

                        {/* Progress Bar for Attendance/GPA */}
                        {(i === 0 || i === 1) && (
                            <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-[5px] overflow-hidden">
                                <div className={`h-full rounded-[5px] ${i === 0 ? 'bg-blue-500 w-[92%]' : 'bg-emerald-500 w-[85%]'}`}></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Row 2: Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strong Subject */}
                <div className={`p-8 rounded-[5px] border relative overflow-hidden
                    ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-emerald-900/5'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Zap size={120} />
                    </div>
                    <div className="relative z-10">
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Strong Subject</h3>
                        <div className="text-4xl font-black text-emerald-500 mb-2">CHEMISTRY</div>
                        <p className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Average: 88%</p>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-[5px] w-fit">
                            <CheckSquare size={14} />
                            Consistently Excellent
                        </div>
                    </div>
                </div>

                {/* Needs Focus */}
                <div className={`p-8 rounded-[5px] border relative overflow-hidden
                    ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-red-900/5'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Target size={120} />
                    </div>
                    <div className="relative z-10">
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>Needs Focus</h3>
                        <div className="text-4xl font-black text-red-500 mb-2">MATHEMATICS</div>
                        <p className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Average: 78%</p>
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-[5px] w-fit">
                            <Brain size={14} />
                            AI recommends extra practice
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Performance Trend (Simulated Chart) */}
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                <div className="flex items-center justify-between mb-8">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>Performance Trend (Last 30 Days)</h3>
                </div>
                <div className="h-32 flex items-end justify-between gap-4">
                    {[30, 45, 35, 60, 50, 75, 55, 80].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end group">
                            <div
                                className={`w-full rounded-t-[5px] transition-all duration-500 hover:opacity-80
                                ${isDarkMode ? 'bg-indigo-700' : 'bg-indigo-600'}`}
                                style={{ height: `${h}%` }}
                            ></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom: Announcements */}
            <div className={`p-6 rounded-[5px] border border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500 text-white rounded-[5px]">
                        <AlertCircle size={18} />
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isDarkMode ? 'text-orange-400' : 'text-orange-900'}`}>Physics Exam Countdown</h4>
                        <p className={`text-xs ${isDarkMode ? 'text-orange-400/70' : 'text-orange-800/70'}`}>Upcoming on Monday, 10:00 AM</p>
                    </div>
                    <div className="ml-auto px-3 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-[5px]">
                        5 Days Left
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;

