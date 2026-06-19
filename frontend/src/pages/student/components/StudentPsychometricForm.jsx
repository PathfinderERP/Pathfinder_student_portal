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

const StudentPsychometricForm = ({ isDarkMode, onSubmit, onCancel, studentData }) => {
    const { getApiUrl, token } = useAuth();
    
    const [dynamicSections, setDynamicSections] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [answers, setAnswers] = useState({});
    const [showError, setShowError] = useState(false);
    const [centres, setCentres] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        const fetchPsychometricData = async () => {
            if (!token) return;
            setIsLoadingData(true);
            try {
                // Fetch basic centres
                const centresRes = await axios.get(`${getApiUrl()}/api/admin/erp-centres/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const fetchedData = centresRes.data || [];
                const formattedCentres = fetchedData.map(c => ({
                    value: c.enterCode || c.centreName || c.name,
                    label: c.centreName || c.name || 'Unknown Center'
                }));
                setCentres(formattedCentres);

                // Fetch dynamic psychometric traits and questions
                const [traitsRes, questionsRes] = await Promise.all([
                    axios.get(`${getApiUrl()}/api/master-data/psychometric-traits/?is_active=true`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${getApiUrl()}/api/master-data/psychometric-questions/?is_active=true`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                
                const traits = Array.isArray(traitsRes.data) ? traitsRes.data : traitsRes.data.results || [];
                const questions = Array.isArray(questionsRes.data) ? questionsRes.data : questionsRes.data.results || [];

                const activeTraits = traits.filter(t => t.is_active).sort((a, b) => a.order - b.order);
                const activeQuestions = questions.filter(q => q.is_active).sort((a, b) => a.order - b.order);

                const traitSections = activeTraits.map(trait => {
                    const traitQuestions = activeQuestions.filter(q => String(q.trait) === String(trait.id));
                    return {
                        title: trait.name,
                        description: trait.description,
                        questions: traitQuestions.map(q => ({
                            id: `q_${q.id}`,
                            text: q.text,
                            type: 'rating',
                            required: true,
                            is_reverse_scored: q.is_reverse_scored
                        }))
                    };
                }).filter(section => section.questions.length > 0);

                const basicInfoSection = {
                    title: "Basic Info",
                    description: "Please provide your basic details before we begin.",
                    questions: [
                        { id: "basic_name", text: "Name", type: "text", required: true },
                        { id: "basic_number", text: "Number", type: "text", required: true },
                        { id: "basic_class", text: "Class", type: "text", required: true },
                        { id: "basic_school", text: "School", type: "text", required: true },
                        { id: "basic_center", text: "Center", type: "select", required: true },
                        { id: "basic_career", text: "Dream career (if any)", type: "text", required: false }
                    ]
                };

                // Fallback to legacy structure if no dynamic questions exist yet
                if (traitSections.length === 0) {
                    setDynamicSections([basicInfoSection]);
                } else {
                    setDynamicSections([basicInfoSection, ...traitSections]);
                }
            } catch (error) {
                console.error("Failed to fetch psychometric data", error);
                // Fallback basic info
                setDynamicSections([{
                    title: "Basic Info",
                    questions: [
                        { id: "basic_name", text: "Name", type: "text", required: true },
                    ]
                }]);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchPsychometricData();
    }, [token, getApiUrl]);

    const handleInputChange = (id, value) => {
        setAnswers(prev => ({ ...prev, [id]: value }));
        setShowError(false);
    };



    const handleSinglePageSubmit = () => {
        if (isSubmitting || dynamicSections.length === 0) return;
        
        // Validate all required
        const allQuestions = dynamicSections.flatMap(s => s.questions);
        const unansweredRequired = allQuestions.filter(q => q.required && !answers[q.id]);
        
        if (unansweredRequired.length > 0) {
            setShowError(true);
            // Scroll to top or show alert
            alert("Please answer all required questions.");
            return;
        }

        handleFinalSubmit();
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Evaluate responses locally
            const traitsScore = {
                Focus: 0,
                Discipline: 0,
                Confidence: 0,
                Stress: 0
            };
            let totalQuestions = 0;
            
            dynamicSections.forEach(sec => {
                sec.questions.forEach(q => {
                    if (q.trait && answers[q.id]) {
                        // Assuming traits match these categories
                        const traitKey = Object.keys(traitsScore).find(k => q.trait.toLowerCase().includes(k.toLowerCase())) || 'Focus';
                        traitsScore[traitKey] += parseInt(answers[q.id]);
                        totalQuestions++;
                    }
                });
            });

            const avgScore = totalQuestions > 0 ? (Object.values(traitsScore).reduce((a,b)=>a+b, 0) / totalQuestions) : 3;

            let classification = "BALANCED LEARNER";
            let traits = ["ADAPTABLE", "MODERATE FOCUS"];
            let summary = "Shows a balanced approach to studies with room for targeted improvement in consistency.";

            if (avgScore >= 4) {
                classification = "HIGH POTENTIAL PERFORMER";
                traits = ["STRONG FOCUS", "ANALYTICAL THINKING", "SELF-MOTIVATED", "STRATEGIC PLANNER"];
                summary = "Displays a high level of academic discipline and focus. Capable of handling complex concepts and maintaining a consistent study schedule.";
            } else if (avgScore <= 2.5) {
                classification = "DISTRACTED LEARNER";
                traits = ["SHORT ATTENTION SPAN", "IMPULSIVE", "DIGITAL NATIVE", "CREATIVE THINKER"];
                summary = "Highly creative but struggles with sustained focus. Needs structured environment and micro-goal setting to stay on track.";
            } else if (traitsScore.Stress > 12) {
                classification = "STRESSED ACHIEVER";
                traits = ["HARD WORKING", "ANXIOUS", "PERFECTIONIST"];
                summary = "Very dedicated but prone to exam anxiety and stress. Would benefit from mindfulness and relaxed study pacing.";
            }

            const payload = {
                classification,
                traits,
                summary,
                raw_responses: answers
            };

            await onSubmit(payload);
        } catch (error) {
            console.error("Error submitting psychometric form:", error);
            alert("Failed to submit. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData || dynamicSections.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center h-full ${isDarkMode ? 'bg-[#0a0d14] text-white' : 'bg-slate-50 text-slate-900'}`}>
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs opacity-50">Loading Psychometric Profile...</p>
            </div>
        );
    }

    const allQuestions = dynamicSections.flatMap(s => s.questions);
    const totalRequired = allQuestions.filter(q => q.required).length;
    const answeredRequired = allQuestions.filter(q => q.required && answers[q.id]).length;
    const progress = totalRequired === 0 ? 0 : (answeredRequired / totalRequired) * 100;

    const basicInfoSection = dynamicSections.find(s => s.title === "Basic Info");
    
    // Extract rating questions and assign a flat number
    let ratingQuestionCounter = 1;
    const ratingQuestions = dynamicSections.filter(s => s.title !== "Basic Info").flatMap(section => {
        return section.questions.map(q => ({
            ...q,
            traitTitle: section.title,
            displayNumber: ratingQuestionCounter++
        }));
    });

    return (
        <div className={`flex flex-col h-full overflow-hidden ${isDarkMode ? 'bg-[#0F1117] text-white' : 'bg-[#F8FAFC] text-slate-900'}`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8 space-y-6">
                    
                    {/* Header section matching 2nd screenshot */}
                    <div className={`sticky top-0 z-50 p-6 rounded-[5px] border shadow-sm ${isDarkMode ? 'bg-[#151821] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight mb-2">Psychological Exam</h1>
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Rate each statement from 1 to 5. This creates a behavioural profile across focus, discipline, stress, confidence, phone distraction and exam temperament.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {onCancel && (
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className={`px-4 py-2.5 rounded-[5px] text-sm font-bold border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        Back
                                    </button>
                                )}
                                <button 
                                    onClick={handleSinglePageSubmit}
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 rounded-[5px] text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Submit Psychological Exam
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 space-y-2">
                            <div className="flex justify-between items-center text-sm font-black">
                                <span>Psychological Exam Completion</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                                <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${progress}%` }} 
                                    className="h-full bg-indigo-500 rounded-full" 
                                />
                            </div>
                        </div>
                    </div>

                    {showError && (
                        <div className="p-4 rounded-[5px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-bold flex items-center gap-2">
                            <AlertCircle size={16} /> Please answer all required questions before submitting.
                        </div>
                    )}

                    {/* Basic Info (if present) */}
                    {basicInfoSection && basicInfoSection.questions && basicInfoSection.questions.length > 0 && (
                        <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                            <h2 className="text-lg font-black tracking-tight mb-4">{basicInfoSection.title}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {basicInfoSection.questions.map(q => (
                                    <div key={q.id} className="space-y-1.5">
                                        <label className="text-xs font-black uppercase tracking-widest opacity-60">
                                            {q.text} {q.required && <span className="text-rose-500">*</span>}
                                        </label>
                                        
                                        {q.type === "text" && (
                                            <input 
                                                type="text" 
                                                value={answers[q.id] || ""} 
                                                onChange={(e) => handleInputChange(q.id, e.target.value)}
                                                className={`w-full py-2.5 px-3 rounded-[5px] border outline-none font-bold text-sm transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-indigo-500 text-white' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`}
                                            />
                                        )}
                                        {q.type === "select" && (
                                            <Select 
                                                options={q.id === "basic_center" ? centres : []}
                                                value={q.id === "basic_center" ? centres.find(c => c.value === answers[q.id]) : null}
                                                onChange={(selected) => handleInputChange(q.id, selected ? selected.value : '')}
                                                classNamePrefix="react-select"
                                                styles={{
                                                    control: (base, state) => ({
                                                        ...base,
                                                        borderRadius: '5px',
                                                        borderColor: state.isFocused ? '#6366f1' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
                                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                                                        padding: '2px',
                                                        boxShadow: 'none'
                                                    }),
                                                    menu: (base) => ({ ...base, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', zIndex: 9999 }),
                                                    singleValue: (base) => ({ ...base, color: isDarkMode ? '#f8fafc' : '#0f172a', fontWeight: 'bold' }),
                                                    option: (base, state) => ({
                                                        ...base,
                                                        backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? (isDarkMode ? 'rgba(99,102,241,0.2)' : '#e0e7ff') : 'transparent',
                                                        color: state.isSelected ? 'white' : (isDarkMode ? '#f8fafc' : '#334155'),
                                                    })
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2-Column Grid for Rating Questions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ratingQuestions.map(q => (
                            <div key={q.id} className={`p-5 rounded-[5px] border flex flex-col justify-between space-y-4 transition-all ${
                                showError && !answers[q.id] 
                                    ? 'bg-rose-500/10 border-rose-500 shadow-sm shadow-rose-500/20' 
                                    : isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <h3 className="text-sm font-bold leading-snug">
                                        {q.displayNumber}. {q.text} {q.required && !answers[q.id] && showError && <span className="text-rose-500">*</span>}
                                    </h3>
                                    <span className={`shrink-0 px-2.5 py-1 rounded-[5px] text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                        {q.traitTitle}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(rating => {
                                        const isSelected = answers[q.id] === rating;
                                        return (
                                            <button
                                                type="button"
                                                key={rating}
                                                onClick={() => handleInputChange(q.id, rating)}
                                                className={`flex-1 py-2 rounded-[5px] font-black text-sm border transition-all cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                                        : isDarkMode
                                                            ? 'bg-transparent border-white/10 text-slate-400 hover:border-white/30'
                                                            : 'bg-transparent border-slate-200 text-slate-700 hover:border-slate-300'
                                                }`}
                                            >
                                                {rating}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    1 = Strongly disagree, 5 = Strongly agree
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StudentPsychometricForm;
