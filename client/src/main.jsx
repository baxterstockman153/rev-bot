import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx';
import AdminLogin from './admin/pages/Login.jsx';
import ConversationList from './admin/pages/ConversationList.jsx';
import ConversationDetail from './admin/pages/ConversationDetail.jsx';
import { AdminProvider } from './admin/AdminContext.jsx';
import RequireAdmin from './admin/RequireAdmin.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Navigate to="/admin/conversations" replace />} />
          <Route
            path="/admin/conversations"
            element={<RequireAdmin><ConversationList /></RequireAdmin>}
          />
          <Route
            path="/admin/conversations/:id"
            element={<RequireAdmin><ConversationDetail /></RequireAdmin>}
          />
        </Routes>
      </BrowserRouter>
    </AdminProvider>
  </React.StrictMode>
);
