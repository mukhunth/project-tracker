import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-muted">
      <div className="w-full max-w-md p-8 bg-surface border border-surface-border rounded-xl shadow-sm">
        <h2 className="mb-6 text-2xl font-bold text-center text-foreground">Log in to Project Tracker</h2>
        
        {error && <p className="mb-4 text-sm font-semibold text-center text-danger">{error}</p>}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block mb-1 text-sm font-medium text-foreground-muted">Email</label>
            <input 
              type="email" 
              required 
              className="w-full px-4 py-2 border rounded-md bg-surface text-foreground border-surface-border focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-shadow"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-foreground-muted">Password</label>
            <input 
              type="password" 
              required 
              className="w-full px-4 py-2 border rounded-md bg-surface text-foreground border-surface-border focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-shadow"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          <button 
            type="submit" 
            className="w-full px-4 py-2 mt-2 font-semibold transition-opacity rounded-md bg-brand text-surface hover:opacity-90">
            Log In
          </button>
        </form>
        
        <p className="mt-6 text-sm text-center text-foreground-muted">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold transition-colors text-brand hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}