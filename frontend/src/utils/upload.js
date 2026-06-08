import axios from 'axios';
import { message } from 'antd';

export const uploadFile = async ({ file, onSuccess, onError, headers, endpoint, fieldName = 'files' }) => {
  const formData = new FormData();
  formData.append(fieldName, file);
  try {
    const { data } = await axios.post(endpoint, formData, {
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    });
    // Lưu lại URL được trả về vào object file để dùng khi submit form (lưu database)
    file.serverUrl = data.data?.[0] || data.data; 
    onSuccess(data);
  } catch (err) {
    onError(err);
    message.error('Upload ảnh thất bại');
  }
};