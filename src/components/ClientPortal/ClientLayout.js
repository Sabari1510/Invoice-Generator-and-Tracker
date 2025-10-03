import React from 'react';
import ClientSidebar from './ClientSidebar';

const ClientLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientSidebar />
      <main className="lg:ml-64 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default ClientLayout;
