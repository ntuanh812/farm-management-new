import pool from '../config/db.js';

export const reportsController = {
  getOverview: async (request, reply) => {
    try {
      // 1. Thống kê thẻ (Cards)
      const [pigs] = await pool.query("SELECT COUNT(*) AS total FROM pigs WHERE lifecycle_status = 'ACTIVE'");
      const [barns] = await pool.query("SELECT COUNT(*) AS total FROM barns");
      const [sick] = await pool.query("SELECT COUNT(DISTINCT pig_id) AS total FROM vet_diagnosis WHERE status = 'dang_dieu_tri'");
      const [dead] = await pool.query("SELECT COUNT(*) AS total FROM pig_deaths");
      const [pregnant] = await pool.query("SELECT COUNT(DISTINCT sow_id) AS total FROM pig_breedings WHERE status = 'SUCCESS' AND expected_farrow_date >= CURDATE()");
      const [ready] = await pool.query("SELECT COUNT(*) AS total FROM pigs WHERE lifecycle_status = 'ACTIVE' AND category = 'FATTENING' AND current_weight >= 100");

      // 2. Biểu đồ tài chính (Doanh thu)
      const [revenueData] = await pool.query(`
        SELECT DATE_FORMAT(sb.sold_at, '%m/%Y') AS month, COALESCE(SUM(sbl.total_amount), 0) AS revenue
        FROM sale_batches sb
        JOIN sale_batch_lines sbl ON sb.id = sbl.sale_batch_id
        GROUP BY month 
        ORDER BY sb.sold_at DESC LIMIT 6
      `);

      // 3. Biểu đồ sức khỏe (Các bệnh phổ biến)
      const [diseaseData] = await pool.query(`
        SELECT suspected_disease as name, COUNT(*) as value
        FROM vet_diagnosis
        WHERE suspected_disease IS NOT NULL AND suspected_disease != ''
        GROUP BY name 
        ORDER BY value DESC LIMIT 5
      `);

      // 4. Biểu đồ tiêu thụ thức ăn
      const [feedData] = await pool.query(`
        SELECT feed_type as name, SUM(quantity_kg) as value
        FROM feed_usages
        GROUP BY feed_type
      `);

      return reply.send({
        success: true,
        data: {
          stats: {
            total_pigs: pigs[0].total,
            total_barns: barns[0].total,
            sick_pigs: sick[0].total,
            dead_pigs: dead[0].total,
            pregnant_pigs: pregnant[0].total,
            ready_to_sell: ready[0].total,
          },
          charts: {
            // Recharts cần dữ liệu theo chiều thời gian tăng dần
            revenue: revenueData.reverse(), 
            disease: diseaseData.length > 0 ? diseaseData : [{ name: 'Chưa có dữ liệu', value: 1 }],
            feed: feedData.length > 0 ? feedData : [{ name: 'Chưa có dữ liệu', value: 1 }],
          }
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải báo cáo tổng quan' });
    }
  }
};