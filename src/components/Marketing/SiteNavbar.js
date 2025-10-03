import React from 'react';
import { Link } from 'react-router-dom';
import { FiLogIn } from 'react-icons/fi';
import { SITE_NAME } from '../../config/branding';

const SiteNavbar = () => {
  return (
    <header className="w-full border-b bg-white/70 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">₹</span>
          <span className="text-lg font-extrabold tracking-tight">{SITE_NAME}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700" />
        <div className="flex items-center gap-2">
          <Link to="/client/login" className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm">Client Login</Link>
          <Link to="/login" className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-2">
            <FiLogIn /> Business Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default SiteNavbar;
