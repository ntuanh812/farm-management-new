import { create } from "zustand";
import axiosClient from "@/utils/axiosClient";

function loadFromStorage() {
  try {
    const token = sessionStorage.getItem("token");
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export const useAuthStore = create((set, get) => ({
  ...loadFromStorage(),
  loading: false,
  error: null,

  // ── Login ─────────────────────────────────────────────
  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosClient.post(`/auth/login`, {
        username,
        password,
      });
      const { token, user } = data.data;

      // Lưu vào sessionStorage để giữ đăng nhập khi reload, tự xóa khi đóng trình duyệt
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));

      set({ token, user, loading: false });
      return { success: true, role: user.role };
    } catch (err) {
      const msg = err.response?.data?.message || "Đăng nhập thất bại";
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  // ── Logout ────────────────────────────────────────────
  logout: () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    // Xóa thêm ở localStorage phòng trường hợp phiên bản cũ còn lưu
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null, error: null });
  },

  // ── Lấy thông tin user từ server (dùng khi reload) ───
  fetchMe: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const { data } = await axiosClient.get(`/auth/me`);
      set({ user: data.data });
    } catch {
      // Token hết hạn → logout
      get().logout();
    }
  },
}));
