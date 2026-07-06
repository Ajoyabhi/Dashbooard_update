import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { CircularProgress, Box } from '@mui/material'

interface Props {
  allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Box className="flex items-center justify-center h-screen bg-slate-50">
        <CircularProgress sx={{ color: '#1A2744' }} />
      </Box>
    )
  }

  if (!token || !user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.user_type)) {
    const redirectMap: Record<string, string> = {
      admin: '/admin', agent: '/agent', user: '/user', payin_payout: '/user',
    }
    return <Navigate to={redirectMap[user.user_type] || '/login'} replace />
  }

  return <Outlet />
}
