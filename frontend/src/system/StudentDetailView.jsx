import React from 'react';
import { X, User, MapPin, Phone, Mail, BookOpen, Calendar, DollarSign, Activity, FileText, Layers, Award, Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const StudentDetailView = ({ student, onClose }) => {
    const { isDarkMode } = useTheme();

    if (!student) return null;

    // Helper to extract nested data safely
    const details = student?.student?.studentsDetails?.[0] || {};
    const course = student?.course || {};
    const paymentBreakdown = student?.paymentBreakdown || [];
    const feeStructure = student?.feesStructure || student?.feeStructureSnapshot || [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className={`relative w-full max-w-5xl h-[90vh] overflow-hidden rounded-[2.5rem] border shadow-2xl flex flex-col animate-in zoom-in duration-300
                ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-slate-50 border-slate-200'}`}>

                {/* Header */}
                <div className={`px-8 py-6 border-b flex justify-between items-center z-10 
                    ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border-2
                            ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                            {(details.studentName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {details.studentName || 'Student Details'}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border
                                    ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                    {paymentBreakdown.length > 0 ? '#' + student.admissionNumber : 'ID: N/A'}
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border
                                    ${student.admissionStatus === 'ACTIVE'
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                    {student.admissionStatus || 'UNKNOWN'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-3 rounded-xl transition-all hover:rotate-90 hover:scale-110 active:scale-95
                        ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}>
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column: Personal & Academic Info */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Personal Info Card */}
                            <section className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2 mb-6">
                                    <User size={14} className="text-orange-500" /> Personal Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InfoItem label="Full Name" value={details.studentName} isDark={isDarkMode} Icon={User} />
                                    <InfoItem label="Date of Birth" value={details.dateOfBirth} isDark={isDarkMode} Icon={Calendar} />
                                    <InfoItem label="Gender" value={details.gender} isDark={isDarkMode} Icon={User} />
                                    <InfoItem label="Admission Number" value={student.admissionNumber} isDark={isDarkMode} Icon={FileText} />
                                    <InfoItem label="Email" value={details.studentEmail} isDark={isDarkMode} Icon={Mail} />
                                    <InfoItem label="Mobile" value={`+91 ${details.mobileNum}`} isDark={isDarkMode} Icon={Phone} />
                                    <InfoItem label="School" value={details.schoolName} isDark={isDarkMode} Icon={BookOpen} />
                                    <InfoItem label="Board" value={details.board} isDark={isDarkMode} Icon={Award} />
                                    <InfoItem label="Address" value={details.address} isDark={isDarkMode} Icon={MapPin} isFullWidth />
                                </div>
                            </section>

                            {/* Course Info Card */}
                            <section className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2 mb-6">
                                    <Layers size={14} className="text-blue-500" /> Course Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InfoItem label="Course Name" value={course.courseName} isDark={isDarkMode} Icon={BookOpen} isFullWidth />
                                    <InfoItem label="Center" value={student.centre || details.centre} isDark={isDarkMode} Icon={MapPin} />
                                    <InfoItem label="Session" value={student.academicSession || course.courseSession} isDark={isDarkMode} Icon={Calendar} />
                                    <InfoItem label="Duration" value={course.courseDuration} isDark={isDarkMode} Icon={Clock} />
                                    <InfoItem label="Mode" value={course.mode} isDark={isDarkMode} Icon={Activity} />
                                </div>
                            </section>

                            {/* Payment Timeline */}
                            <section className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2 mb-6">
                                    <Activity size={14} className="text-emerald-500" /> Installment Schedule
                                </h3>
                                <div className="space-y-3">
                                    {paymentBreakdown.slice(0, 5).map((pay, i) => (
                                        <div key={pay._id || i} className={`flex items-center justify-between p-4 rounded-2xl border
                                            ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                                    ${pay.status === 'PAID' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                                                    {pay.installmentNumber}
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                        Installment #{pay.installmentNumber}
                                                    </p>
                                                    <p className="text-[10px] opacity-50">{new Date(pay.dueDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    ₹{pay.amount?.toLocaleString()}
                                                </p>
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full
                                                    ${pay.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                    {pay.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {paymentBreakdown.length > 5 && (
                                        <div className="text-center pt-2">
                                            <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                                                + {paymentBreakdown.length - 5} More Installments
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Financial Summary */}
                        <div className="space-y-8">
                            <section className={`p-6 rounded-3xl border sticky top-0 ${isDarkMode ? 'bg-[#151923] border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
                                <div className="mb-8">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2 mb-6">
                                        <DollarSign size={14} className="text-yellow-500" /> Financial Overview
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-end pb-4 border-b border-dashed border-slate-700/50">
                                            <span className="text-xs font-bold opacity-60">Total Fees</span>
                                            <span className="text-2xl font-black tracking-tighter">₹{student.totalFees?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-end pb-4 border-b border-dashed border-slate-700/50">
                                            <span className="text-xs font-bold opacity-60 text-emerald-500">Paid Amount</span>
                                            <span className="text-xl font-black tracking-tighter text-emerald-500">₹{student.totalPaidAmount?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold opacity-60 text-orange-500">Pending</span>
                                            <span className="text-xl font-black tracking-tighter text-orange-500">₹{student.remainingAmount?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2 mb-4">
                                        <FileText size={14} className="text-purple-500" /> Fee Breakdown
                                    </h3>
                                    <div className="space-y-3">
                                        {feeStructure.map((fee, i) => (
                                            <div key={i} className={`p-3 rounded-xl border flex justify-between items-center
                                                ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{fee.feesType}</span>
                                                <span className="text-sm font-black">₹{fee.value?.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple reusable Info Row
const InfoItem = ({ label, value, isDark, Icon, isFullWidth = false }) => (
    <div className={`space-y-1.5 ${isFullWidth ? 'col-span-full' : ''}`}>
        <label className={`text-[9px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1.5`}>
            {Icon && <Icon size={10} />} {label}
        </label>
        <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {value || '—'}
        </p>
    </div>
);

export default StudentDetailView;
