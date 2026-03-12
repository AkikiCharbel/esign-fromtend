import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import TemplateIndex from './pages/templates/TemplateIndex';
import TemplateBuilder from './pages/templates/TemplateBuilder';
import DocumentIndex from './pages/documents/DocumentIndex';
import DocumentCreate from './pages/documents/DocumentCreate';
import DocumentShow from './pages/documents/DocumentShow';
import SubmissionIndex from './pages/submissions/SubmissionIndex';
import SubmissionShow from './pages/submissions/SubmissionShow';
import SigningPage from './pages/public/SigningPage';
import CustomerPortal from './pages/public/CustomerPortal';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/public/esign/:token" element={<SigningPage />} />
        <Route path="/portal/:token" element={<CustomerPortal />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/templates" element={<TemplateIndex />} />
          <Route path="/templates/:id/builder" element={<TemplateBuilder />} />
          <Route path="/documents" element={<DocumentIndex />} />
          <Route path="/documents/create" element={<DocumentCreate />} />
          <Route path="/documents/:id" element={<DocumentShow />} />
          <Route path="/submissions" element={<SubmissionIndex />} />
          <Route path="/submissions/:id" element={<SubmissionShow />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
