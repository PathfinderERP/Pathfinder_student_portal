import React from 'react';
import { Users, Search, Filter, Mail, Phone, ChevronRight } from 'lucide-react';

const TeacherStudents = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/5 p-8 rounded-3xl border border-white/10">
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Active Students</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Total 124 Registered in your batches</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search student..."
                        className="bg-black/20 border border-white/10 rounded-xl px-12 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 min-w-[300px]"
                    />
                </div>
                <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                    <Filter size={18} />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="group bg-white/5 border border-white/10 p-6 rounded-3xl hover:bg-white/[0.08] transition-all cursor-pointer relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center font-black text-orange-500 text-xl">
                            {String.fromCharCode(64 + i)}
                        </div>
                        <div>
                            <h4 className="font-black text-white uppercase tracking-tight">Student Name {i}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">NEET Batch A • {i}0293</p>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-4 border-t border-white/5 pt-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                            <Mail size={12} /> Email
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                            <Phone size={12} /> Contact
                        </div>
                        <ChevronRight className="ml-auto text-slate-600 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" size={20} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default TeacherStudents;
