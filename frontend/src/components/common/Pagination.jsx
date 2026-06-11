import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const { isDarkMode } = useTheme();
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

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

                <div className="flex gap-1 flex-wrap justify-center">
                    {getPageNumbers().map((page, i) => (
                        page === '...' ? (
                            <span key={`ellipsis-${i}`} className={`w-10 h-10 flex items-center justify-center text-[10px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                ...
                            </span>
                        ) : (
                            <button
                                key={i}
                                onClick={() => onPageChange(page)}
                                className={`w-10 h-10 rounded-[5px] text-[10px] font-black transition-all relative ${currentPage === page
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                    : `border ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-white'}`
                                    }`}
                            >
                                {page}
                                {currentPage === page && (
                                    <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-white rounded-[1px] opacity-70" />
                                )}
                            </button>
                        )
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
