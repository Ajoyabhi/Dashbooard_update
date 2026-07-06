import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import { Shield, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-[#1A2744] rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Shield size={36} className="text-[#D4AF37]" />
        </div>
        <h1 className="text-7xl font-black text-slate-800 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Page not found</h2>
        <p className="text-slate-400 text-sm mb-8">The page you're looking for doesn't exist or you don't have access.</p>
        <Button variant="contained" startIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}
          sx={{ bgcolor: '#1A2744', borderRadius: 2.5, '&:hover': { bgcolor: '#0E172A' } }}>
          Go Back
        </Button>
      </div>
    </div>
  )
}
