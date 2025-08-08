import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastContainer, useToast } from './components/ui/Toast';
import Connections from './pages/Connections';
import DatabaseBrowser from './pages/DatabaseBrowser';
import QueryEditor from './pages/QueryEditor';
import DataVisualization from './pages/DataVisualization';
import AIPage from './pages/AIPage';
import Settings from './pages/Settings';

function App() {
  const { toasts, removeToast } = useToast();

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/connections" replace />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/database" element={<DatabaseBrowser />} />
            <Route path="/query" element={<QueryEditor />} />
            <Route path="/visualization" element={<DataVisualization />} />
            <Route path="/ai" element={<AIPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/connections" replace />} />
          </Routes>
        </Layout>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </Router>
  );
}

export default App;