import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ComplaintList from './pages/Complaints/ComplaintList';
import ComplaintDetail from './pages/Complaints/ComplaintDetail';
import CFAManagement from './pages/CFAManagement';
import DealerManagement from './pages/DealerManagement';
import Reports from './pages/Reports';
import CustomFieldManager from './pages/Settings/CustomFieldManager';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="complaints" element={<ComplaintList />} />
              <Route path="complaints/:id" element={<ComplaintDetail />} />
              <Route path="cfa-management" element={<CFAManagement />} />
              <Route path="dealer-management" element={<DealerManagement />} />
              <Route path="reports" element={<Reports />} />
              <Route path="field-management" element={<CustomFieldManager />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer position="bottom-right" autoClose={3000} theme="colored" toastClassName="!rounded-xl !shadow-lg" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
