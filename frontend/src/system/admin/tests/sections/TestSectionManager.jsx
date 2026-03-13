import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Plus, Search, Edit2, Trash2, RefreshCw, ArrowLeft,
    Settings, Loader2, ChevronRight, X, ShieldCheck, BellRing, CheckSquare, Square
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';

const TestSectionManager = ({ test, onBack, onManageQuestions }) => {
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
    const [subjects, setSubjects] = useState([]);

    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        return activeToken ? { headers: { 'Authorization': `Bearer ${activeToken}` } } : {};
    }, [token]);

    const fetchSections = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const [sectionsRes, targetExamsRes, subjectsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/${test.id}/sections/`, getAuthConfig()),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, getAuthConfig()),
                axios.get(`${apiUrl}/api/master-data/subjects/`, getAuthConfig())
            ]);
            setSections(sectionsRes.data);
            setTargetExams(targetExamsRes.data);
            setSubjects(subjectsRes.data);
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
            subject_id: '',
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
            subject_id: section.subject_id || '',
            total_questions: section.total_questions || 20,
            allowed_questions: section.allowed_questions || 20,
            shuffle: section.shuffle,
            correct_marks: section.correct_marks || 4,
            negative_marks: section.negative_marks || 1,
            partial_type: section.partial_type || 'regular',
            partial_marks: section.partial_marks || 0,
            priority: section.priority || 1
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


    const filteredSections = Array.isArray(sections)
        ? sections.filter(s =>
            (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())
          )
        : [];

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
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-black uppercase tracking-tight">Section List</h3>
                    </div>
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
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b shadow-sm ${isDarkMode ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-slate-200 text-slate-700 border-slate-300'}`}>
                                <th className="py-5 px-4 text-center whitespace-nowrap w-12">#</th>
                                <th className="py-5 px-4 whitespace-nowrap text-left">Section Name</th>
                                <th className="py-5 px-4 whitespace-nowrap text-left">Subject Code</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap">Allowed/Total Questions</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap">Shuffle</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap">Correct Marks</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap">Negative Marks</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap">Partial Type</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap">Partial Marks</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap">Questions</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap w-20">Action</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap w-20">Delete</th>
                                <th className="py-5 px-4 text-center whitespace-nowrap w-20">Priority</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array(13).fill(0).map((__, j) => (
                                            <td key={j} className="py-4 px-3 text-center">
                                                <div className={`h-4 w-12 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredSections.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="py-20 text-center opacity-40">No sections found</td>
                                </tr>
                            ) : filteredSections.map((section, index) => (
                                <tr key={section.id} className={`group transition-all duration-300 border-b ${isDarkMode ? 'border-white/5 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50'}`}>

                                    {/* Row # */}
                                    <td className="py-5 px-4 text-center">
                                        <span className={`text-xs font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{index + 1}</span>
                                    </td>

                                    {/* Section Name */}
                                    <td className="py-5 px-4">
                                        <span className={`font-black text-xs uppercase ${isDarkMode ? 'text-white' : 'text-[#1A1F2B]'}`}>{section.name}</span>
                                    </td>

                                    {/* Subject Code */}
                                    <td className="py-5 px-4">
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-orange-400' : 'text-[#FF6600]'}`}>
                                            {section.subject_code || section.code}
                                        </span>
                                    </td>

                                    {/* Allowed / Total */}
                                    <td className="py-5 px-4 text-center">
                                        <span className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-[#1A1F2B]'}`}>
                                            {section.questions?.length || 0}/{section.total_questions}
                                        </span>
                                    </td>

                                    {/* Shuffle Toggle */}
                                    <td className="py-5 px-4 text-center">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleToggleShuffle(section)}
                                                className={`w-[42px] h-[22px] rounded-full relative transition-all duration-300 focus:outline-none shadow-inner ${section.shuffle ? 'bg-[#00D284]' : (isDarkMode ? 'bg-white/10' : 'bg-[#D2D6E1]')}`}
                                            >
                                                <div className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-all duration-300 ${section.shuffle ? 'left-[22px]' : 'left-[2px]'}`} />
                                            </button>
                                        </div>
                                    </td>

                                    {/* Correct Marks */}
                                    <td className="py-5 px-4 text-center">
                                        <span className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-[#1A1F2B]'}`}>{section.correct_marks}</span>
                                    </td>

                                    {/* Negative Marks */}
                                    <td className="py-5 px-4 text-center">
                                        <span className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-[#1A1F2B]'}`}>{section.negative_marks}</span>
                                    </td>

                                    {/* Partial Type */}
                                    <td className="py-5 px-4 text-center">
                                        <span className={`text-[11px] font-bold capitalize ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{section.partial_type || 'regular'}</span>
                                    </td>

                                    {/* Partial Marks */}
                                    <td className="py-5 px-4 text-center">
                                        <span className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-[#1A1F2B]'}`}>{section.partial_marks ?? 0}</span>
                                    </td>

                                    {/* Questions — Manage Button */}
                                    <td className="py-5 px-4 text-center">
                                        <button
                                            onClick={() => onManageQuestions ? onManageQuestions(section) : null}
                                            className="px-5 py-1.5 rounded-[5px] bg-[#2563EB] hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                                        >
                                            Manage
                                        </button>
                                    </td>

                                    {/* Action — Edit */}
                                    <td className="py-5 px-4 text-center">
                                        <div className="flex justify-center">
                                            <button onClick={() => handleEdit(section)}
                                                className={`p-1 transition-all hover:scale-110 opacity-70 hover:opacity-100 ${isDarkMode ? 'text-blue-400' : 'text-[#2563EB]'}`}>
                                                <Edit2 size={16} strokeWidth={2} />
                                            </button>
                                        </div>
                                    </td>

                                    {/* Delete */}
                                    <td className="py-5 px-4 text-center">
                                        <div className="flex justify-center">
                                            <button onClick={() => handleDelete(section.id)}
                                                className={`p-1 transition-all hover:scale-110 opacity-70 hover:opacity-100 ${isDarkMode ? 'text-blue-400' : 'text-[#2563EB]'}`}>
                                                <Trash2 size={16} strokeWidth={2} />
                                            </button>
                                        </div>
                                    </td>

                                    {/* Priority */}
                                    <td className="py-5 px-4 text-center">
                                        <span className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-[#1A1F2B]'}`}>{section.priority}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Section Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isActionLoading && setIsModalOpen(false)} />
                    <div className={`relative w-full max-w-2xl rounded-[5px] shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        {/* Header */}
                        <div className={`px-8 py-5 flex justify-between items-center shrink-0 border-b ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-300'}`}>
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tighter leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {modalMode === 'add' ? 'Add Section Details' : 'Edit Section Details'}
                                </h3>
                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{test.name}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className={`transition-all duration-300 hover:rotate-90 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar flex-1">
                            <div className="p-8 grid grid-cols-2 gap-6">

                                {/* Row 0: Subject Picker (full-width) */}
                                <div className={`col-span-2 relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-orange-400' : 'bg-white text-orange-500'}`}>
                                        Subject (from Master Data)
                                    </label>
                                    <select
                                        value={formValues.subject_id || ''}
                                        onChange={e => {
                                            const selected = subjects.find(s => String(s.id) === e.target.value);
                                            setFormValues({
                                                ...formValues,
                                                subject_id: e.target.value,
                                                // Auto-fill name and subject code from master subject
                                                name: selected ? selected.name : formValues.name,
                                                subject_code: selected ? selected.code : formValues.subject_code
                                            });
                                        }}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] appearance-none cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-800'}`}
                                    >
                                        <option value="">— Select a Subject —</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-40">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                    </div>
                                </div>

                                {/* Row 1: Section Name + Subject Code */}
                                <div className={`relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-400' : 'bg-white text-slate-500'}`}>Section Name *</label>
                                    <input required type="text" value={formValues.name || ''} placeholder="e.g. Physics"
                                        onChange={e => setFormValues({ ...formValues, name: e.target.value })}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] ${isDarkMode ? 'text-white placeholder-white/20' : 'text-slate-800 placeholder-slate-300'}`} />
                                </div>
                                <div className={`relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-400' : 'bg-white text-slate-500'}`}>Subject Code *</label>
                                    <input required type="text" value={formValues.subject_code || ''} placeholder="e.g. PHY"
                                        onChange={e => setFormValues({ ...formValues, subject_code: e.target.value.toUpperCase() })}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] ${isDarkMode ? 'text-white placeholder-white/20' : 'text-slate-800 placeholder-slate-300'}`} />
                                </div>

                                {/* Row 2: Priority + Total Questions */}
                                <div className={`relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-400' : 'bg-white text-slate-500'}`}>Section Priority *</label>
                                    <input type="number" min="1" value={formValues.priority}
                                        onChange={e => setFormValues({ ...formValues, priority: parseInt(e.target.value) || 1 })}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] ${isDarkMode ? 'text-white' : 'text-slate-800'}`} />
                                </div>
                                <div className={`relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-400' : 'bg-white text-slate-500'}`}>Total No. of Questions *</label>
                                    <input type="number" min="0" value={formValues.total_questions}
                                        onChange={e => setFormValues({ ...formValues, total_questions: parseInt(e.target.value) || 0 })}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] ${isDarkMode ? 'text-white' : 'text-slate-800'}`} />
                                </div>

                                {/* Row 3: Allowed Questions + Correct Marks */}
                                <div className={`relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-400' : 'bg-white text-slate-500'}`}>Questions Allowed *</label>
                                    <input type="number" min="0" value={formValues.allowed_questions}
                                        onChange={e => setFormValues({ ...formValues, allowed_questions: parseInt(e.target.value) || 0 })}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] ${isDarkMode ? 'text-white' : 'text-slate-800'}`} />
                                </div>
                                <div className={`relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-400' : 'bg-white text-slate-500'}`}>Correct Marks *</label>
                                    <input type="number" step="0.5" value={formValues.correct_marks}
                                        onChange={e => setFormValues({ ...formValues, correct_marks: parseFloat(e.target.value) || 0 })}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] ${isDarkMode ? 'text-white' : 'text-slate-800'}`} />
                                </div>

                                {/* Row 4: Negative Marks + Partial Type */}
                                <div className={`relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-400' : 'bg-white text-slate-500'}`}>Negative Marks *</label>
                                    <input type="number" step="0.25" min="0" value={formValues.negative_marks}
                                        onChange={e => setFormValues({ ...formValues, negative_marks: parseFloat(e.target.value) || 0 })}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] ${isDarkMode ? 'text-white' : 'text-slate-800'}`} />
                                </div>
                                <div className={`relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-400' : 'bg-white text-slate-500'}`}>Partial Marks Type</label>
                                    <select value={formValues.partial_type}
                                        onChange={e => setFormValues({ ...formValues, partial_type: e.target.value })}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] appearance-none cursor-pointer ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                        <option value="regular">Regular</option>
                                        <option value="partial">Partial</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>

                                {/* Row 5: Partial Marks + Shuffle */}
                                <div className={`relative border rounded-[5px] transition-all focus-within:border-orange-500 ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                                    <label className={`absolute -top-2.5 left-3 px-1 text-[9px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-400' : 'bg-white text-slate-500'}`}>Partial Marks *</label>
                                    <input type="number" step="0.25" min="0" value={formValues.partial_marks}
                                        onChange={e => setFormValues({ ...formValues, partial_marks: parseFloat(e.target.value) || 0 })}
                                        className={`w-full px-4 py-3 bg-transparent text-sm font-bold outline-none rounded-[5px] ${isDarkMode ? 'text-white' : 'text-slate-800'}`} />
                                </div>
                                <div className={`flex items-center justify-between px-4 py-3 rounded-[5px] border ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                                    <span className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Shuffle Questions</span>
                                    <button type="button" onClick={() => setFormValues({ ...formValues, shuffle: !formValues.shuffle })}
                                        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${formValues.shuffle ? 'bg-[#2D6A4F]' : (isDarkMode ? 'bg-white/10' : 'bg-slate-300')}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${formValues.shuffle ? 'left-6' : 'left-0.5'}`} />
                                    </button>
                                </div>

                            </div>

                            <div className={`px-8 pb-8 shrink-0`}>
                                <button type="submit" disabled={isActionLoading}
                                    className="w-full py-4 bg-[#2D6A4F] hover:bg-[#1B4332] text-white rounded-[5px] font-black text-xs uppercase tracking-widest shadow-xl shadow-green-900/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-60">
                                    {isActionLoading && <Loader2 size={16} className="animate-spin" />}
                                    {modalMode === 'add' ? 'Add Section' : 'Update Section'}
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
