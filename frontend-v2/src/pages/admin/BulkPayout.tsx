import { useState } from 'react'
import { Button, TextField } from '@mui/material'
import { Upload, Send } from 'lucide-react'
import api from '@/utils/axios'
import toast from 'react-hot-toast'

export default function BulkPayout() {
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!file) return toast.error('Please select a CSV file')
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post('/admin/bulk-payout', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Bulk payout submitted')
      setFile(null)
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="max-w-xl space-y-5 animate-fade-in">
      <div className="page-header"><h1 className="page-title">Bulk Payout</h1><p className="page-subtitle">Process multiple payouts via CSV upload</p></div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <Upload size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-2">Upload a CSV file with payout details</p>
          <p className="text-xs text-slate-400 mb-4">Format: order_id, amount, bank_account, ifsc, account_name</p>
          <label className="cursor-pointer">
            <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <span className="inline-block px-4 py-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">Choose File</span>
          </label>
          {file && <p className="mt-3 text-xs text-emerald-600 font-medium">{file.name}</p>}
        </div>
        {file && (
          <TextField fullWidth size="small" label="Selected File" value={file.name} InputProps={{ readOnly: true }} />
        )}
        <Button variant="contained" startIcon={<Send size={14} />} onClick={handleSubmit} disabled={submitting || !file} sx={{ bgcolor: '#1A2744', borderRadius: 2, '&:hover': { bgcolor: '#0E172A' } }}>
          {submitting ? 'Processing...' : 'Submit Bulk Payout'}
        </Button>
      </div>
    </div>
  )
}
