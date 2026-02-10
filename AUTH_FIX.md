# Authentication Fix for ERP Data Fetching

## Problem
The StudentRegistry and StudentDashboard components were trying to get the JWT token from `localStorage.getItem('access_token')`, but the actual token is stored as `auth_token` and is available directly from the AuthContext.

## Error Message
```
❌ ERP Sync Failed: Error: Authentication required
```

## Root Cause
```javascript
// ❌ WRONG - Token key doesn't exist
const token = localStorage.getItem('access_token');

// ✅ CORRECT - Token is in AuthContext
const { token } = useAuth();
```

## Solution

### Files Fixed:

1. **`frontend/src/system/admin/StudentRegistry.jsx`**
   - Changed from `localStorage.getItem('access_token')` to `useAuth()` hook
   - Now uses `token` and `getApiUrl()` from AuthContext
   - Proper error handling for missing token

2. **`frontend/src/pages/student/StudentDashboard.jsx`**
   - Same fix applied
   - Uses `token` and `getApiUrl()` from AuthContext

### Code Changes:

**Before:**
```javascript
const StudentRegistry = ({ studentsData, isERPLoading }) => {
    const { user: portalUser } = useAuth();
    
    const loadERPData = async () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
        const token = localStorage.getItem('access_token'); // ❌ WRONG KEY
        
        if (!token) {
            throw new Error("Authentication required");
        }
        // ...
    };
};
```

**After:**
```javascript
const StudentRegistry = ({ studentsData, isERPLoading }) => {
    const { user: portalUser, token, getApiUrl } = useAuth(); // ✅ Get from context
    
    const loadERPData = async () => {
        const apiUrl = getApiUrl(); // ✅ Use context method
        
        if (!token) {
            throw new Error("Authentication required. Please log in.");
        }
        // ...
    };
};
```

## How AuthContext Works

From `frontend/src/context/AuthContext.jsx`:

```javascript
// Token is stored as 'auth_token'
localStorage.setItem('auth_token', newToken);

// Token is available in context
const [token, setToken] = useState(localStorage.getItem('auth_token'));

// Exported in context value
<AuthContext.Provider value={{ 
    token,           // ✅ JWT token
    user,            // User object
    getApiUrl,       // Function to get API URL
    login,           // Login function
    logout,          // Logout function
    // ...
}}>
```

## Benefits of Using AuthContext

1. **✅ Centralized**: Token management in one place
2. **✅ Reactive**: Components re-render when token changes
3. **✅ Consistent**: Same API URL logic everywhere
4. **✅ Type-safe**: Better IDE autocomplete
5. **✅ Maintainable**: Easy to update token storage strategy

## Testing

After this fix:
1. ✅ Login works correctly
2. ✅ Token is properly retrieved from AuthContext
3. ✅ Student Registry loads ERP data
4. ✅ Student Dashboard loads individual student data
5. ✅ No more "Authentication required" errors

## Related Files

- `frontend/src/context/AuthContext.jsx` - Token storage and management
- `frontend/src/system/admin/StudentRegistry.jsx` - Admin view (fixed)
- `frontend/src/pages/student/StudentDashboard.jsx` - Student view (fixed)
- `backend/api/erp_views.py` - Backend ERP proxy endpoints
