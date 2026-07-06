import { useState, ReactNode } from 'react'
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, TextField, InputAdornment, Chip, Box,
  CircularProgress, Typography,
} from '@mui/material'
import { Search } from 'lucide-react'
import { getStatusColor } from '@/utils/formatUtils'

export interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string | number
}

interface ServerPagination {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  searchable?: boolean
  searchKeys?: (keyof T)[]
  emptyMessage?: string
  actions?: (row: T) => ReactNode
  rowKey?: keyof T
  serverPagination?: ServerPagination
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, rows, loading, searchable = true, searchKeys = [],
  emptyMessage = 'No data found', actions, rowKey = 'id' as keyof T,
  serverPagination,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [search, setSearch] = useState('')

  const isServer = !!serverPagination

  const filtered = !isServer && searchable && search
    ? rows.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(search.toLowerCase()))
      )
    : rows

  const paginated = isServer ? filtered : filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const getCellValue = (row: T, col: Column<T>): ReactNode => {
    if (col.render) return col.render(row)
    const val = row[col.key as keyof T]
    if (val === null || val === undefined) return <span className="text-slate-300">—</span>
    if (col.key === 'status' && typeof val === 'string') {
      return (
        <Chip label={String(val)} color={getStatusColor(String(val))} size="small"
          sx={{ fontWeight: 500, fontSize: '0.7rem', height: 22, borderRadius: '6px' }} />
      )
    }
    return String(val)
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
      {searchable && (
        <Box sx={{ p: 2, borderBottom: '1px solid #F1F5F9' }}>
          <TextField size="small" placeholder="Search..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={15} color="#94A3B8" /></InputAdornment> }}
            sx={{ width: 260 }} />
        </Box>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={String(col.key)} align={col.align || 'left'} sx={{ width: col.width }}>
                  {col.label}
                </TableCell>
              ))}
              {actions && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} sx={{ color: '#1A2744' }} />
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, idx) => (
                <TableRow key={String(row[rowKey] ?? idx)} hover>
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} align={col.align || 'left'}>
                      {getCellValue(row, col)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        {actions(row)}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={isServer ? serverPagination!.total : filtered.length}
        page={isServer ? serverPagination!.page : page}
        onPageChange={(_, p) => isServer ? serverPagination!.onPageChange(p) : setPage(p)}
        rowsPerPage={isServer ? serverPagination!.pageSize : rowsPerPage}
        onRowsPerPageChange={(e) => {
          const size = parseInt(e.target.value)
          if (isServer) { serverPagination!.onPageSizeChange(size) }
          else { setRowsPerPage(size); setPage(0) }
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        sx={{ borderTop: '1px solid #F1F5F9', fontSize: '0.8rem' }} />
    </Paper>
  )
}
