import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, X, Loader2, Image as ImageIcon, Upload, Edit2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const BannerRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl } = useAuth();
    const [banners, setBanners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState(null);

    const fetchBanners = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/banners/`);
            setBanners(response.data);
        } catch (error) {
            console.error("Failed to fetch banners", error);
            toast.error("Failed to load banners");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchBanners();
    }, [fetchBanners]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleAddBanner = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.error("Please select an image");
            return;
        }

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('is_active', 'true');

            await axios.post(`${apiUrl}/api/master-data/banners/`, formData);

            toast.success("Banner added successfully");
            setIsAddModalOpen(false);
            setSelectedFile(null);
            setPreviewUrl(null);
            fetchBanners();
        } catch (error) {
            console.error("Failed to add banner", error);
            toast.error("Failed to add banner");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateBanner = async (e) => {
        e.preventDefault();

        // If updating, file is optional. If not provided, don't update image.
        // But if provided, append it.

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            if (selectedFile) {
                formData.append('image', selectedFile);
            }

            await axios.patch(`${apiUrl}/api/master-data/banners/${selectedBanner.id}/`, formData);

            toast.success("Banner updated successfully");
            setIsEditModalOpen(false);
            setSelectedBanner(null);
            setSelectedFile(null);
            setPreviewUrl(null);
            fetchBanners();
        } catch (error) {
            console.error("Failed to update banner", error);
            toast.error("Failed to update banner");
        } finally {
            setIsActionLoading(false);
        }
    };

    const openEditModal = (banner) => {
        setSelectedBanner(banner);
        setPreviewUrl(banner.image);
        setSelectedFile(null); // Reset selected file
        setIsEditModalOpen(true);
    };

    const handleDeleteBanner = async (id) => {
        if (!window.confirm("Are you sure you want to delete this banner?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/banners/${id}/`);
            toast.success("Banner deleted successfully");
            fetchBanners();
        } catch (error) {
            console.error("Failed to delete banner", error);
            toast.error("Failed to delete banner");
        }
    };

    const handleToggleStatus = async (banner) => {
        try {
            const apiUrl = getApiUrl();
            const newStatus = !banner.is_active;

            // Optimistic update
            setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: newStatus } : b));

            await axios.patch(`${apiUrl}/api/master-data/banners/${banner.id}/`, {
                is_active: newStatus
            });

            toast.success(`Banner ${newStatus ? 'activated' : 'deactivated'}`);
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to update banner status");
            // Revert on failure
            fetchBanners();
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative text-slate-900 dark:text-white">
            <div className={`p-8 rounded-[5px] border transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl shadow-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className={`text-3xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                Banner
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchBanners}
                            className={`p-2 rounded-[5px] transition-all ${isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => { setSelectedFile(null); setPreviewUrl(null); setIsAddModalOpen(true); }}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[5px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
                        >
                            <Plus size={16} strokeWidth={3} />
                            <span>Add File +</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[5px] border transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl shadow-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-orange-400 text-white'}`}>
                                <th className="py-5 px-6 text-center w-20">#</th>
                                <th className="py-5 px-6">Image</th>
                                <th className="py-5 px-6 text-center">Active</th>
                                <th className="py-5 px-6 text-center">Edit</th>
                                <th className="py-5 px-6 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 border-t border-white/5">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-5 px-6 text-center"><div className={`h-4 w-4 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6"><div className={`h-16 w-48 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-6 w-11 mx-auto rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-10 w-10 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                        <td className="py-5 px-6 text-center"><div className={`h-10 w-10 mx-auto rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div></td>
                                    </tr>
                                ))
                            ) : banners.length > 0 ? (
                                banners.map((banner, index) => (
                                    <tr key={banner.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-xs font-black ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div
                                                className="h-16 w-48 relative rounded-[5px] overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer hover:border-orange-500 transition-all"
                                                onClick={() => setSelectedImage(banner.image)}
                                            >
                                                <img
                                                    src={banner.image}
                                                    alt={`Banner ${banner.id}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(banner)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${banner.is_active ? 'bg-blue-600' : 'bg-slate-700'}`}
                                            >
                                                <span className={`${banner.is_active ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                            </button>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                onClick={() => openEditModal(banner)}
                                                className="p-2.5 rounded-[5px] text-blue-500 hover:bg-blue-600 hover:text-white transition-all active:scale-95 group/edit"
                                            >
                                                <Edit2 size={18} strokeWidth={2.5} className="group-hover/edit:scale-110" />
                                            </button>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                onClick={() => handleDeleteBanner(banner.id)}
                                                className="p-2.5 rounded-[5px] text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-95 group/del"
                                            >
                                                <Trash2 size={18} strokeWidth={2.5} className="group-hover/del:scale-110" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className={`py-20 text-center font-bold uppercase tracking-[0.2em] text-xs transition-all ${isDarkMode ? 'text-slate-500 opacity-40' : 'text-slate-400 opacity-60'}`}>
                                        No banners found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className={`w-full max-w-md rounded-[5px] border shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10 shadow-black' : 'bg-white border-slate-100 shadow-slate-200'}`}>
                        <div className={`p-4 border-b border-white/10 flex justify-between items-center text-white ${isEditModalOpen ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                            <h2 className="text-sm font-black uppercase tracking-widest">{isEditModalOpen ? 'Edit Banner' : 'Add New Banner'}</h2>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setSelectedFile(null); setPreviewUrl(null); }} className="p-1 hover:bg-white/10 rounded-[5px] transition-colors"><X size={18} /></button>
                        </div>

                        <form onSubmit={isEditModalOpen ? handleUpdateBanner : handleAddBanner} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <h3 className={`text-center font-bold text-lg ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                    {isEditModalOpen ? 'Update Banner Image' : 'Upload Banner'}
                                </h3>

                                <div className={`relative border-2 border-dashed rounded-[5px] p-6 text-center group transition-all ${isDarkMode ? 'border-white/10 hover:border-orange-500/50 bg-white/[0.02]' : 'border-slate-300 hover:border-orange-500 bg-slate-50'}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="space-y-2 flex flex-col items-center">
                                        {previewUrl ? (
                                            <div className="w-full h-32 relative rounded-[5px] overflow-hidden">
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <>
                                                <div className={`p-4 rounded-full ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Upload size={24} />
                                                </div>
                                                <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Choose File</p>
                                                <p className="text-[10px] opacity-40">PNG, JPG up to 5MB</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {selectedFile && (
                                    <p className="text-center text-xs font-bold text-emerald-500">{selectedFile.name}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading || !selectedFile}
                                className={`w-full py-3 text-white rounded-[5px] font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isEditModalOpen ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'}`}
                            >
                                {isActionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : (isEditModalOpen ? 'Update' : 'Add')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-full max-h-full p-2">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-all"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={selectedImage}
                            alt="Banner Preview"
                            className="max-w-[90vw] max-h-[85vh] object-contain rounded-[5px] shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default BannerRegistry;
