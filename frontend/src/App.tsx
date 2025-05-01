import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/Toaster';
import LoginPage from './pages/auth/LoginPage';
import AdminDashboard from './pages/admin/Dashboard';
import UserDashboard from './pages/user/Dashboard';
import AgentDashboard from './pages/agent/Dashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ManageUser from './pages/admin/ManageUser';
import AddUser from './pages/admin/AddUser';
import UserView from './pages/admin/UserView';
import UserEdit from './pages/admin/UserEdit';
import UserCharges from './pages/admin/UserCharges';
import UserCallbacks from './pages/admin/UserCallbacks';
import AddFund from './pages/admin/AddFund';
import ManageStaff from './pages/admin/ManageStaff';
import ManagePayout from './pages/admin/ManagePayout';
import BulkPayout from './pages/admin/BulkPayout';
import WalletReport from './pages/admin/WalletReport';
import PayoutReport from './pages/admin/PayoutReport';
import ChargeBack from './pages/admin/ChargeBack';
import ChargeBackReport from './pages/admin/ChargeBackReport';
import ManageFundRequest from './pages/admin/ManageFundRequest';
import Settlement from './pages/admin/Settlement';
import UserFundRequest from './pages/user/FundRequest';
import UserWalletReport from './pages/user/WalletReport';
import UserPayoutReport from './pages/user/PayoutReport';
import UserDeveloperSettings from './pages/user/DeveloperSettings';
import UserDevelopmentDocs from './pages/user/DevelopmentDocs';
import AgentWalletReport from './pages/agent/WalletReport';
import AgentPayoutReport from './pages/agent/PayoutReport';
import AgentDeveloperSettings from './pages/agent/DeveloperSettings';
import AgentDevelopmentDocs from './pages/agent/DevelopmentDocs';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/manage-user" element={<ProtectedRoute role="admin"><ManageUser /></ProtectedRoute>} />
          <Route path="/admin/manage-user/add" element={<ProtectedRoute role="admin"><AddUser /></ProtectedRoute>} />
          <Route path="/admin/manage-user/:userId" element={<ProtectedRoute role="admin"><UserView /></ProtectedRoute>} />
          <Route path="/admin/manage-user/:userId/edit" element={<ProtectedRoute role="admin"><UserEdit /></ProtectedRoute>} />
          <Route path="/admin/manage-user/:userId/charges" element={<ProtectedRoute role="admin"><UserCharges /></ProtectedRoute>} />
          <Route path="/admin/manage-user/:userId/callbacks" element={<ProtectedRoute role="admin"><UserCallbacks /></ProtectedRoute>} />
          <Route path="/admin/manage-user/:userId/add-fund" element={<ProtectedRoute role="admin"><AddFund /></ProtectedRoute>} />
          <Route path="/admin/manage-staff" element={<ProtectedRoute role="admin"><ManageStaff /></ProtectedRoute>} />
          <Route path="/admin/manage-payout" element={<ProtectedRoute role="admin"><ManagePayout /></ProtectedRoute>} />
          <Route path="/admin/bulk-payout" element={<ProtectedRoute role="admin"><BulkPayout /></ProtectedRoute>} />
          <Route path="/admin/wallet-report" element={<ProtectedRoute role="admin"><WalletReport /></ProtectedRoute>} />
          <Route path="/admin/payout-report" element={<ProtectedRoute role="admin"><PayoutReport /></ProtectedRoute>} />
          <Route path="/admin/chargeback" element={<ProtectedRoute role="admin"><ChargeBack /></ProtectedRoute>} />
          <Route path="/admin/chargeback-report" element={<ProtectedRoute role="admin"><ChargeBackReport /></ProtectedRoute>} />
          <Route path="/admin/manage-fund-request" element={<ProtectedRoute role="admin"><ManageFundRequest /></ProtectedRoute>} />
          <Route path="/admin/settlement" element={<ProtectedRoute role="admin"><Settlement /></ProtectedRoute>} />

          {/* User Routes */}
          <Route path="/user" element={<ProtectedRoute role="user"><UserDashboard /></ProtectedRoute>} />
          <Route path="/user/fund-request" element={<ProtectedRoute role="user"><UserFundRequest /></ProtectedRoute>} />
          <Route path="/user/wallet-report" element={<ProtectedRoute role="user"><UserWalletReport /></ProtectedRoute>} />
          <Route path="/user/payout-report" element={<ProtectedRoute role="user"><UserPayoutReport /></ProtectedRoute>} />
          <Route path="/user/developer-settings" element={<ProtectedRoute role="user"><UserDeveloperSettings /></ProtectedRoute>} />
          <Route path="/user/development-docs" element={<ProtectedRoute role="user"><UserDevelopmentDocs /></ProtectedRoute>} />

          {/* Agent Routes */}
          <Route path="/agent" element={<ProtectedRoute role="agent"><AgentDashboard /></ProtectedRoute>} />
          <Route path="/agent/fund-request" element={<ProtectedRoute role="agent"><UserFundRequest /></ProtectedRoute>} />
          <Route path="/agent/wallet-report" element={<ProtectedRoute role="agent"><AgentWalletReport /></ProtectedRoute>} />
          <Route path="/agent/payout-report" element={<ProtectedRoute role="agent"><AgentPayoutReport /></ProtectedRoute>} />
          <Route path="/agent/developer-settings" element={<ProtectedRoute role="agent"><AgentDeveloperSettings /></ProtectedRoute>} />
          <Route path="/agent/development-docs" element={<ProtectedRoute role="agent"><AgentDevelopmentDocs /></ProtectedRoute>} />

          {/* Default and 404 routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;