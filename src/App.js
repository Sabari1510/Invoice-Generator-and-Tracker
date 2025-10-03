import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClientAuthProvider, useClientAuth } from './context/ClientAuthContext';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Landing from './pages/Landing';
import InvoicesPage from './pages/Invoices/InvoicesPage';
import InvoiceForm from './pages/Invoices/InvoiceForm';
import InvoiceDetail from './pages/Invoices/InvoiceDetail';
import ClientsPage from './pages/Clients/ClientsPage';
import ClientDetail from './pages/Clients/ClientDetail';
import ClientForm from './pages/Clients/ClientForm';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import ClientLogin from './pages/ClientPortal/ClientLogin';
import ClientSignup from './pages/ClientPortal/ClientSignup';
import ClientDashboard from './pages/ClientPortal/ClientDashboard';
import ClientInvoices from './pages/ClientPortal/ClientInvoices';
import ClientAnalytics from './pages/ClientPortal/ClientAnalytics';
import PaymentRequestsPage from './pages/Requests/PaymentRequestsPage';
import ClientProfileRequestsPage from './pages/Requests/ClientProfileRequestsPage';
import ProductsPage from './pages/Settings/ProductsPage';

// Import global styles
import './App.css';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// Client protected route
const ClientProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useClientAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/client/login" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <ClientAuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                } 
              />

              {/* Client Portal public route */}
              <Route path="/client/login" element={<ClientLogin />} />
              <Route path="/client/signup" element={<ClientSignup />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              {/* Client Portal protected route */}
              <Route 
                path="/client" 
                element={
                  <ClientProtectedRoute>
                    <ClientDashboard />
                  </ClientProtectedRoute>
                } 
              />
              <Route 
                path="/client/invoices" 
                element={
                  <ClientProtectedRoute>
                    <ClientInvoices />
                  </ClientProtectedRoute>
                } 
              />
              <Route 
                path="/client/analytics" 
                element={
                  <ClientProtectedRoute>
                    <ClientAnalytics />
                  </ClientProtectedRoute>
                } 
              />
              <Route 
                path="/invoices" 
                element={
                  <ProtectedRoute>
                    <InvoicesPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/invoices/new" 
                element={
                  <ProtectedRoute>
                    <InvoiceForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/invoices/:id" 
                element={
                  <ProtectedRoute>
                    <InvoiceDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/invoices/:id/edit" 
                element={
                  <ProtectedRoute>
                    <InvoiceForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/clients" 
                element={
                  <ProtectedRoute>
                    <ClientsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/clients/:id" 
                element={
                  <ProtectedRoute>
                    <ClientDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/clients/new" 
                element={
                  <ProtectedRoute>
                    <ClientForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/clients/:id/edit" 
                element={
                  <ProtectedRoute>
                    <ClientForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings/products" 
                element={
                  <ProtectedRoute>
                    <ProductsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/requests" 
                element={
                  <ProtectedRoute>
                    <PaymentRequestsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/requests/client-profiles" 
                element={
                  <ProtectedRoute>
                    <ClientProfileRequestsPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Landing as default */}
              <Route path="/" element={<Landing />} />
              
              {/* Catch all route - redirect to landing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </Router>
      </ClientAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
