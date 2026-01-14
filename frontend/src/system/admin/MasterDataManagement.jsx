import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
    Calendar, Layers, GraduationCap, Plus, Search,
    Edit2, Trash2, Filter, Loader2, Database, X, Check, ChevronDown
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const subTabs = [
    { id: 'Session', icon: Calendar, label: 'Session', endpoint: 'sessions' },
    { id: 'Exam Type', icon: Layers, label: 'Exam Type', endpoint: 'exam-types' },
    { id: 'Class', icon: GraduationCap, label: 'Class', endpoint: 'classes' }
];

const MasterDataManagement = ({ activeSubTab, setActiveSubTab }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState(null);

    // Filter State
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedItem, setSelectedItem] = useState(null);
    const [formValues, setFormValues] = useState({
        name: '',
        code: '',
        description: '',
        is_active: true
    });

    const currentTabConfig = useMemo(() => subTabs.find(t => t.id === activeSubTab), [activeSubTab]);

    const getAuthConfig = useCallback(() => {
        const token = localStorage.getItem('auth_token');
        return token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    }, []);

    const fetchData = useCallback(async () => {
        if (!currentTabConfig) return;
        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = getApiUrl();
            const config = getAuthConfig();
            const response = await axios.get(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/`, config);
            setData(response.data);
        } catch (err) {
            console.error(`Failed to fetch ${activeSubTab} data:`, err);
            setError(`Failed to load ${activeSubTab.toLowerCase()} data.`);
        } finally {
            setIsLoading(false);
        }
    }, [currentTabConfig, getApiUrl, getAuthConfig, activeSubTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = () => {
        setModalMode('create');
        setSelectedItem(null);
        setFormValues({ name: '', code: '', description: '', is_active: true });
        setIsModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('edit');
        setSelectedItem(item);
        setFormValues({
            name: item.name,
            code: item.code,
            description: item.description || '',
            is_active: item.is_active
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/${id}/`, getAuthConfig());
            fetchData();
        } catch (err) {
            alert('Failed to delete item');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/${item.id}/`,
                { is_active: !item.is_active },
                getAuthConfig()
            );
            fetchData();
        } catch (err) {
            alert('Failed to toggle status');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            if (modalMode === 'create') {
                await axios.post(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/`, formValues, getAuthConfig());
            } else {
                await axios.patch(`${apiUrl}/api/master-data/${currentTabConfig.endpoint}/${selectedItem.id}/`, formValues, getAuthConfig());
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert(`Failed to ${modalMode} item: ` + (err.response?.data?.code || err.message));
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredData = data.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = item.is_active === true;
        if (statusFilter === 'inactive') matchesStatus = item.is_active === false;

        return matchesSearch && matchesStatus;
    });

    const renderHeader = () => (
        <div className={`p-8 rounded-[2.5rem] border shadow-xl mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                        Master <span className="text-orange-500">Data</span>
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Configure system-wide parameters and categories.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 p-1.5 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        {subTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab.id
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-white'
                                    }`}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderContent = () => (
        <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${activeSubTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                            }`}
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto relative">
                    {/* Filter Button & Dropdown */}
                    <div className="relative flex-1 md:flex-none">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${statusFilter !== 'all'
                                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-500'
                                    : isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Filter size={16} className={statusFilter !== 'all' ? 'animate-pulse' : ''} />
                            {statusFilter === 'all' ? 'Filter' : `${statusFilter}`}
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-[60]" onClick={() => setIsFilterOpen(false)} />
                                <div className={`absolute right-0 top-full mt-3 w-56 z-[70] p-2 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'
                                    }`}>
                                    {[
                                        { id: 'all', label: 'All Status' },
                                        { id: 'active', label: 'Active Only' },
                                        { id: 'inactive', label: 'Inactive Only' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                setStatusFilter(opt.id);
                                                setIsFilterOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${statusFilter === opt.id
                                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            {opt.label}
                                            {statusFilter === opt.id && <Check size={14} strokeWidth={3} />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={handleCreate}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 active:scale-95"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Add New {activeSubTab}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                {isLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">Synchronizing Master Data...</p>
                    </div>
                ) : error ? (
                    <div className="py-24 flex flex-col items-center justify-center space-y-4 text-red-500">
                        <Database size={48} className="opacity-20" />
                        <p className="font-bold">{error}</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-4 px-4 font-black">Name / Title</th>
                                <th className="pb-4 px-4 font-black">Code</th>
                                <th className="pb-4 px-4 font-black text-center">Status</th>
                                <th className="pb-4 px-4 text-right font-black">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {filteredData.length > 0 ? filteredData.map((item) => (
                                <tr key={item.id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-200/50'} transition-colors`}>
                                    <td className="py-5 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-orange-900/10 text-orange-500 border-white/5' : 'bg-orange-50 text-orange-600 border-orange-100'
                                                }`}>
                                                {activeSubTab.charAt(0)}
                                            </div>
                                            <span className="font-bold text-sm">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-sm font-bold opacity-70">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {item.code}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleToggleStatus(item)}
                                                disabled={isActionLoading}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all hover:scale-105 active:scale-95 ${item.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}
                                            >
                                                <div className={`w-1 h-1 rounded-full ${item.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                {item.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-end items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className={`p-2 rounded-xl transition-all hover:scale-110 ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white'}`}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                disabled={isActionLoading}
                                                className={`p-2 rounded-xl transition-all hover:scale-110 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white'}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-24 text-center">
                                        <div className="flex flex-col items-center opacity-20">
                                            <Database size={48} className="mb-4" />
                                            <p className="font-black uppercase tracking-[0.2em] text-sm">No Records Found</p>
                                            <p className="text-xs mt-1">Try adjusting your search or add a new entry.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    const renderModal = () => {
        if (!isModalOpen) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isActionLoading && setIsModalOpen(false)} />
                <div className={`relative w-full max-w-lg rounded-[2.5rem] border shadow-2xl p-8 animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                {modalMode === 'create' ? 'Add New' : 'Edit'} <span className="text-orange-500">{activeSubTab}</span>
                            </h2>
                            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">Configuration parameters</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}>
                            <X size={20} strokeWidth={3} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Name / Title</label>
                            <input
                                required
                                type="text"
                                value={formValues.name}
                                onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                placeholder={`e.g. ${activeSubTab} 2024`}
                                className={`w-full p-4 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Unique Code</label>
                            <input
                                required
                                type="text"
                                value={formValues.code}
                                onChange={e => setFormValues({ ...formValues, code: e.target.value })}
                                placeholder="SESS_2024"
                                className={`w-full p-4 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Description</label>
                            <textarea
                                rows="3"
                                value={formValues.description}
                                onChange={e => setFormValues({ ...formValues, description: e.target.value })}
                                placeholder="Optional details..."
                                className={`w-full p-4 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 resize-none ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                        </div>

                        <div className="flex items-center gap-4 py-2">
                            <button
                                type="button"
                                onClick={() => setFormValues({ ...formValues, is_active: !formValues.is_active })}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-black text-[10px] uppercase tracking-widest ${formValues.is_active
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                                    : isDarkMode ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${formValues.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                {formValues.is_active ? 'Active' : 'Inactive'}
                            </button>
                        </div>

                        <button
                            disabled={isActionLoading}
                            type="submit"
                            className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-4"
                        >
                            {isActionLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>SAVE CONFIGURATION <Check size={18} strokeWidth={3} /></>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderHeader()}
            {renderContent()}
            {renderModal()}
        </div>
    );
};

export default MasterDataManagement;
