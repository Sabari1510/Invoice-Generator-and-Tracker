import React from 'react';
import { SITE_NAME } from '../../config/branding';

const SiteFooter = () => {
  return (
    <footer className="border-t bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-gray-500 flex items-center justify-between">
        <span>© {new Date().getFullYear()} {SITE_NAME}</span>
        <span>Made in India 🇮🇳</span>
      </div>
    </footer>
  );
};

export default SiteFooter;
