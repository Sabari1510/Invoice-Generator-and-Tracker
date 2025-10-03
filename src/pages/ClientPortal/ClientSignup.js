import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ClientSignup = () => {
  const [searchParams] = useSearchParams();
  const presetBusinessIdRaw = searchParams.get('businessUserId') || searchParams.get('business') || '';
  const presetBusinessEmail = searchParams.get('businessEmail') || searchParams.get('biz') || '';
  const isValidObjectId = (v) => /^[a-fA-F0-9]{24}$/.test(v || '');
  const presetIsValid = isValidObjectId(presetBusinessIdRaw);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { businessUserId: presetIsValid ? presetBusinessIdRaw : '', businessEmail: presetBusinessEmail || '' },
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const businessId = isValidObjectId(data.businessUserId) ? data.businessUserId : undefined;
      const businessEmail = data.businessEmail && /.+@.+\..+/.test(data.businessEmail) ? data.businessEmail : undefined;
      // Public signup request (general interest)
      await api.post('/public/signup', {
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        company: data.company,
        phone: data.phone,
        notes: data.notes,
        businessUserId: businessId,
        businessEmail,
      });
      // Optional: submit a profile request to a business (if provided)
      if (businessId || businessEmail) {
        await api.post('/public/profile-request', {
          businessUserId: businessId,
          businessEmail,
          name: data.name,
          email: data.email,
          company: data.company,
          phone: data.phone,
          taxId: data.taxId,
          address: { street: data.street, city: data.city, state: data.state, zipCode: data.zipCode, country: data.country },
          notes: data.notes,
        });
      }
  navigate('/client/login', { state: { msg: 'Account created. Please log in using your email and password.' } });
    } catch (e) {
      console.error('Signup failed', e);
      const be = e?.response?.data;
      const firstError = Array.isArray(be?.errors) && be.errors.length ? `${be.errors[0].param}: ${be.errors[0].msg}` : null;
      alert(be?.message || firstError || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold">Thanks!</h1>
          <p className="text-gray-600 mt-2">Your request has been submitted. We will contact you shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl shadow-md w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Client Sign Up</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Name</label>
            <input className="w-full border rounded-lg px-3 py-2" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input type="email" className="w-full border rounded-lg px-3 py-2" {...register('email', { required: 'Email is required' })} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input type="password" className="w-full border rounded-lg px-3 py-2" {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label className="text-sm">Confirm Password</label>
            <input type="password" className="w-full border rounded-lg px-3 py-2" {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v) => v === watch('password') || 'Passwords do not match',
            })} />
            {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          <div>
            <label className="text-sm">Company</label>
            <input className="w-full border rounded-lg px-3 py-2" {...register('company')} />
          </div>
          <div>
            <label className="text-sm">Phone</label>
            <input className="w-full border rounded-lg px-3 py-2" {...register('phone')} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Business User ID (optional)</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="If you know the business id, enter to request approval"
              {...register('businessUserId', {
                validate: (v) => !v || isValidObjectId(v) || 'Enter a valid Business User ID',
              })}
              disabled={presetIsValid}
            />
            {errors.businessUserId && (
              <p className="text-sm text-red-600">{errors.businessUserId.message}</p>
            )}
            {presetIsValid && (
              <p className="text-xs text-gray-500 mt-1">This sign up will be linked to business: {presetBusinessIdRaw}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Business Email (optional)</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Alternatively enter the business email"
              {...register('businessEmail', {
                validate: (v) => !v || /.+@.+\..+/.test(v) || 'Enter a valid email',
              })}
              disabled={presetIsValid || !!presetBusinessEmail}
            />
            {errors.businessEmail && (
              <p className="text-sm text-red-600">{errors.businessEmail.message}</p>
            )}
            {presetBusinessEmail && (
              <p className="text-xs text-gray-500 mt-1">This sign up will be linked to business email: {presetBusinessEmail}</p>
            )}
          </div>
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Tax ID (optional)</label>
              <input className="w-full border rounded-lg px-3 py-2" {...register('taxId')} />
            </div>
            <div>
              <label className="text-sm">Street</label>
              <input className="w-full border rounded-lg px-3 py-2" {...register('street')} />
            </div>
            <div>
              <label className="text-sm">City</label>
              <input className="w-full border rounded-lg px-3 py-2" {...register('city')} />
            </div>
            <div>
              <label className="text-sm">State</label>
              <input className="w-full border rounded-lg px-3 py-2" {...register('state')} />
            </div>
            <div>
              <label className="text-sm">Zip Code</label>
              <input className="w-full border rounded-lg px-3 py-2" {...register('zipCode')} />
            </div>
            <div>
              <label className="text-sm">Country</label>
              <input className="w-full border rounded-lg px-3 py-2" {...register('country')} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Notes (optional)</label>
            <textarea className="w-full border rounded-lg px-3 py-2" rows={3} {...register('notes')} />
          </div>
        </div>
        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2">{loading ? 'Submitting...' : 'Create Account'}</button>
        <div className="text-center text-sm">Already have access? <a href="/client/login" className="text-blue-600 hover:underline">Client Login</a></div>
      </form>
    </div>
  );
};

export default ClientSignup;
