import React from 'react';
import { Avatar, Space, Upload, Button } from 'antd';
import { UserOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';

export const AvatarUpload = ({ fileList, setFileList }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <Avatar 
        size={80} 
        src={fileList.length > 0 ? (fileList[0].url || fileList[0].thumbUrl) : null}
        icon={<UserOutlined />}
      />
      <Space direction="vertical">
        <Upload
          beforeUpload={() => false} // Chặn tự động tải lên server
          showUploadList={false}
          maxCount={1}
          onChange={({ fileList: newFileList }) => {
            // Ép buộc hệ thống CHỈ giữ lại 1 file mới nhất vừa được chọn
            const latestList = [...newFileList].slice(-1);

            const updatedList = latestList.map(f => {
              if (f.originFileObj && !f.thumbUrl) {
                f.thumbUrl = URL.createObjectURL(f.originFileObj);
              }
              return f;
            });
            setFileList(updatedList);
          }}
          accept="image/*"
        >
          <Button icon={<UploadOutlined />}>Đổi ảnh đại diện</Button>
        </Upload>
        <Button 
          danger 
          icon={<DeleteOutlined />} 
          disabled={fileList.length === 0}
          onClick={() => setFileList([])}
        >
          Xóa ảnh
        </Button>
      </Space>
    </div>
  );
};