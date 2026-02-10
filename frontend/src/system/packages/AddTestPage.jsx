import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RefreshCcw } from 'lucide-react';
import TestManagement from './TestManagement';

/**
 * AddTestPage Component
 * Manages the flow: Package List (SS1) -> Test Management (SS2)
 */
const AddTestPage = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);

    const fetchPackages = useCallback(async () => {
        try {
            setLoading(true);
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            const response = await axios.get(`${apiUrl}/api/packages/`, config);
            setPackages(response.data);
        } catch (err) {
            console.error("Failed to fetch packages", err);
        } finally {
            setLoading(false);
        }
    }, [getApiUrl, token]);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    const togglePackageStatus = async (pkg) => {
        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` } };
            await axios.patch(`${apiUrl}/api/packages/${pkg._id}/`, { is_completed: !pkg.is_completed }, config);
            fetchPackages();
        } catch (err) {
            console.error("Failed to toggle status", err);
        }
    };

    if (selectedPackage) {
        return (
            <TestManagement
                packageData={selectedPackage}
                onBack={() => setSelectedPackage(null)}
            />
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className={`p-8 rounded-[5px] border shadow-xl transition-all ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold tracking-tight">All Packages</h2>
                    <button onClick={fetchPackages} className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${loading ? 'animate-spin' : ''}`}>
                        <RefreshCcw size={20} className="text-blue-500" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`text-xs font-bold uppercase tracking-wider border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100/60'}`}>
                                <th className="pb-4 px-4 w-12 text-center">#</th>
                                <th className="pb-4 px-4">Name</th>
                                <th className="pb-4 px-4 text-center">Code</th>
                                <th className="pb-4 px-4 text-center">Exam Type</th>
                                <th className="pb-4 px-4 text-center">Completed</th>
                                <th className="pb-4 px-4 text-center">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-transparent">
                            {packages.map((pkg, index) => (
                                <tr key={pkg._id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}`}>
                                    <td className="py-5 px-4 text-sm font-bold opacity-40 text-center">{index + 1}</td>
                                    <td className="py-5 px-4 text-sm font-black">{pkg.name}</td>
                                    <td className="py-5 px-4 text-sm font-bold opacity-70 text-center">{pkg.code}</td>
                                    <td className="py-5 px-4 text-sm font-bold opacity-70 text-center">{pkg.exam_type_details?.id || pkg.exam_type || 'N/A'}</td>
                                    <td className="py-5 px-4">
                                        <div className="flex justify-center">
                                            <button onClick={() => togglePackageStatus(pkg)} className="active:scale-90 transition-transform">
                                                <div className={`w-11 h-5 rounded-full p-1 transition-all ${pkg.is_completed ? 'bg-red-400' : 'bg-red-200 opacity-50'}`}>
                                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${pkg.is_completed ? 'translate-x-[24px]' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-5 px-4 text-center">
                                        <button
                                            onClick={() => setSelectedPackage(pkg)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-[5px] text-xs font-black shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-wider"
                                        >
                                            Manage Test
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AddTestPage;
