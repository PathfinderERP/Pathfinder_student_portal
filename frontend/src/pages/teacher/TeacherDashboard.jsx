import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, Calendar, BookOpen,
    Bell, Settings, LogOut, CheckCircle, Clock,
    FileText, User, ClipboardList, BookMarked
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PortalLayout from '../../components/common/PortalLayout';

// Sub-components
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
    const { user, logout } = useAuth();
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Overview');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initial setup/data fetching could happen here
        setTimeout(() => setIsLoading(false), 800);
    }, []);

    const sidebarItems = [
        {
            label: 'Overview',
            icon: LayoutDashboard,
            active: activeTab === 'Overview',
            onClick: () => setActiveTab('Overview')
        },
        {
            label: 'Academics',
            icon: BookOpen,
            subItems: [
                {
                    label: 'My Classes',
                    icon: Calendar,
                    active: activeTab === 'My Classes',
                    onClick: () => setActiveTab('My Classes')
                },
                {
                    label: 'Curriculum',
                    icon: BookMarked,
                    active: activeTab === 'Curriculum',
                    onClick: () => setActiveTab('Curriculum')
                },
                {
                    label: 'Study Materials',
                    icon: FileText,
                    active: activeTab === 'Study Materials',
                    onClick: () => setActiveTab('Study Materials')
                }
            ]
        },
        {
            label: 'Student Management',
            icon: Users,
            subItems: [
                {
                    label: 'Student Registry',
                    icon: User,
                    active: activeTab === 'Student Registry',
                    onClick: () => setActiveTab('Student Registry')
                },
                {
                    label: 'Attendance',
                    icon: CheckCircle,
                    active: activeTab === 'Attendance',
                    onClick: () => setActiveTab('Attendance')
                },
                {
                    label: 'Performance',
                    icon: ClipboardList,
                    active: activeTab === 'Performance',
                    onClick: () => setActiveTab('Performance')
                }
            ]
        },
        {
            label: 'Administration',
            icon: Settings,
            subItems: [
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
                },
                {
                    label: 'Settings',
                    icon: Settings,
                    active: activeTab === 'Settings',
                    onClick: () => setActiveTab('Settings')
                }
            ]
        }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'Overview':
                return <TeacherOverview user={user} />;
            case 'My Classes':
                return <TeacherClasses />;
            case 'Curriculum':
                return <TeacherCurriculum />;
            case 'Study Materials':
                return <TeacherStudyMaterials />;
            case 'Student Registry':
                return <TeacherStudents />;
            case 'Attendance':
                return <TeacherAttendance />;
            case 'Performance':
                return <TeacherPerformance />;
            case 'Profile':
                return <TeacherProfile user={user} />;
            case 'Notifications':
                return <TeacherNotifications />;
            case 'Settings':
                return <TeacherSettings />;
            default:
                return (
                    <div className={`flex flex-col items-center justify-center py-20 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <div className={`w-20 h-20 rounded-[5px] flex items-center justify-center mb-6 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-cyan-100 text-cyan-600'}`}>
                            <Clock size={40} />
                        </div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Coming Soon</h2>
                        <p className="text-slate-500 text-sm mt-2 font-black uppercase tracking-[0.2em]">Module: {activeTab}</p>
                    </div>
                );
        }
    };

    if (isLoading) {
        return (
            <div className={`h-screen w-full flex flex-col items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-white text-slate-900'}`}>
                <div className={`w-16 h-16 border-4 rounded-full animate-spin mb-4 ${isDarkMode ? 'border-cyan-500/20 border-t-cyan-500' : 'border-cyan-200 border-t-cyan-600'}`}></div>
                <p className="text-xs font-black uppercase tracking-[0.5em] animate-pulse">Synchronizing Session</p>
            </div>
        );
    }

    return (
        <PortalLayout
            sidebarItems={sidebarItems}
            title={activeTab}
            subtitle={`Academic Portal • ${user?.role_label || 'User'} Console`}
            accentColor="cyan"
        >
            <div className="animate-in fade-in duration-500">
                {renderContent()}
            </div>
        </PortalLayout>
    );
};

export default TeacherDashboard;
