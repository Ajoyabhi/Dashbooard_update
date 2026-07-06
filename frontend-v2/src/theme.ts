import { createTheme } from '@mui/material/styles'

export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1A2744', light: '#2563EB', dark: '#0E172A', contrastText: '#FFFFFF' },
    secondary: { main: '#D4AF37', light: '#E8C43A', dark: '#B8960C', contrastText: '#1A2744' },
    success: { main: '#10B981', light: '#34D399', dark: '#059669' },
    error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
    warning: { main: '#F59E0B', light: '#FCD34D', dark: '#D97706' },
    info: { main: '#3B82F6', light: '#60A5FA', dark: '#2563EB' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#1E293B', secondary: '#64748B' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    h1: { fontWeight: 700, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.025em' },
    h3: { fontWeight: 600, letterSpacing: '-0.015em' },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
    caption: { fontSize: '0.75rem', fontWeight: 500 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, padding: '10px 20px', boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
        contained: { '&:hover': { boxShadow: '0 4px 12px rgb(26 39 68 / 0.3)' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07)', border: '1px solid #E2E8F0' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10, backgroundColor: '#F8FAFC',
            '&:hover fieldset': { borderColor: '#94A3B8' },
            '&.Mui-focused fieldset': { borderColor: '#1A2744', borderWidth: 2 },
          },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 500, fontSize: '0.75rem' } } },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F8FAFC', color: '#64748B', fontWeight: 600,
            fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
            borderBottom: '2px solid #E2E8F0',
          },
        },
      },
    },
    MuiTableCell: { styleOverrides: { root: { borderBottom: '1px solid #F1F5F9', fontSize: '0.875rem', color: '#1E293B' } } },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: '#F8FAFC' }, '&:last-child td': { borderBottom: 0 } },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 4, height: 6 } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: '#1E293B', borderRadius: 8, fontSize: '0.75rem', fontWeight: 500 },
      },
    },
  },
})
