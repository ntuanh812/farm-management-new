import axiosClient from "./axiosClient";
import { message } from "antd";

export const uploadFile = async ({
  file,
  onSuccess,
  onError,
  endpoint,
  fieldName = "files",
}) => {
  const formData = new FormData();
  formData.append(fieldName, file);
  try {
    const { data } = await axiosClient.post(endpoint, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // Lưu lại URL được trả về vào object file để dùng khi submit form (lưu database)
    file.serverUrl = data.data?.[0] || data.data;
    onSuccess(data);
  } catch (err) {
    onError(err);
    message.error("Upload ảnh thất bại");
  }
};
