import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/Toaster';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AcceptInvitation from './pages/auth/AcceptInvitation';
import Dashboard from './pages/dashboard/Dashboard';
import TemplateIndex from './pages/templates/TemplateIndex';
import TemplateBuilder from './pages/templates/TemplateBuilder';
import DocumentIndex from './pages/documents/DocumentIndex';
import DocumentCreate from './pages/documents/DocumentCreate';
import DocumentShow from './pages/documents/DocumentShow';
import SubmissionIndex from './pages/submissions/SubmissionIndex';
import SubmissionShow from './pages/submissions/SubmissionShow';
import WorkspaceSettings from './pages/settings/WorkspaceSettings';
import WorkspaceMembers from './pages/settings/WorkspaceMembers';
import SigningPage from './pages/public/SigningPage';
import CustomerPortal from './pages/public/CustomerPortal';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-invite/:token" element={<AcceptInvitation />} />
        <Route path="/public/esign/:token" element={<SigningPage />} />
        <Route path="/portal/:token" element={<CustomerPortal />} />

        {/* Protected routes with app shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/templates" element={<TemplateIndex />} />
            <Route path="/templates/:id/builder" element={<TemplateBuilder />} />
            <Route path="/documents" element={<DocumentIndex />} />
            <Route path="/documents/create" element={<DocumentCreate />} />
            <Route path="/documents/:id" element={<DocumentShow />} />
            <Route path="/submissions" element={<SubmissionIndex />} />
            <Route path="/submissions/:id" element={<SubmissionShow />} />
            <Route path="/settings/workspace" element={<WorkspaceSettings />} />
            <Route path="/settings/members" element={<WorkspaceMembers />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
