import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import SystemDashboard from './system/SystemDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import ParentDashboard from './pages/parent/ParentDashboard';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Registration is now internal only */}

            <Route element={<PrivateRoute roles={['superadmin', 'admin', 'staff']} />}>
              <Route path="/system/*" element={<SystemDashboard />} />
            </Route>

            <Route element={<PrivateRoute roles={['student']} />}>
              <Route path="/student/*" element={<StudentDashboard />} />
            </Route>

            <Route element={<PrivateRoute roles={['parent']} />}>
              <Route path="/parent/*" element={<ParentDashboard />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
