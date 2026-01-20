import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '@/Layout.jsx';
import DeploymentGuide from '@/Components/DeploymentGuide.jsx';
import ProtectedRoute from '@/Components/ProtectedRoute.jsx';
import Login from '@/Pages/Login.jsx';
import Home from '@/Pages/Home.jsx';
import CreateFlow from '@/Pages/CreateFlow.jsx';
import FlowEditor from '@/Pages/FlowEditor.jsx';
import History from '@/Pages/History.jsx';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout currentPageName="Home"><Home /></Layout></ProtectedRoute>} />
          <Route path="/CreateFlow" element={<ProtectedRoute><Layout currentPageName="CreateFlow"><CreateFlow /></Layout></ProtectedRoute>} />
          <Route path="/deployment-openshift" element={<ProtectedRoute><Layout currentPageName="Deployment Guide"><DeploymentGuide /></Layout></ProtectedRoute>} />
          <Route path="/History" element={<ProtectedRoute><Layout currentPageName="History"><History /></Layout></ProtectedRoute>} />
          <Route path="/FlowEditor" element={<ProtectedRoute><Layout currentPageName="FlowEditor"><FlowEditor /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}