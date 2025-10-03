import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiSettings,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiBarChart2,
  FiClipboard
} from 'react-icons/fi';
import { FiPackage } from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/invoices', label: 'Invoices', icon: FiFileText },
    { path: '/clients', label: 'Clients', icon: FiUsers },
  { path: '/analytics', label: 'Analytics', icon: FiBarChart2 },
    { path: '/requests', label: 'Payment Requests', icon: FiClipboard },
    { path: '/settings/products', label: 'Products', icon: FiPackage },
    { path: '/settings', label: 'Settings', icon: FiSettings },
  ];

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md"
        onClick={toggleSidebar}
      >
        {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar fixed left-0 top-0 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600">InvoiceTracker</h1>
          <p className="text-sm text-gray-600 mt-1">
            {user?.userType === 'business' ? 'Business' : user?.userType || 'User'} Dashboard
          </p>
        </div>

        <nav className="mt-6">
          <ul className="space-y-1 px-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`nav-link flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="mr-3" size={20} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User profile section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <FiUser className="text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FiLogOut className="mr-3" size={16} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;