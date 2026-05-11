import axios from 'axios';

const logActivity = async (activityType, path, metadata = {}, duration = 0) => {
    const token = localStorage.getItem('auth_token');

    // With the new Vite proxy, we can use relative paths
    const apiUrl = '/api';

    if (!token) {
        console.warn('[Activity] Skipped: No auth_token');
        return;
    }

    console.log(`[Activity] Logging: ${activityType} on ${path}`, { metadata, duration });

    try {
        const response = await axios.post(`${apiUrl}/activity-logs/`, {
            activity_type: activityType,
            path: path,
            metadata: metadata,
            duration: duration
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('[Activity] Success:', response.status);
    } catch (error) {
        console.error('[Activity] Error:', error.response?.data || error.message);
    }
};

export default logActivity;
