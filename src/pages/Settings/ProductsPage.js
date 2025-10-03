import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { productsAPI } from '../../utils/api';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

const ProductsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', sku: '', rate: 0, taxRate: 0, unit: 'unit', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.list({ page: 1, limit: 200 });
      setProducts(res.data.products || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { name: form.name, sku: form.sku, description: form.description, rate: Number(form.rate), taxRate: Number(form.taxRate), unit: form.unit };
      if (form.id) await productsAPI.update(form.id, payload); else await productsAPI.create(payload);
      setForm({ id: null, name: '', sku: '', rate: 0, taxRate: 0, unit: 'unit', description: '' });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (p) => setForm({ id: p._id, name: p.name, sku: p.sku || '', rate: p.rate, taxRate: p.taxRate || 0, unit: p.unit || 'unit', description: p.description || '' });
  const remove = async (id) => { if (window.confirm('Delete product?')) { await productsAPI.remove(id); await load(); } };

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Products</h1>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
            <input className="border rounded px-3 py-2" placeholder="SKU" value={form.sku} onChange={e=>setForm({...form, sku:e.target.value})} />
            <input type="number" min="0" step="0.01" className="border rounded px-3 py-2" placeholder="Rate" value={form.rate} onChange={e=>setForm({...form, rate:e.target.value})} />
            <input type="number" min="0" step="0.01" className="border rounded px-3 py-2" placeholder="Tax %" value={form.taxRate} onChange={e=>setForm({...form, taxRate:e.target.value})} />
            <input className="border rounded px-3 py-2" placeholder="Unit" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} />
            <button disabled={saving || !form.name} onClick={save} className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg"><FiPlus className="mr-2" /> {form.id ? 'Update' : 'Add'}</button>
          </div>
          <textarea className="border rounded px-3 py-2 w-full mt-3" rows={2} placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        </div>

        <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
          {loading ? 'Loading...' : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Name</th>
                  <th className="py-2">SKU</th>
                  <th className="py-2">Rate</th>
                  <th className="py-2">Tax %</th>
                  <th className="py-2">Unit</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id} className="border-b last:border-0">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2">{p.sku || '-'}</td>
                    <td className="py-2">₹ {Number(p.rate).toFixed(2)}</td>
                    <td className="py-2">{Number(p.taxRate || 0).toFixed(2)}%</td>
                    <td className="py-2">{p.unit || 'unit'}</td>
                    <td className="py-2 flex gap-2">
                      <button onClick={() => edit(p)} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"><FiEdit2 /></button>
                      <button onClick={() => remove(p._id)} className="px-3 py-1 rounded bg-red-600 text-white"><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductsPage;
