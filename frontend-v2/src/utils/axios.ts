import axios from 'axios'

// In dev: Vite proxies /api → https://dashboard.accuzpay.in/api
// In prod: requests go to https://api.shrivatsam.in/api
const baseURL = import.meta.env.PROD
  ? 'https://api.shrivatsam.in/api'
  : '/api'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shrivatsam_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('shrivatsam_token')
      localStorage.removeItem('shrivatsam_user')
      delete api.defaults.headers.common['Authorization']
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
