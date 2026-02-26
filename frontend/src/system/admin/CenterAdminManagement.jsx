import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
    Plus, Search, Edit2, Trash2, Key, UserSquare2,
    Mail, Phone, MapPin, Hash, X, Check, RefreshCw,
    ShieldCheck, BellRing, ChevronDown, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const CenterAdminManagement = () => {
    const { getApiUrl, token } = useAuth();
    const { isDarkMode } = useTheme();
    const [admins, setAdmins] = useState([]);
    const [centres, setCentres] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit'
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        employee_id: '',
        email: '',
        phone: '',
        password: '',
        centre_ids: []
    });

    // Password Reset Modal
    const [showPassModal, setShowPassModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // Alert State
    const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

    const triggerAlert = (message, type = 'success') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    };

    const fetchAdmins = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/admin-management/center-admins/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdmins(response.data);
        } catch (err) {
            console.error('Error fetching admins:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token]);

    const fetchCentres = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/centres/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCentres(response.data);
        } catch (err) {
            console.error('Error fetching centres:', err);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchAdmins();
        fetchCentres();
    }, [fetchAdmins, fetchCentres]);

    const handleAddClick = () => {
        setModalMode('add');
        setEditingAdmin(null);
        setFormData({ name: '', employee_id: '', email: '', phone: '', password: '', centre_ids: [] });
        setShowModal(true);
    };

    const handleEditClick = (admin) => {
        setModalMode('edit');
        setEditingAdmin(admin);
        setFormData({
            name: admin.name || '',
            employee_id: admin.employee_id || '',
            email: admin.email || '',
            phone: admin.phone || '',
            password: '',
            centre_ids: admin.centres ? admin.centres.map(c => c.id) : []
        });
        setShowModal(true);
    };

    const handlePassClick = (admin) => {
        setEditingAdmin(admin);
        setNewPassword('');
        setShowPassModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this center admin?')) return;
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/admin-management/center-admins/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdmins(admins.filter(a => a.id !== id));
            triggerAlert('Admin deleted successfully', 'success');
        } catch (err) {
            triggerAlert('Failed to delete admin', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const method = modalMode === 'edit' ? 'patch' : 'post';
            const url = modalMode === 'edit'
                ? `${apiUrl}/api/admin-management/center-admins/${editingAdmin.id}/`
                : `${apiUrl}/api/admin-management/center-admins/`;

            const submitData = { ...formData };
            if (modalMode === 'edit' && !submitData.password) delete submitData.password;

            const response = await axios[method](url, submitData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (modalMode === 'edit') {
                setAdmins(admins.map(a => a.id === editingAdmin.id ? response.data : a));
            } else {
                setAdmins([response.data, ...admins]);
            }
            setShowModal(false);
            triggerAlert(`Admin ${modalMode === 'edit' ? 'updated' : 'added'} successfully`, 'success');
        } catch (err) {
            triggerAlert(err.response?.data?.detail || 'Failed to save admin', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/admin-management/center-admins/${editingAdmin.id}/reset-password/`,
                { password: newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setShowPassModal(false);
            triggerAlert('Password reset successfully', 'success');
        } catch (err) {
            triggerAlert('Failed to reset password', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredAdmins = admins.filter(a =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-1 animate-fade-in">
            {/* Header */}
            <div className={`p-8 rounded-[5px] border shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                        Center <span className="text-orange-500">Admin Management</span>
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Manage center level administrators and their assigned locations.
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80 group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                        <input
                            type="text"
                            placeholder="Enter the Center Admin name"
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-medium ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50' : 'bg-slate-50 border-slate-200 focus:border-orange-500/50'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleAddClick}
                        className="px-6 py-3 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-[5px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/10 active:scale-95 whitespace-nowrap"
                    >
                        <span>Add Center Admin +</span>
                    </button>
                    <button
                        onClick={fetchAdmins}
                        className={`p-3 rounded-[5px] border transition-all active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:text-orange-600'}`}
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                <th className="py-6 px-8">Name</th>
                                <th className="py-6 px-8">Employee ID</th>
                                <th className="py-6 px-8">Email</th>
                                <th className="py-6 px-8">Phone</th>
                                <th className="py-6 px-8 text-center">Operation</th>
                                <th className="py-6 px-8">Centre</th>
                                <th className="py-6 px-8 text-right pr-12">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="py-8 px-8">
                                            <div className="h-4 bg-slate-200/20 rounded-full w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center opacity-40 uppercase font-black tracking-widest text-sm">No Admins Found</td>
                                </tr>
                            ) : filteredAdmins.map((admin, index) => (
                                <tr key={admin.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/30'}`}>
                                    <td className="py-5 px-8 font-black text-sm uppercase">{admin.name}</td>
                                    <td className="py-5 px-8 font-bold text-xs">
                                        <span className="px-2 py-1 bg-purple-500/10 text-purple-500 rounded-[5px] font-mono tracking-wider">{admin.employee_id}</span>
                                    </td>
                                    <td className="py-5 px-8 text-xs font-medium opacity-60 lowercase">{admin.email}</td>
                                    <td className="py-5 px-8 text-xs font-bold">{admin.phone || 'N/A'}</td>
                                    <td className="py-5 px-8 text-center">
                                        <button
                                            onClick={() => handleEditClick(admin)}
                                            className="text-orange-500 hover:text-orange-600 font-black text-[10px] uppercase tracking-widest border-b-2 border-orange-500/20 hover:border-orange-500 transition-all"
                                        >
                                            show-edit
                                        </button>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex flex-col gap-1 max-w-[200px]">
                                            {admin.centres && admin.centres.length > 0 ? admin.centres.map(c => (
                                                <div key={c.id} className="flex items-center gap-1.5">
                                                    <div className="w-1 h-1 bg-orange-500 rounded-full" />
                                                    <span className="text-[10px] font-black uppercase tracking-tight truncate">{c.name}</span>
                                                </div>
                                            )) : <span className="text-[10px] opacity-30 font-bold">NO CENTRE</span>}
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-right pr-12">
                                        <div className="flex justify-end items-center gap-4">
                                            <button
                                                onClick={() => handlePassClick(admin)}
                                                className="text-blue-500 hover:text-blue-600 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 border-blue-500/10 hover:border-blue-500"
                                            >
                                                Change Password
                                            </button>
                                            <button
                                                onClick={() => handleEditClick(admin)}
                                                className="text-blue-500 hover:text-blue-600 text-[10px] font-black uppercase tracking-widest border-b-2 border-blue-500/10 hover:border-blue-500"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(admin.id)}
                                                className="text-red-500 hover:text-red-600 text-[10px] font-black uppercase tracking-widest border-b-2 border-red-500/10 hover:border-red-500"
                                            >
                                                delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Standard Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isActionLoading && setShowModal(false)} />
                    <div className={`relative w-full max-w-lg rounded-[5px] overflow-hidden shadow-2xl animate-scale-up ${isDarkMode ? 'bg-[#10141D] border border-white/10' : 'bg-white'}`}>
                        <div className="bg-orange-500 p-6 flex items-center justify-between">
                            <h2 className="text-white text-lg font-black uppercase tracking-tight">Center Admin Detail</h2>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition-colors">
                                <X size={22} strokeWidth={3} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Admin Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Enter Full Name"
                                        className={`w-full bg-transparent border-b-2 py-3 font-bold text-sm outline-none transition-all ${isDarkMode ? 'border-white/10 text-white focus:border-orange-500' : 'border-slate-200 text-slate-800 focus:border-orange-500'}`}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Employee ID *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="PATH-..."
                                        className={`w-full bg-transparent border-b-2 py-3 font-bold text-sm outline-none transition-all ${isDarkMode ? 'border-white/10 text-white focus:border-orange-500' : 'border-slate-200 text-slate-800 focus:border-orange-500'}`}
                                        value={formData.employee_id}
                                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="XXXXXXXXXX"
                                        className={`w-full bg-transparent border-b-2 py-3 font-bold text-sm outline-none transition-all ${isDarkMode ? 'border-white/10 text-white focus:border-orange-500' : 'border-slate-200 text-slate-800 focus:border-orange-500'}`}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email Address *</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="admin@pathfinder.edu.in"
                                        className={`w-full bg-transparent border-b-2 py-3 font-bold text-sm outline-none transition-all ${isDarkMode ? 'border-white/10 text-white focus:border-orange-500' : 'border-slate-200 text-slate-800 focus:border-orange-500'}`}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                {modalMode === 'add' && (
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Account Password *</label>
                                        <input
                                            required
                                            type="password"
                                            placeholder="••••••••"
                                            className={`w-full bg-transparent border-b-2 py-3 font-bold text-sm outline-none transition-all ${isDarkMode ? 'border-white/10 text-white focus:border-orange-500' : 'border-slate-200 text-slate-800 focus:border-orange-500'}`}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Assign Centres</label>
                                    <div className={`mt-2 p-4 rounded-[5px] border max-h-40 overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="grid grid-cols-2 gap-4">
                                            {centres.map(centre => (
                                                <label key={centre.id} className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.centre_ids.includes(centre.id)}
                                                        onChange={(e) => {
                                                            const ids = e.target.checked
                                                                ? [...formData.centre_ids, centre.id]
                                                                : formData.centre_ids.filter(id => id !== centre.id);
                                                            setFormData({ ...formData, centre_ids: ids });
                                                        }}
                                                        className="w-4 h-4 rounded accent-orange-500"
                                                    />
                                                    <span className="text-[10px] font-black uppercase tracking-tight group-hover:text-orange-500 transition-colors uppercase truncate">{centre.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-3"
                            >
                                {isActionLoading ? <RefreshCw size={16} className="animate-spin" /> : (modalMode === 'edit' ? 'Update Profile' : 'Create Admin')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {showPassModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowPassModal(false)} />
                    <div className={`relative w-full max-w-sm rounded-[5px] overflow-hidden shadow-2xl animate-scale-up ${isDarkMode ? 'bg-[#10141D] border border-white/10' : 'bg-white'}`}>
                        <div className="bg-blue-500 p-6 flex items-center justify-between">
                            <h2 className="text-white text-lg font-black uppercase tracking-tight">Security Update</h2>
                            <button onClick={() => setShowPassModal(false)} className="text-white/80 hover:text-white transition-colors">
                                <X size={22} strokeWidth={3} />
                            </button>
                        </div>
                        <form onSubmit={handlePasswordReset} className="p-8 space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">New Password *</label>
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    className={`w-full bg-transparent border-b-2 py-3 font-bold text-sm outline-none transition-all ${isDarkMode ? 'border-white/10 text-white focus:border-blue-500' : 'border-slate-200 text-slate-800 focus:border-blue-500'}`}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3"
                            >
                                {isActionLoading ? <RefreshCw size={16} className="animate-spin" /> : 'Confirm Reset'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Premium Alert */}
            {alert.show && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-10 duration-500 w-[90%] max-w-sm">
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-[5px] shadow-2xl border backdrop-blur-md ${alert.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
                        <div className="w-10 h-10 rounded-[5px] bg-white/20 flex items-center justify-center">
                            {alert.type === 'success' ? <ShieldCheck size={22} /> : <BellRing size={22} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Notification</p>
                            <p className="text-sm font-bold">{alert.message}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CenterAdminManagement;
