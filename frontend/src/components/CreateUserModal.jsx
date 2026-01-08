import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus, User, Mail, Lock, Briefcase, AlertCircle, X } from 'lucide-react';

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        user_type: 'student'
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // Include token since we restricted this endpoint to admins
            await axios.post('http://127.0.0.1:3001/api/register/', formData);
            if (onSuccess) onSuccess();
            onClose();
            setFormData({ username: '', email: '', password: '', user_type: 'student' });
        } catch (err) {
            setError(err.response?.data?.detail || 'Creation failed.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6">Add New User</h2>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-lg mb-6 flex items-center gap-2">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 ml-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="Username"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="Email address"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="Create password"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 ml-1">Role</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                name="user_type"
                                value={formData.user_type}
                                onChange={handleChange}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none [&>option]:text-black"
                            >
                                <option value="student">Student</option>
                                <option value="parent">Parent</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg transform transition hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Create User</span>
                                <UserPlus size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateUserModal;
