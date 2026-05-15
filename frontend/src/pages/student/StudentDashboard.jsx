import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
    LayoutDashboard, User, CheckSquare, FileText,
    TrendingUp, Activity, AlertCircle, BookOpen,
    BarChart2, Brain, Calendar, Users, ChevronRight,
    GraduationCap, Clock, CalendarDays, Flame,
    Target, Book, Zap, Award, LogOut, Bell, Beaker, Compass, RefreshCw, PlayCircle, Trophy, HelpCircle
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
import Doubts from './components/Doubts';
// import SWOTAnalysis from './components/SWOTAnalysis';
import StudyMaterials from './components/StudyMaterials';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import AIInsights from './components/AIInsights';
import StudyPlanner from './components/StudyPlanner';
import NoticeBoard from './components/NoticeBoard';
import Scholarlab from './components/Scholarlab';
import SocialFeed from './components/SocialFeed';
import { useActivityTracker } from '../../services/useActivityTracker';

import PortalLayout from '../../components/common/PortalLayout';
import { motion, AnimatePresence } from 'framer-motion';

const StudentDashboard = () => {
    const { user, logout, token, getApiUrl, loading: authLoading, refreshUser } = useAuth();
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('Dashboard');

    // Track Student Activity
    useActivityTracker(`StudentPortal/${activeTab}`);

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const location = useLocation();

    // URL-based Tab Navigation
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab) {
            // Mapping check to ensure valid tab
            const validTabs = [
                'Dashboard', 'My Profile', 'Classes', 'Attendance',
                'Exams', 'Results', 'Performance', 'Grievances', 'Doubts',
                'Study Materials', 'Study Planner', 'Notice Board'
            ];
            if (validTabs.includes(tab)) {
                setActiveTab(tab);
            }
        }
    }, [location.search]);
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [silentLoading, setSilentLoading] = useState(false);
    const [error, setError] = useState(null);

    // Data Caching for Tabs
    const [classesCache, setClassesCache] = useState({
        data: [],
        ongoing: [],
        upcoming: [],
        history: [],
        loaded: false
    });
    const [attendanceCache, setAttendanceCache] = useState({ data: null, loaded: false });
    const [studyMaterialsCache, setStudyMaterialsCache] = useState({ data: [], loaded: false });
    const [examsCache, setExamsCache] = useState({ data: [], loaded: false });
    const [scholarlabCache, setScholarlabCache] = useState({ data: [], loaded: false });

    // Flag to prevent multiple auto-sync attempts in one session
    const hasAutoSynced = useRef(false);
    const [statsData, setStatsData] = useState({
        attendance: { value: '—%', subtext: 'Syncing attendance...', loaded: false },
        gpa: { value: '—/10', subtext: 'Syncing GPA...', loaded: false },
        streak: { value: '— days', subtext: 'Keep it up!', loaded: false },
        rank: { value: '—', subtext: 'Institutional Standing', loaded: false }
    });

    const fetchAnalytics = useCallback(async () => {
        if (!token || !getApiUrl) return;
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/student/activity-analytics/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = response.data;
            setStatsData(prev => ({
                ...prev,
                streak: {
                    value: `${data.streak || 0} days`,
                    subtext: data.streak > 0 ? 'Consistent learning!' : 'Start your streak today!',
                    loaded: true
                }
            }));
        } catch (err) {
            console.error("Dashboard Analytics Fetch Error:", err);
        }
    }, [token, getApiUrl]);

    // Fetch Student Data from backend API (which proxies to ERP)
    const fetchStudentData = useCallback(async (forceRefresh = false, silentBackground = false) => {
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
                setStudentData(prevData => {
                    const isNewDataOffline = response.data.is_offline;
                    const hasExistingData = prevData && !prevData.is_offline;

                    if (hasExistingData && isNewDataOffline && !forceRefresh) {
                        console.warn("Skipping update: Prevented overwriting valid data with offline fallback");
                        return prevData;
                    }
                    return response.data;
                });
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
    }, [authLoading, user, getApiUrl, token, refreshUser]);

    // Fetch Attendance Stats for Dashboard Cards
    const fetchAttendanceStats = useCallback(async () => {
        if (!token || !getApiUrl) return;
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/student/attendance/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = response.data;
            const records = Array.isArray(data) ? data : (data.data || []);

            if (records.length > 0) {
                const present = records.filter(r => (r.attendanceStatus || r.status) === 'Present').length;
                const absent = records.filter(r => (r.attendanceStatus || r.status) === 'Absent').length;
                const total = records.length;
                const marked = present + absent;
                const percentage = marked > 0 ? Math.round((present / marked) * 100) : 0;

                setStatsData(prev => ({
                    ...prev,
                    attendance: {
                        value: `${percentage}%`,
                        subtext: `${present} of ${total} classes | ${absent} absences`,
                        loaded: true
                    }
                }));

                // Also update the Global Attendance Cache to avoid double fetch in Attendance tab
                setAttendanceCache({ data: records, loaded: true });
            }
        } catch (err) {
            console.error("Dashboard Attendance Fetch Error:", err);
        }
    }, [token, getApiUrl]);

    // Fetch Upcoming Exams for Dashboard Countdown
    const fetchUpcomingExams = useCallback(async () => {
        if (!token || !getApiUrl) return;
        try {
            const apiUrl = getApiUrl();
            const [testsRes, resultsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get(`${apiUrl}/api/tests/my_results/`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] }))
            ]);

            const testsData = testsRes.data || [];
            const resultsData = resultsRes.data || [];

            // Merge results data (rank, marks) into tests data
            const mergedData = testsData.map(test => {
                const result = resultsData.find(r => r.code === test.code || r.id === test.id);
                if (result) {
                    return {
                        ...test,
                        submission: {
                            ...(test.submission || {}),
                            score: result.marks != null && result.total > 0
                                ? (result.marks / result.total) * 100
                                : (test.submission?.score ?? 0),
                            rank: result.rank || test.submission?.rank || null,
                            is_finalized: true,
                            section_stats: result.section_stats
                        }
                    };
                }
                return test;
            });

            // Calculate GPA and Rank from merged results
            const completedTests = mergedData.filter(t => t.submission?.is_finalized);
            if (completedTests.length > 0) {
                const totalScore = completedTests.reduce((acc, t) => acc + (t.submission.score || 0), 0);
                const avgGpa = (totalScore / completedTests.length / 10).toFixed(1); // Assuming 0-100 scale -> 0-10 scale
                const latestRank = completedTests[0]?.submission?.rank || '—';

                setStatsData(prev => ({
                    ...prev,
                    gpa: {
                        value: `${avgGpa}/10`,
                        subtext: `Based on ${completedTests.length} tests`,
                        loaded: true
                    },
                    rank: {
                        value: latestRank !== '—' ? `#${latestRank}` : '—',
                        subtext: 'Current Class Position',
                        loaded: true
                    }
                }));
            }

            setExamsCache({ data: mergedData, loaded: true });
        } catch (err) {
            console.error("Dashboard Exams Fetch Error:", err);
        }
    }, [token, getApiUrl]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (authLoading) return;
            if (!user) return;

            const data = await fetchStudentData(false);

            // Fix static data flicker in Attendance by ensuring cache status triggers fetch if needed
            const isInitial = !attendanceCache?.loaded;
            if (isInitial) {
                fetchAttendanceStats();
                fetchAnalytics();
            }

            fetchUpcomingExams(); // Fetch exams for countdown

            // If data is offline/mock and we haven't tried syncing yet this mount, do it now
            if (data?.is_offline && !hasAutoSynced.current) {
                hasAutoSynced.current = true;
                // Add a small delay so UI doesn't flicker too much
                setTimeout(() => fetchStudentData(true, true), 1200);
            }
        };

        loadInitialData();
    }, [user, fetchStudentData, authLoading, fetchAttendanceStats, fetchUpcomingExams, fetchAnalytics]);

    const navItems = useMemo(() => [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'Nexus Hub', icon: Compass },
        { name: 'My Profile', icon: User },
        { name: 'Classes', icon: CalendarDays },
        { name: 'Attendance', icon: CheckSquare },
        { name: 'Exams', icon: FileText },
        { name: 'Results', icon: Trophy },
        { name: 'Performance', icon: TrendingUp },
        // { name: 'SWOT Analysis', icon: Target },
        { name: 'Grievances', icon: AlertCircle },
        { name: 'Doubts', icon: HelpCircle },
        {
            name: 'Study Materials',
            icon: BookOpen,
            subItems: [
                { name: 'Video Content', icon: PlayCircle },
                { name: 'Notes', icon: FileText },
                { name: 'DPP Questions', icon: Target }
            ]
        },
        // { name: 'Scholarlab', icon: Beaker },
        { name: 'Advanced Analytics', icon: BarChart2 },
        // { name: 'AI Insights', icon: Brain },
        { name: 'Study Planner', icon: Calendar },
        { name: 'Notice Board', icon: Bell },
    ], []);

    const sidebarItems = useMemo(() => navItems.map(item => ({
        label: item.name,
        icon: item.icon,
        active: activeTab === item.name || item.subItems?.some(s => s.name === activeTab),
        onClick: item.subItems ? undefined : () => {
            setActiveTab(item.name);
        },
        subItems: item.subItems?.map(sub => ({
            label: sub.name,
            icon: sub.icon,
            active: activeTab === sub.name,
            onClick: () => setActiveTab(sub.name)
        }))
    })), [navItems, activeTab]);

    // Extract Details safely
    const { basicInfo, rollNo, classNameValue } = useMemo(() => {
        const detailsList = studentData?.student?.studentsDetails || [];
        const basic = detailsList.find(d =>
            (user?.email && d?.studentEmail?.toLowerCase() === user.email.toLowerCase()) ||
            d?.studentEmail?.toLowerCase() === user?.username?.toLowerCase()
        ) || detailsList[0] || {};

        return {
            basicInfo: basic,
            rollNo: studentData?.admissionNumber || "N/A",
            classNameValue: studentData?.class?.name || "N/A"
        };
    }, [studentData, user]);

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


    const studentBatch = studentData?.student?.batches?.[0]?.batchName || null;

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <DashboardHome isDarkMode={isDarkMode} student={basicInfo} rollNo={rollNo} className={classNameValue} onSync={fetchStudentData} studentData={studentData} silentLoading={silentLoading} onTabChange={setActiveTab} dashboardStats={statsData} exams={examsCache.data} />;
            case 'My Profile':
                return <MyProfile isDarkMode={isDarkMode} studentData={studentData} onRefresh={fetchStudentData} silentLoading={silentLoading || loading} />;
            case 'Classes':
                return <Classes isDarkMode={isDarkMode} cache={classesCache} setCache={setClassesCache} studentBatch={studentBatch} />;
            case 'Attendance':
                return <Attendance isDarkMode={isDarkMode} cache={attendanceCache} setCache={setAttendanceCache} />;
            case 'Exams':
                return <Exams isDarkMode={isDarkMode} onRefresh={fetchStudentData} cache={examsCache} setCache={setExamsCache} />;
            case 'Results':
                return <Results isDarkMode={isDarkMode} />;
            case 'Performance':
                return <Performance isDarkMode={isDarkMode} />;
            case 'Grievances':
                return <Grievances isDarkMode={isDarkMode} />;
            case 'Doubts':
                return <Doubts isDarkMode={isDarkMode} />;
            /* case 'SWOT Analysis':
                return <SWOTAnalysis isDarkMode={isDarkMode} />; */
            case 'Video Content':
                return <StudyMaterials cache={studyMaterialsCache} setCache={setStudyMaterialsCache} studentClass={classNameValue} initialType="VIDEO" />;
            case 'Notes':
                return <StudyMaterials cache={studyMaterialsCache} setCache={setStudyMaterialsCache} studentClass={classNameValue} initialType="STUDY_MATERIAL" />;
            case 'DPP Questions':
                return <StudyMaterials cache={studyMaterialsCache} setCache={setStudyMaterialsCache} studentClass={classNameValue} initialType="DPP" />;
            case 'Study Materials':
                // Default to Video Content if parent is clicked
                return <StudyMaterials cache={studyMaterialsCache} setCache={setStudyMaterialsCache} studentClass={classNameValue} initialType="VIDEO" />;
            case 'Scholarlab':
                return <Scholarlab isDarkMode={isDarkMode} studentClass={classNameValue} cache={scholarlabCache} setCache={setScholarlabCache} />;
            case 'Advanced Analytics':
                return <AdvancedAnalytics isDarkMode={isDarkMode} />;
            // case 'AI Insights':
            //     return <AIInsights isDarkMode={isDarkMode} />;
            case 'Study Planner':
                return <StudyPlanner isDarkMode={isDarkMode} studentData={studentData} />;
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
            onNoticeClick={() => setActiveTab('Notice Board')}
            variant="premium"
        >
            {renderContent()}
        </PortalLayout>
    );
};

