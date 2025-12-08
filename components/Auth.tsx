
import React, { useState } from 'react';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { BookOpen, User as UserIcon, Lock, ArrowRight, Sparkles, Brain, Image as ImageIcon, CheckCircle2, Zap } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const usersStr = localStorage.getItem('smart-study-users');
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    if (isLogin) {
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid username or password');
      }
    } else {
      if (users.some(u => u.username === username)) {
        setError('Username already taken');
        return;
      }
      
      const newUser: User = {
        id: uuidv4(),
        username,
        password
      };
      
      localStorage.setItem('smart-study-users', JSON.stringify([...users, newUser]));
      onLogin(newUser);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-600/20">
              <BookOpen size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              SmartStudy
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
             <a href="#features" className="hover:text-white transition-colors">Features</a>
             <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column: Copy */}
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-800 text-blue-400 text-xs font-bold tracking-wide uppercase">
              <Sparkles size={12} />
              <span>Powered by Gemini 2.5 AI</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Master Your Studies<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">In Half The Time</span>
            </h1>
            
            <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
              Transform scattered notes and textbook photos into organized summaries and interactive quizzes instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle2 size={18} className="text-green-500" />
                <span>Smart Summaries</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle2 size={18} className="text-green-500" />
                <span>OCR Image Import</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle2 size={18} className="text-green-500" />
                <span>AI Grading</span>
              </div>
            </div>
          </div>

          {/* Right Column: Auth Form */}
          <div className="relative animate-in fade-in slide-in-from-right-4 duration-700 delay-150">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20"></div>
            
            <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {isLogin ? 'Enter your credentials to access your notes.' : 'Get started with your free study assistant.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Username</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 text-gray-200 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600"
                      placeholder="e.g. studymaster99"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 text-gray-200 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm text-center font-medium animate-in fade-in zoom-in-95">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transform active:scale-[0.98]"
                >
                  {isLogin ? 'Sign In' : 'Get Started'}
                  <ArrowRight size={18} />
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-800 text-center">
                <p className="text-sm text-gray-400">
                  {isLogin ? "New here?" : "Already have an account?"}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                      setUsername('');
                      setPassword('');
                    }}
                    className="ml-2 text-blue-400 hover:text-blue-300 font-bold hover:underline transition-all"
                  >
                    {isLogin ? 'Create an account' : 'Sign in'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="bg-gray-900/30 py-24 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-white">Everything you need to ace exams</h2>
            <p className="text-gray-400 text-lg">Your personal AI tutor, available 24/7. We combine advanced note-taking tools with generative AI.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Brain size={24} className="text-purple-400" />}
              title="Concept Summaries"
              desc="Turn long, complex lectures into concise bullet points with real-world examples that stick."
            />
             <FeatureCard 
              icon={<ImageIcon size={24} className="text-blue-400" />}
              title="Instant OCR"
              desc="Snap a photo of your textbook or handwritten notes. We extract the text automatically."
            />
             <FeatureCard 
              icon={<Zap size={24} className="text-yellow-400" />}
              title="Active Recall Quizzes"
              desc="Test yourself with AI-generated questions. Get instant, human-like feedback on your answers."
            />
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-2 opacity-70">
            <div className="bg-gray-800 p-1 rounded-md">
              <BookOpen size={16} className="text-gray-400" />
            </div>
            <span className="font-semibold text-gray-400">
              SmartStudy
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} SmartStudy Notes. Built with Google Gemini API.
          </p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: any) => (
  <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800 hover:border-gray-700 hover:bg-gray-900 transition-all duration-300 group">
    <div className="w-14 h-14 bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-gray-100">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{desc}</p>
  </div>
);
