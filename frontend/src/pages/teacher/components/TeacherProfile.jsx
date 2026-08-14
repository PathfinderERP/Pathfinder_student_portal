import React, { useState, useEffect, useMemo } from 'react';
import { User, Mail, Shield, Briefcase, Calendar, MapPin, Edit3, Camera, Phone, Award, Layers, CheckCircle2, BookOpen, Building2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

const TeacherProfile = ({ user: propUser }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user: authUser } = useAuth();
    const user = propUser || authUser;
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const tokenVal = token || localStorage.getItem('auth_token');
                const apiUrl = getApiUrl();
                const userEmail = user?.email || user?.username || user?.code || user?.employee_id;
                const profileUrl = userEmail 
                    ? `${apiUrl}/api/teacher-portal/profile/?email=${encodeURIComponent(userEmail)}&username=${encodeURIComponent(userEmail)}&code=${encodeURIComponent(userEmail)}`
                    : `${apiUrl}/api/teacher-portal/profile/`;

                const res = await fetch(profileUrl, {
                    headers: { 'Authorization': `Bearer ${tokenVal}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.profile) setProfile(data.profile);
                }
            } catch (e) {
                console.error('[TeacherProfile] error fetching profile:', e);
            }
        };
        fetchProfile();
    }, [token, getApiUrl, user?.email, user?.username, user?.code]);

    const centresDisplay = useMemo(() => {
        if (Array.isArray(profile?.centres) && profile.centres.length > 0) {
            return profile.centres.join(', ');
        }
        if (profile?.centre_name) return profile.centre_name;
        if (Array.isArray(user?.centres) && user.centres.length > 0) {
            return user.centres.join(', ');
        }
        return user?.centre_name || user?.center || 'N/A';
    }, [profile, user]);

    const formatSubj = (str) => {
        if (!str) return 'N/A';
        if (Array.isArray(str)) str = str[0];
        const clean = String(str).replace(/[\[\]'"]/g, '').trim();
        return clean.toUpperCase() || 'N/A';
    };

    const theme = {
        card: isDarkMode ? 'bg-slate-900/60 border-white/10 shadow-2xl backdrop-blur-xl' : 'bg-white border-slate-200 shadow-md',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        field: isDarkMode ? 'bg-black/40 border-white/10 hover:border-cyan-500/30' : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
    };

    const empId = profile?.employee_id || profile?.code || user?.employee_id || user?.code || user?.username || 'N/A';
    const teacherEmail = profile?.email || user?.email || 'N/A';
    const teacherPhone = profile?.phone || user?.phone || user?.mobile || 'N/A';
    const joiningDateStr = profile?.academicInfo?.joiningDate 
        ? new Date(profile.academicInfo.joiningDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'Feb 2026';
    const gender = profile?.academicInfo?.gender || user?.gender || 'Male';
    const dept = profile?.teacherDepartment || user?.teacherDepartment || user?.department || 'ALL-INDIA + FND';
    const subj = formatSubj(profile?.subject || user?.subject || user?.subjects);
    const board = profile?.boardType || user?.boardType || 'NEET/JEE';
    const designation = profile?.designation || user?.designation || 'FACULTY';
    const empType = profile?.teacherType || profile?.academicInfo?.employmentType || user?.teacherType || 'FULL-TIME';

    return (
        <div className="w-full max-w-none space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-3 md:px-8 py-3">
            {/* Header Profile Banner */}
            <div className={`relative p-6 md:p-10 rounded-2xl border ${theme.card} overflow-hidden transition-all duration-300`}>
                <div className="absolute top-6 right-6 flex items-center gap-3">
                    <button className="p-2.5 border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10 rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                        <Edit3 size={16} /> Edit Profile
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-10">
                    <div className="relative group">
                        <div className={`w-36 h-36 md:w-44 md:h-44 rounded-2xl border-2 ${isDarkMode ? 'bg-slate-800/90 border-white/20' : 'bg-slate-100 border-slate-300'} flex items-center justify-center font-black text-5xl md:text-6xl text-cyan-500 overflow-hidden shadow-2xl`}>
                            {user?.profile_image ? (
                                <img src={user.profile_image} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                (profile?.name?.charAt(0) || user?.first_name?.charAt(0) || 'T').toUpperCase()
                            )}
                        </div>
                        <button className="absolute bottom-[-8px] right-[-8px] p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <Camera size={16} />
                        </button>
                    </div>

                    <div className="text-center md:text-left space-y-3 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <h1 className={`text-3xl md:text-5xl font-black uppercase tracking-tight ${theme.text}`}>
                                {profile?.name || `${user?.first_name || ''} ${user?.last_name || ''}`}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-black uppercase tracking-wider rounded-lg w-fit">
                                <CheckCircle2 size={14} /> Active Teacher
                            </span>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
                            <div className="px-3.5 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-xs font-black text-cyan-500 uppercase rounded-lg flex items-center gap-1.5 shadow-sm">
                                <Shield size={14} /> {user?.role_label || 'TEACHER'}
                            </div>
                            <div className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/30 text-xs font-black text-rose-500 uppercase rounded-lg flex items-center gap-1.5 shadow-sm">
                                <Briefcase size={14} /> DEPT: {dept}
                            </div>
                            <div className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-xs font-black text-amber-500 uppercase rounded-lg flex items-center gap-1.5 shadow-sm">
                                <BookOpen size={14} /> SUBJECT: {subj}
                            </div>
                            <div className="px-3.5 py-1.5 bg-violet-500/10 border border-violet-500/30 text-xs font-black text-violet-400 uppercase rounded-lg flex items-center gap-1.5 shadow-sm">
                                <Award size={14} /> {designation}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs md:text-sm font-bold uppercase tracking-wide pt-3 bg-cyan-500/5 dark:bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
                            <MapPin size={16} className="text-cyan-500 shrink-0" />
                            <span><strong className="text-slate-500 dark:text-slate-400">ASSIGNED CENTRES:</strong> {centresDisplay}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Personal Signature */}
                <div className={`p-6 md:p-8 rounded-2xl border ${theme.card} space-y-5 transition-all`}>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                        <User className="text-cyan-500" size={20} />
                        <h2 className={`text-xs md:text-sm font-black uppercase tracking-[0.2em] ${theme.text}`}>Personal Signature</h2>
                    </div>
                    <div className="space-y-3.5">
                        <InfoRow icon={<User size={16} />} label="Employee ID" value={empId} theme={theme} />
                        <InfoRow icon={<Mail size={16} />} label="Email Address" value={teacherEmail} theme={theme} />
                        <InfoRow icon={<Phone size={16} />} label="Phone Number" value={teacherPhone} theme={theme} />
                        <InfoRow icon={<Shield size={16} />} label="Access Tier" value="Privileged" theme={theme} />
                        <InfoRow icon={<Calendar size={16} />} label="Joined On" value={joiningDateStr} theme={theme} />
                    </div>
                </div>

                {/* Academic Load */}
                <div className={`p-6 md:p-8 rounded-2xl border ${theme.card} space-y-5 transition-all`}>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                        <Briefcase className="text-cyan-500" size={20} />
                        <h2 className={`text-xs md:text-sm font-black uppercase tracking-[0.2em] ${theme.text}`}>Academic Load</h2>
                    </div>
                    <div className="space-y-3.5">
                        <InfoRow icon={<Briefcase size={16} />} label="Department" value={dept} theme={theme} />
                        <InfoRow icon={<Edit3 size={16} />} label="Subject" value={subj} theme={theme} />
                        <InfoRow icon={<Award size={16} />} label="Designation" value={designation} theme={theme} />
                        <InfoRow icon={<Shield size={16} />} label="Board Type" value={board} theme={theme} />
                        <InfoRow icon={<Layers size={16} />} label="Employment Type" value={empType} theme={theme} />
                    </div>
                </div>

                {/* Campus & Center Allotment */}
                <div className={`p-6 md:p-8 rounded-2xl border ${theme.card} space-y-5 md:col-span-2 lg:col-span-1 transition-all`}>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                        <Building2 className="text-cyan-500" size={20} />
                        <h2 className={`text-xs md:text-sm font-black uppercase tracking-[0.2em] ${theme.text}`}>Campus & Allotments</h2>
                    </div>
                    <div className="space-y-3.5">
                        <InfoRow icon={<Building2 size={16} />} label="Primary Centre" value={centresDisplay.split(',')[0] || 'N/A'} theme={theme} />
                        <InfoRow icon={<MapPin size={16} />} label="All Assigned Centres" value={centresDisplay} theme={theme} />
                        <InfoRow icon={<User size={16} />} label="Gender" value={gender} theme={theme} />
                        <InfoRow icon={<CheckCircle2 size={16} />} label="Account Status" value="ACTIVE / VERIFIED" theme={theme} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, value, theme }) => (
    <div className={`p-3.5 rounded-xl border ${theme.field} flex items-center justify-between transition-all duration-200 gap-3`}>
        <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-cyan-500">{icon}</span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        </div>
        <span className={`text-xs md:text-sm font-extrabold uppercase tracking-tight ${theme.text} text-right break-all leading-snug`}>
            {value}
        </span>
    </div>
);

export default TeacherProfile;
