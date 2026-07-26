import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Video, Calendar, Clock, Search, RefreshCw, Maximize2, X, AlertCircle, Play, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const StudentLiveClass = ({ isDarkMode }) => {
    const { getApiUrl, token, user } = useAuth();
    const [liveClasses, setLiveClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeLiveStream, setActiveLiveStream] = useState(null);
    const iframeLoadCountRef = useRef(0);

    const studentDisplayName = useMemo(() => {
        if (!user) return 'Student';
        const fullName = user.full_name || user.name || (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '');
        return fullName || user.username || 'Student';
    }, [user]);

    const getMeetingUrlWithStudentName = (rawUrl, name) => {
        if (!rawUrl) return '';
        try {
            const urlObj = new URL(rawUrl);
            urlObj.searchParams.set('loginName', name);
            urlObj.searchParams.set('name', name);
            urlObj.searchParams.set('uname', name);
            urlObj.searchParams.set('username', name);
            urlObj.searchParams.set('displayName', name);
            urlObj.searchParams.set('participantName', name);
            urlObj.searchParams.set('usrName', name);
            return urlObj.toString();
        } catch (e) {
            const sep = rawUrl.includes('?') ? '&' : '?';
            const encodedName = encodeURIComponent(name);
            return `${rawUrl}${sep}loginName=${encodedName}&name=${encodedName}&uname=${encodedName}&username=${encodedName}&displayName=${encodedName}`;
        }
    };

    // Reset load count when active meeting changes
    useEffect(() => {
        iframeLoadCountRef.current = 0;
    }, [activeLiveStream]);

    // Detect meeting end / close window events via postMessage
    useEffect(() => {
        if (!activeLiveStream) return;

        const handleMessage = (event) => {
            if (!event.data) return;
            let dataStr = '';
            try {
                dataStr = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
            } catch (e) {
                dataStr = String(event.data);
            }
            const lowerData = dataStr.toLowerCase();
            if (
                lowerData.includes('closewindow') ||
                lowerData.includes('close_window') ||
                lowerData.includes('meeting_left') ||
                lowerData.includes('meetingleft') ||
                lowerData.includes('left_meeting') ||
                lowerData.includes('leftmeeting') ||
                lowerData.includes('end_meeting') ||
                lowerData.includes('endmeeting') ||
                lowerData.includes('meeting_ended') ||
                lowerData.includes('meetingended') ||
                lowerData.includes('leave_meeting') ||
                lowerData.includes('leavemeeting') ||
                lowerData.includes('zoho.meeting')
            ) {
                setActiveLiveStream(null);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [activeLiveStream]);

    const handleIframeLoad = () => {
        iframeLoadCountRef.current += 1;
        // When iframe navigates away from initial meeting room (e.g. user clicks Close Window or leaves call)
        if (iframeLoadCountRef.current > 1) {
            setActiveLiveStream(null);
        }
    };

    const fetchLiveClasses = async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/master-data/live-classes/?refresh=true&_t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data.results || response.data || [];
            setLiveClasses(data);
        } catch (error) {
            console.error('Failed to fetch live classes:', error);
            toast.error('Failed to load live classes');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveClasses();
        const interval = setInterval(() => {
            fetchLiveClasses();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredClasses = liveClasses.filter(c => 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (startTime) => {
        if (!startTime) return { text: 'Scheduled', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
        const now = new Date();
        const start = new Date(startTime);
        const diffMins = (now - start) / (1000 * 60);

        if (diffMins >= -15 && diffMins <= 180) {
            return { text: 'LIVE NOW', color: 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' };
        } else if (diffMins < -15) {
            return { text: 'UPCOMING', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
        } else {
            return { text: 'COMPLETED', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Banner */}
            <div className={`p-8 rounded-[5px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-white/5' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
                                <Video size={12} /> LIVE CLASSES
                            </span>
                            <h2 className={`text-2xl md:text-3xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                My <span className="text-amber-500">Live Classes</span>
                            </h2>
                        </div>
                        <p className={`text-xs md:text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Join interactive live sessions scheduled for your class and centre.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder="Search live class..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 rounded-[5px] border outline-none text-xs font-bold transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-white focus:border-amber-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500'}`}
                            />
                        </div>
                        <button
                            onClick={fetchLiveClasses}
                            className={`p-2.5 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 text-amber-500 hover:bg-white/10' : 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100'}`}
                            title="Refresh List"
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Live Classes Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`p-6 rounded-[5px] border animate-pulse space-y-4 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                            <div className="h-6 w-24 bg-white/10 rounded-[5px]"></div>
                            <div className="h-5 w-3/4 bg-white/10 rounded-[5px]"></div>
                            <div className="h-4 w-1/2 bg-white/10 rounded-[5px]"></div>
                            <div className="h-10 w-full bg-white/10 rounded-[5px]"></div>
                        </div>
                    ))}
                </div>
            ) : filteredClasses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClasses.map(item => {
                        const status = getStatusBadge(item.start_time);
                        return (
                            <div
                                key={item.id}
                                className={`p-6 rounded-[5px] border shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-amber-500/30' : 'bg-white border-slate-100 hover:border-amber-400'}`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-[5px] border ${status.color}`}>
                                            {status.text}
                                        </span>
                                        <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {item.duration ? `${item.duration} Mins` : ''}
                                        </span>
                                    </div>

                                    <h3 className={`font-black text-lg uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                        {item.name}
                                    </h3>

                                    {item.description && (
                                        <p className={`text-xs font-medium line-clamp-2 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {item.description}
                                        </p>
                                    )}

                                    <div className="space-y-2 mb-6">
                                        <div className={`flex items-center gap-2 text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            <Calendar size={14} className="text-amber-500" />
                                            <span>
                                                {item.start_time ? new Date(item.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Flexible'}
                                            </span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            <Clock size={14} className="text-amber-500" />
                                            <span>
                                                {item.start_time ? new Date(item.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    {item.meeting_link ? (
                                        <button
                                            onClick={() => setActiveLiveStream(item)}
                                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-[5px] shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Play size={16} fill="currentColor" />
                                            <span>Join Live Class</span>
                                        </button>
                                    ) : (
                                        <div className={`w-full py-3 text-center text-xs font-bold uppercase tracking-wider rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                            Link Not Available
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className={`p-16 rounded-[5px] border text-center shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}>
                    <AlertCircle size={40} className="mx-auto mb-3 text-amber-500 opacity-60" />
                    <h3 className="text-lg font-black uppercase tracking-tight mb-1">No Live Classes Available</h3>
                    <p className="text-xs font-medium opacity-70">
                        There are currently no scheduled live classes matching your registered class and active centre.
                    </p>
                </div>
            )}

            {/* In-App Embedded Live Class Player Modal */}
            {activeLiveStream && createPortal(
                <div className="fixed inset-0 z-[99999] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 p-2 sm:p-4 md:p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-[#10141D] border border-white/10 rounded-[5px] mb-2 sm:mb-4 text-white shrink-0 shadow-2xl">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 sm:p-2.5 bg-amber-500/20 text-amber-500 rounded-[5px] shrink-0">
                                <Video size={20} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-sm sm:text-base uppercase tracking-tight text-amber-500 truncate">{activeLiveStream.name}</h3>
                                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-bold opacity-70 mt-0.5 flex-wrap">
                                    <span>Duration: {activeLiveStream.duration || 60} mins</span>
                                    {activeLiveStream.start_time && (
                                        <span>• Scheduled: {new Date(activeLiveStream.start_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                            <button
                                onClick={() => {
                                    const iframe = document.getElementById('student-zoho-iframe');
                                    if (iframe) {
                                        if (document.fullscreenElement) {
                                            document.exitFullscreen();
                                        } else {
                                            iframe.requestFullscreen();
                                        }
                                    }
                                }}
                                className="p-2 sm:px-3 sm:py-2 rounded-[5px] bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
                            >
                                <Maximize2 size={16} />
                                <span className="hidden sm:inline">Fullscreen</span>
                            </button>
                            <button
                                onClick={() => setActiveLiveStream(null)}
                                className="p-2 sm:px-3 sm:py-2 rounded-[5px] bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 font-black text-xs uppercase tracking-wider"
                                title="Leave / Exit Meeting"
                            >
                                <X size={18} strokeWidth={2.5} />
                                <span className="hidden sm:inline">Leave</span>
                            </button>
                        </div>
                    </div>

                    {/* Embedded Player Container */}
                    <div className="flex-1 w-full bg-black rounded-[5px] overflow-hidden border border-white/10 relative shadow-2xl">
                        <iframe
                            id="student-zoho-iframe"
                            src={getMeetingUrlWithStudentName(activeLiveStream.meeting_link, studentDisplayName)}
                            title={activeLiveStream.name}
                            onLoad={handleIframeLoad}
                            className="w-full h-full border-none"
                            allow="camera; microphone; display-capture; autoplay; clipboard-write; encrypted-media; fullscreen"
                            allowFullScreen
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default StudentLiveClass;
