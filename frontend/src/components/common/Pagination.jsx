import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const { isDarkMode } = useTheme();
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className={`mt-8 p-6 flex flex-col md:flex-row justify-between items-center gap-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
            <p className="text-[10px] font-black uppercase tracking-widest">
                Showing <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>{startItem}</span> to <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>{endItem}</span> of <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>{totalItems}</span> results
            </p>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-[5px] border transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-600 hover:text-white hover:border-blue-600'} ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => onPageChange(i + 1)}
                            className={`w-10 h-10 rounded-[5px] text-[10px] font-black transition-all ${currentPage === i + 1
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : `border ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-white'}`
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-[5px] border transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-600 hover:text-white hover:border-blue-600'} ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