// -- DASHBOARD HOME COMPONENT --
// -- DASHBOARD HOME COMPONENT --
const DashboardHome = ({ isDarkMode, student, rollNo, className, onSync, studentData, silentLoading, onTabChange, dashboardStats, exams }) => {
    const isPending = studentData?.sync_status === 'pending';
    const isActuallySyncing = isPending || silentLoading;

    const subjectStats = useMemo(() => {
        if (!exams || !Array.isArray(exams)) return null;

        const subjects = {};
        const completedTests = exams.filter(e => e.submission?.is_finalized && e.submission?.score != null);

        if (completedTests.length === 0) return null;

        completedTests.forEach(e => {
            // New logic: prioritize section-wise performance breakdown
            if (e.submission?.section_stats && e.submission.section_stats.length > 0) {
                e.submission.section_stats.forEach(sec => {
                    const sName = sec.name || 'General';
                    if (!subjects[sName]) subjects[sName] = { scores: [], total: 0 };
                    
                    const pct = sec.total > 0 ? (sec.marks / sec.total) * 100 : 0;
                    subjects[sName].scores.push(pct);
                    subjects[sName].total += pct;
                });
            } else {
                // Fallback: extract subject name from test name
                const sName = e.name?.split(' - ')[0] || 'General';
                if (!subjects[sName]) subjects[sName] = { scores: [], total: 0 };
                subjects[sName].scores.push(e.submission.score);
                subjects[sName].total += e.submission.score;
            }
        });

        const subjectList = Object.keys(subjects).map(sName => ({
            name: sName,
            average: Math.round(subjects[sName].total / subjects[sName].scores.length)
        })).sort((a, b) => b.average - a.average);

        return {
            strongest: subjectList[0] || null,
            weakest: subjectList.length > 1 ? subjectList[subjectList.length - 1] : null
        };
    }, [exams]);

    const nextExam = useMemo(() => {
        if (!exams || !Array.isArray(exams)) return null;
        const now = new Date();
        return exams
            .filter(e => e.start_time && new Date(e.start_time) > now)
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
    }, [exams]);

    const trajectoryData = useMemo(() => {
        if (!exams || !Array.isArray(exams)) return [];
        const data = exams
            .filter(e => e.submission?.is_finalized && e.submission?.score != null)
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            .slice(-7) // Last 7 tests for a clean chart
            .map(e => ({
                date: new Date(e.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                score: Math.round(e.submission.score)
            }));
        
        // Ensure at least 2 points for the line
        if (data.length === 1) return [{ date: 'Start', score: 0 }, ...data];
        return data;
    }, [exams]);

    const stats = useMemo(() => [
        {
            label: 'ATTENDANCE RATE',
            value: dashboardStats?.attendance?.value || '—%',
            subtext: dashboardStats?.attendance?.subtext || 'Calculating attendance...',
            trend: '+1.2%', trendUp: true, color: 'blue', icon: Activity, tab: 'Attendance'
        },
        { 
            label: 'CURRENT GPA', 
            value: dashboardStats?.gpa?.value || '—/10', 
            subtext: dashboardStats?.gpa?.subtext || 'Processing results...',
            pill: dashboardStats?.rank?.value ? `Rank: ${dashboardStats.rank.value}` : 'Calculating Rank',
            color: 'indigo', 
            icon: GraduationCap 
        },
        {
            label: 'NEXT EXAM',
            value: nextExam ? nextExam.name : 'NO EXAMS',
            subtext: nextExam
                ? `${new Date(nextExam.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} | ${new Date(nextExam.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                : 'Enjoy your break!',
            pill: nextExam ? `Duration: ${nextExam.duration}m` : 'Clear Sky',
            color: 'orange',
            icon: CalendarDays,
            tab: 'Exams'
        },
        { 
            label: 'STUDY STREAK', 
            value: dashboardStats?.streak?.value || '— days', 
            subtext: dashboardStats?.streak?.subtext || 'Keep it up!', 
            pill: 'Daily Engagement', 
            color: 'purple', 
            icon: Flame 
        },
    ], [dashboardStats, nextExam]);

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
                    ? 'bg-linear-to-br from-[#020617] via-[#0f172a] to-[#1e293b] border-white/5 shadow-black/40'
                    : 'bg-linear-to-br from-[#0B1120] via-[#10192D] to-[#1E293B] border-slate-200 shadow-slate-900/10'}`}>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* Subtle Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-0.5 w-12 bg-orange-500 rounded-full"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-400 font-brand">Student Intelligence Hub</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-[1.05] mb-4 antialiased font-brand">
                            Welcome Back, <span className="bg-linear-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">{(student?.studentName || "Student").split(' ')[0]}!</span>
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
                                    <div className="w-16 h-16 rounded-[5px] bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center text-xl font-black text-white shadow-lg ring-4 ring-white/10">
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
                    <div
                        key={i}
                        onClick={() => stat.tab && onTabChange(stat.tab)}
                        className={`p-4 sm:p-6 rounded-[5px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group
                        ${stat.tab ? 'cursor-pointer' : ''}
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
                        <div className="text-4xl font-black text-emerald-500 mb-2">
                            {subjectStats?.strongest?.name || 'SYNCING...'}
                        </div>
                        <p className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {subjectStats?.strongest ? `Average: ${subjectStats.strongest.average}%` : 'Data being analyzed'}
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-[5px] w-fit">
                            <CheckSquare size={14} />
                            {subjectStats?.strongest ? 'Consistently Excellent' : 'AI Analysis Pending'}
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
                        <div className="text-4xl font-black text-red-500 mb-2">
                            {subjectStats?.weakest?.name || (subjectStats?.strongest ? 'EXCELLENT' : 'SYNCING...')}
                        </div>
                        <p className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {subjectStats?.weakest ? `Average: ${subjectStats.weakest.average}%` : subjectStats?.strongest ? 'No weak subjects identified' : 'Data being analyzed'}
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-[5px] w-fit">
                            <Brain size={14} />
                            {subjectStats?.weakest ? 'AI recommends extra practice' : 'Academic profile looks healthy'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Performance Trend (Simulated Chart) */}
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>
                            Performance Trend (Last 30 Days)
                        </h3>
                        <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">+12% Mastery Growth</p>
                    </div>
                </div>

                {/* Visual Premium Area Chart */}
                <div className="relative h-48 w-full">
                    {trajectoryData.length === 0 ? (
                        <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-500/20 rounded-[5px]">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Waiting for performance data...</p>
                        </div>
                    ) : (
                        <svg viewBox="0 0 1000 200" className="w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="perfDashboardGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            {/* Grid Lines */}
                            {[0, 50, 100].map(val => (
                                <line
                                    key={val}
                                    x1="0" y1={200 - (val * 1.5) - 20}
                                    x2="1000" y2={200 - (val * 1.5) - 20}
                                    stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                                    strokeDasharray="4 4"
                                />
                            ))}

                            {(() => {
                                const stepX = 1000 / (trajectoryData.length - 1 || 1);
                                const getPoints = () => trajectoryData.map((d, i) => {
                                    const x = i * stepX;
                                    const y = 200 - (d.score * 1.5) - 20; // 0-100 scale to 180-30 svg y
                                    return { x, y, score: d.score };
                                });
                                const points = getPoints();
                                const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
                                const areaD = `${pathD} L ${points[points.length - 1].x} 200 L 0 200 Z`;

                                return (
                                    <>
                                        <motion.path
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            d={areaD}
                                            fill="url(#perfDashboardGradient)"
                                        />
                                        <motion.path
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 2, ease: "easeInOut" }}
                                            d={pathD}
                                            fill="none"
                                            stroke="#6366f1"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        {points.map((p, i) => (
                                            <g key={i} className="group cursor-pointer">
                                                <motion.circle
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: 2 + (i * 0.1) }}
                                                    whileHover={{ scale: 1.8, strokeWidth: 4 }}
                                                    cx={p.x} cy={p.y} r="5"
                                                    className="fill-white stroke-indigo-500 stroke-[3px]"
                                                />
                                                <foreignObject x={p.x - 20} y={p.y - 35} width="40" height="25" className="overflow-visible pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="bg-indigo-600 text-white text-[9px] font-black py-1 px-1.5 rounded-[3px] text-center shadow-xl">
                                                        {p.score}%
                                                    </div>
                                                </foreignObject>
                                            </g>
                                        ))}
                                    </>
                                );
                            })()}
                        </svg>
                    )}
                </div>

                <div className="flex justify-between mt-6 px-1">
                    {trajectoryData.length > 0 ? (
                        trajectoryData.map((d, i) => (
                            <span key={i} className="text-[9px] font-black uppercase opacity-30 tracking-[0.2em]">{d.date}</span>
                        ))
                    ) : (
                        ['Past', 'Recent', 'Today'].map(l => (
                            <span key={l} className="text-[9px] font-black uppercase opacity-30 tracking-[0.2em]">{l}</span>
                        ))
                    )}
                </div>
            </div>

            {/* Bottom: Dynamic Announcements/Exams */}
            {nextExam && (
                <div
                    onClick={() => onTabChange('Exams')}
                    className={`p-6 rounded-[5px] border cursor-pointer transition-all hover:scale-[1.01] active:scale-95 shadow-lg
                    ${isDarkMode ? 'border-orange-500/20 bg-orange-500/5 shadow-orange-500/5' : 'border-orange-200 bg-orange-50 shadow-orange-100'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500 text-white rounded-[5px] animate-pulse">
                            <AlertCircle size={18} />
                        </div>
                        <div>
                            <h4 className={`font-black uppercase tracking-tight text-sm ${isDarkMode ? 'text-orange-400' : 'text-orange-900'}`}>
                                {nextExam.name} Countdown
                            </h4>
                            <p className={`text-xs font-bold ${isDarkMode ? 'text-orange-400/70' : 'text-orange-800/70'}`}>
                                Upcoming on {new Date(nextExam.start_time).toLocaleDateString('en-IN', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <div className="ml-auto px-4 py-2 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-[5px] shadow-lg shadow-orange-500/30">
                            {(() => {
                                const diff = new Date(nextExam.start_time) - new Date();
                                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                return days <= 0 ? 'Starts Today' : `${days} Days Left`;
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;

