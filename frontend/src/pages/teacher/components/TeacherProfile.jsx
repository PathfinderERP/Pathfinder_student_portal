import React from 'react';
import { User, Mail, Shield, Briefcase, Calendar, MapPin, Edit3, Camera } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherProfile = ({ user }) => {
    const { isDarkMode } = useTheme();

    const theme = {
        card: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-500' : 'text-slate-500',
        field: isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <div className={`relative p-8 rounded-[5px] border ${theme.card} overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4">
                    <button className="p-2 border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10 rounded-[5px] transition-all">
                        <Edit3 size={18} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="relative group">
                        <div className={`w-32 h-32 rounded-[5px] border-2 ${isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'} flex items-center justify-center font-black text-4xl text-cyan-500 overflow-hidden`}>
                            {user?.profile_image ? <img src={user.profile_image} className="w-full h-full object-cover" /> : user?.first_name?.charAt(0)}
                        </div>
                        <button className="absolute bottom-[-10px] right-[-10px] p-2 bg-cyan-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={14} />
                        </button>
                    </div>

                    <div className="text-center md:text-left space-y-2">
                        <h2 className={`text-3xl font-black uppercase tracking-tight ${theme.text}`}>{user?.first_name} {user?.last_name}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-black text-cyan-500 uppercase rounded-[2px]"> {user?.role_label || 'User'} </div>
                            <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-[10px] font-black text-rose-500 uppercase rounded-[2px]"> Dept: {user?.teacherDepartment || 'Academic'} </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-4">
                            <MapPin size={12} className="text-cyan-500" /> Headquarters • Main Campus
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`p-6 rounded-[5px] border ${theme.card}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-6 ${theme.text}`}>Personal Signature</h3>
                    <div className="space-y-4">
                        <InfoRow icon={<User size={14} />} label="Employee ID" value={user?.employee_id || user?.username || 'N/A'} theme={theme} />
                        <InfoRow icon={<Mail size={14} />} label="Email Address" value={user?.email || 'N/A'} theme={theme} />
                        <InfoRow icon={<Shield size={14} />} label="Access Tier" value="Privileged" theme={theme} />
                        <InfoRow icon={<Calendar size={14} />} label="Joined On" value="Dec 2023" theme={theme} />
                    </div>
                </div>

                <div className={`p-6 rounded-[5px] border ${theme.card}`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-6 ${theme.text}`}>Academic Load</h3>
                    <div className="space-y-4">
                        <InfoRow icon={<Briefcase size={14} />} label="Total Batches" value="06 Active" theme={theme} />
                        <InfoRow icon={<Edit3 size={14} />} label="Specialization" value="Botany / Genetics" theme={theme} />
                        <InfoRow icon={<Shield size={14} />} label="Session Prot." value="256-Bit Encrypted" theme={theme} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, value, theme }) => (
    <div className={`p-3 rounded-[5px] border ${theme.field} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
            <span className="text-cyan-500">{icon}</span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-tight ${theme.text} truncate max-w-[150px]`}>{value}</span>
    </div>
);

export default TeacherProfile;
