import React, { useState, useRef } from 'react';
import {
    Upload, Plus, Database, FileText, CheckCircle,
    X, Search, Filter, ChevronRight, AlertCircle,
    BookOpen, HelpCircle, HardDrive, Download,
    CloudUpload, FileSpreadsheet, Layers
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const QuestionBank = () => {
    const { isDarkMode } = useTheme();
    const [view, setView] = useState('overview'); // 'overview', 'repository', 'manual'
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = () => {
        if (!selectedFile) return;
        setIsUploading(true);
        // Simulate upload
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setUploadProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadProgress(0);
                    setSelectedFile(null);
                    // Show success message or redirect
                }, 500);
            }
        }, 200);
    };

    const stats = [
        { label: 'Total Questions', value: '12,450', icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Added This Month', value: '+450', icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Last Batch', value: '2 hrs ago', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className={`p-10 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/30">
                                <Database className="text-white" size={24} />
                            </div>
                            <h2 className="text-4xl font-black tracking-tight uppercase">
                                Question <span className="text-orange-500">Bank</span>
                            </h2>
                        </div>
                        <p className={`text-sm font-medium max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Centralized repository for all academic assessments. Manage questions across different subjects, classes, and difficulty levels with precision.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {stats.map((stat, i) => (
                            <div key={i} className={`px-6 py-4 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} flex items-center gap-4`}>
                                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">{stat.label}</p>
                                    <p className="text-lg font-black tracking-tight">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bulk Import Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className={`p-8 rounded-[2.5rem] border shadow-xl flex flex-col h-full ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Bulk Import</h3>
                                <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Upload Excel / CSV Files</p>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                Template Version 2.4
                            </div>
                        </div>

                        {/* Dropzone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`flex-1 min-h-[300px] rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center relative group
                                ${isDragging
                                    ? 'border-orange-500 bg-orange-500/5'
                                    : isDarkMode ? 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                            {!selectedFile ? (
                                <>
                                    <div className={`w-20 h-20 rounded-3xl mb-6 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-white shadow-xl text-slate-900 shadow-slate-200'}`}>
                                        <CloudUpload size={40} className="text-orange-500" />
                                    </div>
                                    <h4 className="text-lg font-black uppercase tracking-tight mb-2">Drop your file here</h4>
                                    <p className={`text-sm font-medium mb-8 max-w-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Drag and drop your academic Excel sheet or click to browse files
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-orange-500/30 active:scale-95 flex items-center gap-3"
                                    >
                                        <FileSpreadsheet size={18} />
                                        <span>Browse Files</span>
                                    </button>
                                </>
                            ) : (
                                <div className="animate-in zoom-in-95 duration-300 w-full max-w-sm">
                                    <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                                                <FileSpreadsheet size={24} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-black text-sm uppercase tracking-tight truncate">{selectedFile.name}</p>
                                                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload</p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedFile(null)}
                                                className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {isUploading ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-orange-500">Processing Questions...</span>
                                                    <span>{uploadProgress}%</span>
                                                </div>
                                                <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                                    <div
                                                        className="h-full bg-orange-500 transition-all duration-300 relative"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleUpload}
                                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-3"
                                            >
                                                <Upload size={18} />
                                                <span>Begin Upload</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                            />
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-500" />
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>XLSX, XLS, CSV Supported</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Download size={14} className="text-blue-500" />
                                <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline underline-offset-4">Download Standard Template</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secondary Actions */}
                <div className="space-y-8">
                    {/* Manual Question Entry */}
                    <div className={`p-8 rounded-[2.5rem] border shadow-xl relative overflow-hidden group border-white/5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-[#10141D]' : 'bg-white border-slate-200'}`}>
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Plus size={80} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
                                <Plus size={28} strokeWidth={3} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Manual Entry</h3>
                            <p className={`text-sm font-medium mb-8 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Create complex questions manually with equations, images, and multi-format options.
                            </p>
                            <div className="flex items-center gap-2 text-blue-500 font-black uppercase tracking-[0.2em] text-[10px]">
                                Add Question Now
                                <ChevronRight size={14} strokeWidth={4} />
                            </div>
                        </div>
                    </div>

                    {/* Show Repository */}
                    <div className={`p-8 rounded-[2.5rem] border shadow-xl relative overflow-hidden group border-white/5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-[#10141D]' : 'bg-white border-slate-200'}`}>
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Database size={80} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
                                <Layers size={28} strokeWidth={3} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight mb-2">My Repository</h3>
                            <p className={`text-sm font-medium mb-8 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Explore your historical question bank. Filter by tags, dates, or academic level.
                            </p>
                            <div className="flex items-center gap-2 text-emerald-500 font-black uppercase tracking-[0.2em] text-[10px]">
                                Browse All <span className="opacity-50">(12.4k)</span>
                                <ChevronRight size={14} strokeWidth={4} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Uploads Table */}
            <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Recent Activity</h3>
                        <p className="text-xs font-bold opacity-40 uppercase tracking-widest mt-1">Last 5 Import Batches</p>
                    </div>
                    <button className={`px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} hover:bg-orange-500 hover:text-white hover:border-orange-500 group flex items-center gap-2`}>
                        View Full History
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left border-b border-white/5">
                                <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest opacity-30">Batch ID</th>
                                <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest opacity-30">File Name</th>
                                <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest opacity-30 text-center">Questions</th>
                                <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest opacity-30">Status</th>
                                <th className="pb-4 px-4 text-[10px] font-black uppercase tracking-widest opacity-30 text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {[
                                { id: '#BATCH-901', name: 'Physics_Mock_Set_A.xlsx', count: 120, status: 'Completed', date: 'Just now' },
                                { id: '#BATCH-899', name: 'Math_Calculus_Basic.xlsx', count: 45, status: 'Completed', date: '2 hrs ago' },
                                { id: '#BATCH-898', name: 'Chemistry_Organic_Mains.xlsx', count: 90, status: 'Failed', date: 'Yesterday' },
                                { id: '#BATCH-897', name: 'Biology_Genetics_NEET.xlsx', count: 150, status: 'Completed', date: 'Jan 14, 2026' }
                            ].map((batch, i) => (
                                <tr key={i} className={`group cursor-default ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                    <td className="py-5 px-4 font-black text-[11px] tracking-widest opacity-40">{batch.id}</td>
                                    <td className="py-5 px-4 text-sm font-bold tracking-tight">{batch.name}</td>
                                    <td className="py-5 px-4 text-center">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                            {batch.count}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${batch.status === 'Completed' ? 'text-emerald-500' : 'text-red-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${batch.status === 'Completed' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                            {batch.status}
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-right text-[10px] font-bold opacity-40 uppercase tracking-widest">{batch.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    height: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

// Simple Clock and helper icons needed by stats/etc
const Clock = ({ size = 18, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

export default QuestionBank;
