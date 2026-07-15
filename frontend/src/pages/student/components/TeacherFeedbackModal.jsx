import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getBaseApiUrl } from '../../../services/apiConfig';

const FEEDBACK_QUESTIONS = [
    "Explains concepts clearly and uses real-world examples to improve understanding.",
    "Maintains excellent classroom discipline and encourages student participation.",
    "Always well-prepared and delivers structured, easy-to-follow lessons.",
    "Provides timely feedback and supports students beyond classroom hours.",
    "Demonstrates strong subject knowledge and effective teaching methodologies.",
    "Creates a positive learning environment that motivates students to perform better.",
    "Uses interactive teaching methods and digital tools effectively.",
    "Regularly tracks student progress and addresses learning gaps proactively.",
    "Encourages critical thinking and problem-solving skills among students.",
    "Shows professionalism, punctuality, and dedication towards student success."
];

const OPTIONS = ['EXCELLENT', 'GOOD', 'AVERAGE', 'BAD'];

const TeacherFeedbackModal = ({ isOpen, onClose, classRecord, isDarkMode, onSubmit }) => {
    const [responses, setResponses] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleOptionSelect = (qIndex, option) => {
        setResponses(prev => ({
            ...prev,
            [qIndex]: option
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('auth_token');
            const apiUrl = getBaseApiUrl();
            
            const payload = {
                teacher_id: classRecord?.teacherId?._id || classRecord?.teacherId || '',
                teacher_name: classRecord?.teacherId?.name || classRecord?.teacherName || 'Unknown',
                subject: classRecord?.subjectId?.subjectName || classRecord?.subjectName || classRecord?.subject || 'Unknown',
                date_of_class: (classRecord?.date || classRecord?.classScheduleId?.date) 
                    ? new Date(classRecord?.date || classRecord?.classScheduleId?.date).toISOString().split('T')[0] 
                    : new Date().toISOString().split('T')[0],
                responses: responses,
                centre_code: classRecord?.centre_code || ''
            };

            const response = await fetch(`${apiUrl}/api/class-feedback/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to submit feedback');

            onSubmit(responses);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
            onClose();
        }
    };

    const isComplete = Object.keys(responses).length === FEEDBACK_QUESTIONS.length;

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`relative w-full max-w-3xl flex flex-col max-h-[90vh] rounded-xl shadow-2xl overflow-hidden
                            ${isDarkMode ? 'bg-[#10141D] border border-white/10' : 'bg-white border border-slate-200'}`}
                    >
                        {/* Header */}
                        <div className={`shrink-0 px-6 py-5 flex items-center justify-between border-b
                            ${isDarkMode ? 'border-white/10 bg-[#161B26]' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 rounded-full bg-indigo-500"></div>
                                <div>
                                    <h2 className={`text-lg font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        Teacher Performance Feedback
                                    </h2>
                                    {classRecord && (
                                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                                            {classRecord.teacherId?.name || classRecord.teacherName || 'Assigned Staff'} • {classRecord.subjectId?.subjectName || classRecord.subjectName || classRecord.subject || 'Subject'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {FEEDBACK_QUESTIONS.map((question, idx) => (
                                <div
                                    key={idx}
                                    className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}
                                >
                                    <div className="flex gap-4">
                                        <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 text-xs font-black">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-semibold mb-5 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                                {question}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {OPTIONS.map(opt => {
                                                    const isSelected = responses[idx] === opt;
                                                    let selectedClass = '';
                                                    if (isSelected) {
                                                        selectedClass = opt === 'BAD' || opt === 'AVERAGE' 
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                                            : 'bg-blue-600 text-white border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'; // Based on screenshot, all selected are blue
                                                    } else {
                                                        selectedClass = isDarkMode 
                                                            ? 'bg-transparent text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-300' 
                                                            : 'bg-transparent text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700';
                                                    }

                                                    return (
                                                        <button
                                                            key={opt}
                                                            onClick={() => handleOptionSelect(idx, opt)}
                                                            className={`px-5 py-2 rounded-md border text-[10px] font-black uppercase tracking-widest transition-all
                                                                ${selectedClass}`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className={`shrink-0 p-6 flex items-center justify-between gap-4 border-t
                            ${isDarkMode ? 'border-white/10 bg-[#161B26]' : 'border-slate-100 bg-slate-50'}`}>
                            <button
                                onClick={onClose}
                                className={`px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-colors
                                    ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`flex-1 max-w-sm px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all
                                    ${isSubmitting || !isComplete
                                        ? 'bg-[#8b5cf6]/50 text-white/50 cursor-not-allowed'
                                        : 'bg-[#9d00ff] hover:bg-[#b033ff] text-white shadow-[0_0_20px_rgba(157,0,255,0.4)] active:scale-95'
                                    }`}
                            >
                                {isSubmitting ? 'Saving...' : 'Save All Feedback'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default TeacherFeedbackModal;
