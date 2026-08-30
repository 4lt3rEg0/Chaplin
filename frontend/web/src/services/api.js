import axios from 'axios'

// Same-origin by default. In dev, Vite's proxy forwards /api to the backend
// (see vite.config.js). In a production build, FastAPI serves the built
// frontend AND the API from one origin (CHAPLIN MOBILE ALPHA — single-origin
// architecture), so a relative path is correct there too — a phone on the
// network hitting the tunnel/LAN URL must never be told to go to "localhost"
// or a hardcoded port, since on that phone "localhost" means the phone
// itself. Only set VITE_API_BASE_URL for a genuinely split-origin deployment.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getCurrentUser = async () => {
  const { data } = await api.get('/users/me')
  return data
}

export const logout = () => {
  localStorage.removeItem('token')
}

export default api
