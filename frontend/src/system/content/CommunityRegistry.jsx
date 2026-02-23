import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, X, Loader2, Edit2, Search, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const CommunityRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl } = useAuth();
    const [communities, setCommunities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        title: '',
        link: ''
    });
    const [selectedThumbnail, setSelectedThumbnail] = useState(null);
    const [previewThumbnail, setPreviewThumbnail] = useState(null);

    const fetchCommunities = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/communities/`);
            setCommunities(response.data);
        } catch (error) {
            console.error("Failed to fetch communities", error);
            toast.error("Failed to load communities");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchCommunities();
    }, [fetchCommunities]);

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

    const openModal = (community = null) => {
        if (community) {
            setSelectedCommunity(community);
            setFormData({
                title: community.title,
                link: community.link
            });
            setPreviewThumbnail(community.thumbnail);
            setSelectedThumbnail(null);
        } else {
            setSelectedCommunity(null);
            setFormData({
                title: '',
                link: ''
            });
            setPreviewThumbnail(null);
            setSelectedThumbnail(null);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title) {
            toast.error("Enter channel title");
            return;
        }

        if (!formData.link) {
            toast.error("Enter join link");
            return;
        }

        if (!selectedThumbnail && !selectedCommunity) {
            toast.error("Select thumbnail image");
            return;
        }

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const payload = new FormData();
            payload.append('title', formData.title);
            payload.append('link', formData.link);

            if (selectedThumbnail) {
                payload.append('thumbnail', selectedThumbnail);
            }

            if (selectedCommunity) {
                await axios.patch(`${apiUrl}/api/master-data/communities/${selectedCommunity.id}/`, payload);
                toast.success("Community updated successfully");
            } else {
                await axios.post(`${apiUrl}/api/master-data/communities/`, payload);
                toast.success("Community added successfully");
            }

            setIsModalOpen(false);
            fetchCommunities();
        } catch (error) {
            console.error("Failed to save community", error);
            toast.error(selectedCommunity ? "Failed to update community" : "Failed to add community");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this channel?")) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/communities/${id}/`);
            toast.success("Community deleted successfully");
            fetchCommunities();
        } catch (error) {
            console.error("Failed to delete community", error);
            toast.error("Failed to delete community");
        }
    };

    const filteredCommunities = communities.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative text-slate-900 dark:text-white">
            <div className={`p-6 rounded-[5px] border transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl shadow-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            Social Communities
                        </h2>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Manage WhatsApp, Telegram and other social links</p>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-end">
                        <div className={`relative flex items-center w-full max-w-md h-10 rounded-[5px] border focus-within:ring-2 transition-all ${isDarkMode ? 'bg-[#1a1f2e] border-white/10 focus-within:ring-green-500/50' : 'bg-slate-50 border-slate-200 focus-within:ring-green-500/20'}`}>
                            <input
                                type="text"
                                placeholder="Search channels..."
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
                            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-[5px] font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 whitespace-nowrap"
                        >
                            <span>Add Channel +</span>
                        </button>

                        <button
                            onClick={fetchCommunities}
                            className={`px-3 py-2 rounded-[5px] font-semibold text-sm transition-all ${isDarkMode ? 'hover:bg-white/10 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className={`rounded-[5px] border overflow-hidden animate-pulse ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className={`h-40 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                            <div className="p-4 space-y-3">
                                <div className={`h-6 w-3/4 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                                <div className={`h-4 w-1/2 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                            </div>
                        </div>
                    ))
                ) : filteredCommunities.length > 0 ? (
                    filteredCommunities.map((community) => (
                        <div key={community.id} className={`group relative rounded-[5px] border overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 hover:shadow-green-900/10' : 'bg-white border-slate-200 hover:shadow-green-500/10'}`}>

                            {/* Actions Overlay */}
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => openModal(community)}
                                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(community.id)}
                                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Image */}
                            <div className="h-40 overflow-hidden bg-gray-100 relative items-center justify-center flex">
                                {community.thumbnail ? (
                                    <img
                                        src={community.thumbnail}
                                        alt={community.title}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                                    />
                                ) : (
                                    <ImageIcon size={40} className="text-gray-300" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className={`font-bold text-lg mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {community.title}
                                </h3>

                                <a
                                    href={community.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs font-semibold text-green-600 hover:text-green-500 mt-2 hover:underline"
                                >
                                    <LinkIcon size={12} />
                                    <span className="truncate">{community.link}</span>
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                        <p className="font-bold text-lg uppercase tracking-widest">No communities found</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className={`w-full max-w-lg rounded-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#1a1f2e]' : 'bg-white'}`}>
                        <div className="bg-green-700 p-4 flex justify-between items-center text-white">
                            <h2 className="text-xl font-bold">
                                {selectedCommunity ? 'Edit Channel' : 'Add Channel'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Title */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium opacity-70 mb-1">Channel Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Official WhatsApp Group"
                                    className={`w-full px-4 py-2.5 rounded-[5px] border outline-none focus:ring-2 focus:ring-green-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                    required
                                />
                            </div>

                            {/* Link */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium opacity-70 mb-1">Invite Link *</label>
                                <input
                                    type="url"
                                    name="link"
                                    value={formData.link}
                                    onChange={handleInputChange}
                                    placeholder="https://chat.whatsapp.com/..."
                                    className={`w-full px-4 py-2.5 rounded-[5px] border outline-none focus:ring-2 focus:ring-green-500/50 transition-all ${isDarkMode ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}
                                    required
                                />
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

                            <div className="pt-4 flex justify-center">
                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="px-8 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-[5px] font-bold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider min-w-[120px]"
                                >
                                    {isActionLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : (selectedCommunity ? 'Update' : 'Add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunityRegistry;
