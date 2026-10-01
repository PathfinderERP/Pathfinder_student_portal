import React from 'react';
import {
    RefreshCw, MapPin, Layers, Users, Database, FilePlus, ChevronRight, FileText,
    Building2, Sparkles, BookOpen, GraduationCap, CheckCircle
} from 'lucide-react';

const DashboardOverview = ({
    isDarkMode,
    syncERP,
    isERPLoading,
    erpLoaded = false,
    erpStudentsCount,
    erpCentresCount,
    dashboardStats,
    setActiveTab,
    onNavigateMaster,
    currentUser,
    userAssignedCentres = [],
    hasPermission = () => true
}) => {
    const isSuperAdmin = currentUser?.user_type === 'superadmin';

    // Format assigned centre labels
    const assignedCentresList = Array.isArray(currentUser?.assigned_centres) && currentUser.assigned_centres.length > 0
        ? currentUser.assigned_centres
        : (Array.isArray(currentUser?.centres) && currentUser.centres.length > 0 ? currentUser.centres : []);

    const centreNames = assignedCentresList.map(c => typeof c === 'object' ? (c.name || c.code) : c);

    // Helper to format large numbers (e.g., 4200 -> 4.2k)
    const formatValue = (val) => {
        if (val === undefined || val === null) return 'N/A';
        if (val === 0) return '0';
        if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
        return val.toString();
    };

    // Construct raw stats list without any static dummy numbers
    const allStats = [
        { 
            id: 'centre_mgmt',
            label: isSuperAdmin ? 'TOTAL CENTRES' : (centreNames.length === 1 ? 'ASSIGNED BRANCH' : 'ASSIGNED BRANCHES'), 
            value: !isSuperAdmin && centreNames.length > 0
                ? (centreNames.length === 1 ? centreNames[0] : `${centreNames.length} Branches`)
                : (erpCentresCount > 0 ? erpCentresCount.toString() : (erpLoaded ? '0' : 'N/A')), 
            icon: Building2, 
            color: 'emerald', 
            trend: !isSuperAdmin && assignedCentresList.length > 0 ? 'Your designated branch' : (erpCentresCount > 0 ? 'Across active regions' : 'Live from ERP'),
            onClick: hasPermission('centre_mgmt') ? () => setActiveTab('Centre Management') : undefined,
            visible: isSuperAdmin || hasPermission('centre_mgmt') || assignedCentresList.length > 0 || !isSuperAdmin
        },
        { 
            id: 'admin_student',
            label: isSuperAdmin ? 'TOTAL STUDENTS' : 'ACTIVE STUDENTS', 
            value: erpStudentsCount > 0 ? erpStudentsCount.toString() : (erpLoaded ? '0' : 'N/A'), 
            icon: Users, 
            color: 'purple', 
            trend: !isSuperAdmin && assignedCentresList.length > 0 ? 'Active in your branch' : (erpStudentsCount > 0 ? 'Live from ERP' : 'Real-time synchronization'),
            onClick: () => setActiveTab('Admin Student'),
            visible: isSuperAdmin || hasPermission('admin_mgmt', 'admin_student') || hasPermission('student_activity') || !isSuperAdmin
        },
        { 
            id: 'section_mgmt',
            label: 'ACTIVE SECTIONS', 
            value: dashboardStats?.sections?.total !== undefined && dashboardStats?.sections?.total !== null
                ? dashboardStats.sections.total.toString() 
                : 'N/A', 
            icon: Layers, 
            color: 'blue', 
            trend: dashboardStats?.sections?.thisMonth > 0 ? `+${dashboardStats.sections.thisMonth} this month` : (dashboardStats?.sections?.total !== undefined ? 'All sections active' : 'Master Data'),
            onClick: () => onNavigateMaster('Section Management'),
            visible: isSuperAdmin || hasPermission('section_mgmt') || hasPermission('admin_mgmt', 'admin_master_data')
        },
        { 
            id: 'question_bank',
            label: 'QUESTION BANK', 
            value: dashboardStats?.questions?.total !== undefined && dashboardStats?.questions?.total !== null
                ? formatValue(dashboardStats.questions.total) 
                : 'N/A', 
            icon: Database, 
            color: 'orange', 
            trend: dashboardStats?.questions?.thisMonth > 0 ? `+${dashboardStats.questions.thisMonth} new this month` : (dashboardStats?.questions?.total !== undefined ? 'Categorized items' : 'Item bank repository'),
            onClick: () => setActiveTab('Question Bank'),
            visible: isSuperAdmin || hasPermission('question_bank')
        },
    ];

    // Filter stats based on permissions
    const visibleStats = allStats.filter(stat => stat.visible);

    // Action cards filtered by permission
    const allActions = [
        {
            id: 'test_create',
            title: 'Create New Test',
            desc: 'Set up a new assessment',
            icon: FilePlus,
            color: 'orange',
            onClick: () => setActiveTab('Test Create'),
            visible: isSuperAdmin || hasPermission('test_mgmt', 'test_create')
        },
        {
            id: 'chapter_test_results',
            title: 'Chapter Test Results',
            desc: 'View student performance analytics',
            icon: GraduationCap,
            color: 'blue',
            onClick: () => setActiveTab('Chapter Test Results'),
            visible: isSuperAdmin || hasPermission('test_mgmt', 'chapter_test_results')
        },
        {
            id: 'centre_mgmt',
            title: 'Manage Centres',
            desc: 'Configure training locations',
            icon: MapPin,
            color: 'slate',
            onClick: () => setActiveTab('Centre Management'),
            visible: isSuperAdmin || hasPermission('centre_mgmt')
        },
        {
            id: 'pen_paper_test',
            title: 'Pen Paper Test',
            desc: 'Offline test management',
            icon: FileText,
            color: 'purple',
            onClick: () => setActiveTab('Pen Paper Test'),
            visible: isSuperAdmin || hasPermission('content_mgmt', 'pen_paper_test')
        },
        {
            id: 'section_mgmt',
            title: 'Section Management',
            desc: 'Manage course sections & allotments',
            icon: Layers,
            color: 'blue',
            onClick: () => onNavigateMaster('Section Management'),
            visible: isSuperAdmin || hasPermission('section_mgmt') || hasPermission('admin_mgmt', 'admin_master_data')
        },
        {
            id: 'question_bank',
            title: 'Question Bank',
            desc: 'Browse categorized questions',
            icon: Database,
            color: 'orange',
            onClick: () => setActiveTab('Question Bank'),
            visible: isSuperAdmin || hasPermission('question_bank')
        }
    ];

    const visibleActions = allActions.filter(a => a.visible).slice(0, 3);

    return (
        <div className="space-y-8 animate-in zoom-in duration-300">
            {/* Dashboard Overview Banner */}
            <div className={`relative overflow-hidden p-8 md:p-10 rounded-[5px] shadow-2xl transition-all border
                ${isDarkMode
                    ? 'bg-gradient-to-r from-[#1A202C] to-[#111827] border-white/5'
                    : 'bg-gradient-to-br from-slate-50 to-white border-slate-100 shadow-orange-900/5'}`}>

                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500/10 blur-[100px] rounded-full"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest">
                            <Sparkles size={12} />
                            {isSuperAdmin ? 'SUPER ADMIN WORKSPACE' : `${(currentUser?.user_type || 'ADMIN').toUpperCase()} WORKSPACE`}
                        </div>
                        
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                            {isSuperAdmin ? (
                                <>CENTRAL <span className="text-orange-500 tracking-wider">COMMAND_</span></>
                            ) : (
                                <>BRANCH <span className="text-orange-500 tracking-wider">OPERATIONS_</span></>
                            )}
                        </h2>

                        <p className={`text-sm font-medium max-w-xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {isSuperAdmin
                                ? 'Welcome back. Here is your enterprise-wide real-time activity summary, branch roster, and system metrics.'
                                : `Welcome back, ${currentUser?.first_name || currentUser?.username || 'Admin'}. Showing data tailored for your assigned role and branch.`}
                        </p>

                        {/* Assigned Centre Badges for Branch Admins/Staff */}
                        {!isSuperAdmin && centreNames.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-[10px] font-black uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                                    <Building2 size={13} className="text-orange-500" />
                                    Active Branches:
                                </span>
                                {centreNames.map((cName, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold"
                                    >
                                        {cName}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <button
                            onClick={() => syncERP(true)}
                            disabled={isERPLoading}
                            className={`px-6 py-3 rounded-[5px] font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg
                                ${isERPLoading
                                    ? 'bg-orange-500/20 text-orange-500 cursor-not-allowed'
                                    : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'}`}
                        >
                            <RefreshCw size={16} className={isERPLoading ? 'animate-spin' : ''} />
                            <span>{isERPLoading ? 'Syncing...' : 'Sync with ERP'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            {visibleStats.length > 0 && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${visibleStats.length >= 4 ? 'lg:grid-cols-4' : visibleStats.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
                    {visibleStats.map((stat, i) => (
                        <div 
                            key={i} 
                            onClick={stat.onClick}
                            className={`relative overflow-hidden p-8 rounded-[5px] border transition-all duration-500 group hover:-translate-y-2 cursor-pointer
                            ${isDarkMode
                                ? `bg-[#0B0E14] border-white/5 shadow-2xl hover:bg-white/[0.02]`
                                : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-orange-500/10'}`}
                            style={{
                                boxShadow: stat.color === 'blue' ? `0 20px 40px -20px ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)'}` :
                                    stat.color === 'purple' ? `0 20px 40px -20px ${isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.4)'}` :
                                        stat.color === 'emerald' ? `0 20px 40px -20px ${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)'}` :
                                            `0 20px 40px -20px ${isDarkMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.4)'}`
                            }}
                        >
                            <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full transition-transform duration-700 ease-out group-hover:scale-110
                                ${stat.color === 'blue' ? 'bg-blue-500/10' :
                                    stat.color === 'purple' ? 'bg-purple-500/10' :
                                        stat.color === 'emerald' ? 'bg-emerald-500/10' :
                                            'bg-orange-500/10'}`}></div>

                            <div className="relative z-10">
                                <div className="relative mb-6">
                                    <div className={`p-3 rounded-[5px] w-fit relative z-10 transition-transform group-hover:scale-110 duration-500
                                        ${stat.color === 'blue' ? 'bg-blue-600 text-white' :
                                            stat.color === 'purple' ? 'bg-purple-600 text-white' :
                                                stat.color === 'emerald' ? 'bg-emerald-600 text-white' :
                                                    'bg-orange-600 text-white'}`}>
                                        <stat.icon size={22} strokeWidth={2.5} />
                                    </div>
                                </div>

                                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {stat.label}
                                </div>
                                <div className="min-h-[44px] flex items-center mb-3">
                                    {stat.value === 'N/A' ? (
                                        <span className={`text-lg font-black tracking-widest uppercase select-none ${isDarkMode ? 'text-white/20' : 'text-slate-300'}`}>
                                            N/A
                                        </span>
                                    ) : (
                                        <span className={`${typeof stat.value === 'string' && stat.value.length > 5 ? 'text-2xl md:text-3xl' : 'text-4xl'} font-black tracking-tight uppercase truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`} title={stat.value}>
                                            {stat.value}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <div className={`w-1 h-1 rounded-full ${stat.color === 'blue' ? 'bg-blue-500' :
                                        stat.color === 'purple' ? 'bg-purple-500' :
                                            stat.color === 'emerald' ? 'bg-emerald-500' :
                                                'bg-orange-500'
                                        }`}></div>
                                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {stat.trend}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Row */}
            {visibleActions.length > 0 && (
                <div className={`grid grid-cols-1 ${visibleActions.length === 3 ? 'lg:grid-cols-3' : visibleActions.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-8`}>
                    {visibleActions.map((act, i) => (
                        <div
                            key={i}
                            onClick={act.onClick}
                            className={`p-10 rounded-[5px] shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px] transition-transform hover:scale-[1.01] duration-500 cursor-pointer group border
                            ${act.color === 'orange'
                                ? (isDarkMode ? 'bg-gradient-to-br from-orange-500 to-[#F97316] border-orange-400' : 'bg-gradient-to-br from-slate-50 to-white border-slate-100 shadow-orange-900/5')
                                : (isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200 shadow-slate-200/50')}`}
                        >
                            <div className={`absolute top-8 left-10 p-4 backdrop-blur-md rounded-[5px] transition-all duration-300
                                ${act.color === 'orange'
                                    ? (isDarkMode ? 'bg-white/20 text-white' : 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 group-hover:scale-110')
                                    : act.color === 'blue'
                                        ? (isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/30')
                                        : act.color === 'purple'
                                            ? (isDarkMode ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/30')
                                            : (isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-900 text-white')}`}>
                                <act.icon size={32} strokeWidth={3} />
                            </div>

                            {act.color === 'orange' && (
                                <div className={`absolute top-0 right-0 h-full bg-white/5 -skew-x-12 translate-x-12 transition-all duration-500 ${isDarkMode ? 'w-[40%]' : 'w-0'}`}></div>
                            )}

                            <h3 className={`text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{act.title}</h3>
                            <div className={`mt-4 flex items-center gap-2 font-bold text-sm ${act.color === 'orange' && isDarkMode ? 'text-white/80' : 'text-slate-500'}`}>
                                <span>{act.desc}</span>
                                <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardOverview;
