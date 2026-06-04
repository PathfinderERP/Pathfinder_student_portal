import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Select from 'react-select';
import { useAuth } from '../../../context/AuthContext';
import { 
    Brain, Target, GraduationCap, ChevronLeft, ChevronRight, Activity, 
    CheckCircle2, BookOpen, Calculator, Sparkles, Loader2, ArrowRight, 
    X, ShieldCheck, HeartPulse, User, School, Trophy, Timer, AlertCircle
} from 'lucide-react';

const getSections = () => {
    return [
        {
            title: "Basic Info",
            questions: [
                { id: "basic_name", text: "Name", type: "text", required: true },
                { id: "basic_number", text: "Number", type: "text", required: true },
                { id: "basic_class", text: "Class", type: "text", required: true },
                { id: "basic_school", text: "School", type: "text", required: true },
                { id: "basic_center", text: "Center", type: "select", required: true },
                { id: "basic_career", text: "Dream career (if any)", type: "text", required: false }
            ]
        },
        {
            title: "How You Study",
            questions: [
                { 
                    id: "q1", 
                    text: "When you sit to study, what usually happens?", 
                    type: "radio", 
                    required: true,
                    options: ["I focus easily", "I get distracted after some time", "I struggle to even start", "Depends on the subject"] 
                },
                { 
                    id: "q2", 
                    text: "Which way helps you understand best?", 
                    type: "radio", 
                    required: true,
                    options: ["Teacher explaining", "Solving questions", "Watching videos", "Reading notes"] 
                },
                { 
                    id: "q3", 
                    text: "How often do you revise what you study?", 
                    type: "radio", 
                    required: true,
                    options: ["Daily", "Sometimes", "Rarely"] 
                },
                { 
                    id: "q4", 
                    text: "What is your biggest problem while studying?", 
                    type: "radio", 
                    required: true,
                    options: ["I get distracted", "I don’t understand concepts", "I feel lazy", "I forget what I study", "I get stressed"] 
                }
            ]
        },
        {
            title: "Focus & Discipline",
            questions: [
                { 
                    id: "q5", 
                    text: "How long can you study without checking your phone?", 
                    type: "radio", 
                    required: true,
                    options: ["Less than 20 minutes", "20–40 minutes", "40–60 minutes", "More than 1 hour"] 
                },
                { 
                    id: "q6", 
                    text: "Do you follow a study plan or timetable?", 
                    type: "radio", 
                    required: true,
                    options: ["Yes, strictly", "Sometimes", "No"] 
                },
                { 
                    id: "q7", 
                    text: "How regular are you with homework?", 
                    type: "radio", 
                    required: true,
                    options: ["Always on time", "Mostly on time", "Sometimes late", "Often skip"] 
                }
            ]
        },
        {
            title: "Confidence & Mindset",
            questions: [
                { 
                    id: "q8", 
                    text: "How confident are you in your studies?", 
                    type: "radio", 
                    required: true,
                    options: ["Very confident", "Somewhat confident", "Not confident"] 
                },
                { 
                    id: "q9", 
                    text: "What do you feel when exams are near?", 
                    type: "radio", 
                    required: true,
                    options: ["Excited", "Nervous", "Very stressed", "I avoid thinking about it"] 
                },
                { 
                    id: "q10", 
                    text: "What do you do when you get low marks?", 
                    type: "radio", 
                    required: true,
                    options: ["Work harder", "Feel bad but try again", "Lose motivation", "Ignore it"] 
                }
            ]
        },
        {
            title: "Subject & Difficulty",
            questions: [
                { id: "q11", text: "Which subjects do you find difficult?", type: "textarea", required: true },
                { 
                    id: "q12", 
                    text: "Why do you think those subjects are difficult?", 
                    type: "radio", 
                    required: true,
                    options: ["Concepts are hard", "Teaching is not clear", "I don’t practice enough", "I lose interest"] 
                }
            ]
        },
        {
            title: "Motivation & Goals",
            questions: [
                { 
                    id: "q13", 
                    text: "Why do you study?", 
                    type: "radio", 
                    required: true,
                    options: ["To achieve my dream", "For good marks", "Because parents tell me", "I am not sure"] 
                },
                { 
                    id: "q14", 
                    text: "How clear are you about your future?", 
                    type: "radio", 
                    required: true,
                    options: ["Very clear", "Some idea", "No idea"] 
                }
            ]
        },
        {
            title: "Stress & Pressure",
            questions: [
                { 
                    id: "q15", 
                    text: "Do you feel pressure from studies?", 
                    type: "radio", 
                    required: true,
                    options: ["A lot", "Sometimes", "Very little"] 
                },
                { 
                    id: "q16", 
                    text: "What stresses you the most?", 
                    type: "radio", 
                    required: true,
                    options: ["Exams", "Expectations", "Not understanding", "Managing time"] 
                }
            ]
        },
        {
            title: "Learning Support",
            questions: [
                { 
                    id: "q17", 
                    text: "What kind of help do you think you need?", 
                    type: "radio", 
                    required: true,
                    options: ["Better explanation", "More practice", "Motivation", "Study plan", "Doubt solving"] 
                },
                { 
                    id: "q18", 
                    text: "Would you like a system that tells you how to study better, where you are going wrong, and how to improve step-by-step?", 
                    type: "radio", 
                    required: true,
                    options: ["Yes", "Maybe", "No"] 
                }
            ]
        },
        {
            title: "Digital Learning",
            questions: [
                { 
                    id: "q19", 
                    text: "Do you like learning through:", 
                    type: "radio", 
                    required: true,
                    options: ["Live classes", "Recorded videos", "Tests & quizzes", "Apps/portals"] 
                },
                { 
                    id: "q20", 
                    text: "Would you prefer studying in your own language (e.g., Bengali) for better understanding?", 
                    type: "radio", 
                    required: true,
                    options: ["Yes", "No", "Depends"] 
                }
            ]
        },
        {
            title: "Final Reflection",
            questions: [
                { id: "q21", text: "If you could improve one thing about your studies, what would it be?", type: "textarea", required: true }
            ]
        }
    ];
};

