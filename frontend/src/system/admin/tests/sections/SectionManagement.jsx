import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Plus, Search, Edit2, Trash2, RefreshCw, ArrowLeft,
    Settings, ToggleLeft, ToggleRight, Loader2, ChevronRight, X
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';

const SectionManagement = ({ test, onBack }) => {
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
        } catch (err) {
            alert('Failed to delete section');
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
        } catch (err) {
            alert('Failed to update shuffle status');
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
            fetchSections();
        } catch (err) {
            alert('Failed to save section');
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
            <div className={`mb-6 p-4 rounded-xl border flex flex-wrap justify-between items-center gap-4 ${isDarkMode ? 'bg-[#1A1F2B] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={`p-3 rounded-xl transition-all hover:scale-110 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
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
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center gap-3 active:scale-95"
                >
                    Show ALL Test
                </button>
            </div>

            {/* Main Content Card */}
            <div className={`rounded-2xl border shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
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
                                className={`pl-10 pr-4 py-2 rounded-lg border text-xs font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            className="px-6 py-3 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-xl font-black text-sm shadow-xl shadow-green-900/10 transition-all flex items-center gap-3 active:scale-95"
                        >
                            <Plus size={20} /> Add Section +
                        </button>
                        <button
                            onClick={fetchSections}
                            className={`p-3 rounded-xl border transition-all hover:scale-110 active:rotate-180 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200 text-blue-500'}`}
                        >
                            <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Sections Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                <th className="py-4 px-2 text-center first:rounded-l-xl">#</th>
                                <th className="py-4 px-2">Section Name</th>
                                <th className="py-4 px-2">Subject Code</th>
                                <th className="py-4 px-2 text-center whitespace-nowrap">Allowed/Total</th>
                                <th className="py-4 px-2 text-center">Shuffle</th>
                                <th className="py-4 px-2 text-center">Correct</th>
                                <th className="py-4 px-2 text-center">Negative</th>
                                <th className="py-4 px-2 text-center">Partial Type</th>
                                <th className="py-4 px-2 text-center">Partial Marks</th>
                                <th className="py-4 px-2 text-center">Questions</th>
                                <th className="py-4 px-2 text-center">Action</th>
                                <th className="py-4 px-2 text-center last:rounded-r-xl">Priority</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="12" className="py-20 text-center">
                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                                        <div className="text-xs font-bold opacity-40 uppercase tracking-widest">Loading Sections...</div>
                                    </td>
                                </tr>
                            ) : filteredSections.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="py-20 text-center opacity-40">
                                        No sections found for this test.
                                    </td>
                                </tr>
                            ) : filteredSections.map((section, index) => (
                                <tr key={section.id} className={`${index % 2 === 0 ? (isDarkMode ? 'bg-white/[0.01]' : 'bg-slate-50/50') : ''}`}>
                                    <td className="py-4 px-2 text-center font-bold text-xs opacity-50">{index + 1}</td>
                                    <td className="py-4 px-2 font-bold text-[10px] uppercase truncate max-w-[120px]" title={section.name}>{section.name}</td>
                                    <td className="py-4 px-2 font-black text-[10px] text-blue-500 uppercase">{section.subject_code}</td>
                                    <td className="py-4 px-2 text-center font-bold text-xs">
                                        {section.allowed_questions}/{section.total_questions}
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        <button
                                            onClick={() => handleToggleShuffle(section)}
                                            className={`transition-all hover:scale-125 ${section.shuffle ? 'text-[#2E7D32]' : 'text-slate-400 opacity-40'}`}
                                        >
                                            {section.shuffle ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                        </button>
                                    </td>
                                    <td className="py-4 px-2 text-center font-black text-xs">{section.correct_marks}</td>
                                    <td className="py-4 px-2 text-center font-black text-xs">{section.negative_marks}</td>
                                    <td className="py-4 px-2 text-center text-[9px] font-bold uppercase opacity-60 underline decoration-dotted">{section.partial_type}</td>
                                    <td className="py-4 px-2 text-center font-black text-xs">{section.partial_marks}</td>
                                    <td className="py-4 px-2 text-center">
                                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all">
                                            Questions
                                        </button>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        <div className="flex justify-center items-center gap-3">
                                            <button
                                                onClick={() => handleEdit(section)}
                                                className="text-blue-500 hover:scale-125 transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(section.id)}
                                                className="text-red-500 hover:scale-125 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[9px] font-black border border-slate-200">
                                            {section.priority}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Add/Edit Section */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isActionLoading && setIsModalOpen(false)} />
                    <div className={`relative w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1A1F2B] border-white/10' : 'bg-white border-slate-200'}`}>
                        {/* Header */}
                        <div className="bg-[#FF6600] p-6 flex justify-between items-center relative">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                                {modalMode === 'add' ? 'Add' : 'Edit'} Section Details
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:rotate-90 transition-all duration-300">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                                {/* Standardized Labeled Input Component Helper */}
                                {[
                                    { label: 'Section Name *', key: 'name', type: 'text', placeholder: 'Enter Section Name' },
                                    { label: 'Subject Code *', key: 'subject_code', type: 'text', placeholder: 'Enter Subject Code' },
                                    { label: 'Section Priority *', key: 'priority', type: 'number' },
                                    { label: 'Total Number Of Question *', key: 'total_questions', type: 'number' },
                                    { label: 'Number of question allowed *', key: 'allowed_questions', type: 'number' },
                                    { label: 'Correct Marks *', key: 'correct_marks', type: 'number', step: '0.1' },
                                    { label: 'Negative Marks *', key: 'negative_marks', type: 'number', step: '0.1' },
                                ].map((field) => (
                                    <div key={field.key} className="relative group">
                                        <label className={`absolute -top-2.5 left-4 px-1 text-[10px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-500' : 'bg-white text-slate-400'}`}>
                                            {field.label}
                                        </label>
                                        <input
                                            required
                                            type={field.type}
                                            step={field.step}
                                            value={formValues[field.key]}
                                            placeholder={field.placeholder || ''}
                                            onChange={e => setFormValues({ ...formValues, [field.key]: field.type === 'number' ? parseFloat(e.target.value) : e.target.value })}
                                            className={`w-full px-5 py-4 rounded-xl border text-sm font-bold outline-none transition-all group-hover:border-slate-400 focus:border-blue-500 ${isDarkMode ? 'bg-transparent border-white/10 text-white' : 'bg-transparent border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                ))}

                                {/* Partial Marks Type Select - Now Dynamic */}
                                <div className="relative group">
                                    <label className={`absolute -top-2.5 left-4 px-1 text-[10px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-500' : 'bg-white text-slate-400'}`}>
                                        Select Partial Marks Type
                                    </label>
                                    <select
                                        value={formValues.partial_type}
                                        onChange={e => setFormValues({ ...formValues, partial_type: e.target.value })}
                                        className={`w-full px-5 py-4 rounded-xl border text-sm font-bold outline-none transition-all appearance-none cursor-pointer ${isDarkMode ? 'bg-transparent border-white/10 text-white' : 'bg-transparent border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="regular">Select Type</option>
                                        {targetExams.map(exam => (
                                            <option key={exam.id} value={exam.name}>
                                                {exam.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Partial Marks Field */}
                                <div className="relative group">
                                    <label className={`absolute -top-2.5 left-4 px-1 text-[10px] font-black uppercase tracking-widest z-10 ${isDarkMode ? 'bg-[#1A1F2B] text-slate-500' : 'bg-white text-slate-400'}`}>
                                        Partial Marks *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={formValues.partial_marks}
                                        onChange={e => setFormValues({ ...formValues, partial_marks: parseFloat(e.target.value) })}
                                        className={`w-full px-5 py-4 rounded-xl border text-sm font-bold outline-none transition-all ${isDarkMode ? 'bg-transparent border-white/10 text-white' : 'bg-transparent border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-6 pt-4">
                                {/* Shuffle Toggle */}
                                <div className="flex items-center gap-4">
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Shuffle Questions</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormValues({ ...formValues, shuffle: !formValues.shuffle })}
                                        className={`relative w-16 h-8 rounded-full transition-colors flex items-center ${formValues.shuffle ? 'bg-[#2E7D32]' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute w-6 h-6 bg-white rounded-full transition-all shadow-md ${formValues.shuffle ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <button
                                    disabled={isActionLoading}
                                    className="px-16 py-5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-green-900/30 transition-all flex items-center gap-3 active:scale-95"
                                >
                                    {isActionLoading && <Loader2 size={18} className="animate-spin" />}
                                    {modalMode === 'add' ? 'Add Section' : 'Update Section'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SectionManagement;
