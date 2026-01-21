import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Package, Search, Plus, Filter, ArrowLeft, Edit2, Trash2, CheckCircle, Clock, X, Upload } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PackageRegistry = ({ onBack }) => {
    const { isDarkMode } = useTheme();
    // Dummy Data to match the screenshot
    // Data State
    const [packages, setPackages] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    const { getApiUrl, token } = useAuth();

    // Modal & Form State
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formValues, setFormValues] = useState({
        name: '',
        code: '',
        examType: '', // Map to target_exam
        session: '',
        description: '',
        image: null
    });

    // Master Data State
    const [targetExams, setTargetExams] = useState([]);
    const [sessions, setSessions] = useState([]);

    // Image Preview Modal State
    const [previewImage, setPreviewImage] = useState(null);

    // Fetch Master Data on Modal Open
    const fetchMasterData = useCallback(async () => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };

            const [targetRes, sessionRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/master-data/sessions/`, config)
            ]);

            setTargetExams(targetRes.data);
            setSessions(sessionRes.data);
        } catch (err) {
            console.error("Failed to fetch master data", err);
        }
    }, [getApiUrl, token]);

    const handleOpenModal = (pkg = null) => {
        fetchMasterData();
        if (pkg) {
            setIsEditing(true);
            setEditId(pkg._id);
            setFormValues({
                name: pkg.name,
                code: pkg.code,
                examType: pkg.exam_type,
                session: pkg.session,
                description: pkg.description || '',
                image: null, // Keep existing image if null
                currentImage: pkg.image // Store current image url for reference if needed
            });
        } else {
            setIsEditing(false);
            setEditId(null);
            setFormValues({ name: '', code: '', examType: '', session: '', description: '', image: null });
        }
        setIsModalOpen(true);
    };

    // Fetch Packages
    const fetchPackages = useCallback(async () => {
        try {
            setLoadingData(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/packages/`, config);
            setPackages(response.data);
        } catch (err) {
            console.error("Failed to fetch packages", err.response?.data || err.message);
        } finally {
            setLoadingData(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    const toggleStatus = useCallback(async (pkg) => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/packages/${pkg._id}/`, { is_completed: !pkg.is_completed }, config);
            fetchPackages();
        } catch (err) {
            console.error("Failed to toggle status", err);
        }
    }, [getApiUrl, token, fetchPackages]);

    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleDelete = useCallback(async (id) => {
        // 1. Message BEFORE delete (Confirmation)
        if (!window.confirm("ARE YOU SURE? This action will permanently remove this package from the active list.")) return;

        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };

            await axios.delete(`${apiUrl}/api/packages/${id}/`, config);

            // 2. Message AFTER delete (Success)
            alert("DONE! The package has been deleted successfully.");

            fetchPackages();
        } catch (err) {
            console.error("Failed to delete package", err);
            alert("ERROR: Could not delete the package. Please try again.");
        }
    }, [getApiUrl, token, fetchPackages]);

    const handleSubmit = useCallback(async (e) => {
        if (e) e.preventDefault();

        if (!formValues.name || !formValues.code) {
            alert("Please fill in the Package Name and Code.");
            return;
        }

        setIsLoading(true);

        try {
            const apiUrl = getApiUrl();
            const config = {
                headers: {
                    'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            };

            const formData = new FormData();
            formData.append('name', formValues.name);
            formData.append('code', formValues.code);
            formData.append('description', formValues.description);
            formData.append('exam_type', formValues.examType);
            formData.append('session', formValues.session);
            if (formValues.image) formData.append('image', formValues.image);

            if (isEditing) {
                await axios.patch(`${apiUrl}/api/packages/${editId}/`, formData, config);
                alert("SUCCESS: Package updated successfully!");
            } else {
                await axios.post(`${apiUrl}/api/packages/`, formData, config);
                alert("SUCCESS: New package created successfully!");
            }

            setIsModalOpen(false);
            fetchPackages();
            setFormValues({ name: '', code: '', examType: '', session: '', description: '', image: null });
            setIsEditing(false);
            setEditId(null);
        } catch (err) {
            console.error("Failed to save package", err.response?.data || err.message);
            alert(`Failed to save package: ${JSON.stringify(err.response?.data || err.message)}`);
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token, formValues, isEditing, editId, fetchPackages]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className={`p-10 rounded-[2.5rem] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200/60 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className={`p-4 rounded-2xl transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                            >
                                <ArrowLeft size={24} strokeWidth={3} />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="px-3 py-1 bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/20">
                                    Package Management
                                </div>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    All <span className="text-purple-500">Packages</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage and configure your test packages.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => handleOpenModal()} className="px-6 py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-green-600/20">
                            <Plus size={16} strokeWidth={3} />
                            <span>Add Package +</span>
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`overflow-x-auto custom-scrollbar transition-all ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                <th className="pb-1 px-4">#</th>
                                <th className="pb-1 px-4">Name</th>
                                <th className="pb-1 px-4">Code</th>
                                <th className="pb-1 px-4">Exam Type</th>
                                <th className="pb-1 px-4">Session</th>
                                <th className="pb-1 px-4">Image</th>
                                <th className="pb-1 px-4 text-center">Content Status</th>
                                <th className="pb-1 px-4 text-center">Test Status</th>
                                <th className="pb-1 px-4 text-center">Mark Completed</th>
                                <th className="pb-1 px-4 text-center">Edit</th>
                                <th className="pb-1 px-4 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {packages.length > 0 ? packages.map((pkg, index) => (
                                <tr key={pkg._id} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-all duration-300`}>
                                    <td className="py-0 px-4 text-xs font-bold opacity-60">{index + 1}</td>

                                    <td className="py-0 px-4">
                                        <div className="font-extrabold text-sm tracking-tight">{pkg.name}</div>
                                    </td>

                                    <td className="py-0 px-4">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                            {pkg.code}
                                        </span>
                                    </td>

                                    <td className="py-0 px-4 text-xs font-bold opacity-70">{pkg.exam_type_details?.name || 'N/A'}</td>

                                    <td className="py-0 px-4 text-xs font-medium opacity-60">{pkg.session_details?.name || 'N/A'}</td>

                                    <td className="py-0 px-4">
                                        <div
                                            onClick={() => pkg.image && setPreviewImage({ url: pkg.image, name: pkg.name })}
                                            className={`w-8 h-8 my-1 rounded-lg flex items-center justify-center text-[10px] font-bold overflow-hidden cursor-pointer transition-transform active:scale-90 hover:ring-2 hover:ring-purple-500 shadow-sm ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}
                                            title="Click to view full image"
                                        >
                                            {pkg.image ? (
                                                <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover" />
                                            ) : 'Img'}
                                        </div>
                                    </td>

                                    <td className="py-0 px-4 text-center">
                                        <div className="flex justify-center">
                                            {pkg.content_status ?
                                                <CheckCircle className="text-green-500" size={18} strokeWidth={2.5} /> :
                                                <Clock className="text-orange-500" size={18} strokeWidth={2.5} />
                                            }
                                        </div>
                                    </td>

                                    <td className="py-0 px-4 text-center">
                                        <div className="flex justify-center">
                                            {pkg.test_status ?
                                                <CheckCircle className="text-green-500" size={18} strokeWidth={2.5} /> :
                                                <Clock className="text-orange-500" size={18} strokeWidth={2.5} />
                                            }
                                        </div>
                                    </td>

                                    <td className="py-0 px-4 text-center">
                                        <button onClick={() => toggleStatus(pkg)} className="group active:scale-95 transition-all">
                                            <div className={`w-10 h-5.5 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center ${pkg.is_completed ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${pkg.is_completed ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                                            </div>
                                        </button>
                                    </td>

                                    <td className="py-0 px-4 text-center">
                                        <button onClick={() => handleOpenModal(pkg)} className="p-1 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                    </td>

                                    <td className="py-0 px-4 text-center">
                                        <button onClick={() => handleDelete(pkg._id)} className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="11" className="py-12 text-center opacity-50 font-medium">No packages found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Package Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] ${isDarkMode ? 'bg-[#1A1F2B]' : 'bg-white'}`}>

                        {/* Orange Header */}
                        <div className="bg-orange-500 p-6 flex items-center justify-between shrink-0">
                            <h3 className="text-xl font-bold text-white tracking-wide">{isEditing ? 'Edit Package Details' : 'Enter Package Details'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Content */}
                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">

                            {/* Package Name */}
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={formValues.name}
                                    onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                                    placeholder=" "
                                    className={`peer w-full px-4 py-3.5 rounded-xl border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                        ? 'bg-transparent border-white/10 text-white focus:border-blue-500 focus:ring-blue-500/10'
                                        : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500/10'
                                        }`}
                                />
                                <label className={`absolute left-4 transition-all duration-200 pointer-events-none 
                                    top-0 -translate-y-full text-xs 
                                    peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm 
                                    peer-focus:top-0 peer-focus:-translate-y-full peer-focus:text-xs peer-focus:text-blue-500 
                                    ${isDarkMode ? 'text-slate-500 bg-[#1A1F2B] px-1 peer-focus:text-blue-400' : 'text-slate-400 bg-white px-1'}`}>
                                    Enter Package Name *
                                </label>
                            </div>

                            {/* Code */}
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={formValues.code}
                                    onChange={(e) => setFormValues({ ...formValues, code: e.target.value })}
                                    placeholder=" "
                                    className={`peer w-full px-4 py-3.5 rounded-xl border-2 outline-none font-bold transition-all focus:ring-4 ${isDarkMode
                                        ? 'bg-transparent border-white/10 text-white focus:border-blue-500 focus:ring-blue-500/10'
                                        : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-blue-500/10'
                                        }`}
                                />
                                <label className={`absolute left-4 transition-all duration-200 pointer-events-none 
                                    top-0 -translate-y-full text-xs 
                                    peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm 
                                    peer-focus:top-0 peer-focus:-translate-y-full peer-focus:text-xs peer-focus:text-blue-500 
                                    ${isDarkMode ? 'text-slate-500 bg-[#1A1F2B] px-1 peer-focus:text-blue-400' : 'text-slate-400 bg-white px-1'}`}>
                                    Enter Code *
                                </label>
                            </div>

                            {/* Exam Type - Dropdown */}
                            <div className="relative">
                                <select
                                    value={formValues.examType}
                                    onChange={(e) => setFormValues({ ...formValues, examType: e.target.value })}
                                    className={`w-full px-4 py-3.5 rounded-xl border-2 outline-none font-bold appearance-none cursor-pointer transition-all ${isDarkMode
                                        ? 'bg-transparent border-white/10 text-white focus:border-blue-500'
                                        : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500'
                                        }`}
                                >
                                    <option value="" disabled>Select Exam Type</option>
                                    {targetExams.map(exam => (
                                        <option key={exam.id} value={exam.id} className={isDarkMode ? 'bg-slate-900' : ''}>
                                            {exam.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>

                            {/* Course Session - Dropdown */}
                            <div className="relative">
                                <label className={`block text-xs font-bold mb-2 uppercase tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Select Course Session *</label>
                                <div className="relative">
                                    <select
                                        value={formValues.session}
                                        onChange={(e) => setFormValues({ ...formValues, session: e.target.value })}
                                        className={`w-full px-4 py-3.5 rounded-xl border-2 outline-none font-bold appearance-none cursor-pointer transition-all ${isDarkMode
                                            ? 'bg-transparent border-white/10 text-white focus:border-blue-500'
                                            : 'bg-transparent border-slate-200 text-slate-800 focus:border-blue-500'
                                            }`}
                                    >
                                        <option value="" disabled>Select Session</option>
                                        {sessions.map(session => (
                                            <option key={session.id} value={session.id} className={isDarkMode ? 'bg-slate-900' : ''}>
                                                {session.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className={`p-4 rounded-xl border-2 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                <textarea
                                    value={formValues.description}
                                    onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                                    placeholder="Description *"
                                    rows="4"
                                    className="w-full bg-transparent outline-none font-medium placeholder:text-slate-400 resize-none"
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <h4 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Select Image</h4>
                                <div className="flex items-center gap-3 mb-4">
                                    <label className={`cursor-pointer px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all shadow-sm active:scale-95 ${isDarkMode ? 'border-white/20 hover:bg-white/5 text-slate-300' : 'border-slate-300 hover:bg-slate-50 text-slate-600'}`}>
                                        Choose File
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => setFormValues({ ...formValues, image: e.target.files[0] })}
                                        />
                                    </label>
                                    <span className="text-sm font-medium opacity-50 italic">
                                        {formValues.image ? formValues.image.name : 'No file chosen'}
                                    </span>
                                </div>

                                {/* Image Preview */}
                                {(formValues.image || formValues.currentImage) && (
                                    <div className={`w-full h-48 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden relative ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
                                        <img
                                            src={formValues.image ? URL.createObjectURL(formValues.image) : formValues.currentImage}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Add Button */}
                            <div className="pt-4 flex justify-center">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className={`px-12 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${formValues.name && formValues.code
                                        ? (isDarkMode ? 'bg-white text-slate-900' : 'bg-orange-500 text-white hover:bg-orange-600')
                                        : (isDarkMode ? 'bg-white/10 text-white/20' : 'bg-slate-300 text-slate-900 cursor-not-allowed')
                                        } ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        isEditing ? 'Update' : 'Add'
                                    )}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {/* Image Preview Modal (Lightbox) */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95 group"
                    >
                        <X size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>

                    <div className="relative max-w-5xl w-full h-[80vh] flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <img
                            src={previewImage.url}
                            alt={previewImage.name}
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-black/50"
                        />
                        <div className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-white font-bold text-sm tracking-wide">
                            {previewImage.name}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackageRegistry;
