import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Plus, Search, Edit2, Trash2, RefreshCw, ArrowLeft,
    Settings, ToggleLeft, ToggleRight, Loader2, ChevronRight, X, ShieldCheck, BellRing
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';

const TestSectionManager = ({ test, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [sections, setSections] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state for Add/Edit Section
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedSection, setSelectedSection] = useState(null);
    const [formValues, setFormValues] = useState({
        name: '',
        subject_code: '',
        total_questions: 20,
        allowed_questions: 20,
        shuffle: false,
        correct_marks: 4,
        negative_marks: 1,
        partial_type: 'regular',
        partial_marks: 0,
        priority: 1
    });

    // Custom Alert State
    const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

    const triggerAlert = (message, type = 'success') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
    };

    const [targetExams, setTargetExams] = useState([]);

    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        return activeToken ? { headers: { 'Authorization': `Bearer ${activeToken}` } } : {};
    }, [token]);

    const fetchSections = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const [sectionsRes, targetExamsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/${test.id}/sections/`, getAuthConfig()),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, getAuthConfig())
            ]);
            setSections(sectionsRes.data);
            setTargetExams(targetExamsRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [test.id, getApiUrl, getAuthConfig]);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    const handleAdd = () => {
        setModalMode('add');
        setSelectedSection(null);
        setFormValues({
            name: '',
            subject_code: '',
            total_questions: 20,
            allowed_questions: 20,
            shuffle: false,
            correct_marks: 4,
            negative_marks: 1,
            partial_type: 'regular',
            partial_marks: 0,
            priority: sections.length + 1
        });
        setIsModalOpen(true);
    };

    const handleEdit = (section) => {
        setModalMode('edit');
        setSelectedSection(section);
        setFormValues({
            name: section.name,
            subject_code: section.subject_code,
            total_questions: section.total_questions,
            allowed_questions: section.allowed_questions,
            shuffle: section.shuffle,
            correct_marks: section.correct_marks,
            negative_marks: section.negative_marks,
            partial_type: section.partial_type,
            partial_marks: section.partial_marks,
            priority: section.priority
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this section?')) return;
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/sections/${id}/`, getAuthConfig());
            fetchSections();
            triggerAlert('Section deleted successfully!', 'success');
        } catch (err) {
            triggerAlert('Failed to delete section', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleShuffle = async (section) => {
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/sections/${section.id}/`,
                { shuffle: !section.shuffle },
                getAuthConfig()
            );
            fetchSections();
            triggerAlert(`Shuffle ${!section.shuffle ? 'enabled' : 'disabled'}`, 'success');
        } catch (err) {
            triggerAlert('Failed to update shuffle', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const payload = { ...formValues, test: test.id };
            if (modalMode === 'add') {
                await axios.post(`${apiUrl}/api/sections/`, payload, getAuthConfig());
            } else {
                await axios.patch(`${apiUrl}/api/sections/${selectedSection.id}/`, payload, getAuthConfig());
            }
            setIsModalOpen(false);
            await fetchSections();
            triggerAlert(`Section ${modalMode === 'add' ? 'created' : 'updated'} successfully!`, 'success');
        } catch (err) {
            console.error('Error saving section:', err);
            const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Failed to save section';
            triggerAlert(errorMsg, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredSections = sections.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#0B0F17] text-white' : 'bg-slate-50 text-slate-900'} px-1 py-6 animate-in fade-in duration-500`}>
            {/* Header Info */}
            <div className={`mb-6 p-4 rounded-[5px] border flex flex-wrap justify-between items-center gap-4 ${isDarkMode ? 'bg-[#1A1F2B] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={`p-3 rounded-[5px] transition-all hover:scale-110 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold opacity-40 uppercase tracking-widest">Test Name</span>
                            <ChevronRight size={10} className="opacity-20" />
                            <span className="text-sm font-black">{test.name}</span>
                            <span className="text-[10px] opacity-40 font-bold">({test.session_details?.name})</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold opacity-40 uppercase tracking-widest">Code :</span>
                            <span className="text-xs font-black text-blue-500">{test.code}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] font-black text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center gap-3 active:scale-95"
                >
                    Show ALL Test
                </button>
            </div>

            {/* Main Content Card */}
            <div className={`rounded-[5px] border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                {/* Actions Toolbar */}
                <div className="p-6 border-b border-inherit flex flex-wrap justify-between items-center gap-4">
                    <h3 className="text-lg font-black uppercase tracking-tight">Section List</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Enter the Section name"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`pl-10 pr-4 py-2 rounded-[5px] border text-xs font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            className="px-6 py-3 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-[5px] font-black text-sm shadow-xl shadow-green-900/10 transition-all flex items-center gap-3 active:scale-95"
                        >
                            <Plus size={20} /> Add Section +
                        </button>
                        <button
                            onClick={fetchSections}
                            className={`p-3 rounded-[5px] border transition-all hover:scale-110 active:rotate-180 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200 text-blue-500'}`}
                        >
                            <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                <th className="py-4 px-2 text-center">#</th>
                                <th className="py-4 px-2">Section Name</th>
                                <th className="py-4 px-2">Section Code</th>
                                <th className="py-4 px-2 text-center whitespace-nowrap">Allowed/Total</th>
                                <th className="py-4 px-2 text-center">Shuffle</th>
                                <th className="py-4 px-2 text-center">Correct</th>
                                <th className="py-4 px-2 text-center">Negative</th>
                                <th className="py-4 px-2 text-center">Action</th>
                                <th className="py-4 px-2 text-center">Priority</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-2 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-2"><div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-2"><div className={`h-4 w-20 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-2 text-center"><div className={`h-4 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-2 text-center"><div className={`h-6 w-12 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-2 text-center"><div className={`h-4 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-2 text-center"><div className={`h-4 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-2 text-center"><div className={`h-8 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-2 text-center"><div className={`h-4 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    </tr>
                                ))
                            ) : filteredSections.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="py-20 text-center opacity-40">No sections found</td>
                                </tr>
                            ) : filteredSections.map((section, index) => (
                                <tr key={section.id} className={`${index % 2 === 0 ? (isDarkMode ? 'bg-white/[0.01]' : 'bg-slate-50/50') : ''}`}>
                                    <td className="py-4 px-2 text-center font-bold text-xs opacity-50">{index + 1}</td>
                                    <td className="py-4 px-2 font-bold text-[10px] uppercase">{section.name}</td>
                                    <td className="py-4 px-2 font-black text-[10px] text-blue-500 uppercase">{section.subject_code || section.code}</td>
                                    <td className="py-4 px-2 text-center font-bold text-xs">{section.allowed_questions}/{section.total_questions}</td>
                                    <td className="py-4 px-2 text-center">
                                        <button onClick={() => handleToggleShuffle(section)} className={`transition-all hover:scale-125 ${section.shuffle ? 'text-green-600' : 'text-slate-400 opacity-40'}`}>
                                            {section.shuffle ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                        </button>
                                    </td>
                                    <td className="py-4 px-2 text-center font-black text-xs">{section.correct_marks}</td>
                                    <td className="py-4 px-2 text-center font-black text-xs">{section.negative_marks}</td>
                                    <td className="py-4 px-2 text-center">
                                        <div className="flex justify-center items-center gap-3">
                                            <button onClick={() => handleEdit(section)} className="text-blue-500 hover:scale-125 transition-all"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(section.id)} className="text-red-500 hover:scale-125 transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 text-center font-black text-xs">{section.priority}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resized Mini Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isActionLoading && setIsModalOpen(false)} />
                    <div className={`relative w-full max-w-md rounded-[5px] shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        {/* Header - Matching User Image */}
                        <div className="bg-[#FF6600] p-6 flex justify-between items-center relative">
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">
                                Section Detail
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:rotate-90 transition-all duration-300">
                                <X size={22} strokeWidth={3} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 border-b pb-1 border-slate-200 inline-block">Enter Section Details</p>

                                <div className="space-y-6">
                                    <div className="relative group">
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-blue-400' : 'text-slate-500'}`}>Section Code *</label>
                                        <input
                                            required
                                            type="text"
                                            value={formValues.subject_code || ''}
                                            placeholder="Enter Code"
                                            onChange={e => setFormValues({ ...formValues, subject_code: e.target.value })}
                                            className={`w-full py-3 bg-transparent border-b-2 text-sm font-bold outline-none transition-all ${isDarkMode ? 'border-white/10 focus:border-blue-500 text-white' : 'border-slate-100 focus:border-blue-500 text-slate-900'}`}
                                        />
                                    </div>

                                    <div className="relative group">
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-blue-400' : 'text-slate-500'}`}>Section Name *</label>
                                        <input
                                            required
                                            type="text"
                                            value={formValues.name || ''}
                                            placeholder="Enter Name"
                                            onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                            className={`w-full py-3 bg-transparent border-b-2 text-sm font-bold outline-none transition-all ${isDarkMode ? 'border-white/10 focus:border-blue-500 text-white' : 'border-slate-100 focus:border-blue-500 text-slate-900'}`}
                                        />
                                    </div>

                                    {/* Keep hidden fields for backend requirements but show only relevant ones in small modal if needed */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="relative group">
                                            <label className="block text-[9px] font-black text-slate-400 uppercase">Correct</label>
                                            <input type="number" step="0.1" value={formValues.correct_marks} onChange={e => setFormValues({ ...formValues, correct_marks: parseFloat(e.target.value) })} className="w-full py-1 bg-transparent border-b border-slate-200 text-xs font-bold outline-none focus:border-blue-500" />
                                        </div>
                                        <div className="relative group">
                                            <label className="block text-[9px] font-black text-slate-400 uppercase">Negative</label>
                                            <input type="number" step="0.1" value={formValues.negative_marks} onChange={e => setFormValues({ ...formValues, negative_marks: parseFloat(e.target.value) })} className="w-full py-1 bg-transparent border-b border-slate-200 text-xs font-bold outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center pt-4">
                                <button
                                    disabled={isActionLoading}
                                    className="px-8 py-3 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-[5px] font-black text-xs uppercase tracking-widest shadow-xl shadow-green-900/20 transition-all flex items-center gap-3 active:scale-95"
                                >
                                    {isActionLoading && <Loader2 size={16} className="animate-spin" />}
                                    {modalMode === 'add' ? 'Create' : 'Update'}
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
                    <div className="absolute bottom-0 left-4 right-4 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white animate-progress-shrink" style={{ animationDuration: '3000ms' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestSectionManager;
