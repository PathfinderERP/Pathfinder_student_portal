export const getBaseApiUrl = () => {
    let defaultUrl = 'https://api.studypathportal.in';
    
    // In Vite, import.meta.env is available in all modules
    if (import.meta.env.MODE === 'development') {
        defaultUrl = 'http://127.0.0.1:8000';
    }
    
    let url = import.meta.env.VITE_API_URL || defaultUrl;
    
    // Fix for common development connectivity issues: replace localhost with 127.0.0.1
    if (url && url.includes('localhost')) {
        url = url.replace('localhost', '127.0.0.1');
    }
    
    // Ensure no trailing slash for consistency
    if (url && url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    
    return url;
};
