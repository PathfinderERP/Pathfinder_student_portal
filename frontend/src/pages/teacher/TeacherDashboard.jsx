import React, { useState, useEffect, useCallback } from 'react';
import {
    LayoutDashboard, Users, Calendar, BookOpen,
    Bell, Settings, LogOut, CheckCircle, Clock,
    FileText, User, ClipboardList, BookMarked, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PortalLayout from '../../components/common/PortalLayout';

// Sub-components
import SolveDoubt from '../../system/doubt/SolveDoubt';
import TeacherOverview from './components/TeacherOverview';
import TeacherClasses from './components/TeacherClasses';
import TeacherStudents from './components/TeacherStudents';
import TeacherCurriculum from './components/TeacherCurriculum';
import TeacherStudyMaterials from './components/TeacherStudyMaterials';
import TeacherAttendance from './components/TeacherAttendance';
import TeacherPerformance from './components/TeacherPerformance';
import TeacherProfile from './components/TeacherProfile';
import TeacherNotifications from './components/TeacherNotifications';
import TeacherSettings from './components/TeacherSettings';
const TeacherDashboard = () => {
    const { user, logout, token, getApiUrl } = useAuth();
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Overview');
    const [isLoading, setIsLoading] = useState(true);
    const [unsolvedCount, setUnsolvedCount] = useState(0);
    const [unseenFeedbackCount, setUnseenFeedbackCount] = useState(0);

    const fetchUnsolvedCount = useCallback(async () => {
        try {
            const tokenVal = token || localStorage.getItem('auth_token');
            if (!tokenVal) return;
            const response = await fetch(`${getApiUrl()}/api/doubts/`, {
                headers: { 'Authorization': `Bearer ${tokenVal}` }
            });
            const data = await response.json();
            const count = data.filter(d => d.status === 'Assign').length;
            setUnsolvedCount(count);
        } catch (err) {
            console.error(err);
        }
    }, [token, getApiUrl]);

    const fetchFeedbackCount = useCallback(async () => {
        try {
            const tokenVal = token || localStorage.getItem('auth_token');
            if (!tokenVal) return;
            const response = await fetch(`${getApiUrl()}/api/class-feedback/`, {
                headers: { 'Authorization': `Bearer ${tokenVal}` }
            });
            const data = await response.json();
            
            const lastSeenTime = localStorage.getItem('last_seen_feedback_time');
            if (!lastSeenTime) {
                setUnseenFeedbackCount(data.length);
            } else {
                const unseen = data.filter(f => f.created_at && new Date(f.created_at) > new Date(lastSeenTime)).length;
                setUnseenFeedbackCount(unseen);
            }
        } catch (err) {
            console.error(err);
        }
    }, [token, getApiUrl]);

    useEffect(() => {
        setTimeout(() => setIsLoading(false), 800);
        fetchUnsolvedCount();
        fetchFeedbackCount();
        const interval = setInterval(() => {
            fetchUnsolvedCount();
            fetchFeedbackCount();
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchUnsolvedCount, fetchFeedbackCount]);

    // Refresh count when activeTab changes (e.g. teacher resolves a doubt)
    useEffect(() => {
        fetchUnsolvedCount();
        fetchFeedbackCount();
    }, [activeTab, fetchUnsolvedCount, fetchFeedbackCount]);

    const sidebarItems = React.useMemo(() => [
        {
            label: 'Overview',
            icon: LayoutDashboard,
            active: activeTab === 'Overview',
            onClick: () => setActiveTab('Overview')
        },
        {
            label: 'My Classes',
            icon: Calendar,
            active: activeTab === 'My Classes',
            onClick: () => setActiveTab('My Classes')
        },
        {
            label: 'Doubt Portal',
            icon: ClipboardList,
            active: activeTab === 'Doubt Portal',
            onClick: () => setActiveTab('Doubt Portal'),
            badge: unsolvedCount > 0 ? unsolvedCount : null
        }
    ], [activeTab, unsolvedCount]);

    const [visitedTabs, setVisitedTabs] = useState(new Set(['Overview']));

    useEffect(() => {
        setVisitedTabs(prev => {
            if (prev.has(activeTab)) return prev;
            const next = new Set(prev);
            next.add(activeTab);
            return next;
        });
    }, [activeTab]);

    if (isLoading) {
        return (
            <div className={`h-screen w-full flex flex-col items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-white text-slate-900'}`}>
                <div className={`w-16 h-16 border-4 rounded-full animate-spin mb-4 ${isDarkMode ? 'border-cyan-500/20 border-t-cyan-500' : 'border-cyan-200 border-t-cyan-600'}`}></div>
                <p className="text-xs font-black uppercase tracking-[0.5em] animate-pulse">Synchronizing Session</p>
            </div>
        );
    }

    const knownTabs = [
        'Overview', 'My Classes', 'Curriculum', 'Study Materials',
        'Doubt Portal', 'Student Registry', 'Attendance', 'Performance',
        'Profile', 'Notifications', 'Settings'
    ];

    return (
        <PortalLayout
            sidebarItems={sidebarItems}
            title={activeTab}
            subtitle={`Academic Portal • ${user?.role_label || 'User'} Console`}
            accentColor="cyan"
        >
            <div className="animate-in fade-in duration-300">
                {visitedTabs.has('Overview') && (
                    <div className={activeTab === 'Overview' ? 'block' : 'hidden'}>
                        <TeacherOverview user={user} />
                    </div>
                )}
                {visitedTabs.has('My Classes') && (
                    <div className={activeTab === 'My Classes' ? 'block' : 'hidden'}>
                        <TeacherClasses />
                    </div>
                )}
                {visitedTabs.has('Curriculum') && (
                    <div className={activeTab === 'Curriculum' ? 'block' : 'hidden'}>
                        <TeacherCurriculum />
                    </div>
                )}
                {visitedTabs.has('Study Materials') && (
                    <div className={activeTab === 'Study Materials' ? 'block' : 'hidden'}>
                        <TeacherStudyMaterials />
                    </div>
                )}
                {visitedTabs.has('Doubt Portal') && (
                    <div className={activeTab === 'Doubt Portal' ? 'block' : 'hidden'}>
                        <SolveDoubt />
                    </div>
                )}
                {visitedTabs.has('Student Registry') && (
                    <div className={activeTab === 'Student Registry' ? 'block' : 'hidden'}>
                        <TeacherStudents />
                    </div>
                )}
                {visitedTabs.has('Attendance') && (
                    <div className={activeTab === 'Attendance' ? 'block' : 'hidden'}>
                        <TeacherAttendance />
                    </div>
                )}
                {visitedTabs.has('Performance') && (
                    <div className={activeTab === 'Performance' ? 'block' : 'hidden'}>
                        <TeacherPerformance />
                    </div>
                )}
                {visitedTabs.has('Profile') && (
                    <div className={activeTab === 'Profile' ? 'block' : 'hidden'}>
                        <TeacherProfile user={user} />
                    </div>
                )}
                {visitedTabs.has('Notifications') && (
                    <div className={activeTab === 'Notifications' ? 'block' : 'hidden'}>
                        <TeacherNotifications />
                    </div>
                )}
                {visitedTabs.has('Settings') && (
                    <div className={activeTab === 'Settings' ? 'block' : 'hidden'}>
                        <TeacherSettings />
                    </div>
                )}
                {!knownTabs.includes(activeTab) && (
                    <div className={`flex flex-col items-center justify-center py-20 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <div className={`w-20 h-20 rounded-[5px] flex items-center justify-center mb-6 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-cyan-100 text-cyan-600'}`}>
                            <Clock size={40} />
                        </div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Coming Soon</h2>
                        <p className="text-slate-500 text-sm mt-2 font-black uppercase tracking-[0.2em]">Module: {activeTab}</p>
                    </div>
                )}
            </div>
        </PortalLayout>
    );
};

export default TeacherDashboard;
