import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, FileText, Eye, Edit2, Trash2, RefreshCw, X, Upload, FileCheck, AlertCircle, ChevronLeft, Loader2, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const LibraryRegistry = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // View Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedItemForView, setSelectedItemForView] = useState(null);
    const [viewPage, setViewPage] = useState(1); // 1 for Thumbnail, 2 for PDF
    const [isFullScreen, setIsFullScreen] = useState(false);

    const [libraryItems, setLibraryItems] = useState([]);

    const [newItem, setNewItem] = useState({
        name: '',
        description: '',
        thumbnail: null,
        pdf: null
    });

    const fetchLibraryItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/library/`);
            setLibraryItems(response.data);
        } catch (error) {
            console.error("Failed to fetch library items", error);
            toast.error("Failed to load library content");
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl]);

    useEffect(() => {
        fetchLibraryItems();
    }, [fetchLibraryItems]);

    const handleFileChange = (e, field) => {
        setNewItem({ ...newItem, [field]: e.target.files[0] });
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('name', newItem.name);
            formData.append('description', newItem.description);
            if (newItem.thumbnail) formData.append('thumbnail', newItem.thumbnail);
            if (newItem.pdf) formData.append('pdf_file', newItem.pdf);

            await axios.post(`${apiUrl}/api/master-data/library/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Item added successfully");
            setIsAddModalOpen(false);
            setNewItem({ name: '', description: '', thumbnail: null, pdf: null });
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to add item", error);
            toast.error("Failed to add library item");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditClick = (item) => {
        setSelectedItemForEdit(item);
        setNewItem({
            name: item.name,
            description: item.description,
            thumbnail: null,
            pdf: null
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const formData = new FormData();
            formData.append('name', newItem.name);
            formData.append('description', newItem.description);
            if (newItem.thumbnail) formData.append('thumbnail', newItem.thumbnail);
            if (newItem.pdf) formData.append('pdf_file', newItem.pdf);

            await axios.patch(`${apiUrl}/api/master-data/library/${selectedItemForEdit.id}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Item updated successfully");
            setIsEditModalOpen(false);
            setSelectedItemForEdit(null);
            setNewItem({ name: '', description: '', thumbnail: null, pdf: null });
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to update item", error);
            toast.error("Failed to update library item");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;

        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/master-data/library/${id}/`);
            toast.success("Item deleted successfully");
            fetchLibraryItems();
        } catch (error) {
            console.error("Failed to delete item", error);
            toast.error("Failed to delete library item");
        }
    };

    const filteredItems = libraryItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
            <div className={`p-8 rounded-[2.5rem] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                {/* Header & Controls */}
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/20">
                                    Content Management
                                </span>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    Study <span className="text-emerald-500">Library</span>
                                </h2>
                            </div>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Manage educational materials, PDFs, and thumbnails in Cloudflare R2.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setNewItem({ name: '', description: '', thumbnail: null, pdf: null });
                                setIsAddModalOpen(true);
                            }}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                        >
                            <Plus size={20} strokeWidth={3} />
                            <span>Add New File</span>
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative group w-full md:w-96">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search by book name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-14 pr-6 py-3 rounded-2xl border-2 outline-none font-bold transition-all ${isDarkMode
                                    ? 'bg-white/5 border-white/5 text-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5'
                                    : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5'
                                    }`}
                            />
                        </div>
                        <button
                            onClick={fetchLibraryItems}
                            className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/5' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100'}`}
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-orange-50 text-orange-900/50'}`}>
                                <th className="py-5 px-6 text-center w-20">#</th>
                                <th className="py-5 px-6">Name</th>
                                <th className="py-5 px-6">Description</th>
                                <th className="py-5 px-6 text-center">Image</th>
                                <th className="py-5 px-6 text-center">PDF</th>
                                <th className="py-5 px-6 text-center">Action</th>
                                <th className="py-5 px-6 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <Loader2 size={40} className="animate-spin text-emerald-500" />
                                            <p className="font-bold text-lg opacity-50">Loading library items...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map((item, index) => (
                                    <tr key={item.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                        <td className="py-5 px-6 text-center">
                                            <span className={`text-sm font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="max-w-xs xl:max-w-sm">
                                                <span className="font-bold text-sm tracking-tight leading-tight block">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {item.description || "No description provided."}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <div className="flex justify-center">
                                                <div className="relative group/img overflow-hidden rounded-xl shadow-lg w-16 h-20">
                                                    <img src={item.thumbnail || 'https://via.placeholder.com/100x130?text=NO+IMAGE'} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Eye size={16} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                disabled={!item.pdf_file}
                                                onClick={() => {
                                                    setSelectedItemForView(item);
                                                    setViewPage(1);
                                                    setIsViewModalOpen(true);
                                                    setIsFullScreen(false);
                                                }}
                                                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${!item.pdf_file ? 'opacity-30 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                            >
                                                View
                                            </button>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                onClick={() => handleEditClick(item)}
                                                className="p-3 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all active:scale-90"
                                            >
                                                <Edit2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </td>
                                        <td className="py-5 px-6 text-center">
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                            >
                                                <Trash2 size={16} strokeWidth={2.5} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                                            <AlertCircle size={48} className={isDarkMode ? 'text-slate-700' : 'text-slate-300'} />
                                            <p className="font-bold text-lg">No library items found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add File Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className="w-full max-w-xl overflow-hidden rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex-shrink-0 flex items-center justify-between px-10 py-6 bg-emerald-600 text-white">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Add File Details</h3>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Upload your resources to Cloudflare</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className={`overflow-y-auto custom-scrollbar flex-grow p-10 ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}`}>
                            <form onSubmit={handleAddItem} className="space-y-6">
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>File Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Enter file name"
                                        value={newItem.name}
                                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                        className={`w-full px-6 py-4 rounded-2xl border-2 outline-none font-bold transition-all ${isDarkMode
                                            ? 'bg-white/5 border-white/5 text-white focus:border-emerald-500/50'
                                            : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-emerald-500/50'
                                            }`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Description *</label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Enter brief description"
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        className={`w-full px-6 py-4 rounded-2xl border-2 outline-none font-bold transition-all resize-none ${isDarkMode
                                            ? 'bg-white/5 border-white/5 text-white focus:border-emerald-500/50'
                                            : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-emerald-500/50'
                                            }`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Thumbnail Image</label>
                                        <div className="relative h-32">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileChange(e, 'thumbnail')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`absolute inset-0 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${newItem.thumbnail ? 'bg-emerald-500/10 border-emerald-500' : (isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200')}`}>
                                                {newItem.thumbnail ? (
                                                    <div className="w-full h-full p-2 flex flex-col items-center justify-center gap-1">
                                                        <img src={URL.createObjectURL(newItem.thumbnail)} className="h-16 w-12 object-cover rounded-lg shadow-md" alt="Preview" />
                                                        <span className="text-[9px] font-bold text-emerald-500 uppercase truncate w-full text-center px-4">{newItem.thumbnail.name}</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload size={28} className="text-slate-400" />
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Choose Image</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>PDF File</label>
                                        <div className="relative h-32">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => handleFileChange(e, 'pdf')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`absolute inset-0 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${newItem.pdf ? 'bg-blue-500/10 border-blue-500' : (isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200')}`}>
                                                {newItem.pdf ? (
                                                    <>
                                                        <FileCheck size={28} className="text-blue-500" />
                                                        <span className="text-[10px] font-bold text-blue-500 uppercase truncate px-4">{newItem.pdf.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileText size={28} className="text-slate-400" />
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Choose PDF</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                                >
                                    {isActionLoading ? <Loader2 size={24} className="animate-spin" /> : "Add To Library"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit File Modal */}
            {isEditModalOpen && selectedItemForEdit && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 p-4">
                    <div className="w-full max-w-xl overflow-hidden rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex-shrink-0 flex items-center justify-between px-10 py-6 bg-blue-600 text-white">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">Edit File Details</h3>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Update existing resource</p>
                            </div>
                            <button onClick={() => { setIsEditModalOpen(false); setSelectedItemForEdit(null); }} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Modal Body - Scrollable */}
                        <div className={`overflow-y-auto custom-scrollbar flex-grow p-10 ${isDarkMode ? 'bg-[#10141D]' : 'bg-white'}`}>
                            <form onSubmit={handleUpdateItem} className="space-y-6">
                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>File Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Enter file name"
                                        value={newItem.name}
                                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                        className={`w-full px-6 py-4 rounded-2xl border-2 outline-none font-bold transition-all ${isDarkMode
                                            ? 'bg-white/5 border-white/5 text-white focus:border-blue-500/50'
                                            : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-blue-500/50'
                                            }`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Description *</label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Enter brief description"
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        className={`w-full px-6 py-4 rounded-2xl border-2 outline-none font-bold transition-all resize-none ${isDarkMode
                                            ? 'bg-white/5 border-white/5 text-white focus:border-blue-500/50'
                                            : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-blue-500/50'
                                            }`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Thumbnail (Optional Update)</label>
                                        <div className="relative h-32">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileChange(e, 'thumbnail')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`absolute inset-0 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${newItem.thumbnail ? 'bg-blue-500/10 border-blue-500' : (isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200')}`}>
                                                {newItem.thumbnail ? (
                                                    <div className="w-full h-full p-2 flex flex-col items-center justify-center gap-1">
                                                        <img src={URL.createObjectURL(newItem.thumbnail)} className="h-16 w-12 object-cover rounded-lg shadow-md" alt="New Preview" />
                                                        <span className="text-[9px] font-bold text-blue-500 uppercase truncate w-full text-center px-4">{newItem.thumbnail.name}</span>
                                                    </div>
                                                ) : selectedItemForEdit.thumbnail ? (
                                                    <div className="w-full h-full p-2 flex flex-col items-center justify-center gap-1">
                                                        <img src={selectedItemForEdit.thumbnail} className="h-16 w-12 object-cover rounded-lg" alt="Current" />
                                                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Current Image</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload size={28} className="text-slate-400" />
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Change Image</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>PDF (Optional Update)</label>
                                        <div className="relative h-32">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={(e) => handleFileChange(e, 'pdf')}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`absolute inset-0 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${newItem.pdf ? 'bg-blue-500/10 border-blue-500' : (isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200')}`}>
                                                {newItem.pdf ? (
                                                    <>
                                                        <FileCheck size={28} className="text-blue-500" />
                                                        <span className="text-[10px] font-bold text-blue-500 uppercase truncate px-4">{newItem.pdf.name}</span>
                                                    </>
                                                ) : selectedItemForEdit.pdf_file ? (
                                                    <>
                                                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                                                            <FileText size={24} />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current PDF</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={28} className="text-slate-400" />
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Change PDF</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isActionLoading}
                                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                                >
                                    {isActionLoading ? <Loader2 size={24} className="animate-spin" /> : "Update Details"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal - 2 Page Logic */}
            {isViewModalOpen && selectedItemForView && (
                <div className={`fixed z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 ${isFullScreen ? 'inset-0 p-0' : 'inset-0 p-4'}`}>
                    <div className={`transition-all duration-300 overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl rounded-[2.5rem] h-[85vh]'}`}>
                        {/* Modal Header */}
                        <div className={`flex-shrink-0 flex items-center justify-between px-10 py-6 bg-emerald-600 text-white ${isFullScreen ? 'rounded-none' : ''}`}>
                            <div className="flex items-center gap-4">
                                {viewPage === 2 && (
                                    <button
                                        onClick={() => {
                                            if (isFullScreen) setIsFullScreen(false);
                                            setViewPage(1);
                                        }}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-all flex items-center gap-2 group"
                                    >
                                        <ChevronLeft size={20} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Back to Cover</span>
                                    </button>
                                )}
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-1">
                                        {viewPage === 1 ? 'Preview Cover' : 'Reading Document'}
                                    </h3>
                                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest truncate max-w-[400px]">
                                        {selectedItemForView.name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {viewPage === 2 && selectedItemForView.pdf_file && (
                                    <>
                                        {/* Minimize logic: If full screen, revert to medium (modal). If modal, no button shown (Requirement: fix it in medium screen) */}
                                        {isFullScreen ? (
                                            <button
                                                onClick={() => setIsFullScreen(false)}
                                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-xs font-bold border border-white/20 active:scale-95"
                                                title="Minimize back to modal"
                                            >
                                                <Minimize2 size={16} strokeWidth={3} />
                                                <span>Minimize</span>
                                            </button>
                                        ) : (
                                            /* Requirement: In medium screen don't show minimize button. Only show Full Screen option. */
                                            <button
                                                onClick={() => setIsFullScreen(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-xs font-bold border border-white/20 active:scale-95"
                                                title="Full Screen"
                                            >
                                                <Maximize2 size={16} strokeWidth={3} />
                                                <span>Full Screen</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => window.open(selectedItemForView.pdf_file, '_blank')}
                                            className="p-2 hover:bg-white/20 rounded-xl transition-all active:scale-95"
                                            title="Open in new tab"
                                        >
                                            <ExternalLink size={20} strokeWidth={3} />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        setIsViewModalOpen(false);
                                        setSelectedItemForView(null);
                                        setIsFullScreen(false);
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className={`flex-grow overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
                            {viewPage === 1 ? (
                                /* Page 1: Thumbnail View - Horizontal Layout */
                                <div className="flex flex-col lg:flex-row items-center justify-center h-full p-10 lg:p-16 gap-10 lg:gap-16 animate-in slide-in-from-right-8 duration-500 overflow-y-auto custom-scrollbar">
                                    {/* Image Side */}
                                    <div className="relative group overflow-hidden rounded-[2.5rem] shadow-2xl shadow-emerald-500/20 w-full max-w-[18rem] h-[24rem] lg:max-w-[20rem] lg:h-[28rem] border-[8px] border-white dark:border-white/5 flex-shrink-0 mt-5">
                                        <img
                                            src={selectedItemForView.thumbnail || 'https://via.placeholder.com/100x130?text=NO+IMAGE'}
                                            alt={selectedItemForView.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    </div>

                                    {/* Text Side */}
                                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl">
                                        <div className="mb-6 w-full">
                                            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-500/20 mb-4 inline-block">
                                                Digital Resource
                                            </span>
                                            <h4 className={`text-3xl lg:text-5xl font-black uppercase tracking-tight mb-4 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                {selectedItemForView.name}
                                            </h4>
                                            <div className="w-20 h-2 bg-emerald-500 rounded-full mb-6 lg:ml-0 mx-auto" />
                                        </div>

                                        <p className={`text-base font-medium leading-relaxed mb-10 opacity-80 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {selectedItemForView.description || "No description available for this resource."}
                                        </p>

                                        <button
                                            onClick={() => setViewPage(2)}
                                            className="px-10 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-600/40 transition-all active:scale-95 flex items-center gap-4 group ring-4 ring-emerald-600/10"
                                        >
                                            <FileText size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                            <span>Open Reader</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Page 2: PDF View (Iframe) */
                                <div className={`w-full h-full animate-in slide-in-from-right-8 duration-500 ${isFullScreen ? 'p-0' : 'p-4'}`}>
                                    {selectedItemForView.pdf_file ? (
                                        <iframe
                                            src={selectedItemForView.pdf_file}
                                            className={`w-full h-full bg-white ${isFullScreen ? 'rounded-none' : 'rounded-2xl'}`}
                                            title="PDF Preview"
                                        />
                                    ) : (
                                        <div className={`w-full h-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-6 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                            <AlertCircle size={48} className="text-amber-500" />
                                            <p className="font-bold">No PDF file attached to this item.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LibraryRegistry;
