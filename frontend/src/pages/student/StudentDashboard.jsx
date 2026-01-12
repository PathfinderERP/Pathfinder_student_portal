import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, User, CheckSquare, FileText,
    TrendingUp, Activity, AlertCircle, BookOpen,
    BarChart2, Brain, Calendar, Users, ChevronRight,
    GraduationCap, Clock, CalendarDays, Flame,
    Target, Book, Zap, Award, LogOut
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch Student Data from ERP based on logged-in user's email
    useEffect(() => {
        const fetchStudentData = async () => {
            if (!user) return;

            // Helper function to perform ERP login and return token
            const loginToErp = async () => {
                console.log("Authenticating with ERP...");
                if (!import.meta.env.VITE_ERP_API_URL) {
                    console.warn("VITE_ERP_API_URL is not set, using fallback.");
                }
                const erpBaseUrl = import.meta.env.VITE_ERP_API_URL || 'https://pathfinder-5ri2.onrender.com';

                const loginRes = await axios.post(`${erpBaseUrl}/api/superAdmin/login`, {
                    email: "atanu@gmail.com",
                    password: "000000"
                });

                if (loginRes.data && loginRes.data.token) {
                    return loginRes.data.token;
                } else {
                    throw new Error("ERP Login returned no token");
                }
            };

            const searchEmail = user.email || user.username;
            console.log("Fetching ERP data for:", searchEmail);
            const erpUrl = import.meta.env.VITE_ERP_API_URL || 'https://pathfinder-5ri2.onrender.com';

            setLoading(true);
            setError(null);

            try {
                let erpToken = localStorage.getItem('erp_token');
                let admissions = null;

                // Function to fetch admissions with a given token
                const getAdmissions = async (token) => {
                    return await axios.get(`${erpUrl}/api/admission`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                };

                // Attempt 1: Try with existing token if available
                if (erpToken) {
                    try {
                        const response = await getAdmissions(erpToken);
                        admissions = response.data;
                    } catch (fetchErr) {
                        // If 401, token is invalid/expired. We will need to re-login.
                        if (fetchErr.response && fetchErr.response.status === 401) {
                            console.log("ERP Token expired or invalid. Re-authenticating...");
                            erpToken = null; // Force re-login
                        } else {
                            throw fetchErr; // Other errors are fatal
                        }
                    }
                }

                // Attempt 2: Login if no token or previous attempt failed with 401
                if (!erpToken) {
                    try {
                        erpToken = await loginToErp();
                        localStorage.setItem('erp_token', erpToken); // Cache new token
                        const response = await getAdmissions(erpToken);
                        admissions = response.data;
                    } catch (loginOrFetchErr) {
                        console.error("Failed to authenticate or fetch data from ERP:", loginOrFetchErr);
                        throw new Error("Unable to connect to Student Records System.");
                    }
                }

                // Process Data
                if (admissions) {
                    const foundStudent = admissions.find(admission =>
                        admission.student?.studentsDetails?.some(detail =>
                            detail.studentEmail?.toLowerCase() === searchEmail.toLowerCase()
                        )
                    );

                    if (foundStudent) {
                        setStudentData(foundStudent);
                    } else {
                        console.warn("Student email not found in ERP Records:", searchEmail);
                        setError("Your student record could not be found. Please contact support.");
                    }
                }
            } catch (err) {
                console.error("Critical Error in Student Data Sync:", err);
                setError(err.message || "Failed to load student profile.");
            } finally {
                setLoading(false);
            }
        };

        fetchStudentData();
    }, [user]);

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0B0F15] text-white' : 'bg-[#F2F5F8] text-slate-900'}`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold animate-pulse">Syncing Student Profile...</p>
                </div>
            </div>
        );
    }

    if (!studentData && !loading) {
        // Fallback to purely existing user data if ERP sync fails completely, 
        // OR show a nice error state. For now, showing error.
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0B0F15] text-white' : 'bg-[#F2F5F8] text-slate-900'}`}>
                <div className="text-center max-w-md p-8 rounded-3xl border border-red-500/20 bg-red-500/5">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                    <h2 className="text-2xl font-black mb-2">Profile Sync Issue</h2>
                    <p className="text-sm opacity-70 mb-6">{error || "Could not match your account with school records."}</p>
                    <button onClick={logout} className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold text-sm">Logout</button>
                </div>
            </div>
        );
    }

    // Extract Details safely
    // Since we found the admission object, we grab basic info
    const basicInfo = studentData.student.studentsDetails.find(d => (user.email && d.studentEmail?.toLowerCase() === user.email.toLowerCase()) || d.studentEmail?.toLowerCase() === user.username.toLowerCase()) || studentData.student.studentsDetails[0];
    const className = studentData.class?.name || "N/A";
    const rollNo = studentData.admissionNumber || "N/A";

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'My Profile', icon: User },
        { name: 'Attendance', icon: CheckSquare },
        { name: 'Exams', icon: FileText },
        { name: 'Performance', icon: TrendingUp },
        { name: 'SWOT Analysis', icon: Target },
        { name: 'Grievances', icon: AlertCircle },
        { name: 'Study Materials', icon: BookOpen },
        { name: 'Advanced Analytics', icon: BarChart2 },
        { name: 'AI Insights', icon: Brain },
        { name: 'Study Planner', icon: Calendar },
        { name: 'Parent Portal', icon: Users },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <DashboardHome isDarkMode={isDarkMode} student={basicInfo} className={className} rollNo={rollNo} />;
            default:
                return (
                    <div className={`flex flex-col items-center justify-center h-[60vh] text-center p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#10141D] border-white/5 text-slate-500' : 'bg-white border-slate-100 text-slate-400'}`}>
                        <div className={`w-20 h-20 rounded-3xl mb-6 flex items-center justify-center ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                            <Book size={40} className="opacity-50" />
                        </div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{activeTab}</h2>
                        <p>This module is currently under development.</p>
                    </div>
                );
        }
    };

    return (
        <div className={`min-h-screen flex transition-colors duration-300 ${isDarkMode ? 'bg-[#0B0F15] text-white' : 'bg-[#F2F5F8] text-slate-900'}`}>
            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full w-72 p-6 flex flex-col gap-8 border-r overflow-y-auto no-scrollbar hidden xl:flex z-50 transition-all
                ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>

                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-xl">
                        P
                    </div>
                    <div>
                        <h1 className="font-black text-lg tracking-tight uppercase leading-none">Pathfinder</h1>
                        <p className={`text-[10px] font-bold tracking-widest mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>STUDENT PORTAL</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => setActiveTab(item.name)}
                            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group relative overflow-hidden
                                ${activeTab === item.name
                                    ? (isDarkMode ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'bg-orange-600 text-white shadow-xl shadow-orange-600/30')
                                    : (isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')
                                }`}
                        >
                            <item.icon size={18} strokeWidth={2.5} className={activeTab === item.name ? 'animate-pulse' : ''} />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </nav>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                            {basicInfo.studentName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate text-sm">{basicInfo.studentName}</h4>
                            <p className="text-xs text-slate-500 truncate">{rollNo}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                        ${isDarkMode ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                    >
                        <LogOut size={14} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 xl:ml-72 p-6 md:p-10 max-w-[1920px] mx-auto w-full flex flex-col gap-6">
                <StudentHeader activeTab={activeTab} isDarkMode={isDarkMode} />
                {renderContent()}
            </main>
        </div>
    );
};

// -- HEADER COMPONENT --
const StudentHeader = ({ activeTab, isDarkMode }) => {
    const { toggleTheme } = useTheme();

    return (
        <header className={`flex items-center justify-between py-4 px-6 rounded-[2rem] border transition-all
            ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
            <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {activeTab}
            </h2>

            <button
                onClick={toggleTheme}
                className={`p-3 rounded-xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-yellow-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
            >
                {isDarkMode ? '☀️' : '🌙'}
            </button>
        </header>
    );
};

// -- DASHBOARD HOME COMPONENT --
const DashboardHome = ({ isDarkMode, student, className, rollNo }) => {
    const stats = [
        { label: 'ATTENDANCE RATE', value: '92%', subtext: '37 of 40 classes | 3 absences', trend: '+1.2%', trendUp: true, color: 'blue', icon: Activity },
        { label: 'CURRENT GPA', value: '8.5/10', subtext: 'Rank: 5th of 60 students', trend: '+0.3', trendUp: true, color: 'emerald', icon: GraduationCap },
        { label: 'NEXT EXAM', value: 'PHYSICS', subtext: '5 days | 10:00 AM - 1:00 PM', pill: 'Preparation: 75%', color: 'orange', icon: CalendarDays },
        { label: 'STUDY STREAK', value: '12 days', subtext: 'Keep it up!', pill: 'Avg: 2.5 hrs/day', color: 'purple', icon: Flame },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-dashed border-slate-200/50 dark:border-white/5">
                <div>
                    <h1 className={`text-3xl md:text-4xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Welcome Back, {student.studentName.split(' ')[0]}! 👋
                    </h1>
                    <p className={`text-sm md:text-base font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Here's your comprehensive learning snapshot & AI-powered insights for today
                    </p>
                </div>
                <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border shadow-lg backdrop-blur-md
                    ${isDarkMode ? 'bg-[#151A25]/80 border-white/10 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-600'}`}>
                    <span className="font-bold">{className}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-slate-500' : 'bg-slate-300'}`}></span>
                    <span className="text-sm">Roll: {rollNo.slice(-3)}</span>
                    <div className={`ml-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'}`}>
                        {student.studentName.match(/\b(\w)/g).join('')}
                    </div>
                </div>
            </div>

            {/* Stats Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className={`p-6 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group
                        ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>

                        <div className={`mb-4 flex items-center justify-between`}>
                            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {stat.label}
                            </h3>
                            <div className={`p-2 rounded-lg ${stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                                stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                                    stat.color === 'orange' ? 'bg-orange-500/10 text-orange-500' :
                                        'bg-purple-500/10 text-purple-500'
                                }`}>
                                <stat.icon size={16} />
                            </div>
                        </div>

                        <div className={`text-3xl font-black tracking-tight mb-2 ${stat.color === 'blue' ? 'text-blue-500' :
                            stat.color === 'emerald' ? 'text-emerald-500' :
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
                            <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${i === 0 ? 'bg-blue-500 w-[92%]' : 'bg-emerald-500 w-[85%]'}`}></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Row 2: Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strong Subject */}
                <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden
                    ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-emerald-900/5'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Zap size={120} />
                    </div>
                    <div className="relative z-10">
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Strong Subject</h3>
                        <div className="text-4xl font-black text-emerald-500 mb-2">CHEMISTRY</div>
                        <p className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Average: 88%</p>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-lg w-fit">
                            <CheckSquare size={14} />
                            Consistently Excellent
                        </div>
                    </div>
                </div>

                {/* Needs Focus */}
                <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden
                    ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-red-900/5'}`}>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Target size={120} />
                    </div>
                    <div className="relative z-10">
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Needs Focus</h3>
                        <div className="text-4xl font-black text-red-500 mb-2">MATHEMATICS</div>
                        <p className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Average: 78%</p>
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-lg w-fit">
                            <Brain size={14} />
                            AI recommends extra practice
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Performance Trend (Simulated Chart) */}
            <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                <div className="flex items-center justify-between mb-8">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Performance Trend (Last 30 Days)</h3>
                </div>
                <div className="h-32 flex items-end justify-between gap-4">
                    {[30, 45, 35, 60, 50, 75, 55, 80].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end group">
                            <div
                                className={`w-full rounded-t-xl transition-all duration-500 hover:opacity-80
                                ${isDarkMode ? 'bg-cyan-700' : 'bg-[#2A7E8F]'}`}
                                style={{ height: `${h}%` }}
                            ></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom: Announcements */}
            <div className={`p-6 rounded-[2rem] border border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500 text-white rounded-lg">
                        <AlertCircle size={18} />
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isDarkMode ? 'text-orange-400' : 'text-orange-900'}`}>Physics Exam Countdown</h4>
                        <p className={`text-xs ${isDarkMode ? 'text-orange-400/70' : 'text-orange-800/70'}`}>Upcoming on Monday, 10:00 AM</p>
                    </div>
                    <div className="ml-auto px-3 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-full">
                        5 Days Left
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
