import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { muiTheme } from './theme'
import { AuthProvider } from './context/AuthContext'

import DashboardLayout from './components/layout/DashboardLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Auth
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

// Admin
import AdminDashboard from './pages/admin/Dashboard'
import AdminManageUser from './pages/admin/ManageUser'
import AdminUserView from './pages/admin/UserView'
import AdminUserAnalytics from './pages/admin/UserAnalytics'
import AdminUserEdit from './pages/admin/UserEdit'
import AdminAddFund from './pages/admin/AddFund'
import AdminRollingReserve from './pages/admin/RollingReserve'
import AdminUserCharges from './pages/admin/UserCharges'
import AdminUserCallbacks from './pages/admin/UserCallbacks'
import AdminAddUser from './pages/admin/AddUser'
import AdminPayinReport from './pages/admin/PayinReport'
import AdminPayoutReport from './pages/admin/PayoutReport'
import AdminWalletReport from './pages/admin/WalletReport'
import AdminManageFundRequest from './pages/admin/ManageFundRequest'
import AdminSettlement from './pages/admin/Settlement'
import AdminManagePayout from './pages/admin/ManagePayout'
import AdminManageStaff from './pages/admin/ManageStaff'
import AdminBulkPayout from './pages/admin/BulkPayout'
import AdminChargeBack from './pages/admin/ChargeBack'
import AdminChargeBackReport from './pages/admin/ChargeBackReport'
import AdminMakePayoutFailed from './pages/admin/MakePayoutFailed'
import AdminTrashReport from './pages/admin/TrashPayinPayoutReport'

// User
import UserDashboard from './pages/user/Dashboard'
import UserFundRequest from './pages/user/FundRequest'
import UserPayinReport from './pages/user/PayinReport'
import UserPayoutReport from './pages/user/PayoutReport'
import UserWalletReport from './pages/user/WalletReport'
import UserSettlementReport from './pages/user/SettlementReport'
import UserDeveloperSettings from './pages/user/DeveloperSettings'
import UserWalletHistory from './pages/user/WalletTransactionHistory'
import UserPayoutFailedHistory from './pages/user/PayoutFailedHistory'
import UserDevelopmentDocs from './pages/user/DevelopmentDocs'

// Agent
import AgentDashboard from './pages/agent/Dashboard'
import AgentAddUsers from './pages/agent/AddUsers'
import AgentUserView from './pages/agent/UserView'
import AgentRegisterUser from './pages/agent/RegisterUser'
import AgentUserCharges from './pages/agent/UserCharges'
import AgentUserCallbacks from './pages/agent/UserCallbacks'
import AgentPayinReport from './pages/agent/PayinReport'
import AgentPayoutReport from './pages/agent/PayoutReport'
import AgentWalletReport from './pages/agent/WalletReport'
import AgentDeveloperSettings from './pages/agent/DeveloperSettings'
import AgentDevelopmentDocs from './pages/agent/DevelopmentDocs'

// Shared
import Profile from './pages/Profile'
import ChangePassword from './pages/ChangePassword'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Shared: profile + change-password (all authenticated roles) */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'user', 'payin_payout', 'agent']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/profile" element={<Profile />} />
                <Route path="/change-password" element={<ChangePassword />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/manage-user" element={<AdminManageUser />} />
                <Route path="/admin/manage-user/add" element={<AdminAddUser />} />
                <Route path="/admin/manage-user/:userId" element={<AdminUserView />} />
                <Route path="/admin/manage-user/:userId/analytics" element={<AdminUserAnalytics />} />
                <Route path="/admin/manage-user/:userId/edit" element={<AdminUserEdit />} />
                <Route path="/admin/manage-user/:userId/add-fund" element={<AdminAddFund />} />
                <Route path="/admin/manage-user/:userId/rolling-reserve" element={<AdminRollingReserve />} />
                <Route path="/admin/manage-user/:userId/charges" element={<AdminUserCharges />} />
                <Route path="/admin/manage-user/:userId/callbacks" element={<AdminUserCallbacks />} />
                <Route path="/admin/payin-report" element={<AdminPayinReport />} />
                <Route path="/admin/payout-report" element={<AdminPayoutReport />} />
                <Route path="/admin/wallet-report" element={<AdminWalletReport />} />
                <Route path="/admin/manage-fund-request" element={<AdminManageFundRequest />} />
                <Route path="/admin/settlement" element={<AdminSettlement />} />
                <Route path="/admin/manage-payout" element={<AdminManagePayout />} />
                <Route path="/admin/manage-staff" element={<AdminManageStaff />} />
                <Route path="/admin/bulk-payout" element={<AdminBulkPayout />} />
                <Route path="/admin/chargeback" element={<AdminChargeBack />} />
                <Route path="/admin/chargeback-report" element={<AdminChargeBackReport />} />
                <Route path="/admin/make-payout-failed" element={<AdminMakePayoutFailed />} />
                <Route path="/admin/trash-payin-payout-report" element={<AdminTrashReport />} />
              </Route>
            </Route>

            {/* User */}
            <Route element={<ProtectedRoute allowedRoles={['user', 'payin_payout']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/user" element={<UserDashboard />} />
                <Route path="/user/fund-request" element={<UserFundRequest />} />
                <Route path="/user/payin-report" element={<UserPayinReport />} />
                <Route path="/user/payout-report" element={<UserPayoutReport />} />
                <Route path="/user/wallet-report" element={<UserWalletReport />} />
                <Route path="/user/settlement-report" element={<UserSettlementReport />} />
                <Route path="/user/developer-settings" element={<UserDeveloperSettings />} />
                <Route path="/user/wallet-transaction-history" element={<UserWalletHistory />} />
                <Route path="/user/payout-failed-history" element={<UserPayoutFailedHistory />} />
                <Route path="/user/development-docs" element={<UserDevelopmentDocs />} />
              </Route>
            </Route>

            {/* Agent */}
            <Route element={<ProtectedRoute allowedRoles={['agent']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/agent" element={<AgentDashboard />} />
                <Route path="/agent/add-users" element={<AgentAddUsers />} />
                <Route path="/agent/add-users/register" element={<AgentRegisterUser />} />
                <Route path="/agent/users/:userId" element={<AgentUserView />} />
                <Route path="/agent/users/:userId/charges" element={<AgentUserCharges />} />
                <Route path="/agent/users/:userId/callbacks" element={<AgentUserCallbacks />} />
                <Route path="/agent/payin-report" element={<AgentPayinReport />} />
                <Route path="/agent/payout-report" element={<AgentPayoutReport />} />
                <Route path="/agent/wallet-report" element={<AgentWalletReport />} />
                <Route path="/agent/developer-settings" element={<AgentDeveloperSettings />} />
                <Route path="/agent/development-docs" element={<AgentDevelopmentDocs />} />
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
