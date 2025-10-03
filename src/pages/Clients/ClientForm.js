import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Layout from '../../components/Layout/Layout';
import { clientsAPI } from '../../utils/api';
import api from '../../utils/api';

const ClientForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      paymentTerms: 'Net 30',
      createCredentials: false,
      clientPassword: ''
    }
  });
  const [loading, setLoading] = useState(!!isEdit);
  const [saving, setSaving] = useState(false);
  const [lookupText, setLookupText] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await clientsAPI.getClient(id);
        const c = res.data?.client;
        reset({
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          company: c.company || '',
          address: c.address || '',
          paymentTerms: c.paymentTerms || 'Net 30',
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = { ...data };
      if (isEdit) await clientsAPI.updateClient(id, payload); else await clientsAPI.createClient(payload);
      navigate('/clients');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Removed: Add from Client Signups feature and related API calls

  // Global lookup by name/email across signups and clients
  const runLookup = async (q) => {
    if (!q?.trim()) { setLookupResults([]); return; }
    try {
      setLookupLoading(true);
  const res = await api.get('/clients/lookup', { params: { search: q } });
  const results = res.data?.results || [];
  setLookupResults(results.filter(r => r.source !== 'signup'));
    } catch (e) {
      console.error('Lookup failed', e);
    } finally {
      setLookupLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Client' : 'New Client'}</h1>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            {saving ? 'Saving...' : 'Save Client'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Name</label>
              <input className="form-input" {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" className="form-input" {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input className="form-input" {...register('phone')} />
            </div>
            <div>
              <label className="form-label">Company</label>
              <input className="form-input" {...register('company')} />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Address</label>
              <textarea rows={4} className="form-input" {...register('address')} />
            </div>
            <div>
              <label className="form-label">Payment Terms</label>
              <input className="form-input" {...register('paymentTerms')} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {!isEdit && (
            <div className="mb-6">
              <h2 className="font-semibold mb-2">Quick Search Existing Clients</h2>
              <div className="flex gap-2 mb-3">
                <input className="form-input flex-1" placeholder="Search by name or email" defaultValue={lookupText}
                  onChange={(e)=>{ const v=e.target.value; setLookupText(v); const h=setTimeout(()=>runLookup(v), 300); return ()=>clearTimeout(h); }} />
                <button type="button" className="px-3 py-2 border rounded-lg" onClick={()=>runLookup(lookupText)}>Search</button>
              </div>
              {lookupLoading && <div className="text-sm text-gray-500">Searching…</div>}
              {!lookupLoading && lookupResults.length>0 && (
                <div className="space-y-2">
                  {lookupResults.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <div className="font-medium">{r.name} <span className="text-gray-500">({r.email})</span></div>
                        <div className="text-sm text-gray-600">{r.company || 'No company'} {r.phone ? `• ${r.phone}`:''} <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100">{r.source}</span></div>
                      </div>
                      <button type="button" className="px-3 py-1 bg-blue-600 text-white rounded"
                        onClick={()=>{
                          reset({
                            name: r.name || '',
                            email: r.email || '',
                            phone: r.phone || '',
                            company: r.company || '',
                            address: '',
                            paymentTerms: 'Net 30',
                            createCredentials: false,
                            clientPassword: ''
                          });
                          alert('Details filled from search. Review and Save Client.');
                        }}>Use</button>
                    </div>
                  ))}
                </div>
              )}
              {!lookupLoading && lookupResults.length===0 && lookupText.trim().length>0 && (
                <div className="text-sm text-gray-500">No matches</div>
              )}
            </div>
          )}
          {/* Removed: Add from Client Signups panel per request */}
          <h2 className="font-semibold mb-3">Client Portal Credentials</h2>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" {...register('createCredentials')} />
            <span>Create/Update client login credentials</span>
          </label>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Client Password</label>
              <input className="form-input" type="password" {...register('clientPassword')} placeholder="Set a password" />
              <p className="text-xs text-gray-500">Leave empty to auto-generate or keep existing.</p>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
};

export default ClientForm;