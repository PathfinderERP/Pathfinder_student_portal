import React from 'react';
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Award, CreditCard, CheckCircle, Activity, RefreshCw, ShieldCheck, Sparkles, Star, AlertCircle, GraduationCap, Target, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const MyProfile = ({ isDarkMode, studentData, onRefresh, silentLoading }) => {
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const details = studentData?.student?.studentsDetails?.[0] || {};
    const guardians = studentData?.student?.guardians || [];
    const examSchema = studentData?.student?.examSchema || [];

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (onRefresh) await onRefresh(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const isActuallyRefreshing = isRefreshing || silentLoading;

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Profile Hero - Premium Edition */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-10 rounded-2xl border relative overflow-hidden shadow-2xl transition-all duration-700
                    ${isDarkMode 
                        ? 'bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e293b] border-white/5 shadow-black/40' 
                        : 'bg-gradient-to-br from-[#0B1120] via-[#10192D] to-[#1E293B] border-slate-200'}`}
            >
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] border border-orange-500/20 backdrop-blur-md">
                                Identity & Access
                            </div>
                            {isActuallyRefreshing && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] border border-blue-500/20 animate-pulse">
                                    <RefreshCw size={10} className="animate-spin" />
                                    Syncing Cloud Records...
                                </div>
                            )}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase leading-tight">
                            My Digital <span className="text-orange-500">Profile</span>
                        </h2>
                        <p className="text-sm font-medium text-white/60 max-w-xl leading-relaxed">
                            Secured digital identity for academic access and administration. All records are cryptographically verified by the central ERP system.
                        </p>
                    </div>
                    
                    <button 
                        onClick={handleRefresh}
                        disabled={isActuallyRefreshing}
                        className={`group p-4 rounded-2xl border backdrop-blur-xl transition-all active:scale-95 flex items-center gap-3
                            ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                    >
                        <div className={`p-2 rounded-lg ${isActuallyRefreshing ? 'bg-orange-500 animate-spin' : 'bg-white/10 group-hover:bg-orange-500'} transition-all duration-500`}>
                            <RefreshCw size={18} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest mr-2">Refresh Hub</span>
                    </button>
                </div>
            </motion.div>

            {/* Enhanced Profile Header Card */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-10 rounded-2xl border shadow-2xl relative overflow-hidden transition-all duration-500 group
                    ${isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-orange-500/30' : 'bg-white border-slate-100'}`}
            >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-5xl shadow-2xl ring-4 ring-indigo-500/20 group-hover:scale-105 transition-transform duration-700">
                            {(details.studentName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-xl shadow-lg border-4 border-white dark:border-[#10141D]">
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                            {details.studentName || 'Student Name'}
                        </h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border
                                ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600 shadow-sm'}`}>
                                <User size={12} className="text-indigo-500" /> {details.gender || 'Student'}
                            </div>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border
                                ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm'}`}>
                                <Sparkles size={12} className="text-orange-500" /> {details.board || 'CBSE'} Board
                            </div>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border
                                ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'}`}>
                                <Star size={12} className="text-indigo-500" /> Elite Rank
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Grid for Personal & Guardian Info */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Personal Information */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`p-10 rounded-2xl border shadow-xl relative
                        ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}
                >
                    <div className="flex items-center justify-between mb-10">
                        <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>
                            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                <User size={16} strokeWidth={3} />
                            </div>
                            BioData & Contact
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                        <InfoField label="Primary Email" value={details.studentEmail} icon={Mail} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="orange" />
                        <InfoField label="Mobile Connectivity" value={details.mobileNum ? `+91 ${details.mobileNum}` : null} icon={Phone} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="orange" />
                        <InfoField label="WhatsApp Contact" value={details.whatsappNumber ? `+91 ${details.whatsappNumber}` : null} icon={Phone} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                        <InfoField label="Birth Celebration" value={details.dateOfBirth} icon={Calendar} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                        <InfoField label="Academic Institution" value={details.schoolName || details.school} icon={BookOpen} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                        <InfoField label="Operational Centre" value={details.centre || details.centreName} icon={MapPin} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                        <InfoField label="Region / State" value={details.state} icon={MapPin} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                        <InfoField label="Postal Index Code" value={details.pincode} icon={MapPin} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                        <InfoField label="Residential Address" value={details.address} icon={MapPin} isDark={isDarkMode} isFullWidth isSyncing={isActuallyRefreshing} accent="indigo" />
                    </div>
                </motion.div>

                {/* Guardian & Support Information */}
                <div className="space-y-8 flex flex-col">
                    {guardians.length > 0 ? guardians.map((guardian, idx) => (
                        <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + (idx * 0.1) }}
                            className={`p-10 rounded-2xl border shadow-xl relative overflow-hidden transition-all duration-500 hover:shadow-indigo-500/5 flex-1
                            ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/20' : 'bg-white border-slate-100 shadow-slate-200/50'}`}
                        >
                            <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 mb-10 ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                    <ShieldCheck size={16} strokeWidth={3} />
                                </div>
                                Guardian Protocol
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                                <InfoField label="Full Name" value={guardian.guardianName} icon={User} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                                <InfoField label="Relationship" value={guardian.relation || 'Parent / Guardian'} icon={Users} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                                <InfoField label="Credential Level" value={guardian.qualification} icon={Award} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                                <InfoField label="Guardian Email" value={guardian.guardianEmail} icon={Mail} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                                <InfoField label="Emergency Mobile" value={guardian.guardianMobile ? `+91 ${guardian.guardianMobile}` : null} icon={Phone} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                                <InfoField label="Alternate Support" value="+91 9407112233" icon={Phone} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                                <InfoField label="Sector Occupation" value={guardian.occupation} icon={BookOpen} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                                <InfoField label="Fiscal Income (Annual)" value={guardian.annualIncome} icon={CreditCard} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                            </div>
                        </motion.div>
                    )) : (
                        <div className={`p-10 rounded-2xl border border-dashed flex flex-col items-center justify-center opacity-20 ${isDarkMode ? 'border-white/10' : 'border-slate-300'}`}>
                             <ShieldCheck size={48} className="mb-4" />
                             <p className="text-xs font-black uppercase tracking-widest text-center px-4">No Guardian Protocols Detected in Core Database</p>
                        </div>
                    )}

                    {/* Digital Security Clearance Card to fill gap */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className={`p-10 rounded-2xl border border-dashed relative overflow-hidden h-fit flex-none
                            ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20 shadow-xl' : 'bg-indigo-50/50 border-indigo-200'}`}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10">
                            <div className="p-4 rounded-2xl bg-indigo-500 text-white shadow-xl shadow-indigo-500/20">
                                <ShieldCheck size={28} />
                            </div>
                            <div className="space-y-1">
                                <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-indigo-900'}`}>Security Integrity</h4>
                                <p className={`text-[10px] font-bold opacity-60 uppercase tracking-widest leading-relaxed`}>Your digital identity and guardian protocols are secured with AES-256 encryption. All changes are logged.</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <Star size={100} />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Academic Records High-End Table */}
            {examSchema.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`p-10 rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}
                >
                    <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 mb-10 ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Sparkles size={16} strokeWidth={3} />
                        </div>
                        Academic History Ledger
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                        {examSchema.map((exam, idx) => (
                            <div key={idx} className={`group p-8 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/30' : 'bg-slate-50 border-slate-100 hover:border-emerald-200 shadow-sm'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                                    <InfoField label="Exam Instance" value={exam.examName} icon={BookOpen} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="emerald" />
                                    <InfoField label="Classification" value={exam.class === 'ALL CLASS' ? 'N/A' : exam.class} icon={Award} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="emerald" />
                                    <InfoField label="Outcome Status" value={exam.examStatus} icon={CheckCircle} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="emerald" />
                                    <InfoField label="Aggregate %" value={exam.markAgregate} icon={Activity} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="emerald" />
                                    <InfoField label="Science/Math %" value={exam.scienceMathParcent} icon={Target} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="emerald" />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Course & Admission Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`p-10 rounded-2xl border shadow-2xl relative overflow-hidden
                    ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}
            >
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                    <BookOpen size={200} />
                </div>
                <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 mb-10 ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <GraduationCap size={16} strokeWidth={3} />
                    </div>
                    Current Enrollment Protocol
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                    <InfoField label="Registered Course" value={studentData?.course?.courseName} icon={BookOpen} isDark={isDarkMode} isFullWidth isSyncing={isActuallyRefreshing} accent="indigo" />
                    <InfoField label="Academic Session" value={studentData?.course?.courseSession} icon={Calendar} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                    <InfoField label="Level / Class" value={studentData?.class?.name} icon={Award} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                    <InfoField label="Delivery Mode" value={studentData?.course?.mode} icon={Activity} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                    <InfoField label="ERP Unique ID" value={studentData?.admissionNumber} icon={ShieldCheck} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                    <InfoField label="Enrollment Date" value={studentData?.admissionDate ? new Date(studentData.admissionDate).toLocaleDateString() : 'N/A'} icon={Calendar} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="indigo" />
                    <InfoField label="System Status" value={studentData?.admissionStatus} icon={CheckCircle} isDark={isDarkMode} isSyncing={isActuallyRefreshing} accent="emerald" />
                </div>
            </motion.div>

            {/* Financial Ledger Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={`p-10 rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}
            >
                <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 mb-10 ${isDarkMode ? 'text-white/60' : 'text-slate-900/60'}`}>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <CreditCard size={16} strokeWidth={3} />
                    </div>
                    Financial Fulfillment Ledger
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div className={`p-8 rounded-2xl border relative overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:shadow-lg'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>Cumulative Fees</p>
                        <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>₹{Math.round(studentData?.totalFees || 0).toLocaleString()}</p>
                    </div>
                    <div className={`p-8 rounded-2xl border relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-500/20`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">Secured Payments</p>
                        <p className="text-3xl font-black">₹{Math.round(studentData?.totalPaidAmount || 0).toLocaleString()}</p>
                        <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
                            <CheckCircle size={100} />
                        </div>
                    </div>
                    <div className={`p-8 rounded-2xl border relative overflow-hidden bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-xl shadow-red-500/20`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">Outstanding Dues</p>
                        <p className="text-3xl font-black">₹{Math.round(studentData?.remainingAmount || 0).toLocaleString()}</p>
                        <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
                            <AlertCircle size={100} />
                        </div>
                    </div>
                </div>

                {studentData?.paymentBreakdown?.length > 0 && (
                    <div className="space-y-4">
                        <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] mb-6 ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>Deferred Installment Timeline</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {studentData.paymentBreakdown.map((inst, idx) => (
                                <div key={idx} className={`p-6 rounded-2xl border flex items-center justify-between transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-white/5 hover:border-indigo-500/30' : 'bg-slate-50 border-slate-100 hover:shadow-md'}`}>
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm
                                            ${inst.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-orange-500/20 text-orange-500'}`}>
                                            {inst.installmentNumber}
                                        </div>
                                        <div>
                                            <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>{inst.status}</p>
                                            <p className={`text-[10px] font-bold opacity-40 mt-1`}>DUE: {new Date(inst.dueDate).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>₹{inst.amount.toLocaleString()}</p>
                                        {inst.paidDate && <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter mt-1">PROCESSED</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

const InfoField = ({ label, value, icon: Icon, isDark, isFullWidth = false, isSyncing = false, accent = 'indigo' }) => {
    const showSkeleton = value === 'Syncing...' || (isSyncing && (!value || value === '—'));
    
    const accentColors = {
        indigo: 'text-indigo-500 bg-indigo-500/10',
        orange: 'text-orange-500 bg-orange-500/10',
        emerald: 'text-emerald-500 bg-emerald-500/10'
    };

    return (
        <div className={`space-y-3 ${isFullWidth ? 'col-span-full' : ''} group`}>
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110 ${accentColors[accent]}`}>
                    {Icon && <Icon size={12} strokeWidth={2.5} />}
                </div>
                <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-slate-900/40'}`}>
                    {label}
                </label>
            </div>
            {showSkeleton ? (
                <div className={`h-6 w-full rounded-lg animate-pulse ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}></div>
            ) : (
                <p className={`text-base font-black tracking-tight pl-0.5 ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    {value || '—'}
                </p>
            )}
        </div>
    );
};

export default MyProfile;
