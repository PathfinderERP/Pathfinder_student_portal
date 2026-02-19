import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Edit, Image as ImageIcon, Heart, Send, Smile,
    MessageCircle, Phone, Video, Info, ChevronLeft,
    MoreVertical, Zap, Check, CheckCheck, Loader2, X, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

const Chat = () => {
    const { isDarkMode } = useTheme();
    const { user, token, getApiUrl } = useAuth();

    // States
    const [selectedChat, setSelectedChat] = useState(null);
    const [message, setMessage] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [socket, setSocket] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search States
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const scrollRef = useRef(null);

    // Environment-aware Chat Server URL
    const chatServerUrl = import.meta.env.VITE_CHAT_SERVER_URL || "http://localhost:4000";

    // 1. Establish Socket Connection & Fetch Inbox
    useEffect(() => {
        if (!token) return;

        const socketInstance = io(chatServerUrl, {
            auth: { token }
        });

        socketInstance.on('connect', () => console.log('[CHAT] Connected to Node Microservice'));

        socketInstance.on('receive_message', (data) => {
            // Optimistic Inbox Update
            setConversations(prev => {
                const existing = prev.find(c => c._id === data.senderId);
                if (existing) {
                    return prev.map(c => c._id === data.senderId
                        ? { ...c, lastMessage: data.message, lastTime: data.timestamp }
                        : c
                    ).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
                }
                // New incoming conversation
                return [{
                    _id: data.senderId,
                    lastMessage: data.message,
                    lastTime: data.timestamp,
                    senderName: data.senderName
                }, ...prev];
            });

            // If we are currently looking at this sender, add to message list
            if (selectedChat && String(selectedChat.id) === String(data.senderId)) {
                setSelectedChat(prev => ({
                    ...prev,
                    messages: [...prev.messages, {
                        id: Date.now(),
                        text: data.message,
                        time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        sentByMe: false
                    }]
                }));
            }
        });

        setSocket(socketInstance);
        fetchInbox();

        return () => socketInstance.disconnect();
    }, [token]);

    // 2. Fetch Inbox (Recent Conversations)
    const fetchInbox = async () => {
        try {
            const res = await axios.get(`${chatServerUrl}/api/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(res.data);
        } catch (err) {
            console.error('[CHAT] Inbox Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Select Conversation & Load History
    const handleSelectChat = async (conv) => {
        const otherId = conv._id || conv.id;
        const otherName = conv.senderName || conv.name;

        setSelectedChat({
            id: otherId,
            name: otherName,
            username: conv.username || 'scholar',
            messages: [],
            loading: true
        });

        if (window.innerWidth < 768) setIsSidebarOpen(false);

        try {
            const res = await axios.get(`${chatServerUrl}/api/chat/history/${otherId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSelectedChat(prev => ({
                ...prev,
                loading: false,
                messages: res.data.map(m => ({
                    id: m._id,
                    text: m.message,
                    time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    sentByMe: String(m.senderId) === String(user.user_id)
                }))
            }));
        } catch (err) {
            console.error('[CHAT] History Error:', err);
        }
    };

    // 4. Send Message
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !selectedChat || !socket) return;

        const msgText = message.trim();
        const timestamp = new Date().toISOString();

        // Emit via Socket
        socket.emit('send_message', {
            recipientId: selectedChat.id,
            message: msgText
        });

        // Update UI locally
        setSelectedChat(prev => ({
            ...prev,
            messages: [...prev.messages, {
                id: Date.now(),
                text: msgText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sentByMe: true
            }]
        }));

        // Update Inbox position
        setConversations(prev => {
            const filtered = prev.filter(c => c._id !== selectedChat.id);
            return [{
                _id: selectedChat.id,
                senderName: selectedChat.name,
                lastMessage: msgText,
                lastTime: timestamp
            }, ...filtered];
        });

        setMessage('');
    };

    // 5. Search for Users (Django API)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const apiUrl = getApiUrl();
                const res = await axios.get(`${apiUrl}/api/chat/search/?q=${searchQuery}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSearchResults(res.data);
            } catch (err) {
                console.error('[CHAT] Search Error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [selectedChat?.messages, selectedChat?.loading]);

    return (
        <div className={`h-[calc(100vh-140px)] flex overflow-hidden rounded-[2.5rem] border shadow-2xl transition-all duration-700
            ${isDarkMode ? 'bg-[#0A0D14] border-white/5 shadow-black/60' : 'bg-white border-slate-200'}`}>

            {/* Sidebar: Inbox */}
            <div className={`flex-none border-r transition-all duration-500 relative flex flex-col
                ${isSidebarOpen ? 'w-full md:w-80 lg:w-96' : 'w-0 overflow-hidden md:w-20'}
                ${isDarkMode ? 'border-white/5 bg-[#0D1117]' : 'border-slate-100 bg-slate-50/50'}`}>

                <div className="p-8 pb-4">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <h2 className={`text-2xl font-black tracking-tighter uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Inbox</h2>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className={`p-2.5 rounded-2xl bg-purple-600/10 text-purple-500 hover:bg-purple-600 hover:text-white transition-all`}>
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            placeholder="Filter inbox..."
                            className={`w-full pl-12 pr-6 py-4 rounded-2xl text-sm font-bold outline-none transition-all
                                ${isDarkMode ? 'bg-black/40 border border-white/5 text-white focus:ring-2 focus:ring-purple-500/20' : 'bg-white border border-slate-200 text-slate-900 focus:ring-4 focus:ring-purple-500/10'}`}
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" /></div>
                    ) : (
                        conversations.map((chat) => (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                key={chat._id}
                                onClick={() => handleSelectChat(chat)}
                                className={`flex items-center gap-4 p-4 rounded-[1.5rem] cursor-pointer transition-all duration-300 relative group
                                    ${selectedChat?.id === chat._id
                                        ? (isDarkMode ? 'bg-gradient-to-r from-purple-600/20 to-transparent' : 'bg-white shadow-xl ring-1 ring-slate-100')
                                        : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-white hover:shadow-lg')}
                                `}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex-none flex items-center justify-center text-lg font-black shadow-lg
                                    ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {(chat.senderName || 'S').charAt(0)}
                                </div>
                                <div className={`flex-1 min-w-0 ${!isSidebarOpen && 'md:hidden'}`}>
                                    <h3 className={`text-sm font-black truncate mb-1 uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{chat.senderName}</h3>
                                    <p className={`text-[11px] font-bold truncate opacity-50`}>{chat.lastMessage}</p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* MESSAGE WINDOW */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-black/20 relative">
                {selectedChat ? (
                    <>
                        <div className={`flex-none px-6 py-4 border-b flex items-center justify-between
                            ${isDarkMode ? 'border-white/5 bg-[#0D1117]/60' : 'border-slate-100 bg-white/60'} backdrop-blur-xl relative z-10`}>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 rounded-xl"><ChevronLeft size={22} /></button>
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {selectedChat.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-tight mb-1">{selectedChat.name}</h2>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Connected</span>
                                </div>
                            </div>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                            {selectedChat.loading ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" /></div>
                            ) : (
                                selectedChat.messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.sentByMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${m.sentByMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-5 rounded-[2rem] text-sm font-bold shadow-xl ${m.sentByMe ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-tr-none' : (isDarkMode ? 'bg-[#1C2128] text-slate-200 rounded-tl-none border border-white/5' : 'bg-white text-slate-800 rounded-tl-none shadow-slate-200/50')}`}>
                                                {m.text}
                                            </div>
                                            <span className="text-[9px] font-black mt-2 uppercase opacity-30">{m.time}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className={`p-6 border-t ${isDarkMode ? 'border-white/5 bg-[#0D1117]/80' : 'border-slate-100 bg-white'} backdrop-blur-md`}>
                            <form onSubmit={handleSendMessage} className={`flex items-center gap-4 p-2 rounded-[2rem] border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                <input
                                    type="text" value={message} onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Message..." className="flex-1 bg-transparent border-none outline-none text-sm font-bold p-3 dark:text-white"
                                />
                                <button type="submit" disabled={!message.trim()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30">Send</button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <MessageCircle size={64} className="text-purple-600 opacity-20 mb-8" />
                        <h2 className="text-3xl font-black mb-2 uppercase">Nexus Message Hub</h2>
                        <p className="opacity-40 max-w-sm">Select a contact to start your scientific collaboration link.</p>
                    </div>
                )}

                {/* Search Overlay */}
                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className={`w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border border-white/10' : 'bg-white border border-slate-200'}`}>
                                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-lg font-black uppercase tracking-tight">Search Scholars</h3>
                                    <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-2 rounded-xl hover:bg-white/10 transition-all"><X size={20} /></button>
                                </div>
                                <div className="p-8">
                                    <div className="relative mb-8">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                                        <input type="text" autoFocus placeholder="Type name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full pl-12 pr-6 py-4 rounded-2xl text-sm font-bold outline-none border ${isDarkMode ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-50 border-slate-200'}`} />
                                    </div>
                                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                                        {isSearching ? <div className="flex justify-center p-4"><Loader2 className="animate-spin text-purple-600" /></div> :
                                            searchResults.map(u => (
                                                <div key={u.id} onClick={() => { handleSelectChat(u); setIsSearchOpen(false); }} className={`p-4 rounded-2xl border cursor-pointer transition-all ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-lg'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-black text-white text-xs">{u.name.charAt(0)}</div>
                                                        <div>
                                                            <p className="text-sm font-black uppercase tracking-tight">{u.name}</p>
                                                            <p className="text-[10px] font-bold opacity-40 uppercase">{u.user_type}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                        {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && <p className="text-center py-4 text-xs font-bold opacity-30">No results found.</p>}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Chat;
