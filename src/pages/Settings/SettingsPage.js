import React, { useEffect } from 'react';
import Layout from '../../components/Layout/Layout';
import { useForm } from 'react-hook-form';
import { usersAPI } from '../../utils/api';

const SettingsPage = () => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      invoicePrefix: 'INV',
      defaultPaymentTerms: 'Net 30',
    }
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await usersAPI.getProfile();
        const s = res.data?.user?.settings || {};
        reset({
          currency: s.currency || 'INR',
          timezone: s.timezone || 'Asia/Kolkata',
          invoicePrefix: s.invoicePrefix || 'INV',
          defaultPaymentTerms: s.defaultPaymentTerms || 'Net 30',
        });
      } catch(e) {
        console.error(e);
      }
    };
    load();
  }, [reset]);

  const onSubmit = async (data) => {
    await usersAPI.updateSettings(data);
  };

  return (
    <Layout>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Currency</label>
              <input className="form-input" {...register('currency')} />
            </div>
            <div>
              <label className="form-label">Timezone</label>
              <input className="form-input" {...register('timezone')} />
            </div>
            <div>
              <label className="form-label">Invoice Prefix</label>
              <input className="form-input" {...register('invoicePrefix')} />
            </div>
            <div>
              <label className="form-label">Default Payment Terms</label>
              <input className="form-input" {...register('defaultPaymentTerms')} />
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
};

export default SettingsPage;