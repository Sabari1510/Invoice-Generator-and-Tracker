import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { useClientAuth } from '../../context/ClientAuthContext';
import { FiMail, FiLock } from 'react-icons/fi';

const ClientLogin = () => {
  const { login, isAuthenticated } = useClientAuth();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  if (isAuthenticated) return <Navigate to="/client" replace />;

  const onSubmit = async (data) => {
    setLoading(true);
    await login(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Client Login</h1>
        <div className="text-sm">
          <Link to="/" className="text-blue-600 hover:underline">← Back to landing</Link>
        </div>
        <div className="relative">
          <FiMail className="absolute left-3 top-3 text-gray-400" />
          <input className="w-full border rounded-lg pl-10 py-2" placeholder="Email" type="email" {...register('email', { required: 'Email is required' })} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div className="relative">
          <FiLock className="absolute left-3 top-3 text-gray-400" />
          <input className="w-full border rounded-lg pl-10 py-2" placeholder="Password" type="password" {...register('password', { required: 'Password is required' })} />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2">{loading ? 'Signing in...' : 'Sign in'}</button>
        <div className="text-center text-sm">
          Are you a business? <Link to="/login" className="text-blue-600 hover:underline">Go to Business Login</Link>
        </div>
        <div className="text-center text-sm">
          New client? <Link to="/client/signup" className="text-blue-600 hover:underline">Create your account</Link>
        </div>
      </form>
    </div>
  );
};

export default ClientLogin;
