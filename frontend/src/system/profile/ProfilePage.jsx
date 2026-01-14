import React, { useState, useEffect } from 'react';
import { Camera, X, ShieldCheck, Clock } from 'lucide-react';

const ProfilePage = ({ user, isDarkMode, isUploading, successMessage, onUpdateProfile, onUpdateImage, onClearImage }) => {
    const [profileData, setProfileData] = useState({
        email: user?.email || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || ''
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                email: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || ''
            });
        }
    }, [user]);

    const handleUpdate = () => {
        onUpdateProfile(profileData);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <h2 className="text-3xl font-black tracking-tight mb-8 uppercase">My <span className="text-orange-500">Profile</span></h2>

                <div className="space-y-10">
                    {/* Profile Image Management */}
                    <div className="flex flex-col md:flex-row items-center gap-8 pb-10 border-b border-orange-500/10">
                        <div className="relative group">
                            <div className={`relative w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 transition-all duration-500 group-hover:scale-105 ${isDarkMode ? 'border-white/10' : 'border-slate-100 shadow-xl shadow-slate-200'}`}>
                                {isUploading && (
                                    <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    </div>
                                )}
                                {user?.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center font-black text-4xl ${isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <label className={`absolute -bottom-2 -right-2 p-3 rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:scale-110 active:scale-95 z-30 ${isDarkMode ? 'bg-orange-600 text-white shadow-orange-600/20' : 'bg-slate-900 text-white shadow-slate-900/20'}`}>
                                <Camera size={20} strokeWidth={2.5} />
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) onUpdateImage(file);
                                    }}
                                />
                            </label>

                            {user?.profile_image && (
                                <button
                                    onClick={onClearImage}
                                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors z-30"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-black tracking-tight mb-2">Account Photo</h3>
                            <p className={`text-sm font-medium mb-4 italic max-w-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Your photo will be used for your profile and visibility across the management portal.
                            </p>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                <div className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                    JPG, PNG or WEBP (Max 2MB)
                                </div>
                            </div>
                        </div>
                    </div>

                    {successMessage && (
                        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                            <ShieldCheck size={18} />
                            <p className="text-sm font-bold uppercase tracking-widest">{successMessage}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Username</label>
                            <input type="text" readOnly value={user?.username} className={`w-full p-4 rounded-xl border font-bold text-sm cursor-not-allowed opacity-60 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Email Address</label>
                            <input
                                type="text"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">First Name</label>
                            <input
                                type="text"
                                value={profileData.first_name}
                                onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                                className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Last Name</label>
                            <input
                                type="text"
                                value={profileData.last_name}
                                onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                                className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={handleUpdate}
                            disabled={isUploading}
                            className={`px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3`}
                        >
                            {isUploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {isUploading ? 'Updating...' : 'Update Profile'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/5' : 'bg-white border-slate-100'}`}>
                    <h3 className="text-xl font-bold mb-4">Account Stats</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold opacity-50">Role</span>
                            <span className="text-xs font-black uppercase text-orange-500">{user?.user_type}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold opacity-50">Member Since</span>
                            <span className="text-xs font-black opacity-80">January 2026</span>
                        </div>
                    </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-[#F8FAFC] border-slate-200/60 shadow-slate-200/50'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <Clock size={16} className="text-orange-500" />
                        <h3 className="text-lg font-black uppercase tracking-tight">Login <span className="text-orange-500">History</span></h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { time: 'Jan 09, 14:55', status: 'Success', ip: '103.44.22.11' },
                            { time: 'Jan 08, 10:20', status: 'Success', ip: '103.44.23.01' },
                        ].map((log, i) => (
                            <div key={i} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100/50 border-slate-200/60'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black opacity-40">{log.time}</span>
                                    <span className="text-[9px] font-black uppercase text-emerald-500">{log.status}</span>
                                </div>
                                <p className="text-[11px] font-bold opacity-70 italic">{log.ip} • Chrome / Windows</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
