import React, { useState, useEffect, useCallback } from 'react';
import {
    LayoutDashboard, Users, Calendar,
    Bell, LogOut, CheckCircle, Clock,
    FileText, User, ClipboardList, BookMarked, Star,
    Trophy, ArrowRightLeft, UserCheck, BarChart2, Gift, UserX, GraduationCap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PortalLayout from '../../components/common/PortalLayout';

// Standard Sub-components
import SolveDoubt from '../../system/doubt/SolveDoubt';
import TeacherOverview from './components/TeacherOverview';
import TeacherClasses from './components/TeacherClasses';
import TeacherPerformance from './components/TeacherPerformance';
import TeacherProfile from './components/TeacherProfile';
import TeacherNotifications from './components/TeacherNotifications';

// New Requirement & Progress Report Tabs
import TopperRankTab from '../../components/tabs/TopperRankTab';
import MentorshipConversionTab from '../../components/tabs/MentorshipConversionTab';
import PTMHistoryTab from '../../components/tabs/PTMHistoryTab';
import TestAnalysisTab from '../../components/tabs/TestAnalysisTab';
import ReferralsCollectedTab from '../../components/tabs/ReferralsCollectedTab';
import DCStoppedTab from '../../components/tabs/DCStoppedTab';
import TeacherTrainingTab from '../../components/tabs/TeacherTrainingTab';

const TeacherDashboard = () => {
    const { user, logout, token, getApiUrl } = useAuth();
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Overview');
    const [isLoading, setIsLoading] = useState(true);
    const [unsolvedCount, setUnsolvedCount] = useState(0);
    const [unseenFeedbackCount, setUnseenFeedbackCount] = useState(0);
    const [inProgressReferralCount, setInProgressReferralCount] = useState(0);

    const fetchUnsolvedCount = useCallback(async () => {
        try {
            const tokenVal = token || localStorage.getItem('auth_token');
            if (!tokenVal) return;
            // Use the lightweight count endpoint instead of fetching all doubts
            const response = await fetch(`${getApiUrl()}/api/doubts/unassigned_count/`, {
                headers: { 'Authorization': `Bearer ${tokenVal}` }
            });
            const data = await response.json();
            setUnsolvedCount(data.count || 0);
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

    const fetchReferralCount = useCallback(async () => {
        try {
            const tokenVal = token || localStorage.getItem('auth_token');
            if (!tokenVal) return;
            const response = await fetch(`${getApiUrl()}/api/referrals/`, {
                headers: { 'Authorization': `Bearer ${tokenVal}` }
            });
            const data = await response.json();
            const list = data?.data || (Array.isArray(data) ? data : []);
            const inProgress = list.filter(r => r.conversion_status !== 'Admitted' && r.conversion_status !== 'Dropped').length;
            setInProgressReferralCount(inProgress);
        } catch (err) {
            console.error(err);
        }
    }, [token, getApiUrl]);

    useEffect(() => {
        setTimeout(() => setIsLoading(false), 800);
        fetchUnsolvedCount();
        fetchFeedbackCount();
        fetchReferralCount();
        // Poll every 60 seconds instead of 15 — badge counts don't need to be real-time
        const interval = setInterval(() => {
            fetchUnsolvedCount();
            fetchFeedbackCount();
            fetchReferralCount();
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchUnsolvedCount, fetchFeedbackCount, fetchReferralCount]);

    // Note: Removed tab-change re-fetch — badge counts update on the 60s interval only.

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
        },
        {
            label: 'Topper Ranks',
            icon: Trophy,
            active: activeTab === 'Topper Ranks',
            onClick: () => setActiveTab('Topper Ranks')
        },
        {
            label: 'Mentorship & Conversion',
            icon: ArrowRightLeft,
            active: activeTab === 'Mentorship & Conversion',
            onClick: () => setActiveTab('Mentorship & Conversion')
        },
        {
            label: 'PTM History',
            icon: Users,
            active: activeTab === 'PTM History',
            onClick: () => setActiveTab('PTM History')
        },
        {
            label: 'Test Analysis',
            icon: BarChart2,
            active: activeTab === 'Test Analysis',
            onClick: () => setActiveTab('Test Analysis')
        },
        {
            label: 'Referrals Collected',
            icon: Gift,
            active: activeTab === 'Referrals Collected',
            badge: inProgressReferralCount > 0 ? inProgressReferralCount : null,
            onClick: () => setActiveTab('Referrals Collected')
        },
        {
            label: 'DC Stopped Students',
            icon: UserX,
            active: activeTab === 'DC Stopped Students',
            onClick: () => setActiveTab('DC Stopped Students')
        },
        {
            label: 'Teacher Training',
            icon: GraduationCap,
            active: activeTab === 'Teacher Training',
            onClick: () => setActiveTab('Teacher Training')
        },
        {
            label: 'Performance',
            icon: Star,
            active: activeTab === 'Performance',
            onClick: () => setActiveTab('Performance')
        },
        {
            label: 'Profile',
            icon: User,
            active: activeTab === 'Profile',
            onClick: () => setActiveTab('Profile')
        },
        {
            label: 'Notifications',
            icon: Bell,
            active: activeTab === 'Notifications',
            onClick: () => setActiveTab('Notifications')
        }
    ], [activeTab, unsolvedCount, inProgressReferralCount]);

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
        'Overview', 'My Classes', 'Doubt Portal',
        'Topper Ranks', 'Mentorship & Conversion',
        'PTM History', 'Test Analysis', 'Referrals Collected', 'DC Stopped Students',
        'Teacher Training', 'Performance', 'Profile', 'Notifications'
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
                {visitedTabs.has('Doubt Portal') && (
                    <div className={activeTab === 'Doubt Portal' ? 'block' : 'hidden'}>
                        <SolveDoubt accentColor="cyan" />
                    </div>
                )}
                {visitedTabs.has('Topper Ranks') && (
                    <div className={activeTab === 'Topper Ranks' ? 'block' : 'hidden'}>
                        <TopperRankTab />
                    </div>
                )}
                {visitedTabs.has('Mentorship & Conversion') && (
                    <div className={activeTab === 'Mentorship & Conversion' ? 'block' : 'hidden'}>
                        <MentorshipConversionTab />
                    </div>
                )}
                {visitedTabs.has('PTM History') && (
                    <div className={activeTab === 'PTM History' ? 'block' : 'hidden'}>
                        <PTMHistoryTab />
                    </div>
                )}
                {visitedTabs.has('Test Analysis') && (
                    <div className={activeTab === 'Test Analysis' ? 'block' : 'hidden'}>
                        <TestAnalysisTab />
                    </div>
                )}
                {visitedTabs.has('Referrals Collected') && (
                    <div className={activeTab === 'Referrals Collected' ? 'block' : 'hidden'}>
                        <ReferralsCollectedTab />
                    </div>
                )}
                {visitedTabs.has('DC Stopped Students') && (
                    <div className={activeTab === 'DC Stopped Students' ? 'block' : 'hidden'}>
                        <DCStoppedTab />
                    </div>
                )}
                {visitedTabs.has('Teacher Training') && (
                    <div className={activeTab === 'Teacher Training' ? 'block' : 'hidden'}>
                        <TeacherTrainingTab />
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
