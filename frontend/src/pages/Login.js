import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user);
      toast.success('Login successful');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fafaf9] to-[#f5f5f4] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-stone-100 shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif font-bold text-[#022c22] mb-2" data-testid="login-title">Metra Mind</h1>
            <p className="text-sm text-stone-500">Jewellery ERP System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="rounded-sm border-stone-200 focus:border-[#022c22] focus:ring-1 focus:ring-[#022c22] bg-[#fafaf9]/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="rounded-sm border-stone-200 focus:border-[#022c22] focus:ring-1 focus:ring-[#022c22] bg-[#fafaf9]/50"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full rounded-sm font-medium tracking-wide transition-all duration-300 bg-[#022c22] text-[#d4af37] hover:bg-[#064e3b] hover:shadow-lg"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-[#f0fdf4] rounded-sm border border-[#86efac]">
            <p className="text-xs text-[#14532d] font-medium mb-2">Demo Credentials:</p>
            <p className="text-xs text-[#14532d]">Email: admin@jewellery.com</p>
            <p className="text-xs text-[#14532d]">Password: admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;