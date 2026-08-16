import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { Analytics } from "@vercel/analytics/react";

const ProtectedRoute = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace/>;
};
const PublicRoute = ({children}) => {
  return localStorage.getItem('token') ? <Navigate to="/dashboard" replace/> : children;
};

function App() {
  return (
    <BrowserRouter>
    <div className="min-h-screen font-sans bg-surface-muted text-foreground">
        <Routes>
          <Route path="/" element={<PublicRoute> <Login/> </PublicRoute>} />
          <Route path="/login" element={<PublicRoute> <Login/> </PublicRoute>} />
          <Route path="/register" element={<PublicRoute> <Register/> </PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute> <Dashboard/> </ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
      <Analytics />
    </BrowserRouter>
  );
}

export default App;