import React from 'react';
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Award, CreditCard, CheckCircle, Activity } from 'lucide-react';

const MyProfile = ({ isDarkMode, studentData }) => {
    const details = studentData?.student?.studentsDetails?.[0] || {};
    const guardians = studentData?.student?.guardians || [];
    const examSchema = studentData?.student?.examSchema || [];

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Profile Hero */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="px-3 py-1 rounded-[5px] bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">
                            Account Settings
                        </div>
                    </div>
                    <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        My Digital Profile
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Manage your personal data, guardian contact information, and academic history.
                    </p>
                </div>
                <User size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            {/* Profile Header Card */}
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 rounded-[5px] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-4xl shadow-2xl">
                        {(details.studentName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {details.studentName || 'Student Name'}
                        </h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black uppercase tracking-widest border
                                ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                {details.gender || 'Student'}
                            </span>
                            <span className={`px-3 py-1 rounded-[5px] text-[10px] font-black uppercase tracking-widest border
                                ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                                {details.board || 'Board'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Personal Information */}
            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <User size={14} className="text-orange-500" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField label="Email" value={details.studentEmail} icon={Mail} isDark={isDarkMode} />
                    <InfoField label="Mobile" value={`+91 ${details.mobileNum}`} icon={Phone} isDark={isDarkMode} />
                    <InfoField label="WhatsApp" value={`+91 ${details.whatsappNumber}`} icon={Phone} isDark={isDarkMode} />
                    <InfoField label="Date of Birth" value={details.dateOfBirth} icon={Calendar} isDark={isDarkMode} />
                    <InfoField label="School" value={details.schoolName} icon={BookOpen} isDark={isDarkMode} />
                    <InfoField label="Centre" value={details.centre} icon={MapPin} isDark={isDarkMode} />
                    <InfoField label="State" value={details.state || (details.board === 'WB' ? 'West Bengal' : '')} icon={MapPin} isDark={isDarkMode} />
                    <InfoField label="Pincode" value={details.pincode} icon={MapPin} isDark={isDarkMode} />
                    <InfoField label="Address" value={details.address} icon={MapPin} isDark={isDarkMode} isFullWidth />
                </div>
            </div>

            {/* Guardian Information */}
            {guardians.length > 0 && (
                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <User size={14} className="text-blue-500" /> Guardian Information
                    </h3>
                    <div className="space-y-6">
                        {guardians.map((guardian, idx) => (
                            <div key={idx} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoField label="Name" value={guardian.guardianName} icon={User} isDark={isDarkMode} />
                                    <InfoField label="Qualification" value={guardian.qualification} icon={Award} isDark={isDarkMode} />
                                    <InfoField label="Email" value={guardian.guardianEmail} icon={Mail} isDark={isDarkMode} />
                                    <InfoField label="Mobile" value={`+91 ${guardian.guardianMobile}`} icon={Phone} isDark={isDarkMode} />
                                    <InfoField label="Occupation" value={guardian.occupation} icon={BookOpen} isDark={isDarkMode} />
                                    <InfoField label="Annual Income" value={guardian.annualIncome} icon={Award} isDark={isDarkMode} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Academic Records */}
            {examSchema.length > 0 && (
                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <Award size={14} className="text-orange-500" /> Previous Academic Records
                    </h3>
                    <div className="space-y-4">
                        {examSchema.map((exam, idx) => (
                            <div key={idx} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InfoField label="Exam Name" value={exam.examName} icon={BookOpen} isDark={isDarkMode} />
                                    <InfoField label="Class" value={exam.class} icon={Award} isDark={isDarkMode} />
                                    <InfoField label="Status" value={exam.examStatus} icon={Award} isDark={isDarkMode} />
                                    <InfoField label="Aggregate %" value={exam.markAgregate} icon={Award} isDark={isDarkMode} />
                                    <InfoField label="Science/Math %" value={exam.scienceMathParcent} icon={Award} isDark={isDarkMode} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Course & Admission Details */}
            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <BookOpen size={14} className="text-indigo-500" /> Current Course
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoField label="Course Name" value={studentData?.course?.courseName} icon={BookOpen} isDark={isDarkMode} isFullWidth />
                    <InfoField label="Session" value={studentData?.course?.courseSession} icon={Calendar} isDark={isDarkMode} />
                    <InfoField label="Mode" value={studentData?.course?.mode} icon={Activity} isDark={isDarkMode} />
                    <InfoField label="Admission No" value={studentData?.admissionNumber} icon={Award} isDark={isDarkMode} />
                    <InfoField label="Admission Date" value={studentData?.admissionDate ? new Date(studentData.admissionDate).toLocaleDateString() : 'N/A'} icon={Calendar} isDark={isDarkMode} />
                    <InfoField label="Status" value={studentData?.admissionStatus} icon={CheckCircle} isDark={isDarkMode} />
                </div>
            </div>

            {/* Fee & Payment Details */}
            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    <CreditCard size={14} className="text-emerald-500" /> Fee Payment Status
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Total Fees</p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            ₹{Math.round(studentData?.totalFees || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Paid Amount</p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-emerald-500' : 'text-emerald-700'}`}>
                            ₹{Math.round(studentData?.totalPaidAmount || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Detailed Balance</p>
                        <p className={`text-xl font-black ${isDarkMode ? 'text-red-500' : 'text-red-700'}`}>
                            ₹{Math.round(studentData?.remainingAmount || 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {studentData?.paymentBreakdown?.length > 0 && (
                    <div className="space-y-4">
                        <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Installment Breakdown</h4>
                        {studentData.paymentBreakdown.map((inst, idx) => (
                            <div key={idx} className={`p-4 rounded-[5px] border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Installment {inst.installmentNumber}</span>
                                        <span className={`text-[8px] px-2 py-0.5 rounded-[3px] font-black uppercase ${inst.status === 'PAID'
                                            ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-500' : 'bg-emerald-100 text-emerald-700')
                                            : (isDarkMode ? 'bg-orange-500/20 text-orange-500' : 'bg-orange-100 text-orange-700')
                                            }`}>
                                            {inst.status}
                                        </span>
                                    </div>
                                    <p className={`text-[10px] font-medium ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                                        Due: {new Date(inst.dueDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>₹{inst.amount.toLocaleString()}</p>
                                    {inst.paidDate && (
                                        <p className={`text-[10px] font-medium ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>
                                            Paid on {new Date(inst.paidDate).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const InfoField = ({ label, value, icon: Icon, isDark, isFullWidth = false }) => (
    <div className={`space-y-1.5 ${isFullWidth ? 'col-span-full' : ''}`}>
        <label className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/30' : 'text-slate-900/30'} flex items-center gap-1.5`}>
            {Icon && <Icon size={10} />} {label}
        </label>
        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {value || '—'}
        </p>
    </div>
);

export default MyProfile;
