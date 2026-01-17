import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';

export default function LoginModal({ isOpen, onClose, isDark, onLoginSuccess }) {
      const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(""); 
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Email/Password Auth Logic
const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } }
        });
        if (error) throw error;
      } else {
        // ADD "{ data }" HERE - This was the missing piece causing the crash
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Now that data is defined, this line will work
        if (data?.user) onLoginSuccess(data.user.id);
      }
      onClose();
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Logic
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Container */}
      <div className={`relative w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl transition-all
        ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-gray-200'}`}>
        
        <h2 className={`text-xl font-light tracking-[0.2em] uppercase mb-8 text-center 
          ${isDark ? 'text-white' : 'text-zinc-800'}`}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        {errorMsg && (
          <p className="text-[10px] text-red-400 mb-6 text-center uppercase tracking-widest bg-red-400/10 py-2 rounded-lg font-bold">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {isSignUp && (
            <input 
              type="text" placeholder="DISPLAY NAME"
              className={`w-full px-6 py-4 rounded-2xl border text-[11px] tracking-widest outline-none transition-all
                ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-purple-500' : 'bg-gray-100 border-gray-200 focus:border-purple-400'}`}
              value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
            />
          )}
          <input 
            type="email" placeholder="EMAIL ADDRESS"
            className={`w-full px-6 py-4 rounded-2xl border text-[11px] tracking-widest outline-none transition-all
              ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-purple-500' : 'bg-gray-100 border-gray-200 focus:border-purple-400'}`}
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <input 
            type="password" placeholder="PASSWORD"
            className={`w-full px-6 py-4 rounded-2xl border text-[11px] tracking-widest outline-none transition-all
              ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-purple-500' : 'bg-gray-100 border-gray-200 focus:border-purple-400'}`}
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-5 mt-2 rounded-2xl text-[10px] font-bold uppercase tracking-[0.4em] bg-purple-600 text-white hover:bg-purple-500 active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Processing...' : (isSignUp ? 'Register' : 'Log In')}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><span className={`w-full border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}></span></div>
          <div className="relative flex justify-center text-[8px] uppercase tracking-widest">
            <span className={`px-4 ${isDark ? 'bg-zinc-900 text-zinc-600' : 'bg-white text-zinc-400'}`}>Or</span>
          </div>
        </div>

        {/* Google Login Button */}
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full py-4 rounded-2xl border flex items-center justify-center gap-3 transition-all active:scale-95
            ${isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-gray-200 hover:bg-gray-50 text-zinc-800 shadow-sm'}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Continue with Google</span>
        </button>

        <button 
          onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(""); }} 
          className="w-full mt-8 text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold hover:text-purple-400 transition-colors">
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Create one'}
        </button>
      </div>
    </div>,
    document.body
  );
}