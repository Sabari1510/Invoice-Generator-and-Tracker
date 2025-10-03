import React from 'react';
import { Link } from 'react-router-dom';
import SiteNavbar from '../components/Marketing/SiteNavbar';
import SiteFooter from '../components/Marketing/SiteFooter';
import InvoiceTemplatePreview from '../components/Marketing/InvoiceTemplatePreview';
import { SITE_NAME, SITE_TAGLINE, FEATURES } from '../config/branding';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNavbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              {SITE_NAME}
            </h1>
            <p className="mt-3 text-lg text-gray-700">{SITE_TAGLINE}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/login" className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Business Login</Link>
              <Link to="/client/login" className="px-5 py-3 rounded-lg border border-gray-300 hover:bg-white font-semibold">Client Login</Link>
              <Link to="/client/signup" className="px-5 py-3 rounded-lg border border-gray-300 hover:bg-white font-semibold">Client Sign Up</Link>
            </div>
            
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <InvoiceTemplatePreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h2 className="text-2xl font-bold">Everything you need to invoice in India</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="border rounded-xl p-5 hover:shadow-sm transition bg-white">
                <div className="font-semibold">{f.title}</div>
                <div className="text-sm text-gray-600 mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimal features section for cleanliness */}
      <section id="pricing" className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h2 className="text-2xl font-bold text-center">Simple and clean</h2>
          <p className="text-gray-600 mt-2 text-center">GST-ready PDFs, UPI payments, and a focused client portal.</p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.slice(0,3).map((f) => (
              <div key={f.title} className="border rounded-xl p-5 bg-white">
                <div className="font-semibold">{f.title}</div>
                <div className="text-sm text-gray-600 mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Landing;
