import pool from '../config/db.js';

export const reportsController = {
  getOverview: async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      // 1. Lợn đang nuôi (Cơ cấu đàn) - Thường lấy số liệu hiện tại nên không bọc filter ngày
      const [activePigs] = await pool.query(
        "SELECT category, COUNT(*) as count FROM pigs WHERE lifecycle_status = 'ACTIVE' GROUP BY category"
      );

      // 2. Lợn chết
      let deadQuery = "SELECT COUNT(*) as total FROM pig_deaths WHERE 1=1";
      let deadParams = [];
      if (startDate && endDate) {
        deadQuery += " AND death_date >= ? AND death_date <= ?";
        deadParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }
      const [dead] = await pool.query(deadQuery, deadParams);

      // 3. Xuất bán & Doanh thu
      let saleQuery = `
        SELECT COUNT(sbl.id) as soldPigs, COALESCE(SUM(sbl.total_amount - COALESCE(p.purchase_price, 0)), 0) as revenue
        FROM sale_batches sb
        LEFT JOIN sale_batch_lines sbl ON sb.id = sbl.sale_batch_id
        LEFT JOIN pigs p ON sbl.pig_id = p.id
        WHERE 1=1
      `;
      let saleParams = [];
      if (startDate && endDate) {
        saleQuery += " AND sb.sold_at >= ? AND sb.sold_at <= ?";
        saleParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }
      const [sales] = await pool.query(saleQuery, saleParams);

      // 4. Chuồng trại (hiện tại)
      const [barnStats] = await pool.query(
        "SELECT COUNT(*) as total_barns, COALESCE(SUM(capacity), 0) as total_capacity FROM barns WHERE status != 'MAINTENANCE'"
      );

      // 5. Tiêu thụ thức ăn
      let feedQuery = "SELECT feed_type, COALESCE(SUM(quantity_kg), 0) as total_kg FROM feed_usages WHERE 1=1";
      let feedParams = [];
      if (startDate && endDate) {
        feedQuery += " AND used_at >= ? AND used_at <= ?";
        feedParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }
      feedQuery += " GROUP BY feed_type";
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
      if (startDate && endDate) {
        revQuery += " AND sb.sold_at >= ? AND sb.sold_at <= ?";
        revParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }
      revQuery += " GROUP BY date ORDER BY MIN(sb.sold_at) ASC";
      const [revenueTrend] = await pool.query(revQuery, revParams);

      // 8. Thống kê mũi tiêm vaccine
      let vacQuery = "SELECT vaccine_name, COUNT(*) as total_doses FROM vaccinations WHERE 1=1";
      let vacParams = [];
      if (startDate && endDate) {
        vacQuery += " AND vaccinated_at >= ? AND vaccinated_at <= ?";
        vacParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }
      vacQuery += " GROUP BY vaccine_name ORDER BY total_doses DESC";
      const [vaccineStats] = await pool.query(vacQuery, vacParams);

      // 9. Thống kê sử dụng thuốc
      let medQuery = "SELECT medicine_name, SUM(quantity) as total_quantity, MAX(unit) as unit FROM medicine_usages WHERE 1=1";
      let medParams = [];
      if (startDate && endDate) {
        medQuery += " AND used_at >= ? AND used_at <= ?";
        medParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
      }
      medQuery += " GROUP BY medicine_name ORDER BY total_quantity DESC";
      const [medicineUsage] = await pool.query(medQuery, medParams);

      return reply.send({
        success: true,
        data: {
          activePigs: activePigs.map(p => ({ ...p, count: Number(p.count) })),
          deadPigs: Number(dead[0].total || 0),
          soldPigs: Number(sales[0].soldPigs || 0),
          revenue: Number(sales[0].revenue || 0),
          barnStats: {
            total_barns: Number(barnStats[0].total_barns || 0),
            total_capacity: Number(barnStats[0].total_capacity || 0)
          },
          feedUsage: feedUsage.map(f => ({ ...f, total_kg: Number(f.total_kg) })),
          pendingReports: Number(pendingReports[0].total || 0),
          revenueTrend: revenueTrend.map(r => ({ date: r.date, revenue: Number(r.revenue) })),
          vaccineStats: vaccineStats.map(v => ({ ...v, total_doses: Number(v.total_doses) })),
          medicineUsage: medicineUsage.map(m => ({ ...m, total_quantity: Number(m.total_quantity) }))
        }
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải báo cáo tổng quan' });
    }
  }
};