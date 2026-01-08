import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import SystemPortal from './pages/SystemPortal';
import StudentPortal from './pages/StudentPortal';
import ParentPortal from './pages/ParentPortal';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Registration is now internal only */}

          <Route element={<PrivateRoute roles={['superadmin', 'admin', 'staff']} />}>
            <Route path="/system/*" element={<SystemPortal />} />
          </Route>

          <Route element={<PrivateRoute roles={['student']} />}>
            <Route path="/student/*" element={<StudentPortal />} />
          </Route>

          <Route element={<PrivateRoute roles={['parent']} />}>
            <Route path="/parent/*" element={<ParentPortal />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
