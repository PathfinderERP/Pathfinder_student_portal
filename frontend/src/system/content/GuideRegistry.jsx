import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, X, Loader2, Edit2, Search, Link as LinkIcon, FileText, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const GuideRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl } = useAuth();
    const [guides, setGuides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState(null);
    const [selectedThumbnailImage, setSelectedThumbnailImage] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        title: '',
        content_type: 'video', // 'video' or 'pdf'
        video_link: ''
    });
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [previewThumbnail, setPreviewThumbnail] = useState(null);

    const fetchGuides = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/guides/`);
            setGuides(response.data);
        } catch (error) {
            console.error("Failed to fetch guides", error);
            toast.error("Failed to load guides");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchGuides();
    }, [fetchGuides]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedThumbnail(file);
            setPreviewThumbnail(URL.createObjectURL(file));
        }
    };

    const handlePdfChange = (e) => {
        if (e.target.files[0]) {
            setSelectedPdf(e.target.files[0]);
        }
    };

    const openModal = (guide = null) => {
        if (guide) {
            setSelectedGuide(guide);
            setFormData({
                title: guide.title,
                content_type: guide.content_type,
                video_link: guide.video_link || ''
            });
            setPreviewThumbnail(guide.thumbnail);
            setSelectedThumbnail(null);
            setSelectedPdf(null);
        } else {
            setSelectedGuide(null);
            setFormData({
                title: '',
                content_type: 'video',
                video_link: ''
            });
            setPreviewThumbnail(null);
            setSelectedThumbnail(null);
            setSelectedPdf(null);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title) {
            toast.error("Enter guide title");
            return;
        }

        if (formData.content_type === 'video' && !formData.video_link) {
            toast.error("Enter video link");
            return;
        }

        if (formData.content_type === 'pdf' && !selectedPdf && !selectedGuide) {
            toast.error("Select PDF file");
            return;
        }

        if (!selectedThumbnail && !selectedGuide) {
            toast.error("Select thumbnail image");
            return;
        }

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const payload = new FormData();
            payload.append('title', formData.title);
            payload.append('content_type', formData.content_type);

            if (formData.content_type === 'video') {
                payload.append('video_link', formData.video_link);
            } else if (selectedPdf) {
                payload.append('pdf_file', selectedPdf);
            }

            if (selectedThumbnail) {
                payload.append('thumbnail', selectedThumbnail);
            }

            if (selectedGuide) {
                await axios.patch(`${apiUrl}/api/master-data/guides/${selectedGuide.id}/`, payload); // No manual Content-Type
                toast.success("Guide updated successfully");
            } else {
                await axios.post(`${apiUrl}/api/master-data/guides/`, payload); // No manual Content-Type
                toast.success("Guide added successfully");
            }

            setIsModalOpen(false);
            fetchGuides();
        } catch (error) {
            console.error("Failed to save guide", error);
            toast.error(selectedGuide ? "Failed to update guide" : "Failed to add guide");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this guide?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/guides/${id}/`);
            toast.success("Guide deleted successfully");
            fetchGuides();
        } catch (error) {
            console.error("Failed to delete guide", error);
            toast.error("Failed to delete guide");
        }
    };

    const filteredGuides = guides.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative text-slate-900 dark:text-white">
            <div className={`p-6 rounded-[5px] border transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl shadow-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            Guide Section
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
                            <span>Add Guide +</span>
                        </button>

                        <button
                            onClick={fetchGuides}
                            className={`px-3 py-2 rounded-[5px] font-semibold text-sm transition-all ${isDarkMode ? 'hover:bg-white/10 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}
                        >
                            Refresh
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
                                <th className="py-4 px-6 w-1/4">Title</th>
                                <th className="py-4 px-6">Document Type</th>
                                <th className="py-4 px-6">Thumbnail Image</th>
                                <th className="py-4 px-6">PDF</th>
                                <th className="py-4 px-6">Link</th>
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
                                        <td className="py-4 px-6 text-center"><div className={`h-4 w-20 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6">
                                            <div className={`w-24 h-14 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                        </td>
                                        <td className="py-4 px-6 text-center"><div className={`h-7 w-16 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-3 w-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                                <div className={`h-3 w-32 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center"><div className={`h-5 w-10 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-4 px-6 text-center"><div className={`h-5 w-10 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    </tr>
                                ))
                            ) : filteredGuides.length > 0 ? (
                                filteredGuides.map((guide, index) => (
                                    <tr key={guide.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-4 px-6 text-center font-bold text-xs opacity-60">
                                            {index + 1}
                                        </td>
                                        <td className="py-4 px-6 font-semibold text-sm leading-relaxed max-w-xs">
                                            {guide.title}
                                        </td>
                                        <td className="py-4 px-6 text-sm font-medium opacity-80 uppercase">
                                            {guide.content_type}
                                        </td>
                                        <td className="py-4 px-6">
                                            {guide.thumbnail && (
                                                <div
                                                    className="w-24 h-14 relative cursor-pointer group/img overflow-hidden rounded shadow-sm border border-white/10"
                                                    onClick={() => setSelectedThumbnailImage(guide.thumbnail)}
                                                >
                                                    <img
                                                        src={guide.thumbnail}
                                                        alt="Thumb"
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                                                        <ImageIcon size={16} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {guide.content_type === 'pdf' && guide.pdf_file && (
                                                <a
                                                    href={guide.pdf_file}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block px-3 py-1 border border-blue-400 text-blue-500 rounded text-xs font-bold uppercase hover:bg-blue-50 transition-colors"
                                                >
                                                    View
                                                </a>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            {guide.content_type === 'video' && guide.video_link && (
                                                <a
                                                    href={guide.video_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:text-blue-600 hover:underline text-xs max-w-[200px] truncate block"
                                                    title={guide.video_link}
                                                >
                                                    {guide.video_link}
                                                </a>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => openModal(guide)}
                                                className="text-blue-500 hover:text-blue-600 font-semibold text-sm transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => handleDelete(guide.id)}
                                                className="text-blue-500 hover:text-red-600 font-semibold text-sm transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center font-bold uppercase tracking-[0.2em] text-xs opacity-40">
                                        No guides found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className={`w-full max-w-lg rounded-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1a1f2e]' : 'bg-white'}`}>
                        <div className="bg-orange-600 p-4 flex justify-between items-center text-white">
                            <h2 className="text-xl font-bold">
                                {selectedGuide ? 'Edit Guide' : 'Add Guide'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Title */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium opacity-70 mb-1">Guide Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="Enter guide title"
                                    className={`w-full px-4 py-2.5 rounded-[5px] border outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                    required
                                />
                            </div>

                            {/* Content Type */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium opacity-70 mb-1">Content Type *</label>
                                <select
                                    name="content_type"
                                    value={formData.content_type}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2.5 rounded-[5px] border outline-none focus:ring-2 focus:ring-orange-500/50 transition-all appearance-none ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                >
                                    <option value="video">Video</option>
                                    <option value="pdf">PDF</option>
                                </select>
                            </div>

                            {/* Thumbnail */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium opacity-70 mb-1 font-bold">Thumbnail Image</label>
                                <div className={`border-2 border-dashed rounded-[5px] p-4 text-center ${isDarkMode ? 'border-white/10' : 'border-slate-300'}`}>
                                    {previewThumbnail ? (
                                        <div className="relative group">
                                            <img src={previewThumbnail} alt="Preview" className="h-32 mx-auto rounded object-contain" />
                                            <button
                                                type="button"
                                                onClick={() => { setPreviewThumbnail(null); setSelectedThumbnail(null); }}
                                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleThumbnailChange}
                                                className="hidden"
                                                id="thumb-upload"
                                            />
                                            <label htmlFor="thumb-upload" className="cursor-pointer flex flex-col items-center gap-2 py-2">
                                                <ImageIcon className="text-slate-400" size={24} />
                                                <span className="text-sm font-semibold opacity-60">Choose File</span>
                                                <span className="text-xs opacity-40">No file chosen</span>
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Conditional Inputs */}
                            {formData.content_type === 'video' ? (
                                <div className="space-y-1 animate-in fade-in">
                                    <label className="block text-sm font-medium opacity-70 mb-1">Video Link *</label>
                                    <input
                                        type="url"
                                        name="video_link"
                                        value={formData.video_link}
                                        onChange={handleInputChange}
                                        placeholder="https://youtube.com/..."
                                        className={`w-full px-4 py-2.5 rounded-[5px] border outline-none focus:ring-2 focus:ring-orange-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                        required={formData.content_type === 'video'}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1 animate-in fade-in">
                                    <label className="block text-sm font-medium opacity-70 mb-1">Upload PDF *</label>
                                    <div className={`relative flex items-center w-full px-4 py-2.5 rounded-[5px] border focus-within:ring-2 focus-within:ring-orange-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={handlePdfChange}
                                            className="w-full bg-transparent outline-none text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                                            required={formData.content_type === 'pdf' && !selectedGuide?.pdf_file}
                                        />
                                        <FileText size={18} className="text-orange-500 ml-2 pointer-events-none" />
                                    </div>
                                    {selectedGuide?.pdf_file && !selectedPdf && (
                                        <p className="text-xs opacity-60 mt-1 pl-1">Current PDF: {selectedGuide.pdf_file.split('/').pop()}</p>
                                    )}
                                </div>
                            )}

                            <div className="pt-4 flex justify-center">
                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="px-8 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-[5px] font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider min-w-[120px]"
                                >
                                    {isActionLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : (selectedGuide ? 'Update' : 'Add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Image Preview Modal */}
            {selectedThumbnailImage && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 p-4"
                    onClick={() => setSelectedThumbnailImage(null)}
                >
                    <div className="relative max-w-full max-h-full p-2">
                        <button
                            onClick={() => setSelectedThumbnailImage(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-all"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={selectedThumbnailImage}
                            alt="Thumbnail Preview"
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-[5px] shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuideRegistry;
