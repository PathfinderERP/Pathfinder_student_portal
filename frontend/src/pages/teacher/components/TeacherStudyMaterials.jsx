import React from 'react';
import { FileText, Plus, Search, Folder, MoreVertical, Download, ExternalLink } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherStudyMaterials = () => {
    const { isDarkMode } = useTheme();

    const theme = {
        card: isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm',
        input: isDarkMode ? 'bg-black/20 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-500' : 'text-slate-500'
    };

    const files = [
        { name: 'Photosynthesis_Lecture_Notes.pdf', size: '2.4 MB', type: 'PDF', date: '2024-03-01' },
        { name: 'Cell_Division_Diagrams.zip', size: '15.8 MB', type: 'ZIP', date: '2024-02-28' },
        { name: 'NEET_Biology_Question_Bank.xlsx', size: '1.1 MB', type: 'XLSX', date: '2024-02-25' },
        { name: 'Genetic_Engineering_Ref.pdf', size: '4.2 MB', type: 'PDF', date: '2024-02-20' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">
            <div className={`p-8 rounded-[5px] border ${theme.card} flex flex-col md:flex-row md:items-center justify-between gap-6`}>
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${theme.text}`}>Study Materials</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Repository for lectures, notes and assignments</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20">
                    <Plus size={16} /> Upload New
                </button>
            </div>

            <div className={`p-4 rounded-[5px] border ${theme.card} flex items-center gap-3`}>
                <Search size={18} className="text-slate-500" />
                <input
                    type="text"
                    placeholder="SEARCH MATERIALS..."
                    className={`flex-1 bg-transparent border-none outline-none text-[10px] font-bold tracking-widest uppercase ${theme.text}`}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {files.map((file, i) => (
                    <div key={i} className={`p-4 rounded-[5px] border ${theme.card} flex items-center justify-between group hover:border-cyan-500/30 transition-all`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <h4 className={`text-xs font-black uppercase tracking-tight ${theme.text}`}>{file.name}</h4>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{file.type} • {file.size} • Uploaded on {file.date}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="p-2 text-slate-500 hover:text-cyan-500 transition-colors">
                                <Download size={16} />
                            </button>
                            <button className="p-2 text-slate-500 hover:text-cyan-500 transition-colors">
                                <ExternalLink size={16} />
                            </button>
                            <button className="p-2 text-slate-500 hover:text-cyan-500 transition-colors">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeacherStudyMaterials;
