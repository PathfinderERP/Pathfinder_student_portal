import React, { useState, useEffect } from 'react';
import { UserPlus, Gift, CheckCircle, Clock, Plus, Search, Filter, Phone, Mail, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const ReferralsCollectedTab = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        referred_by: '',
        referral_source: 'Student',
        referred_person: '',
        phone: '',
        email: '',
        interested_course: 'Class 11 Engineering 2-Year Program',
        referral_date: new Date().toISOString().split('T')[0],
        follow_up_status: 'New Referral',
        conversion_status: 'In Progress'
    });

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/referrals/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setReferrals(res.data.data);
            }
        } catch (err) {
            console.error("Referrals fetch error:", err);
            setReferrals([
                { id: 1, referred_by: "Aarav Ganguly (Student)", referral_source: "Student", referred_person: "Vikram Ganguly", phone: "+91 98765 43210", email: "vikram.g@gmail.com", interested_course: "Class 11 Engineering 2-Year Program", referral_date: "2026-08-01", follow_up_status: "Counseled", conversion_status: "Admitted", reward_points: 500 },
                { id: 2, referred_by: "Dr. Rajesh Sharma (Teacher)", referral_source: "Teacher", referred_person: "Debasmita Paul", phone: "+91 98300 12345", email: "debasmita.p@gmail.com", interested_course: "Repeater Medical Batch", referral_date: "2026-08-05", follow_up_status: "Demo Class Scheduled", conversion_status: "In Progress", reward_points: 0 }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, []);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const newRef = {
            id: Date.now(),
            ...formData,
            reward_points: 0
        };
        setReferrals([newRef, ...referrals]);
        setIsAddModalOpen(false);
        setFormData({
            referred_by: '',
            referral_source: 'Student',
            referred_person: '',
            phone: '',
            email: '',
            interested_course: 'Class 11 Engineering 2-Year Program',
            referral_date: new Date().toISOString().split('T')[0],
            follow_up_status: 'New Referral',
            conversion_status: 'In Progress'
        });
    };

    const filteredReferrals = referrals.filter(r =>
        r.referred_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referred_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.interested_course.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPoints = referrals.reduce((sum, r) => sum + (r.reward_points || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Gift className="text-amber-400" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">Referrals Collected</h2>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Track student, parent, and teacher referrals, follow-up status, admission conversions, and referral rewards.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-all shadow-lg shadow-amber-500/20"
                    >
                        <Plus size={16} />
                        <span>Log New Referral</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Referrals Collected</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{referrals.length}</span>
                        <UserPlus className={isDarkMode ? 'text-cyan-400/80' : 'text-cyan-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Admitted / Converted</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            {referrals.filter(r => r.conversion_status === 'Admitted').length}
                        </span>
                        <CheckCircle className={isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Reward Points Earned</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{totalPoints} pts</span>
                        <Award className={isDarkMode ? 'text-amber-400/80' : 'text-amber-600/80'} size={24} />
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    placeholder="Search by referred person name, referrer, or course..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                        isDarkMode
                            ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500'
                            : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-amber-500'
                    }`}
                />
            </div>

            {/* Referrals List Table */}
            <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'} shadow-xl`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className={`border-b font-extrabold uppercase tracking-wider text-[11px] ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                <th className="p-4">Referred Person</th>
                                <th className="p-4">Referred By & Source</th>
                                <th className="p-4">Interested Course</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Follow-up Status</th>
                                <th className="p-4">Conversion Status</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {filteredReferrals.map(r => (
                                <tr key={r.id} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}>
                                    <td className="p-4">
                                        <p className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{r.referred_person}</p>
                                        <p className={`text-[11px] font-mono flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <Phone size={10} /> {r.phone}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <p className={`font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{r.referred_by}</p>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                                            {r.referral_source}
                                        </span>
                                    </td>
                                    <td className={`p-4 font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{r.interested_course}</td>
                                    <td className={`p-4 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{r.referral_date}</td>
                                    <td className={`p-4 font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{r.follow_up_status}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            r.conversion_status === 'Admitted'
                                                ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                                : (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200')
                                        }`}>
                                            {r.conversion_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`w-full max-w-lg p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} space-y-4 shadow-2xl`}>
                        <h3 className="text-xl font-black">Log Referral</h3>
                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Referred By (Name)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.referred_by}
                                        onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Referral Source</label>
                                    <select
                                        value={formData.referral_source}
                                        onChange={(e) => setFormData({ ...formData, referral_source: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    >
                                        <option value="Student">Student</option>
                                        <option value="Parent">Parent</option>
                                        <option value="Teacher">Teacher</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Referred Person Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.referred_person}
                                    onChange={(e) => setFormData({ ...formData, referred_person: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Phone Number</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Interested Course</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.interested_course}
                                        onChange={(e) => setFormData({ ...formData, interested_course: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div className={`flex items-center justify-end gap-3 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className={`px-4 py-2 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600"
                                >
                                    Submit Referral
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReferralsCollectedTab;
