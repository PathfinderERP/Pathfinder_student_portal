import React from 'react';
import {
    RefreshCw, MapPin, Layers, Users, Database, FilePlus, ChevronRight, FileText
} from 'lucide-react';

const DashboardOverview = ({
    isDarkMode,
    syncERP,
    isERPLoading,
    erpStudentsCount,
    setActiveTab
}) => {
    return (
        <div className="space-y-8">
            {/* Dashboard Overview Banner */}
            <div className={`relative overflow-hidden p-10 rounded-[5px] shadow-2xl transition-all border
                ${isDarkMode
                    ? 'bg-gradient-to-r from-[#1A202C] to-[#111827] border-white/5'
                    : 'bg-gradient-to-br from-slate-50 to-white border-slate-100 shadow-orange-900/5'}`}>

                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500/10 blur-[100px] rounded-full"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight mb-3">
                            DASHBOARD <span className="text-orange-500 tracking-wider">OVERVIEWy</span>
                        </h2>
                        <p className={`text-sm font-medium max-w-xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Welcome back. Here is your daily activity summary and system health check.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'TOTAL CENTRES', value: '28', icon: MapPin, color: 'emerald', trend: 'Across active regions' },
                    { label: 'ACTIVE SECTIONS', value: '142', icon: Layers, color: 'blue', trend: '+5 new this week' },
                    { label: 'TOTAL STUDENTS', value: erpStudentsCount > 0 ? erpStudentsCount.toString() : (isERPLoading ? '...' : '684'), icon: Users, color: 'purple', trend: 'Live from ERP' },
                    { label: 'QUESTION BANK', value: '4.2k', icon: Database, color: 'orange', trend: 'Categorized items' },
                ].map((stat, i) => (
                    <div key={i} className={`relative overflow-hidden p-8 rounded-[5px] border transition-all duration-500 group hover:-translate-y-2
                        ${isDarkMode
                            ? `bg-[#0B0E14] border-white/5 shadow-2xl`
                            : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}
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
                            <div className={`text-4xl font-black tracking-tight mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {stat.value}
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

            {/* Action Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div onClick={() => setActiveTab('Test Create')} className={`p-10 rounded-[5px] shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px] transition-transform hover:scale-[1.01] duration-500 cursor-pointer group border
                    ${isDarkMode
                        ? 'bg-gradient-to-br from-orange-500 to-[#F97316] border-orange-400'
                        : 'bg-gradient-to-br from-slate-50 to-white border-slate-100 shadow-orange-900/5'}`}>

                    <div className={`absolute top-8 left-10 p-4 backdrop-blur-md rounded-[5px] transition-all duration-300
                        ${isDarkMode ? 'bg-white/20 text-white' : 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 group-hover:scale-110'}`}>
                        <FilePlus size={32} strokeWidth={3} />
                    </div>

                    <div className={`absolute top-0 right-0 h-full bg-white/5 -skew-x-12 translate-x-12 transition-all duration-500 ${isDarkMode ? 'w-[40%]' : 'w-0'}`}></div>

                    <h3 className={`text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Create New Test</h3>
                    <div className={`mt-4 flex items-center gap-2 font-bold text-sm ${isDarkMode ? 'text-white/80' : 'text-slate-500'}`}>
                        <span>Set up a new assessment</span>
                        <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                </div>

                <div onClick={() => setActiveTab('Centre Management')} className={`p-10 rounded-[5px] shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px] transition-transform hover:scale-[1.01] duration-500 cursor-pointer group border
                    ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200 shadow-slate-200/50'}`}>
                    <div className={`absolute top-8 left-10 p-4 backdrop-blur-md rounded-[5px] ${isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'}`}>
                        <MapPin size={32} strokeWidth={3} />
                    </div>
                    <h3 className={`text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Manage Centres</h3>
                    <div className={`mt-4 flex items-center gap-2 font-bold text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                        <span>Configure training locations</span>
                        <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                </div>

                <div onClick={() => setActiveTab('Pen Paper Test')} className={`p-10 rounded-[5px] shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px] transition-transform hover:scale-[1.01] duration-500 cursor-pointer group border
                    ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200 shadow-slate-200/50'}`}>
                    <div className={`absolute top-8 left-10 p-4 backdrop-blur-md rounded-[5px] ${isDarkMode ? 'bg-white/10 text-white' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'}`}>
                        <FileText size={32} strokeWidth={3} />
                    </div>
                    <h3 className={`text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Pen Paper Test</h3>
                    <div className={`mt-4 flex items-center gap-2 font-bold text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                        <span>Offline test management</span>
                        <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
