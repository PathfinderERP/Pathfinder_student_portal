import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { Loader2, ExternalLink, BookOpen, GraduationCap, Beaker } from 'lucide-react';
import axios from 'axios';

const Scholarlab = () => {
    const { isDarkMode } = useTheme();
    const { user, token, getApiUrl } = useAuth();
    const [loading, setLoading] = useState(true);
    const [simulations, setSimulations] = useState([]);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('All');
    const [selectedSubject, setSelectedSubject] = useState('All');

    useEffect(() => {
        fetchSchoolarlabData();
    }, []);

    const fetchSchoolarlabData = async () => {
        setLoading(true);
        setError(null);

        try {
            const apiUrl = getApiUrl();

            if (!token) {
                setError('Authentication required. Please log in.');
                setLoading(false);
                return;
            }

            // Call backend proxy endpoint
            const response = await axios.get(
                `${apiUrl}/api/student/scholarlab/simulations/`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            setSimulations(response.data.simulations || []);
        } catch (err) {
            console.error('Scholarlab API Error:', err);
            setError(err.response?.data?.error || 'Failed to load Scholarlab simulations');
        } finally {
            setLoading(false);
        }
    };

    const initializeSimulation = async (simulation) => {
        try {
            const apiUrl = getApiUrl();

            // Call backend proxy to initialize simulation
            const response = await axios.post(
                `${apiUrl}/api/student/scholarlab/initialize/`,
                {
                    webgl_url: simulation.webgl_url,
                    web_url: simulation.web_url || '',
                    sim_id: simulation.id
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const simulationUrl = response.data.simulation_url;
            const warning = response.data.warning;

            if (warning) {
                // Backend flagged this as a download URL
                const proceed = window.confirm(
                    `⚠️ This simulation requires a desktop download.\n\nWould you like to download it anyway?\n\n(${simulationUrl})`
                );
                if (proceed) {
                    window.open(simulationUrl, '_blank');
                }
                return;
            }

            if (simulationUrl) {
                // Open simulation in new window
                window.open(simulationUrl, '_blank', 'width=1200,height=800,noopener,noreferrer');
            } else {
                alert('Failed to get simulation URL. Please try again.');
            }
        } catch (err) {
            console.error('Failed to initialize simulation:', err);
            alert(err.response?.data?.error || 'Failed to launch simulation. Please try again.');
        }
    };

    // Filter Logic
    const filteredSimulations = simulations.filter(sim => {
        const matchesSearch = sim.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (sim.description && sim.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const simGrade = sim.grade ? String(sim.grade) : '';
        const simSubject = sim.subject ? String(sim.subject) : '';

        const matchesGrade = selectedGrade === 'All' || simGrade === selectedGrade;
        const matchesSubject = selectedSubject === 'All' || simSubject === selectedSubject;

        return matchesSearch && matchesGrade && matchesSubject;
    });

    // Extract unique subjects and grades for filter options
    const subjects = ['All', ...new Set(simulations.map(sim => sim.subject).filter(s => s && s !== 'All'))];
    const grades = ['All', ...new Set(simulations.map(sim => String(sim.grade)).filter(g => g && g !== 'undefined' && g !== 'All'))].sort((a, b) => {
        if (a === 'All') return -1;
        if (b === 'All') return 1;
        return parseInt(a) - parseInt(b);
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                <p className={`text-sm animate-pulse ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Fetching scientific labs...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-8 rounded-2xl border ${isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'} animate-in fade-in zoom-in duration-300`}>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h3 className={`font-bold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>Connection Error</h3>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-red-300/80' : 'text-red-600'}`}>
                    {error}
                </p>
                <button
                    onClick={fetchSchoolarlabData}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold uppercase transition-transform hover:scale-105"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className={`p-8 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <Beaker className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-1">
                                    Scholar<span className="text-purple-500 italic">lab</span>
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Interactive Science Simulations
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search Input */}
                        <div className="md:col-span-2 relative">
                            <input
                                type="text"
                                placeholder="Search experiments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-4 pr-10 py-3 rounded-xl border transition-all outline-none text-sm font-medium ${isDarkMode
                                    ? 'bg-[#10141D] border-white/10 focus:border-purple-500/50 text-white'
                                    : 'bg-slate-50 border-slate-200 focus:border-purple-400 text-slate-700'
                                    }`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <SearchIcon className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            </div>
                        </div>

                        {/* Subject Filter */}
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className={`px-4 py-3 rounded-xl border transition-all outline-none text-sm font-bold appearance-none cursor-pointer ${isDarkMode
                                ? 'bg-[#10141D] border-white/10 focus:border-purple-500/50 text-white'
                                : 'bg-slate-50 border-slate-200 focus:border-purple-400 text-slate-700 shadow-sm'
                                }`}
                        >
                            <option value="All" className={isDarkMode ? 'bg-[#10141D] text-white' : ''}>All Subjects</option>
                            {subjects.filter(s => s !== 'All').map(subject => (
                                <option key={subject} value={subject} className={isDarkMode ? 'bg-[#10141D] text-white' : ''}>
                                    {subject}
                                </option>
                            ))}
                        </select>

                        {/* Grade Filter */}
                        <select
                            value={selectedGrade}
                            onChange={(e) => setSelectedGrade(e.target.value)}
                            className={`px-4 py-3 rounded-xl border transition-all outline-none text-sm font-bold appearance-none cursor-pointer ${isDarkMode
                                ? 'bg-[#10141D] border-white/10 focus:border-purple-500/50 text-white'
                                : 'bg-slate-50 border-slate-200 focus:border-purple-400 text-slate-700 shadow-sm'
                                }`}
                        >
                            <option value="All" className={isDarkMode ? 'bg-[#10141D] text-white' : ''}>All Grades</option>
                            {grades.filter(g => g !== 'All').map(grade => (
                                <option key={grade} value={grade} className={isDarkMode ? 'bg-[#10141D] text-white' : ''}>
                                    Grade {grade}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Simulations Grid */}
            {filteredSimulations.length === 0 ? (
                <div className={`p-20 rounded-2xl border text-center ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="relative inline-block mb-6">
                        <BookOpen className={`w-20 h-20 mx-auto ${isDarkMode ? 'text-slate-800' : 'text-slate-100'}`} />
                        <Beaker className="w-8 h-8 absolute bottom-0 right-0 text-purple-500/50 animate-bounce" />
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>No simulations found</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Try adjusting your filters or search keywords
                    </p>
                    <button
                        onClick={() => { setSearchQuery(''); setSelectedGrade('All'); setSelectedSubject('All'); }}
                        className="mt-6 text-purple-500 text-sm font-bold underline hover:text-purple-400 transition-colors"
                    >
                        Reset Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSimulations.map((simulation) => (
                        <div
                            key={simulation.id}
                            className={`group p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-2 cursor-pointer relative overflow-hidden ${isDarkMode
                                ? 'bg-[#10141D] border-white/5 hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/10'
                                : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-100 shadow-sm'
                                }`}
                            onClick={() => initializeSimulation(simulation)}
                        >
                            {/* Grade/Subject Badges - Top Right */}
                            <div className="absolute top-4 right-4 flex flex-col gap-1 items-end">
                                {simulation.subject && simulation.subject !== 'General Science' && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-[9px] font-black uppercase tracking-tighter border border-purple-500/20">
                                        {simulation.subject}
                                    </span>
                                )}
                                {simulation.grade && simulation.grade !== 'All' && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase tracking-tighter border border-blue-500/20">
                                        Gr. {simulation.grade}
                                    </span>
                                )}
                            </div>

                            {/* Simulation Icon */}
                            <SimIcon simulation={simulation} isDarkMode={isDarkMode} />

                            {/* Simulation Info */}
                            <h3 className={`text-xl font-black mb-2 uppercase tracking-tighter leading-tight pr-16 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                {simulation.name}
                            </h3>

                            {simulation.description && (
                                <p className={`text-xs mb-6 line-clamp-3 leading-relaxed font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {simulation.description}
                                </p>
                            )}

                            {/* Launch Button */}
                            <div className={`mt-auto py-3 px-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${isDarkMode
                                ? 'bg-purple-600/10 border-purple-600/50 text-purple-400 group-hover:bg-purple-600 group-hover:text-white'
                                : 'bg-purple-50 border-purple-200 text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600'
                                }`}>
                                Launch Laboratory
                                <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Premium Tip Footer */}
            <div className={`p-6 rounded-2xl border overflow-hidden relative ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200 shadow-sm'}`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 blur-2xl" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-500">
                        <Beaker className="w-5 h-5" />
                    </div>
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-widest leading-none mb-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Pro Tip</p>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Click on any simulation card to launch it in a new window. Make sure pop-ups are enabled for the best experience.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SearchIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

// Handles image display with graceful fallback if URL is broken
const SimIcon = ({ simulation, isDarkMode }) => {
    const [imgError, setImgError] = React.useState(false);

    if (simulation.icon_url && !imgError) {
        return (
            <div className="mb-6">
                <img
                    src={simulation.icon_url}
                    alt={simulation.name}
                    className="w-20 h-20 rounded-2xl object-cover shadow-md group-hover:scale-110 transition-transform duration-500"
                    onError={() => setImgError(true)}
                />
            </div>
        );
    }

    return (
        <div className="mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-500">
                <Beaker className="w-10 h-10 text-white" />
            </div>
        </div>
    );
};

export default Scholarlab;
