import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Image as ImageIcon, MessageCircle, Heart, Share2,
    MoreHorizontal, Send, X, Search, Bell, TrendingUp, Users,
    Hash, Camera, Video, Smile, CheckCircle, Clock, Award,
    ChevronRight, Play, Pause, Volume2, VolumeX, BarChart2,
    FileText, Zap, Shield, Bookmark, Flag, Filter, Download,
    Eye, MapPin, Link as LinkIcon, Edit, Trash2, Loader2,
    Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import axios from 'axios';
import PdfDocumentHub from './PdfDocumentHub';

// --- Global Styles for Animations & Custom Scrollbar ---
const styles = `
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite linear;
    background: linear-gradient(to right, #eff1f3 4%, #e2e2e2 25%, #eff1f3 36%);
    background-size: 1000px 100%;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 20px; }
`;

// -----------------------------------------------------------------------------
// CHILD COMPONENTS
// -----------------------------------------------------------------------------

const ImageCarousel = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    if (!images || images.length === 0) return null;
    return (
        <div className="relative group overflow-hidden rounded-[2rem] bg-black">
            <motion.img
                key={currentIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                src={images[currentIndex].startsWith('/') ? `http://localhost:4000${images[currentIndex]}` : images[currentIndex]}
                className="w-full h-auto max-h-[600px] object-contain"
                alt="Post content"
            />
            {images.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                    {images.map((_, i) => (
                        <div
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === currentIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const VoterAvatar = ({ voterId, users = [] }) => {
    const user = users.find(u => u._id === voterId);
    return (
        <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white overflow-hidden ring-1 ring-indigo-500/20">
            {user?.profileImage ? (
                <img src={user.profileImage} className="w-full h-full object-cover" alt="" />
            ) : (
                <span>{(user?.name || '?').charAt(0)}</span>
            )}
        </div>
    );
};

const ParticipantModal = ({ isOpen, onClose, userIds, users, isDarkMode }) => {
    if (!isOpen) return null;
    const participants = userIds.map(id => users.find(u => u._id === id)).filter(Boolean);
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                    className={`w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0A0D14] border border-white/5' : 'bg-white border border-slate-100'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black uppercase tracking-tight">Voters & Engagement</h3>
                            <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">{participants.length}</span>
                        </div>
                        <button onClick={onClose} className="p-3 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all"><X size={20} /></button>
                    </div>
                    <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                        {participants.length === 0 ? (
                            <div className="py-20 text-center opacity-20"><Users size={48} className="mx-auto mb-4" /><p className="font-black uppercase tracking-tighter text-xs">No Data Available</p></div>
                        ) : (
                            participants.map(p => (
                                <div key={p._id} className={`flex items-center justify-between p-4 rounded-[1.5rem] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-white hover:shadow-xl'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black">{p.name?.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight">{p.name}</p>
                                            <p className="text-[10px] font-black opacity-40 uppercase">{p.role}</p>
                                        </div>
                                    </div>
                                    <button className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Profile</button>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const VideoPlayer = ({ src }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const fullUrl = src.startsWith('/') ? `http://localhost:4000${src}` : src;

    const togglePlay = () => {
        if (isPlaying) videoRef.current.pause();
        else videoRef.current.play();
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="relative rounded-[2rem] overflow-hidden bg-black group aspect-video shadow-2xl ring-1 ring-white/10">
            <video
                ref={videoRef}
                src={fullUrl}
                loop muted={isMuted} playsInline
                className="w-full h-full object-cover"
                onClick={togglePlay}
            />
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-indigo-600/90 text-white flex items-center justify-center backdrop-blur-md shadow-2xl scale-110 group-hover:scale-125 transition-all">
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
                </button>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                <div className="h-1.5 flex-1 mx-4 bg-white/20 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} className="h-full bg-indigo-500" />
                </div>
                <button onClick={() => setIsMuted(!isMuted)} className="p-3 bg-black/40 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-all">
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
            </div>
        </div>
    );
};

// -----------------------------------------------------------------------------
// MAIN SOCIAL FEED COMPONENT
// -----------------------------------------------------------------------------

const SocialFeed = () => {
    const { isDarkMode } = useTheme();
    const { user, token } = useAuth();
    const chatServerUrl = import.meta.env.VITE_CHAT_SERVER_URL || "http://localhost:4000";

    // --- State ---
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [newPostContent, setNewPostContent] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [pollModal, setPollModal] = useState(false);
    const [pollData, setPollData] = useState({ question: '', options: ['', ''] });
    const [activeUsers, setActiveUsers] = useState([]);
    const [isVotersModalOpen, setIsVotersModalOpen] = useState(false);
    const [activeVoterIds, setActiveVoterIds] = useState([]);
    const [tagQuery, setTagQuery] = useState('');
    const [taggableUsers, setTaggableUsers] = useState([]);
    const [showTagResults, setShowTagResults] = useState(false);

    // --- Fetchers ---
    useEffect(() => {
        fetchPosts();
        fetchTaggableUsers();
        trackPresence();
        const interval = setInterval(() => { trackPresence(); fetchActivity(); }, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await axios.get(`${chatServerUrl}/api/posts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(res.data);
        } catch (err) { console.error('Fetch Posts Error', err); }
        finally { setLoading(false); }
    };

    const fetchTaggableUsers = async () => {
        try {
            const res = await axios.get(`${chatServerUrl}/api/posts/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTaggableUsers(res.data);
        } catch (e) { console.error('Taggable Users Error', e); }
    };

    const trackPresence = async () => {
        try {
            await axios.post(`${chatServerUrl}/api/posts/visit`, {
                name: user.username,
                role: user.user_type
            }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (e) { }
    };

    const fetchActivity = async () => {
        try {
            const res = await axios.get(`${chatServerUrl}/api/posts/activity`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveUsers(res.data);
        } catch (e) { }
    };

    // --- Actions ---
    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPostContent.trim() && selectedFiles.length === 0 && !pollData.question) return;
        setIsPosting(true);

        const formData = new FormData();
        formData.append('content', newPostContent);
        selectedFiles.forEach(file => formData.append('images', file));
        if (pollData.question) {
            formData.append('poll', JSON.stringify({
                question: pollData.question,
                options: pollData.options.filter(o => o.trim()).map(o => ({ text: o, votes: [] }))
            }));
        }

        try {
            await axios.post(`${chatServerUrl}/api/posts`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            setNewPostContent('');
            setSelectedFiles([]);
            setPollData({ question: '', options: ['', ''] });
            setPollModal(false);
            fetchPosts();
        } catch (err) { console.error('Create Post Error', err); }
        finally { setIsPosting(false); }
    };

    const handleLike = async (postId) => {
        try {
            const res = await axios.post(`${chatServerUrl}/api/posts/${postId}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(posts.map(p => p._id === postId ? res.data : p));
        } catch (e) { }
    };

    const handleVote = async (postId, optionId) => {
        try {
            const res = await axios.post(`${chatServerUrl}/api/posts/${postId}/vote`, { optionId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(posts.map(p => p._id === postId ? res.data : p));
        } catch (e) { }
    };

    const handleComment = async (postId, text) => {
        try {
            const res = await axios.post(`${chatServerUrl}/api/posts/${postId}/comment`, { text }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPosts(posts.map(p => p._id === postId ? res.data : p));
        } catch (e) { }
    };

    const handleViewDetail = async (postId) => {
        try {
            await axios.post(`${chatServerUrl}/api/posts/${postId}/view`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state if needed
        } catch (e) { }
    };

    const removeFile = (index) => setSelectedFiles(selectedFiles.filter((_, i) => i !== index));

    // -------------------------------------------------------------------------
    // RENDER HELPERS
    // -------------------------------------------------------------------------

    const PostCard = ({ post }) => {
        const [showComments, setShowComments] = useState(false);
        const [commentText, setCommentText] = useState('');
        const hasVoted = post.poll?.options?.some(o => o.votes.includes(String(user.user_id)));
        const totalVotes = post.poll?.options?.reduce((acc, curr) => acc + curr.votes.length, 0) || 0;
        const isLiked = post.likes.includes(String(user.user_id));

        return (
            <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                className={`group rounded-[1.5rem] shadow-xl overflow-hidden mb-8 border ${isDarkMode ? 'bg-[#0A0D14] border-white/5 hover:border-indigo-500/30' : 'bg-white border-slate-100 hover:border-indigo-500/10'} transition-all duration-700`}
            >
                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-lg relative z-10">
                                {post.author?.name?.charAt(0) || '?'}
                            </div>
                            <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur-lg opacity-20 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-base font-black uppercase tracking-tight">{post.author?.name}</h4>
                                <CheckCircle size={14} className="text-indigo-500" fill="currentColor" />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full">{post.author?.role}</span>
                                <span className="text-[10px] font-bold opacity-30 flex items-center gap-1.5 uppercase tracking-tighter"><Clock size={12} /> {new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <button className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}><MoreHorizontal size={22} /></button>
                </div>

                {/* Content */}
                <div className="px-8 py-6">
                    <p className={`text-lg font-bold leading-relaxed mb-8 whitespace-pre-wrap ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {post.content.split(' ').map((word, i) => word.startsWith('@') ? <span key={i} className="text-indigo-500 cursor-pointer hover:underline">{word} </span> : word + ' ')}
                    </p>

                    {post.images?.length > 0 && <ImageCarousel images={post.images} />}
                    {post.videos?.length > 0 && post.videos.map((vid, i) => <VideoPlayer key={i} src={vid} />)}

                    {/* Poll */}
                    {post.poll && post.poll.options.length > 0 && (
                        <div className={`mt-8 p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3 mb-6">
                                <BarChart2 className="text-indigo-500" />
                                <h5 className="text-sm font-black uppercase tracking-widest">{post.poll.question}</h5>
                            </div>
                            <div className="space-y-4">
                                {post.poll.options.map((opt) => {
                                    const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                                    const isSelected = opt.votes.includes(String(user.user_id));
                                    return (
                                        <div key={opt._id} className="relative">
                                            <button
                                                disabled={hasVoted}
                                                onClick={() => handleVote(post._id, opt._id)}
                                                className={`w-full p-5 rounded-2xl border relative z-10 flex items-center justify-between transition-all duration-500 overflow-hidden ${isSelected ? 'border-indigo-500 bg-indigo-500/10' : (isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-200 hover:bg-white')}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-indigo-500' : ''}`}>{opt.text}</span>
                                                    {isSelected && <CheckCircle size={16} className="text-indigo-500" />}
                                                </div>
                                                <span className={`text-xs font-black ${isSelected ? 'text-indigo-500' : 'opacity-40'}`}>{percentage}%</span>
                                                <motion.div
                                                    initial={{ width: 0 }} animate={{ width: `${percentage}%` }}
                                                    className={`absolute left-0 top-0 bottom-0 opacity-10 ${isSelected ? 'bg-indigo-500' : (isDarkMode ? 'bg-white' : 'bg-indigo-500')}`}
                                                />
                                            </button>
                                            {opt.votes.length > 0 && (
                                                <div
                                                    className="absolute -right-2 -top-2 flex -space-x-2 z-20 cursor-pointer"
                                                    onClick={() => { setActiveVoterIds(opt.votes); setIsVotersModalOpen(true); }}
                                                >
                                                    {opt.votes.slice(0, 3).map(vid => (
                                                        <VoterAvatar key={vid} voterId={vid} users={taggableUsers} />
                                                    ))}
                                                    {opt.votes.length > 3 && (
                                                        <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[7px] font-black text-white">+ {opt.votes.length - 3}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-6 flex items-center justify-between px-2">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-30">{totalVotes} Total Votes</p>
                                {hasVoted && <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5"><Shield size={10} /> Vote Recorded</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-8 pb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleLike(post._id)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isLiked ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' : (isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-indigo-500 hover:text-white')}`}
                        >
                            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                            {post.likes?.length || 0} Likes
                        </button>
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-indigo-500 hover:text-white'}`}
                        >
                            <MessageCircle size={16} />
                            {post.comments?.length || 0}
                        </button>
                        <button className={`p-3 rounded-2xl ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-indigo-500 hover:text-white'}`}><Share2 size={16} /></button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {post.views?.slice(0, 3).map(vid => <VoterAvatar key={vid} voterId={vid} users={taggableUsers} />)}
                        </div>
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">{post.views?.length || 0} Views</span>
                    </div>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                    {showComments && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className={`px-8 pb-8 ${isDarkMode ? 'bg-black/20' : 'bg-slate-50/50'} border-t border-white/5`}
                        >
                            <div className="pt-8 space-y-6 max-h-96 overflow-y-auto custom-scrollbar mb-8 pr-4">
                                {post.comments?.map((c, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex-none flex items-center justify-center font-black text-white text-xs">{c.user.name.charAt(0)}</div>
                                        <div className={`p-4 rounded-[1.5rem] flex-1 ${isDarkMode ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="text-[10px] font-black uppercase tracking-tight">{c.user.name}</h5>
                                                <span className="text-[8px] font-bold opacity-30">{new Date(c.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-xs font-medium opacity-80">{c.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Add a comment..."
                                    onKeyDown={(e) => e.key === 'Enter' && commentText.trim() && (handleComment(post._id, commentText), setCommentText(''))}
                                    className={`w-full pl-6 pr-16 py-4 rounded-[1.5rem] text-xs font-bold outline-none border transition-all ${isDarkMode ? 'bg-black/40 border-white/5 focus:ring-2 focus:ring-indigo-500/20' : 'bg-white border-slate-200 focus:ring-4 focus:ring-indigo-500/10'}`}
                                />
                                <button
                                    onClick={() => { if (commentText.trim()) { handleComment(post._id, commentText); setCommentText(''); } }}
                                    className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                >
                                    Post
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    const ProfileCard = () => (
        <div className={`p-8 rounded-[1.5rem] border shadow-xl relative overflow-hidden mb-8 ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
            <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={120} /></div>
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-[1.8rem] bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-xl relative z-10">{user.username.charAt(0)}</div>
                    <div className="absolute inset-0 bg-indigo-500 rounded-[1.8rem] blur-xl opacity-20 animation-pulse" />
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-emerald-500 border-4 border-white dark:border-[#10141D] flex items-center justify-center text-white"><CheckCircle size={12} fill="currentColor" /></div>
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight mb-1 w-full truncate px-4">{user.username}</h3>
                <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-8">{user.user_type}</p>

                <div className="grid grid-cols-3 w-full gap-4 mb-8">
                    <div className="text-center"><p className="text-lg font-black">{posts.filter(p => p.author?.id === String(user.user_id)).length}</p><p className="text-[8px] font-black opacity-30 uppercase tracking-widest">Posts</p></div>
                    <div className="text-center"><p className="text-lg font-black">2.4k</p><p className="text-[8px] font-black opacity-30 uppercase tracking-widest">Followers</p></div>
                    <div className="text-center"><p className="text-lg font-black">842</p><p className="text-[8px] font-black opacity-30 uppercase tracking-widest">Impact</p></div>
                </div>

                <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all">My Digital Profile</button>
            </div>
        </div>
    );

    const SocialActivity = () => {
        const sortedVisitors = [...activeUsers].sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));
        return (
            <div className={`p-8 rounded-[1.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black uppercase tracking-tight">Active Pulse</h3>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                </div>
                <div className="space-y-6">
                    {sortedVisitors.slice(0, 5).map((u, i) => (
                        <div key={i} className="flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">{u.name.charAt(0)}</div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tight">{u.name}</p>
                                    <p className="text-[9px] font-bold opacity-30 uppercase">{u.role}</p>
                                </div>
                            </div>
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Online</span>
                        </div>
                    ))}
                    {sortedVisitors.length === 0 && <p className="text-center py-4 text-[10px] font-black opacity-20 uppercase tracking-widest">No recent spikes detected</p>}
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#0B0F15] text-white' : 'bg-[#F8FAFC] text-slate-900'} transition-colors duration-700 custom-scrollbar overflow-y-auto px-4 py-8 md:px-10`}>
            <style>{styles}</style>

            <div className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-4">
                        <Compass className="text-indigo-600" size={32} />
                        Nexus Hub
                    </h1>
                    <p className="text-sm font-bold opacity-40 uppercase tracking-widest mt-1">Discovery & Global Collaboration</p>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* Left Sidebar: Profile & Community Index */}
                <div className="hidden lg:block lg:col-span-3 space-y-8 h-fit sticky top-8">
                    <ProfileCard />
                    <SocialActivity />
                </div>

                {/* Main Feed */}
                <div className="lg:col-span-6 space-y-8 pb-20">

                    {/* Create Post Hub */}
                    <div className={`p-8 rounded-[1.5rem] shadow-xl border ${isDarkMode ? 'bg-[#0A0D14] border-white/5' : 'bg-white border-slate-100'}`}>
                        <div className="flex items-start gap-6 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white flex-none shadow-lg">{user.username.charAt(0)}</div>
                            <textarea
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="Broadcast your breakthrough..."
                                className={`w-full bg-transparent border-none outline-none text-base font-bold resize-none min-h-[100px] pt-4 ${isDarkMode ? 'placeholder:text-white/10' : 'placeholder:text-slate-300'}`}
                            />
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                {selectedFiles.map((file, i) => (
                                    <div key={i} className="relative group aspect-square rounded-[1.5rem] overflow-hidden shadow-xl ring-1 ring-white/10">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                                        <button onClick={() => removeFile(i)} className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-xl shadow-2xl scale-0 group-hover:scale-100 transition-all"><X size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                            <div className="flex items-center gap-1">
                                <label className={`p-3 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all group relative`}>
                                    <ImageIcon size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                    <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)])} />
                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest shadow-xl">Media</span>
                                </label>
                                <button onClick={() => setPollModal(true)} className={`p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group relative`}>
                                    <BarChart2 size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest shadow-xl">Poll</span>
                                </button>
                                <button className={`p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group relative`}>
                                    <Hash size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                            <button
                                onClick={handleCreatePost}
                                disabled={isPosting || (!newPostContent.trim() && selectedFiles.length === 0)}
                                className="px-12 py-4 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all flex items-center gap-3"
                            >
                                {isPosting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                {isPosting ? 'Broadcasting...' : 'Broadcast'}
                            </button>
                        </div>
                    </div>

                    {/* Feed Display */}
                    <div className="space-y-12">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center opacity-20">
                                <Loader2 size={48} className="animate-spin text-indigo-500 mb-6" />
                                <p className="text-xs font-black uppercase tracking-[0.5em]">Syncing Feed...</p>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="py-32 text-center opacity-20">
                                <Zap size={64} className="mx-auto mb-8" />
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Silence in the Nexus</h3>
                                <p className="text-xs font-bold uppercase tracking-widest mt-2">Broadcast the first breakthrough</p>
                            </div>
                        ) : (
                            posts.map(post => <PostCard key={post._id} post={post} />)
                        )}
                    </div>
                </div>

                {/* Right Sidebar: Trends & Docs */}
                <div className="hidden lg:block lg:col-span-3 space-y-8 h-fit sticky top-8">
                    <div className={`p-8 rounded-[1.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                        <div className="flex items-center gap-3 mb-8">
                            <TrendingUp className="text-indigo-500" />
                            <h3 className="text-lg font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Nexus Trends</h3>
                        </div>
                        <div className="space-y-4">
                            {['#QuantumPhysis', '#JEE2026', '#AI_Research', '#FutureScholars', '#ScholarLab'].map((tag, i) => (
                                <div key={i} className={`flex items-center justify-between group cursor-pointer p-3 rounded-2xl transition-all ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <Hash size={14} className="text-indigo-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                                            <span className="text-sm font-black uppercase tracking-tight group-hover:text-indigo-500 transition-colors">{tag.replace('#', '')}</span>
                                        </div>
                                        <span className="text-[9px] font-black opacity-30 uppercase tracking-widest ml-6">{(8.3 - (i * 1.2)).toFixed(1)}k Interactions</span>
                                    </div>
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-500" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <PdfDocumentHub isDarkMode={isDarkMode} />
                </div>
            </div>

            {/* Poll Creation Modal */}
            <AnimatePresence>
                {pollModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className={`w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0A0D14] border border-white/5' : 'bg-white border border-slate-100'}`}>
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-xl font-black uppercase tracking-tight">Create Decision Poll</h3>
                                <button onClick={() => setPollModal(false)} className="p-3 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all"><X size={20} /></button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block">Question</label>
                                    <input value={pollData.question} onChange={e => setPollData({ ...pollData, question: e.target.value })} placeholder="What's your query?" className={`w-full p-5 rounded-2xl outline-none font-bold ${isDarkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-slate-50 focus:bg-white border border-slate-200'}`} />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 block">Options</label>
                                    {pollData.options.map((opt, i) => (
                                        <div key={i} className="flex gap-3">
                                            <input value={opt} onChange={e => { const newOpts = [...pollData.options]; newOpts[i] = e.target.value; setPollData({ ...pollData, options: newOpts }); }} placeholder={`Option ${i + 1}`} className={`flex-1 p-5 rounded-2xl outline-none font-bold ${isDarkMode ? 'bg-white/5 focus:bg-white/10' : 'bg-slate-50 focus:bg-white border border-slate-200'}`} />
                                            {pollData.options.length > 2 && <button onClick={() => setPollData({ ...pollData, options: pollData.options.filter((_, idx) => idx !== i) })} className="p-5 rounded-2xl bg-red-500/10 text-red-500"><Trash2 size={20} /></button>}
                                        </div>
                                    ))}
                                    <button onClick={() => setPollData({ ...pollData, options: [...pollData.options, ''] })} className="w-full py-4 border-2 border-dashed border-indigo-500/20 text-indigo-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-500/5 transition-all">+ Add Option</button>
                                </div>
                                <button onClick={() => setPollModal(false)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20">Finalize Poll</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voter Modal Integration */}
            <ParticipantModal
                isOpen={isVotersModalOpen}
                onClose={() => setIsVotersModalOpen(false)}
                userIds={activeVoterIds}
                users={taggableUsers}
                isDarkMode={isDarkMode}
            />
        </div>
    );
};

export default SocialFeed;
