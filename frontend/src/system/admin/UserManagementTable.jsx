import React from 'react';
import { Power, Key, Settings, Trash2 } from 'lucide-react';

const UserManagementTable = ({
    users,
    isDarkMode,
    onToggleStatus,
    onResetPassword,
    onEditPermissions,
    onDelete,
    currentUserId,
    isActionLoading
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                        <th className="pb-4 px-4 font-black">User</th>
                        <th className="pb-4 px-4 font-black">Role</th>
                        <th className="pb-4 px-4 font-black">Email</th>
                        <th className="pb-4 px-4 font-black">Created By</th>
                        <th className="pb-4 px-4 font-black">Creation Time</th>
                        <th className="pb-4 px-4 font-black text-center">Status</th>
                        <th className="pb-4 px-4 text-right font-black">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-transparent">
                    {users.map((admin, i) => (
                        <tr key={i} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-200/50'} transition-colors`}>
                            <td className="py-5 px-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden border-2 transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-orange-900/20 text-orange-500 border-white/5' : 'bg-orange-100 text-orange-600 border-slate-200'}`}>
                                        {admin.profile_image ? (
                                            <img src={admin.profile_image} alt={admin.username} className="w-full h-full object-cover" />
                                        ) : (
                                            admin.username?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <span className={`font-bold text-sm ${!admin.is_active && 'opacity-40 grayscale'}`}>{admin.username}</span>
                                </div>
                            </td>
                            <td className="py-5 px-4 text-sm font-bold opacity-70">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter hover:scale-110 transition-transform cursor-default ${admin.user_type === 'superadmin' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                    'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                    }`}>
                                    {admin.user_type?.toUpperCase()}
                                </span>
                            </td>
                            <td className="py-5 px-4 text-sm font-medium opacity-60 italic whitespace-nowrap">{admin.email}</td>
                            <td className="py-5 px-4 text-[11px] font-bold opacity-60 whitespace-nowrap">
                                {admin.created_by_username || 'System'}
                            </td>
                            <td className="py-5 px-4 text-[10px] font-bold opacity-50 whitespace-nowrap text-center">
                                {admin.date_joined ? new Date(admin.date_joined).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex justify-center">
                                    <button
                                        onClick={() => onToggleStatus(admin)}
                                        disabled={isActionLoading || admin.id === currentUserId}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all shadow-sm ${admin.is_active
                                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                                            : 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500 hover:text-white'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <Power size={10} strokeWidth={4} />
                                        {admin.is_active ? 'Active' : 'Locked'}
                                    </button>
                                </div>
                            </td>
                            <td className="py-5 px-4">
                                <div className="flex justify-end items-center gap-2">
                                    <button
                                        onClick={() => onResetPassword(admin)}
                                        className={`p-2 rounded-xl transition-all hover:scale-110 shadow-sm ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-orange-500 border border-white/5' : 'bg-slate-100 text-slate-500 hover:bg-orange-600 hover:text-white border border-slate-200'}`}
                                        title="Change Password"
                                    >
                                        <Key size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => onEditPermissions(admin)}
                                        className={`p-2 rounded-xl transition-all hover:scale-110 shadow-sm ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white border border-white/5' : 'bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white border border-slate-200'}`}
                                        title="Edit User Permissions"
                                    >
                                        <Settings size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(admin)}
                                        disabled={isActionLoading || admin.id === currentUserId}
                                        className={`p-2 rounded-xl transition-all hover:scale-110 shadow-sm ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white border border-red-100'} disabled:opacity-50`}
                                        title="Delete User"
                                    >
                                        <Trash2 size={16} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserManagementTable;
