import { useEffect, useRef } from 'react';
import logActivity from './activityService';

export const useActivityTracker = (path) => {
    const heartbeatInterval = useRef(null);
    const sessionStartTime = useRef(Date.now());

    useEffect(() => {
        // Log Initial Page View
        logActivity('page_view', path);

        // Start Heartbeat
        heartbeatInterval.current = setInterval(() => {
            logActivity('heartbeat', path, {}, 60);
        }, 60000); // Every 60 seconds

        return () => {
            // Log Page Exit with duration
            const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
            logActivity('heartbeat', path, { action: 'exit' }, duration % 60);
            
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }
        };
    }, [path]);
};

export const logVideoActivity = (action, videoId, videoTitle, duration = 0) => {
    logActivity(`video_${action}`, window.location.pathname, {
        video_id: videoId,
        video_title: videoTitle
    }, duration);
};
