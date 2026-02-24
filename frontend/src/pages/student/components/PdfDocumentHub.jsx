import React from 'react';
import { FileText, Download } from 'lucide-react';

const PdfDocumentHub = ({ isDarkMode }) => {
    return (
        <div className={`p-8 rounded-[1.5rem] border text-center ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
            <FileText size={48} className="mx-auto mb-4 text-purple-600 opacity-20" />
            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Document Hub</h3>
            <p className="opacity-40 text-sm max-w-xs mx-auto mb-6">Access course materials, research papers, and shared documents.</p>
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-xs font-bold opacity-30 italic">No documents shared yet.</p>
            </div>
        </div>
    );
};

export default PdfDocumentHub;
