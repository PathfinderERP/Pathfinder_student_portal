import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Mail, Lock, Briefcase, AlertCircle } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
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
            await axios.post('http://127.0.0.1:3001/api/register/', formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-purple-100">Join Pathfinder Portal</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-lg mb-6 flex items-center gap-2">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-purple-100 ml-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200" size={18} />
                            <input
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-purple-300/30 rounded-xl px-10 py-2.5 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                                placeholder="Username"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-purple-100 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200" size={18} />
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-purple-300/30 rounded-xl px-10 py-2.5 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                                placeholder="Email address"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-purple-100 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200" size={18} />
                            <input
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-purple-300/30 rounded-xl px-10 py-2.5 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
                                placeholder="Create password"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-purple-100 ml-1">Role</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200" size={18} />
                            <select
                                name="user_type"
                                value={formData.user_type}
                                onChange={handleChange}
                                className="w-full bg-white/5 border border-purple-300/30 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition appearance-none [&>option]:text-black"
                            >
                                <option value="student">Student</option>
                                <option value="parent">Parent</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-4 bg-white text-purple-600 hover:bg-purple-50 font-bold py-3 rounded-xl shadow-lg transform transition hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Register</span>
                                <UserPlus size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-purple-200 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-white hover:underline font-medium">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
