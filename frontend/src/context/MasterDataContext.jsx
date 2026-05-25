import React, { createContext, useState, useCallback, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const MasterDataContext = createContext();

export const useMasterData = () => {
    const context = useContext(MasterDataContext);
    if (!context) {
        throw new Error('useMasterData must be used within MasterDataProvider');
    }
    return context;
};

export const MasterDataProvider = ({ children }) => {
    const { getApiUrl, token, loading: authLoading } = useAuth();
    
    // Cache state
    const [sessions, setSessions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [examTypes, setExamTypes] = useState([]);
    const [targetExams, setTargetExams] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [sections, setSections] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isCached, setIsCached] = useState(false);
    const [error, setError] = useState(null);

    const extract = (res) => {
        const data = res?.data;
        if (!data) return [];
        if (Array.isArray(data)) return data;
        return data.results || data.sections || data.chapters || data.topics || [];
    };

    const fetchMasterData = useCallback(async (forceRefresh = false) => {
        // Return cached data if available and not forcing refresh
        if (isCached && !forceRefresh) {
            return {
                sessions,
                classes,
                subjects,
                examTypes,
                targetExams,
                chapters,
                topics,
                sections
            };
        }

        if (authLoading) return null;
        if (!token) return null;

        setIsLoading(true);
        setError(null);

        try {
            const apiUrl = getApiUrl();
            const config = { headers: { 'Authorization': `Bearer ${token}` } };

            // Fetch all master data in parallel
            const [sessRes, classRes, subRes, etRes, teRes, secRes, chapRes, topRes] = await Promise.all([
                axios.get(`${apiUrl}/api/master-data/sessions/`, config),
                axios.get(`${apiUrl}/api/master-data/classes/`, config),
                axios.get(`${apiUrl}/api/master-data/subjects/`, config),
                axios.get(`${apiUrl}/api/master-data/exam-types/`, config),
                axios.get(`${apiUrl}/api/master-data/target-exams/`, config),
                axios.get(`${apiUrl}/api/master-data/master-sections/`, config),
                axios.get(`${apiUrl}/api/master-data/chapters/`, config),
                axios.get(`${apiUrl}/api/master-data/topics/`, config)
            ]);

            const extractedSessions = extract(sessRes).filter(s => s.is_active);
            const extractedClasses = extract(classRes);
            const extractedSubjects = extract(subRes);
            const extractedExamTypes = extract(etRes);
            const extractedTargetExams = extract(teRes);
            const extractedChapters = extract(chapRes);
            const extractedTopics = extract(topRes);
            const extractedSections = extract(secRes);

            // Update state
            setSessions(extractedSessions);
            setClasses(extractedClasses);
            setSubjects(extractedSubjects);
            setExamTypes(extractedExamTypes);
            setTargetExams(extractedTargetExams);
            setChapters(extractedChapters);
            setTopics(extractedTopics);
            setSections(extractedSections);

            // Mark as cached
            setIsCached(true);

            return {
                sessions: extractedSessions,
                classes: extractedClasses,
                subjects: extractedSubjects,
                examTypes: extractedExamTypes,
                targetExams: extractedTargetExams,
                chapters: extractedChapters,
                topics: extractedTopics,
                sections: extractedSections
            };
        } catch (err) {
            console.error('Failed to fetch master data', err);
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [getApiUrl, token, authLoading, isCached, sessions, classes, subjects, examTypes, targetExams, chapters, topics, sections]);

    const clearCache = useCallback(() => {
        setSessions([]);
        setClasses([]);
        setSubjects([]);
        setExamTypes([]);
        setTargetExams([]);
        setChapters([]);
        setTopics([]);
        setSections([]);
        setIsCached(false);
        setError(null);
    }, []);

    const value = {
        // Data
        sessions,
        classes,
        subjects,
        examTypes,
        targetExams,
        chapters,
        topics,
        sections,
        
        // Status
        isLoading,
        isCached,
        error,
        
        // Methods
        fetchMasterData,
        clearCache
    };

    return (
        <MasterDataContext.Provider value={value}>
            {children}
        </MasterDataContext.Provider>
    );
};
