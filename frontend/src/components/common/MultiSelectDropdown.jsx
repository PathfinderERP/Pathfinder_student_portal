import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

const MultiSelectDropdown = ({ 
    options = [], 
    selected = [], 
    onChange, 
    placeholder = "Select...", 
    isDarkMode = false 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        return options.filter(opt => 
            opt.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const handleSelect = (option) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const isAllSelected = selected.length === options.length && options.length > 0;
    const handleSelectAll = () => {
        if (isAllSelected) {
            onChange([]);
        } else {
            onChange([...options]);
        }
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-2 text-sm border rounded-[5px] cursor-pointer flex justify-between items-center transition-colors ${
                    isDarkMode 
                        ? 'bg-[#1a1f2c] border-white/10 text-white hover:border-white/20' 
                        : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
            >
                <div className="truncate pr-2">
                    {selected.length === 0 && <span className="text-slate-500">{placeholder}</span>}
                    {selected.length === 1 && <span>{selected[0]}</span>}
                    {selected.length > 1 && <span>{selected.length} Selected</span>}
                </div>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
            </div>

            {isOpen && (
                <div className={`absolute z-50 w-full mt-1 border rounded-[5px] shadow-xl overflow-hidden ${
                    isDarkMode ? 'bg-[#1a1f2c] border-white/10' : 'bg-white border-slate-200'
                }`}>
                    {/* Search Bar */}
                    <div className={`p-2 border-b flex items-center gap-2 ${
                        isDarkMode ? 'border-white/10' : 'border-slate-100'
                    }`}>
                        <Search size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-400'} />
                        <input 
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full text-sm bg-transparent focus:outline-none ${
                                isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'
                            }`}
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 && (
                            <div 
                                onClick={handleSelectAll}
                                className={`px-3 py-2 text-sm flex items-center gap-2 cursor-pointer transition-colors ${
                                    isDarkMode 
                                        ? 'hover:bg-white/5 text-slate-200' 
                                        : 'hover:bg-slate-50 text-slate-700'
                                }`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                    isAllSelected 
                                        ? 'bg-orange-500 border-orange-500' 
                                        : isDarkMode ? 'border-slate-600' : 'border-slate-300'
                                }`}>
                                    {isAllSelected && <Check size={12} className="text-white" />}
                                </div>
                                <span className="font-semibold">Select All</span>
                            </div>
                        )}
                        
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = selected.includes(opt);
                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => handleSelect(opt)}
                                        className={`px-3 py-2 text-sm flex items-center gap-2 cursor-pointer transition-colors ${
                                            isDarkMode 
                                                ? 'hover:bg-white/5 text-slate-300' 
                                                : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                            isSelected 
                                                ? 'bg-orange-500 border-orange-500' 
                                                : isDarkMode ? 'border-slate-600' : 'border-slate-300'
                                        }`}>
                                            {isSelected && <Check size={12} className="text-white" />}
                                        </div>
                                        <span className="truncate">{opt}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className={`px-3 py-4 text-center text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                No options found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
