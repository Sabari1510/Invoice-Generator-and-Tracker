import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiFileText, FiBarChart2, FiLogOut } from 'react-icons/fi';
import { useClientAuth } from '../../context/ClientAuthContext';
import '../Layout/Sidebar.css';
import './client-portal.css';

const ClientSidebar = () => {
  const location = useLocation();
  const { logout } = useClientAuth();
  const [open, setOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Top bar for mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow z-50 flex items-center justify-between px-4 py-3">
        <div className="font-semibold">Client Portal</div>
        <button className="px-3 py-2 border rounded" onClick={() => setOpen(!open)}>
          Menu
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`client-sidebar fixed left-0 ${open ? 'top-12 mobile-open' : 'top-0 -translate-x-full lg:translate-x-0'} lg:top-0 bg-white shadow-xl z-40 transform transition-transform duration-300 lg:transform-none w-64 overflow-y-auto`}
      >
        <div className="p-4 border-b">
          <div className="text-lg font-bold">Client Portal</div>
          <div className="text-xs text-gray-500">Your invoices and payments</div>
        </div>
        <nav className="p-3 space-y-1">
          <Link to="/client" className={`nav-link ${isActive('/client') ? 'active' : ''}`} onClick={() => setOpen(false)}>
            <FiHome className="mr-2" /> Dashboard
          </Link>
          <Link to="/client/invoices" className={`nav-link ${isActive('/client/invoices') ? 'active' : ''}`} onClick={() => setOpen(false)}>
            <FiFileText className="mr-2" /> Invoices
          </Link>
          <Link to="/client/analytics" className={`nav-link ${isActive('/client/analytics') ? 'active' : ''}`} onClick={() => setOpen(false)}>
            <FiBarChart2 className="mr-2" /> Analytics
          </Link>
          <button onClick={logout} className="nav-link text-red-600">
            <FiLogOut className="mr-2" /> Logout
          </button>
        </nav>
      </aside>
      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-12" />
    </>
  );
};

export default ClientSidebar;
