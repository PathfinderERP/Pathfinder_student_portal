import axios from 'axios';
import { getBaseApiUrl } from './apiConfig';

const logActivity = async (activityType, path, metadata = {}, duration = 0) => {
    const token = localStorage.getItem('auth_token');
    const apiUrl = getBaseApiUrl();

    if (!token) {
        // console.warn('[Activity] Skipped: No auth_token');
        return;
    }

    // console.log(`[Activity] Logging: ${activityType} on ${path}`, { metadata, duration });

    try {
        const response = await axios.post(`${apiUrl}/api/activity-logs/`, {
            activity_type: activityType,
            path: path,
            metadata: metadata,
            duration: duration
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        // console.log('[Activity] Success:', response.status);
    } catch (error) {
        // console.error('[Activity] Error:', error.response?.data || error.message);
    }
};

export default logActivity;
