import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, Calendar, BookOpen,
    Bell, Settings, LogOut, CheckCircle, Clock,
    FileText, User, ClipboardList, BookMarked
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PortalLayout from '../../components/common/PortalLayout';

// Sub-components
import TeacherOverview from './components/TeacherOverview';
import TeacherClasses from './components/TeacherClasses';
import TeacherStudents from './components/TeacherStudents';

const TeacherDashboard = () => {
    const { user, logout } = useAuth();
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
            case 'Student Registry':
                return <TeacherStudents />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10">
                        <div className="w-20 h-20 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-6">
                            <Clock size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Coming Soon</h2>
                        <p className="text-slate-500 text-sm mt-2 font-black uppercase tracking-[0.2em]">Module: {activeTab}</p>
                    </div>
                );
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0D1117] text-white">
                <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black uppercase tracking-[0.5em] animate-pulse">Synchronizing Session</p>
            </div>
        );
    }

    return (
        <PortalLayout
            sidebarItems={sidebarItems}
            title={activeTab}
            subtitle={`Academic Portal • Faculty Console`}
        >
            <div className="animate-in fade-in duration-500">
                {renderContent()}
            </div>
        </PortalLayout>
    );
};

export default TeacherDashboard;
