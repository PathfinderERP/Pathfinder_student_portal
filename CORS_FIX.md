# CORS Error Fix - Student Portal

## Problem
The frontend was trying to call the ERP API (`https://pfndrerp.in`) directly from the browser, which caused CORS (Cross-Origin Resource Sharing) errors:

```
Access to XMLHttpRequest at 'https://pfndrerp.in/api/superAdmin/login' from origin 
'https://pathfinder-student-portal.vercel.app' has been blocked by CORS policy
```

## Root Cause
- Browser security blocks cross-origin requests unless the server explicitly allows it
- The ERP server doesn't have CORS headers allowing requests from your domain
- Direct ERP calls from frontend exposed admin credentials in client-side code (security risk)

## Solution
Created a **backend proxy endpoint** that handles ERP communication server-side:

### Backend Changes:
1. **Created `api/erp_views.py`**:
   - New endpoint: `/api/student/erp-data/`
   - Requires authentication (JWT token)
   - Fetches student data from ERP on behalf of the logged-in user
   - Returns only the student's own admission data

2. **Updated `api/urls.py`**:
   - Added route for the new endpoint

3. **Updated `.env`**:
   - Added ERP configuration:
     ```
     ERP_API_URL=https://pfndrerp.in
     ERP_ADMIN_EMAIL=atanu@gmail.com
     ERP_ADMIN_PASSWORD=000000
     ```

### Frontend Changes:
1. **Updated `StudentDashboard.jsx`**:
   - Removed direct ERP API calls
   - Now calls backend endpoint: `GET /api/student/erp-data/`
   - Uses JWT token for authentication
   - Better error handling with specific messages

## Benefits
✅ **No CORS errors** - Server-to-server communication
✅ **More secure** - Admin credentials not exposed in frontend
✅ **Better performance** - Backend can cache ERP data
✅ **Centralized** - All ERP logic in one place
✅ **Easier to maintain** - Changes only needed in backend

## How It Works Now

```
Student Browser → Django Backend → ERP Server
                ↓
            JWT Auth
                ↓
         Student Data
```

1. Student logs in with email + admission number
2. Django authenticates against ERP
3. Creates local user account
4. Returns JWT tokens
5. Student dashboard uses JWT to fetch their ERP data from Django
6. Django fetches from ERP and returns to frontend

## Testing
The backend is already running. The frontend needs to be rebuilt and redeployed to Vercel with these changes.

## Student Login Credentials
Students use:
- **Username**: Their email from ERP
- **Password**: Their admission number (e.g., `PATH26000002`)
