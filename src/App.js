import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import FileTransfer from './components/FileTransfer';

function App() {
  // Simple auth check: is there a token in localStorage?
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/transfer"
          element={
            isAuthenticated ? <FileTransfer /> : <Navigate to="/login" replace />
          }
        />
        {/* Default route: redirect to /transfer if logged in, else to /login */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/transfer" : "/login"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
