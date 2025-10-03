import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { clientsAPI, invoicesAPI, templatesAPI, productsAPI } from '../../utils/api';
import { calculateInvoiceTotals, formatCurrency } from '../../utils/helpers';
import Layout from '../../components/Layout/Layout';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

const defaultItem = { description: '', quantity: 1, rate: 0, taxRate: 0 };

const InvoiceForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();
  const isEdit = !!params.id;

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      clientId: '',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
      paymentTerms: 'Net 30',
  currency: 'INR',
      template: 'standard',
      items: [defaultItem],
      discountAmount: 0,
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const discountAmount = watch('discountAmount') ?? 0;
  const currency = watch('currency') || 'INR';

  const totals = useMemo(
    () => calculateInvoiceTotals(items || [], Number(discountAmount || 0)),
    [items, discountAmount]
  );

  useEffect(() => {
    const clientIdFromQuery = searchParams.get('clientId');
    Promise.all([
      clientsAPI.getClients({ page: 1, limit: 100 }),
      productsAPI.list({ page: 1, limit: 200, active: true }),
      templatesAPI.getTemplates(),
      isEdit ? invoicesAPI.getInvoice(params.id) : Promise.resolve(null)
    ])
      .then(([clientsRes, productsRes, templatesRes, invoiceRes]) => {
        setClients(clientsRes.data.clients || []);
        setProducts(productsRes.data.products || []);
        setTemplates(templatesRes.data?.templates || []);
        if (invoiceRes && invoiceRes.data?.invoice) {
          const inv = invoiceRes.data.invoice;
          reset({
            clientId: inv.clientId?._id || inv.clientId,
            issueDate: inv.issueDate?.slice(0, 10),
            dueDate: inv.dueDate?.slice(0, 10),
            paymentTerms: inv.paymentTerms,
            currency: inv.currency,
            template: inv.template || 'standard',
            items: inv.items.map(i => ({ description: i.description, quantity: i.quantity, rate: i.rate, taxRate: i.taxRate || 0 })),
            discountAmount: inv.discountAmount || 0,
            notes: inv.notes || ''
          });
        } else if (clientIdFromQuery) {
          setValue('clientId', clientIdFromQuery);
        }
      })
      .finally(() => setLoading(false));
  }, [isEdit, params.id, reset, searchParams, setValue]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        items: data.items.map(i => ({
          description: i.description,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          taxRate: Number(i.taxRate)
        })),
        discountAmount: Number(data.discountAmount),
        template: data.template || 'standard'
      };

      if (isEdit) {
        await invoicesAPI.updateInvoice(params.id, payload);
      } else {
        const res = await invoicesAPI.createInvoice(payload);
        const id = res.data?.invoice?._id;
        if (id) navigate(`/invoices/${id}`);
      }
      if (isEdit) navigate(`/invoices/${params.id}`);
    } catch (e) {
      console.error('Save invoice error:', e);
    } finally {
      setSaving(false);
    }
  };

  const addProductLine = () => {
    if (!productId) return;
    const p = products.find(x => x._id === productId);
    if (!p) return;
    append({ description: p.name, quantity: 1, rate: p.rate, taxRate: p.taxRate || 0 });
    setProductId('');
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
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-4 flex gap-2 items-end">
                <div className="flex-1">
                  <label className="form-label">Pick a Product</label>
                  <select className="form-input" value={productId} onChange={e=>setProductId(e.target.value)}>
                    <option value="">-- Select product --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name} — ₹{Number(p.rate).toFixed(2)} ({Number(p.taxRate||0)}%)</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={addProductLine} className="px-3 py-2 bg-gray-100 rounded-lg border">Add Line</button>
                <a href="/settings/products" className="text-sm text-blue-600 underline">Manage products</a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Client</label>
                  <select className="form-input" {...register('clientId', { required: 'Client is required' })}>
                    <option value="">Select client</option>
                    {clients.map(c => (
                      <option value={c._id} key={c._id}>{c.name} {c.company ? `- ${c.company}` : ''}</option>
                    ))}
                  </select>
                  {errors.clientId && <p className="text-sm text-red-600 mt-1">{errors.clientId.message}</p>}
                </div>
                <div>
                  <label className="form-label">Issue Date</label>
                  <input type="date" className="form-input" {...register('issueDate', { required: true })} />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" {...register('dueDate', { required: true })} />
                </div>
                <div>
                  <label className="form-label">Payment Terms</label>
                  <input type="text" className="form-input" {...register('paymentTerms')} />
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <input type="text" className="form-input" {...register('currency')} />
                </div>
                <div>
                  <label className="form-label">Template</label>
                  <select className="form-input" {...register('template')}>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Items</h2>
                <button type="button" onClick={() => append(defaultItem)} className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                  <FiPlus className="mr-2" /> Add Item
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-12 md:col-span-5">
                      <input className="form-input" placeholder="Description" {...register(`items.${index}.description`, { required: true })} />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <input type="number" step="0.01" className="form-input" placeholder="Qty" {...register(`items.${index}.quantity`, { required: true, min: 0.01 })} />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <input type="number" step="0.01" className="form-input" placeholder="Rate" {...register(`items.${index}.rate`, { required: true, min: 0 })} />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <input type="number" step="0.01" className="form-input" placeholder="Tax %" {...register(`items.${index}.taxRate`, { min: 0, max: 100 })} />
                    </div>
                    <div className="col-span-6 md:col-span-1 flex items-center">
                      <button type="button" onClick={() => remove(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="form-label">Notes</label>
              <textarea rows={4} className="form-input" placeholder="Additional notes or terms" {...register('notes')} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <span>{formatCurrency(totals.taxAmount, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <input type="number" step="0.01" className="form-input w-28 text-right" {...register('discountAmount', { valueAsNumber: true })} />
                </div>
                <div className="flex items-center justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
};

export default InvoiceForm;