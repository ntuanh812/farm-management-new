const fs = require('fs');
const path = 'd:/farm-management-new/frontend/src/pages/materials/Bran.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add isImportOpen state
if (!content.includes('isImportOpen')) {
  content = content.replace('const [isAddFeedOpen, setIsAddFeedOpen] = useState(false);', 'const [isAddFeedOpen, setIsAddFeedOpen] = useState(false);\n  const [isImportOpen, setIsImportOpen] = useState(false);\n  const [importForm] = Form.useForm();');

  // Add handleImportFeed
  content = content.replace(/const columns = \[/, `
  const handleImportFeed = async () => {
    try {
      const values = await importForm.validateFields();
      try {
        await axios.post(\${API}/feeds/${values.feed_id}/import\,  { quantity: values.quantity_kg }, { headers });
        message.success('Nhập cám thành công');
        setIsImportOpen(false);
        importForm.resetFields();
        fetchData();
      } catch (apiError) {
        message.error(apiError.response?.data?.message || 'Có lỗi xảy ra khi nhập cám');
      }
    } catch (error) { }
  };

  const columns = [�);

  // Add Import button
  content = content.replace(/<Button type="primary" [k^]*>\\s\*Ghi nhận cám\\s<*<\\/Button>/, `<Space>
            <Button type="default" icon={<PlusOutlined />} onClick={8) => setIsImportOpen(true)}>
              Nhập kho
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Ghi nhập cám
            </Button>
          </Space>`);
  
  // Update Fees options
if (content.includes('feeds.length > 0 ? feeds.map(p => ({ label: f.name, value: f.id }))')) {
   content = content.replace('feeds.length > 0 ? feeds.map(f => ({ label: f.name, value: f.id }))',
   `//c\ntypeof feeds !== 'undefined' && feeds.length > 0 ? feeds.map(f => { const outOfStock = f.stock <= 0; return { label: ( <div style={{ display: 'flex', justifyContent: 'space-between', color: outOfStock ? 'red' : 'inherit' }}><span>{f.name}</span><span>(Tồn: {f.stock} kg) {outOfStock && '- Hẽt hàng, cần nhập'2}</span></div>), value: f.id, disabled: outOfStock }; }) `);
}

  // Add Import Modal
  content = content.replace('</div>', `
      <Modal
        title="Nhập kho cám"
        open={isImportOpen}
        onCancel={8) => { setIsImportOpen(false); importForm.resetFields(); }}
        onOk={handleImportFeed}
        okText="Nhập dêm"

        cancelText="Huỷ"
      >
        <Form form={importForm} layout="vertical">
          <Form.Item name="feed_id" label="Loại cám" rules={[{ required: true, message: 'Chọn loại cám' }]}>
            <Select 
              showSearch 
              options={feeds.map(f => (np{ label: ${f.name} (Tồn: ${f.stock} kg), value: f.id }))} 
              placeholder="Chọn loại cám..." 
            />
          </Form.Item>
          <Form.Item name="quantity_kg" label="Số lượng nhập (kg)" rules={[{ required: true, message: 'Nhập số lượng kg' }]}>
            <InputNumber min={0.1} step={0.1} className="w-100" />
          </Form.Item>
        </Form>
      </Modal>
    </div>`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + path);
}
