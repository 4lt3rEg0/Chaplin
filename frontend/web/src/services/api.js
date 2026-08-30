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

export const uploadAvatar = async (file) => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/users/me/avatar', form)
  return data
}

// "Profile music" reuses the real Post -> Track -> profile Playlist pipeline
// instead of a separate raw-file/localStorage path, so it actually persists
// server-side and shows up in the profile's real playlist.
export const uploadProfileMusic = async (file) => {
  const form = new FormData()
  form.append('content', `Música de perfil: ${file.name}`)
  form.append('is_public', 'true')
  form.append('file', file)
  const { data: post } = await api.post('/posts/', form)

  const { data: track } = await api.post(`/tracks/from-post/${post.id}`, {
    title: file.name,
    visibility: 'public'
  })

  const { data: profilePlaylist } = await api.get('/playlists/mine/profile')
  await api.post(`/playlists/${profilePlaylist.id}/items`, { track_id: track.id })

  return track
}

export const logout = () => {
  localStorage.removeItem('token')
}

export default api
