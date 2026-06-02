import pool from '../config/db.js';

export const reportsController = {
  getOverview: async (request, reply) => {
    try {
      const { start_date, end_date } = request.query;

      // 1. Lợn đang nuôi (Cơ cấu đàn) - Thường lấy số liệu hiện tại nên không bọc filter ngày
      const [activePigs] = await pool.query(
        "SELECT category, COUNT(*) as count FROM pigs WHERE lifecycle_status = 'ACTIVE' GROUP BY category"
      );

      // 2. Lợn chết
      let deadQuery = "SELECT COUNT(*) as total FROM pig_deaths WHERE 1=1";
      let deadParams = [];
      if (start_date && end_date) {
        deadQuery += " AND death_date >= ? AND death_date <= ?";
        deadParams.push(`${start_date} 00:00:00`, `${end_date} 23:59:59`);
      }
      const [dead] = await pool.query(deadQuery, deadParams);

      // 3. Xuất bán & Doanh thu
      let saleQuery = `
        SELECT COUNT(sbl.id) as sold_pigs, COALESCE(SUM(sbl.total_amount - COALESCE(p.purchase_price, 0)), 0) as revenue
        FROM sale_batches sb
        LEFT JOIN sale_batch_lines sbl ON sb.id = sbl.sale_batch_id
        LEFT JOIN pigs p ON sbl.pig_id = p.id
        WHERE 1=1
      `;
      let saleParams = [];
      if (start_date && end_date) {
        saleQuery += " AND sb.sold_at >= ? AND sb.sold_at <= ?";
        saleParams.push(`${start_date} 00:00:00`, `${end_date} 23:59:59`);
      }
      const [sales] = await pool.query(saleQuery, saleParams);

      // 4. Chuồng trại (hiện tại)
      const [barnStats] = await pool.query(
        "SELECT COUNT(*) as total_barns, COALESCE(SUM(capacity), 0) as total_capacity FROM barns WHERE status != 'MAINTENANCE'"
      );

      // 5. Tiêu thụ thức ăn
      let feedQuery = "SELECT fd.name AS feed_type, COALESCE(SUM(fu.quantity_kg), 0) as total_kg FROM feed_usages fu JOIN feeds fd ON fu.feed_id = fd.id WHERE 1=1";
      let feedParams = [];
      if (start_date && end_date) {
        feedQuery += " AND fu.used_at >= ? AND fu.used_at <= ?";
        feedParams.push(`${start_date} 00:00:00`, `${end_date} 23:59:59`);
      }
      feedQuery += " GROUP BY fd.name";
      const [feedUsage] = await pool.query(feedQuery, feedParams);

      // 6. Báo cáo bệnh chờ xử lý (hiện tại)
      const [pendingReports] = await pool.query(
        "SELECT COUNT(*) as total FROM pig_reports WHERE status = 'cho_xu_ly'"
      );

      // 7. Xu hướng doanh thu chi tiết theo ngày
      let revQuery = `
        SELECT DATE_FORMAT(sb.sold_at, '%d/%m/%Y') AS date, COALESCE(SUM(sbl.total_amount - COALESCE(p.purchase_price, 0)), 0) AS revenue
        FROM sale_batches sb
        LEFT JOIN sale_batch_lines sbl ON sb.id = sbl.sale_batch_id
        LEFT JOIN pigs p ON sbl.pig_id = p.id
        WHERE 1=1
      `;
      let revParams = [];
      if (start_date && end_date) {
        revQuery += " AND sb.sold_at >= ? AND sb.sold_at <= ?";
        revParams.push(`${start_date} 00:00:00`, `${end_date} 23:59:59`);
      }
      revQuery += " GROUP BY date ORDER BY MIN(sb.sold_at) ASC";
      const [revenueTrend] = await pool.query(revQuery, revParams);

      // 8. Thống kê mũi tiêm vaccine
      let vacQuery = "SELECT vc.name AS vaccine_name, COUNT(*) as total_doses FROM vaccine_usages v JOIN vaccines vc ON v.vaccine_id = vc.id WHERE 1=1";
      let vacParams = [];
      if (start_date && end_date) {
        vacQuery += " AND v.vaccinated_at >= ? AND v.vaccinated_at <= ?";
        vacParams.push(`${start_date} 00:00:00`, `${end_date} 23:59:59`);
      }
      vacQuery += " GROUP BY vc.name ORDER BY total_doses DESC";
      const [vaccineStats] = await pool.query(vacQuery, vacParams);

      // 9. Thống kê sử dụng thuốc
      let medQuery = "SELECT m.name AS medicine_name, SUM(mu.quantity) as total_quantity, MAX(mu.unit) as unit FROM medicine_usages mu JOIN medicines m ON mu.medicine_id = m.id WHERE 1=1";
      let medParams = [];
      if (start_date && end_date) {
        medQuery += " AND mu.used_at >= ? AND mu.used_at <= ?";
        medParams.push(`${start_date} 00:00:00`, `${end_date} 23:59:59`);
      }
      medQuery += " GROUP BY m.name ORDER BY total_quantity DESC";
      const [medicineUsage] = await pool.query(medQuery, medParams);

      return reply.send({
        success: true,
        data: {
          active_pigs: activePigs.map(p => ({ ...p, count: Number(p.count) })),
          dead_pigs: Number(dead[0].total || 0),
          sold_pigs: Number(sales[0].sold_pigs || 0),
          revenue: Number(sales[0].revenue || 0),
          barn_stats: {
            total_barns: Number(barnStats[0].total_barns || 0),
            total_capacity: Number(barnStats[0].total_capacity || 0)
          },
          feed_usage: feedUsage.map(f => ({ ...f, total_kg: Number(f.total_kg) })),
          pending_reports: Number(pendingReports[0].total || 0),
          revenue_trend: revenueTrend.map(r => ({ date: r.date, revenue: Number(r.revenue) })),
          vaccine_stats: vaccineStats.map(v => ({ ...v, total_doses: Number(v.total_doses) })),
          medicine_usage: medicineUsage.map(m => ({ ...m, total_quantity: Number(m.total_quantity) }))
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải báo cáo tổng quan' });
    }
  }
};