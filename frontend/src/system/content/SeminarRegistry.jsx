import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, X, Loader2, Edit2, Search, Link as LinkIcon, Calendar, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const SeminarRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl } = useAuth();
    const [seminars, setSeminars] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [selectedSeminar, setSelectedSeminar] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        link: '',
        date_time: '',
        duration: ''
    });

    const fetchSeminars = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/seminars/`);
            setSeminars(response.data);
        } catch (error) {
            console.error("Failed to fetch seminars", error);
            toast.error("Failed to load seminars");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchSeminars();
    }, [fetchSeminars]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const openModal = (seminar = null) => {
        if (seminar) {
            setSelectedSeminar(seminar);
            // Format datetime for input
            const date = new Date(seminar.date_time);
            const formattedDate = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

            setFormData({
                name: seminar.name,
                link: seminar.link || '',
                date_time: formattedDate,
                duration: seminar.duration
            });
        } else {
            setSelectedSeminar(null);
            setFormData({
                name: '',
                link: '',
                date_time: '',
                duration: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.link || !formData.date_time || !formData.duration) {
            toast.error("Please fill all required fields");
            return;
        }

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const payload = {
                ...formData,
                duration: parseInt(formData.duration)
            };

            if (selectedSeminar) {
                await axios.patch(`${apiUrl}/api/master-data/seminars/${selectedSeminar.id}/`, payload);
                toast.success("Seminar updated successfully");
            } else {
                await axios.post(`${apiUrl}/api/master-data/seminars/`, payload);
                toast.success("Seminar added successfully");
            }

            setIsModalOpen(false);
            fetchSeminars();
        } catch (error) {
            console.error("Failed to save seminar", error);
            toast.error(selectedSeminar ? "Failed to update seminar" : "Failed to add seminar");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this seminar?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/seminars/${id}/`);
            toast.success("Seminar deleted successfully");
            fetchSeminars();
        } catch (error) {
            console.error("Failed to delete seminar", error);
            toast.error("Failed to delete seminar");
        }
    };

    const handleToggleStatus = async (seminar) => {
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/master-data/seminars/${seminar.id}/`, {
                is_active: !seminar.is_active
            });
            // Optimistic update
            setSeminars(prev => prev.map(s =>
                s.id === seminar.id ? { ...s, is_active: !s.is_active } : s
            ));
            toast.success("Status updated");
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to update status");
        }
    };

    const filteredSeminars = seminars.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative text-slate-900 dark:text-white">
            <div className={`p-6 rounded-[5px] border transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl shadow-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            ALL Seminar
                        </h2>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-end">
                        <div className={`relative flex items-center w-full max-w-md h-10 rounded-[5px] border focus-within:ring-2 transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/10 focus-within:ring-orange-500/50' : 'bg-slate-50 border-slate-200 focus-within:ring-orange-500/20'}`}>
                            <input
                                type="text"
                                placeholder="Enter the name"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-full px-4 bg-transparent outline-none text-sm font-medium"
                            />
                            <div className="px-3 text-slate-400">
                                <Search size={18} />
                            </div>
                        </div>

                        <button
                            onClick={() => openModal()}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[5px] font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 whitespace-nowrap"
                        >
                            <span>Add Seminar +</span>
                        </button>

                        <button
                            onClick={fetchSeminars}
                            className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-blue-600'}`}
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border transition-all overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-orange-400 text-white text-xs font-bold uppercase tracking-wider">
                                <th className="py-4 px-6 text-center w-16">#</th>
                                <th className="py-4 px-6">Name</th>
                                <th className="py-4 px-6">Date</th>
                                <th className="py-4 px-6 text-center">Duration</th>
                                <th className="py-4 px-6">Link</th>
                                <th className="py-4 px-6 text-center">Status</th>
                                <th className="py-4 px-6 text-center">Action</th>
                                <th className="py-4 px-6 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 border-t border-white/5">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-6 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6"><div className={`h-4 w-56 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-4 w-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-4 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center"><div className={`h-4 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-3 w-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-3 w-24 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center"><div className={`h-6 w-11 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6 text-center"><div className={`h-8 w-8 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    </tr>
                                ))
                            ) : filteredSeminars.length > 0 ? (
                                filteredSeminars.map((seminar, index) => (
                                    <tr key={seminar.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-4 px-6 text-center font-bold text-xs opacity-60">
                                            {index + 1}
                                        </td>
                                        <td className="py-4 px-6 font-semibold text-sm">
                                            {seminar.name}
                                        </td>
                                        <td className="py-4 px-6 text-sm flex items-center gap-2 opacity-80">
                                            <Calendar size={14} />
                                            {formatDate(seminar.date_time)}
                                        </td>
                                        <td className="py-4 px-6 text-center text-sm opacity-80">
                                            {seminar.duration} min
                                        </td>
                                        <td className="py-4 px-6">
                                            <a
                                                href={seminar.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:text-blue-600 hover:underline text-sm flex items-center gap-1 w-32 truncate"
                                                title={seminar.link}
                                            >
                                                <LinkIcon size={12} />
                                                <span className="truncate">{seminar.link}</span>
                                            </a>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(seminar)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${seminar.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${seminar.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => openModal(seminar)}
                                                className="p-1.5 rounded-[5px] text-blue-500 hover:bg-blue-50 transition-all active:scale-95"
                                            >
                                                <Edit2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => handleDelete(seminar.id)}
                                                className="p-1.5 rounded-[5px] text-red-500 hover:bg-red-50 transition-all active:scale-95"
                                            >
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center font-bold uppercase tracking-[0.2em] text-xs opacity-40">
                                        No seminars found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                        <div className={`w-full max-w-lg rounded-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1a1f2e]' : 'bg-white'}`}>
                            <div className="bg-orange-600 p-4 flex justify-between items-center text-white">
                                <h2 className="text-lg font-bold">
                                    {selectedSeminar ? 'Edit Seminar' : 'Add Seminar'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium opacity-70 mb-1">Seminar Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter seminar name"
                                        className={`w-full px-4 py-2.5 rounded-[5px] border outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-medium opacity-70 mb-1">Paste the link *</label>
                                    <input
                                        type="url"
                                        name="link"
                                        value={formData.link}
                                        onChange={handleInputChange}
                                        placeholder="https://..."
                                        className={`w-full px-4 py-2.5 rounded-[5px] border outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-medium opacity-70 mb-1">Date and Time *</label>
                                    <div className={`relative flex items-center w-full px-4 py-2.5 rounded-[5px] border focus-within:ring-2 focus-within:ring-orange-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                        <input
                                            type="datetime-local"
                                            name="date_time"
                                            value={formData.date_time}
                                            onChange={handleInputChange}
                                            className="w-full bg-transparent outline-none"
                                            required
                                        />
                                        <Calendar size={18} className="text-orange-500 ml-2 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-medium opacity-70 mb-1">Duration (in min) *</label>
                                    <div className={`relative flex items-center w-full px-4 py-2.5 rounded-[5px] border focus-within:ring-2 focus-within:ring-orange-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                        <input
                                            type="number"
                                            name="duration"
                                            value={formData.duration}
                                            onChange={handleInputChange}
                                            placeholder="0"
                                            className="w-full bg-transparent outline-none"
                                            min="0"
                                            required
                                        />
                                        <Clock size={18} className="text-orange-500 ml-2 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-center">
                                    <button
                                        type="submit"
                                        disabled={isActionLoading}
                                        className="px-8 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[5px] font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                                    >
                                        {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : (selectedSeminar ? 'Update' : 'Add')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SeminarRegistry;