const StudentPsychometricForm = ({ isDarkMode, onSubmit, onCancel, studentData }) => {
    const SECTIONS = getSections();
    const { getApiUrl, token } = useAuth();
    
    const [currentSection, setCurrentSection] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showError, setShowError] = useState(false);
    const [centres, setCentres] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        const fetchCentres = async () => {
            if (!token) return;
            try {
                const response = await axios.get(`${getApiUrl()}/api/admin/erp-centres/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const fetchedData = response.data || [];
                const formatted = fetchedData.map(c => ({
                    value: c.enterCode || c.centreName || c.name,
                    label: c.centreName || c.name || 'Unknown Center'
                }));
                setCentres(formatted);
            } catch (error) {
                console.error("Failed to fetch centres", error);
            }
        };
        fetchCentres();
    }, [token, getApiUrl]);

    const handleInputChange = (id, value) => {
        setAnswers(prev => ({ ...prev, [id]: value }));
        setShowError(false);
    };

    const nextSection = () => {
        if (isSubmitting) return;
        const section = SECTIONS[currentSection];
        const unansweredRequired = section.questions.filter(q => q.required && !answers[q.id]);
        
        if (unansweredRequired.length > 0) {
            setShowError(true);
            return;
        }

        if (currentSection < SECTIONS.length - 1) {
            setCurrentSection(prev => prev + 1);
            setShowError(false);
        } else {
            handleFinalSubmit();
        }
    };

    const prevSection = () => {
        if (isSubmitting) return;
        if (currentSection > 0) {
            setCurrentSection(prev => prev - 1);
        }
    };

    const classifyStudent = () => {
        let scores = {
            distracted: 0,
            confused: 0,
            lowConfidence: 0,
            highPotential: 0
        };

        if (answers.q1 === "I focus easily") scores.highPotential += 2;
        if (answers.q1 === "I get distracted after some time") scores.distracted += 1;
        if (answers.q1 === "I struggle to even start") scores.distracted += 2;

        if (answers.q4 === "I get distracted") scores.distracted += 2;
        if (answers.q4 === "I don’t understand concepts") scores.confused += 2;
        if (answers.q4 === "I feel lazy") scores.distracted += 1;
        if (answers.q4 === "I get stressed") scores.lowConfidence += 1;

        if (answers.q5 === "Less than 20 minutes") scores.distracted += 2;
        if (answers.q5 === "More than 1 hour") scores.highPotential += 2;

        if (answers.q8 === "Very confident") scores.highPotential += 2;
        if (answers.q8 === "Not confident") scores.lowConfidence += 2;

        if (answers.q9 === "Very stressed") scores.lowConfidence += 2;
        if (answers.q9 === "Excited") scores.highPotential += 1;

        const maxScore = Math.max(scores.distracted, scores.confused, scores.lowConfidence, scores.highPotential);
        
        if (maxScore === scores.highPotential) return "High Potential Performer";
        if (maxScore === scores.distracted) return "Distracted Learner";
        if (maxScore === scores.confused) return "Hardworking but Confused";
        if (maxScore === scores.lowConfidence) return "Low Confidence Student";
        
        return "High Potential Performer";
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        try {
            const classification = classifyStudent();
            
            let traits = [];
            let summary = "";

            switch (classification) {
                case "High Potential Performer":
                    traits = ["Strong Focus", "Analytical Thinking", "Strategic Planner", "Self-Motivated"];
                    summary = "Displays a high level of academic discipline and focus. Capable of handling complex concepts and maintaining a consistent study schedule.";
                    break;
                case "Distracted Learner":
                    traits = ["Short Attention Span", "Impulsive", "Digital Native", "Creative Thinker"];
                    summary = "Highly creative but struggles with sustained focus. Needs structured environment and micro-goal setting to stay on track.";
                    break;
                case "Hardworking but Confused":
                    traits = ["Diligent", "Rote Learner", "Anxious", "Persistent"];
                    summary = "Puts in significant effort but lacks conceptual clarity. Needs focus on foundational principles and application-based learning.";
                    break;
                case "Low Confidence Student":
                    traits = ["Self-Critical", "Reserved", "Fear of Failure", "Observational"];
                    summary = "Academic potential is often masked by anxiety and low self-esteem. Needs positive reinforcement and incremental confidence building.";
                    break;
                default:
                    traits = ["General Learner"];
                    summary = "Standard cognitive profile with balanced learning attributes.";
            }

            await onSubmit({ 
                classification, 
                traits, 
                summary, 
                raw_responses: answers 
            });
        } catch (error) {
            console.error("Submission failed:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const section = SECTIONS[currentSection];
    const progress = ((currentSection + 1) / SECTIONS.length) * 100;

    return (
        <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#0a0d14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* Header */}
            <div className={`py-4 px-6 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-200'} flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                        <HeartPulse size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest">Student Psychometric Evaluation</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Section {currentSection + 1} of {SECTIONS.length}: {section.title}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase text-indigo-500 mb-1">{Math.round(progress)}% Complete</span>
                        <div className={`w-32 h-1 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'} overflow-hidden`}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-indigo-500" />
                        </div>
                    </div>
                    {onCancel && (
                        <button 
                            onClick={onCancel} 
                            disabled={isSubmitting}
                            className={`p-2 rounded-full transition-colors ${isSubmitting ? 'opacity-30 cursor-not-allowed' : isDarkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`} 
                            title="Close Assessment"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                <motion.div 
                    key={currentSection}
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="max-w-3xl mx-auto space-y-10"
                >
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black uppercase tracking-tight">{section.title}</h3>
                        <p className={`text-sm font-bold opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Answer accurately for the most precise strategy synthesis.
                        </p>
                        {showError && (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                className="text-rose-500 text-[11px] font-black uppercase tracking-widest mt-2 flex items-center gap-2"
                            >
                                <AlertCircle size={14} /> Please answer all required questions to proceed.
                            </motion.div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {section.questions.map((q) => (
                            <div key={q.id} className="space-y-3">
                                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-indigo-500">
                                    {q.text} {q.required && <span className="text-rose-500">*</span>}
                                </label>

                                {q.type === "text" && (
                                    <input 
                                        type="text" 
                                        value={answers[q.id] || ""} 
                                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        className={`w-full py-3 px-4 rounded-lg border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'}`}
                                        placeholder={`Enter your ${q.text.toLowerCase()}...`}
                                    />
                                )}

                                {q.type === "select" && (
                                    <Select 
                                        options={q.id === "basic_center" ? centres : []}
                                        value={q.id === "basic_center" ? centres.find(c => c.value === answers[q.id]) : null}
                                        onChange={(selected) => handleInputChange(q.id, selected ? selected.value : '')}
                                        placeholder={`Select your ${q.text.toLowerCase()}...`}
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                        styles={{
                                            control: (base, state) => ({
                                                ...base,
                                                padding: '4px',
                                                borderRadius: '8px',
                                                borderColor: state.isFocused ? '#6366f1' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff',
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    borderColor: state.isFocused ? '#6366f1' : (isDarkMode ? 'rgba(255,255,255,0.2)' : '#cbd5e1')
                                                }
                                            }),
                                            menu: (base) => ({
                                                ...base,
                                                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                                zIndex: 9999
                                            }),
                                            option: (base, state) => ({
                                                ...base,
                                                backgroundColor: state.isSelected 
                                                    ? '#6366f1' 
                                                    : state.isFocused 
                                                        ? (isDarkMode ? 'rgba(99,102,241,0.2)' : '#e0e7ff') 
                                                        : 'transparent',
                                                color: state.isSelected 
                                                    ? 'white' 
                                                    : (isDarkMode ? '#f8fafc' : '#334155'),
                                                '&:active': {
                                                    backgroundColor: '#6366f1'
                                                }
                                            }),
                                            singleValue: (base) => ({
                                                ...base,
                                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                                fontWeight: 'bold'
                                            }),
                                            input: (base) => ({
                                                ...base,
                                                color: isDarkMode ? '#f8fafc' : '#0f172a'
                                            })
                                        }}
                                    />
                                )}

                                {q.type === "textarea" && (
                                    <textarea 
                                        value={answers[q.id] || ""} 
                                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        className={`w-full py-3 px-4 rounded-lg border outline-none font-bold text-sm transition-all min-h-[100px] ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-indigo-500 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'}`}
                                        placeholder="Type your response here..."
                                    />
                                )}

                                {q.type === "radio" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {q.options.map((opt) => (
                                            <button 
                                                key={opt}
                                                onClick={() => handleInputChange(q.id, opt)}
                                                className={`py-3 px-4 rounded-lg border text-left text-xs font-bold transition-all ${answers[q.id] === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/20 text-slate-400' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <div className={`py-4 px-6 border-t ${isDarkMode ? 'border-white/5 bg-[#0a0d14]' : 'border-slate-200 bg-white'} flex items-center justify-between`}>
                <button 
                    onClick={prevSection}
                    disabled={currentSection === 0 || isSubmitting}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentSection === 0 ? 'opacity-0 pointer-events-none' : isSubmitting ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}
                >
                    <ChevronLeft size={16} /> Previous
                </button>

                <button 
                    onClick={nextSection}
                    disabled={isSubmitting}
                    className="flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-xl hover:shadow-indigo-500/20"
                >
                    {isSubmitting ? (
                        <>
                            Processing... <Loader2 className="animate-spin" size={16} />
                        </>
                    ) : (
                        <>
                            {currentSection === SECTIONS.length - 1 ? "Complete Evaluation" : "Next Section"} <ArrowRight size={16} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default StudentPsychometricForm;
