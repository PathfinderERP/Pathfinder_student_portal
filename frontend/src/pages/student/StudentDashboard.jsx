import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, User, CheckSquare, FileText,
    TrendingUp, Activity, AlertCircle, BookOpen,
    BarChart2, Brain, Calendar, Users, ChevronRight,
    GraduationCap, Clock, CalendarDays, Flame,
    Target, Book, Zap, Award, LogOut, Bell, Beaker
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import MyProfile from './components/MyProfile';
import Attendance from './components/Attendance';
import Classes from './components/Classes';
import Exams from './components/Exams';
import Performance from './components/Performance';
import Grievances from './components/Grievances';
import SWOTAnalysis from './components/SWOTAnalysis';
import StudyMaterials from './components/StudyMaterials';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import AIInsights from './components/AIInsights';
import StudyPlanner from './components/StudyPlanner';
import NoticeBoard from './components/NoticeBoard';
import Scholarlab from './components/Scholarlab';


import PortalLayout from '../../components/common/PortalLayout';

const StudentDashboard = () => {
    const { user, logout, token, getApiUrl, loading: authLoading } = useAuth();
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data Caching for Tabs
    const [classesCache, setClassesCache] = useState({ data: [], loaded: false });
    const [attendanceCache, setAttendanceCache] = useState({ data: null, loaded: false });
    const [studyMaterialsCache, setStudyMaterialsCache] = useState({ data: [], loaded: false });

    // Fetch Student Data from backend API (which proxies to ERP)
    useEffect(() => {
        const fetchStudentData = async () => {
            if (authLoading) return;
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const apiUrl = getApiUrl();
                if (!token) {
                    setError("Authentication required. Please log in again.");
                    setLoading(false);
                    return;
                }
                const response = await axios.get(`${apiUrl}/api/student/erp-data/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data) {
                    setStudentData(response.data);
                } else {
                    setError("No student data received from server.");
                }
            } catch (err) {
                console.error("Error fetching student data:", err);
                if (err.response?.status === 404) {
                    setError("Your student record could not be found. Please contact support.");
                } else if (err.response?.status === 503) {
                    setError("Unable to connect to Student Records System. Please try again later.");
                } else if (err.response?.status === 401) {
                    setError("Session expired. Please log in again.");
                } else {
                    setError(err.response?.data?.error || "Failed to load student profile.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchStudentData();
    }, [user, token, getApiUrl, authLoading]);

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'My Profile', icon: User },
        { name: 'Classes', icon: CalendarDays },
        { name: 'Attendance', icon: CheckSquare },
        { name: 'Exams', icon: FileText },
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
            <div className={`min-h-screen flex flex-col items-center justify-center space-y-8 ${isDarkMode ? 'bg-[#0B0F15] text-white' : 'bg-[#F2F5F8] text-slate-900'}`}>
                <div className="relative">
                    <div className="w-24 h-24 border-8 border-orange-500/10 border-t-orange-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap size={32} className="text-orange-500 animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="font-black uppercase tracking-[0.4em] text-sm text-orange-500 mb-2">Syncing ERP Data</p>
                    <p className="text-xs font-bold opacity-40">Authenticating with Pathfinder ERP Systems...</p>
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
    const basicInfo = studentData.student.studentsDetails.find(d => (user.email && d.studentEmail?.toLowerCase() === user.email.toLowerCase()) || d.studentEmail?.toLowerCase() === user.username.toLowerCase()) || studentData.student.studentsDetails[0];
    const rollNo = studentData.admissionNumber || "N/A";
    const classNameValue = studentData.class?.name || "N/A";

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <DashboardHome isDarkMode={isDarkMode} student={basicInfo} rollNo={rollNo} className={classNameValue} />;
            case 'My Profile':
                return <MyProfile isDarkMode={isDarkMode} studentData={studentData} />;
            case 'Classes':
                return <Classes isDarkMode={isDarkMode} cache={classesCache} setCache={setClassesCache} />;
            case 'Attendance':
                return <Attendance isDarkMode={isDarkMode} cache={attendanceCache} setCache={setAttendanceCache} />;
            case 'Exams':
                return <Exams isDarkMode={isDarkMode} />;
            case 'Performance':
                return <Performance isDarkMode={isDarkMode} />;
            case 'Grievances':
                return <Grievances isDarkMode={isDarkMode} />;
            case 'SWOT Analysis':
                return <SWOTAnalysis isDarkMode={isDarkMode} />;
            case 'Study Materials':
                return <StudyMaterials isDarkMode={isDarkMode} cache={studyMaterialsCache} setCache={setStudyMaterialsCache} />;
            case 'Scholarlab':
                return <Scholarlab isDarkMode={isDarkMode} />;
            case 'Advanced Analytics':
                return <AdvancedAnalytics isDarkMode={isDarkMode} />;
            case 'AI Insights':
                return <AIInsights isDarkMode={isDarkMode} />;
            case 'Study Planner':
                return <StudyPlanner isDarkMode={isDarkMode} />;
            case 'Notice Board':
                return <NoticeBoard isDarkMode={isDarkMode} />;

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

    return (
        <PortalLayout
            title={activeTab}
            subtitle="Student Learning Portal"
            sidebarItems={sidebarItems}
        >
            {renderContent()}
        </PortalLayout>
    );
};

// -- DASHBOARD HOME COMPONENT --
const DashboardHome = ({ isDarkMode, student, rollNo, className }) => {
    const stats = [
        { label: 'ATTENDANCE RATE', value: '92%', subtext: '37 of 40 classes | 3 absences', trend: '+1.2%', trendUp: true, color: 'blue', icon: Activity },
        { label: 'CURRENT GPA', value: '8.5/10', subtext: 'Rank: 5th of 60 students', trend: '+0.3', trendUp: true, color: 'indigo', icon: GraduationCap },
        { label: 'NEXT EXAM', value: 'PHYSICS', subtext: '5 days | 10:00 AM - 1:00 PM', pill: 'Preparation: 75%', color: 'orange', icon: CalendarDays },
        { label: 'STUDY STREAK', value: '12 days', subtext: 'Keep it up!', pill: 'Avg: 2.5 hrs/day', color: 'purple', icon: Flame },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-dashed border-slate-200/50 dark:border-white/5">
                <div>
                    <h1 className={`text-3xl md:text-4xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Welcome Back, {student.studentName.split(' ')[0]}!
                    </h1>
                    <p className={`text-sm md:text-base font-medium ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>
                        Here's your comprehensive learning snapshot & AI-powered insights for today
                    </p>
                </div>
                <div className={`flex items-center gap-3 px-5 py-2.5 rounded-[5px] border shadow-lg backdrop-blur-md
                    ${isDarkMode ? 'bg-[#151A25]/80 border-white/10 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-600'}`}>
                    <span className="font-bold">{className}</span>
                    <span className={`w-1.5 h-1.5 rounded-[5px] ${isDarkMode ? 'bg-slate-500' : 'bg-slate-300'}`}></span>
                    <span className="text-sm">Roll: {rollNo.slice(-3)}</span>
                    <div className={`ml-2 w-8 h-8 rounded-[5px] flex items-center justify-center text-xs font-bold ${isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'}`}>
                        {student.studentName.match(/\b(\w)/g).join('')}
                    </div>
                </div>
            </div>

            {/* Stats Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className={`p-6 rounded-[5px] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group
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

