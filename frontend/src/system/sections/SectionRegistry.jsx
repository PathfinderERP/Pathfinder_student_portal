import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Plus,
    Search,
    RotateCcw,
    Pencil,
    X,
    Eye,
    Trash2,
    LayoutDashboard,
    RefreshCw,
    ShieldCheck,
    BellRing
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import AllocatedTestsDetails from './AllocatedTestsDetails';

const SectionRegistry = () => {
    const { getApiUrl, token } = useAuth();
    const { isDarkMode } = useTheme();
    const [sections, setSections] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
    const [editingSection, setEditingSection] = useState(null);
    const [formData, setFormData] = useState({
        subject_code: '',
        name: ''
    });

    // Custom Alert State
    const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

    const triggerAlert = (message, type = 'success') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    };

    // View State
    const [view, setView] = useState('list'); // 'list' or 'details'
    const [selectedSectionForTests, setSelectedSectionForTests] = useState(null);

    const fetchSections = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const authToken = token || localStorage.getItem('auth_token');
            if (!authToken) return;
            const response = await axios.get(`${apiUrl}/api/sections/`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            setSections(response.data);
        } catch (err) {
            console.error('Error fetching sections:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    const handleRefresh = () => {
        setSearchTerm('');
        fetchSections();
    };

    const handleAddClick = () => {
        setModalMode('add');
        setEditingSection(null);
        setFormData({ subject_code: '', name: '' });
        setShowModal(true);
    };

    const handleEditClick = (section) => {
        setModalMode('edit');
        setEditingSection(section);
        setFormData({
            subject_code: section.subject_code || section.code || '',
            name: section.name || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this section?')) return;

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const authToken = token || localStorage.getItem('auth_token');
            await axios.delete(`${apiUrl}/api/sections/${id}/`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            setSections(sections.filter(s => s.id !== id));
        } catch (err) {
            console.error('Error deleting section:', err);
            alert('Failed to delete section.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl().replace(/\/$/, '');
            const authToken = token || localStorage.getItem('auth_token');
            const url = modalMode === 'edit'
                ? `${apiUrl}/api/sections/${editingSection.id}/`
                : `${apiUrl}/api/sections/`;
            const method = modalMode === 'edit' ? 'patch' : 'post';

            const response = await axios[method](url, formData, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (modalMode === 'edit') {
                setSections(sections.map(s => s.id === editingSection.id ? response.data : s));
            } else {
                setSections([response.data, ...sections]);
            }
            setShowModal(false);
            await fetchSections();
            triggerAlert(`Section ${modalMode === 'edit' ? 'updated' : 'added'} successfully!`, 'success');
        } catch (err) {
            console.error('Error saving section:', err);
            const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.response?.data?.code?.[0] || 'Failed to save section.';
            triggerAlert(errorMsg, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleShowTests = (section) => {
        setSelectedSectionForTests(section);
        setView('details');
    };

    const filteredSections = sections.filter(s =>
        s.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (view === 'details' && selectedSectionForTests) {
        return (
            <AllocatedTestsDetails
                section={selectedSectionForTests}
                onBack={() => setView('list')}
            />
        );
    }

    return (
        <div className="p-1 animate-fade-in">
            {/* Header Area */}
            <div className={`flex items-center justify-between mb-8 p-6 rounded-[5px] ${isDarkMode ? 'bg-[#10141D] border border-white/5' : 'bg-slate-50 shadow-sm border border-slate-100'}`}>
                <h1 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Section <span className="text-orange-500">List</span>
                </h1>

                <div className="flex items-center gap-4 flex-1 max-w-2xl ml-8">
                    <div className="relative flex-1 group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
                        <input
                            type="text"
                            placeholder="Enter the test name"
                            className={`w-full pl-12 pr-4 py-3 rounded-[5px] border transition-all outline-none font-medium
                                ${isDarkMode
                                    ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50'
                                    : 'bg-slate-50 border-slate-200 focus:border-orange-500/50 focus:bg-white focus:shadow-lg focus:shadow-orange-500/10'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={handleAddClick}
                        className="px-6 py-3 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-[5px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/10 active:scale-95 whitespace-nowrap"
                    >
                        <span>Add section +</span>
                    </button>

                    <button
                        onClick={handleRefresh}
                        className={`p-3 rounded-[5px] border transition-all active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-orange-500' : 'bg-white border-slate-200 text-slate-500 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50'}`}
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className={`rounded-[5px] border overflow-hidden ${isDarkMode ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-[0.15em] border-b ${isDarkMode ? 'text-slate-500 border-white/5 bg-white/5' : 'text-slate-400 border-slate-100 bg-slate-50/50'}`}>
                                <th className="py-6 px-8">#</th>
                                <th className="py-6 px-8">Section Code</th>
                                <th className="py-6 px-8 text-center">Section Name</th>
                                <th className="py-6 px-8 text-center">Show All Tests</th>
                                <th className="py-6 px-8 text-right pr-12">Edit</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-6 px-8">
                                            <div className={`h-4 w-4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-6 px-8">
                                            <div className={`h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-6 px-8">
                                            <div className={`mx-auto h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-6 px-8">
                                            <div className={`mx-auto h-4 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-6 px-8 text-right pr-12">
                                            <div className="flex justify-end gap-2">
                                                <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-8 w-8 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredSections.length > 0 ? filteredSections.map((section, index) => (
                                <tr key={section.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}>
                                    <td className="py-5 px-8 text-sm font-bold opacity-50">{index + 1}</td>
                                    <td className="py-5 px-8">
                                        <span className={`font-black text-sm tracking-tight ${isDarkMode ? 'text-white/90' : 'text-slate-700'}`}>
                                            {section.subject_code || section.code}
                                        </span>
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {section.name}
                                        </span>
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <button
                                            onClick={() => handleShowTests(section)}
                                            className="text-blue-500 hover:text-blue-600 font-bold text-sm transition-colors hover:underline decoration-2 underline-offset-4">
                                            Show All Tests
                                        </button>
                                    </td>
                                    <td className="py-5 px-8 text-right pr-12">
                                        <div className="flex justify-end gap-2 outline-none">
                                            <button
                                                onClick={() => handleEditClick(section)}
                                                className={`p-2 rounded-[5px] transition-all transform hover:scale-110 ${isDarkMode ? 'bg-white/5 text-blue-400' : 'bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white'}`}
                                            >
                                                <Pencil size={18} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(section.id)}
                                                className={`p-2 rounded-[5px] transition-all transform hover:scale-110 ${isDarkMode ? 'bg-white/5 text-red-400' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                                            >
                                                <Trash2 size={18} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                            <Search size={64} />
                                            <p className="text-lg font-black uppercase tracking-widest">No Sections Found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#0B0E14]/80 backdrop-blur-md animate-fade-in"
                        onClick={() => !isActionLoading && setShowModal(false)}
                    />

                    <div className={`relative w-full max-w-md rounded-[5px] overflow-hidden shadow-2xl animate-scale-up ${isDarkMode ? 'bg-[#10141D] border border-white/10' : 'bg-white'}`}>
                        {/* Modal Header */}
                        <div className="bg-orange-500 p-6 flex items-center justify-between">
                            <h2 className="text-white text-lg font-black uppercase tracking-tight">Section Detail</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-white/80 hover:text-white transition-colors"
                                disabled={isActionLoading}
                            >
                                <X size={22} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-1">
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 border-b pb-1 ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-200'} inline-block`}>
                                    Enter Section Details
                                </p>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Section Code *</label>
                                        <input
                                            required
                                            type="text"
                                            className={`w-full bg-transparent border-b-2 py-3 font-bold text-sm outline-none transition-all
                                                ${isDarkMode
                                                    ? 'border-white/10 text-white focus:border-orange-500'
                                                    : 'border-slate-200 text-slate-800 focus:border-orange-500'}`}
                                            value={formData.subject_code || ''}
                                            onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                                            placeholder="Enter Code"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Section Name *</label>
                                        <input
                                            required
                                            type="text"
                                            className={`w-full bg-transparent border-b-2 py-3 font-bold text-sm outline-none transition-all
                                                ${isDarkMode
                                                    ? 'border-white/10 text-white focus:border-orange-500'
                                                    : 'border-slate-200 text-slate-800 focus:border-orange-500'}`}
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter Name"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center pt-4">
                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="px-8 py-3 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-[5px] font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-emerald-900/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isActionLoading ? <RefreshCw size={12} className="animate-spin" /> : (modalMode === 'edit' ? 'Update' : 'Add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Premium Custom Alert */}
            {alert.show && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-10 duration-500 w-[90%] max-w-sm">
                    <div className={`flex items-center gap-4 px-6 py-4 rounded-[5px] shadow-2xl border backdrop-blur-md ${alert.type === 'success'
                        ? 'bg-emerald-500/90 border-emerald-400 text-white'
                        : 'bg-red-500/90 border-red-400 text-white'
                        }`}>
                        <div className="w-10 h-10 rounded-[5px] bg-white/20 flex items-center justify-center shadow-inner">
                            {alert.type === 'success' ? <ShieldCheck size={22} /> : <BellRing size={22} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">Notification</p>
                            <p className="text-sm font-bold tracking-tight">{alert.message}</p>
                        </div>
                        <button onClick={() => setAlert(prev => ({ ...prev, show: false }))} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
                            <X size={18} strokeWidth={3} />
                        </button>
                    </div>
                    {/* Auto-discard progress bar */}
                    <div className="absolute bottom-0 left-4 right-4 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white animate-progress-shrink" style={{ animationDuration: '3000ms' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SectionRegistry;
