import { create } from 'zustand'
import axios from 'axios'

const API = 'http://localhost:3000/api'

// Lấy user đã lưu từ localStorage (khi refresh trang)
function loadFromStorage() {
  try {
    const token = localStorage.getItem('token')
    const user  = JSON.parse(localStorage.getItem('user') || 'null')
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

export const useAuthStore = create((set, get) => ({
  ...loadFromStorage(),
  loading: false,
  error: null,

  // ── Login ─────────────────────────────────────────────
  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await axios.post(`${API}/auth/login`, { username, password })
      const { token, user } = data.data

      // Lưu vào localStorage để giữ đăng nhập khi reload
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      set({ token, user, loading: false })
      return { success: true, role: user.role }
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại'
      set({ loading: false, error: msg })
      return { success: false, message: msg }
    }
  },

  // ── Logout ────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, error: null })
  },

  // ── Lấy thông tin user từ server (dùng khi reload) ───
  fetchMe: async () => {
    const { token } = get()
    if (!token) return
    try {
      const { data } = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      set({ user: data.data })
    } catch {
      // Token hết hạn → logout
      get().logout()
    }
  },

  // ── Helper: lấy header Authorization ─────────────────
  getAuthHeader: () => {
    const { token } = get()
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
}))
