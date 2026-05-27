import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';

export default function VetDiagnosis() {
  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Chẩn đoán thú y" />
      <div style={{ marginTop: 24, padding: 24, background: '#fff', borderRadius: 8, textAlign: 'center' }}>
        <h2 style={{ color: '#ff4d4f' }}>Chức năng Chẩn đoán bệnh đã được gỡ bỏ</h2>
        <p>Vui lòng sử dụng tính năng "Báo cáo lợn bệnh" để theo dõi và phản hồi sức khỏe đàn lợn.</p>
      </div>
    </div>
  );
}