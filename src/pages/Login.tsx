import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { User, Store, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [maKho, setMaKho] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!username || !maKho || !password) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    setIsLoggingIn(true);
    
    try {
      if (isRegisterMode) {
        const result = await register(username, maKho, password);
        if (!result.success) {
          setError(result.message);
          setIsLoggingIn(false);
        } else {
          setSuccessMsg(result.message);
          // The redirect will happen automatically because userProfile is updated in AuthContext
        }
      } else {
        const result = await login(username, maKho, password);
        if (!result.success) {
          setError(result.message === 'Tài khoản không tồn tại hoặc sai mật khẩu.' 
            ? 'Tài khoản không tồn tại hoặc sai mật khẩu. Vui lòng liên hệ Admin 43751 để được cấp tài khoản.'
            : result.message);
          setIsLoggingIn(false);
        } else {
          setSuccessMsg(result.message);
          // The redirect will happen automatically because userProfile is updated in AuthContext
        }
      }
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-indigo-100/50 p-8 border border-slate-100"
      >
        <div className="text-center mb-8">
          {/* Logo and Brand removed */}
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            {isRegisterMode ? 'Đăng ký tài khoản' : 'Đăng nhập hệ thống'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm font-medium"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-600 text-sm font-medium"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p>{successMsg}</p>
          </motion.div>
        )}

        {isRegisterMode && (
          <motion.div 
            className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 text-amber-600 text-sm font-medium"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>Vui lòng liên hệ Admin 43751 để được cấp tài khoản.</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">User</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="Nhập tên người dùng"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mã kho</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Store size={18} />
              </div>
              <input
                type="text"
                value={maKho}
                onChange={(e) => setMaKho(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="Nhập mã kho"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mật khẩu</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="Nhập mật khẩu"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn || isRegisterMode}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none mt-2"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={20} />
                {'ĐĂNG NHẬP'}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
        </div>
      </motion.div>
      
      <div className="mt-8 text-center text-[10px] font-bold text-slate-400">
        <span>CRM SIÊU THỊ</span>
        <span className="mx-2 text-slate-300">•</span>
        <span className="font-black text-indigo-500 uppercase tracking-wider">Võ Vũ Linh Edition</span>
      </div>
    </div>
  );
}
