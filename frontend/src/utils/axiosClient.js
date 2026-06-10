import axios from "axios";
import { API } from "@/config/env";
import { useAuthStore } from "@/store/authStore";

// Khởi tạo một instance của axios với các cấu hình mặc định
const axiosClient = axios.create({
  baseURL: API, // Sử dụng cấu hình API chung
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Chạy TRƯỚC KHI mỗi request được gửi đi lên server
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token trực tiếp từ Zustand store mà không cần dùng hook useAuthStore() trong component
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Chạy SAU KHI nhận được response từ server
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default axiosClient;
