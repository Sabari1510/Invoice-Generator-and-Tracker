import React, { useEffect, useState } from 'react';
import { clientPortalAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const ClientApprove = () => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') || '';
    setToken(t);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Missing token');
    setLoading(true);
    try {
      await clientPortalAPI.approve(token, password);
      toast.success('Account activated. You can login now.');
      setDone(true);
    } catch (err) {
      // handled globally
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-xl font-bold mb-2">Success</h1>
          <p>Your account is activated. Please proceed to the client login page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-bold mb-4">Activate Client Account</h1>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Set Password</label>
            <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 text-white rounded py-2 mt-2 hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Activating...' : 'Activate'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientApprove;
