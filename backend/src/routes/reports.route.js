import pool from '../config/db.js';
import { protect } from '../middleware/auth.js';

export default async function reportsRoute(app) {
  // GET /api/reports/farm-overview
  app.get('/farm-overview', { preHandler: protect('ADMIN') }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;
      
      // Hàm hỗ trợ build điều kiện mốc thời gian
      const getDateCondition = (column) => {
        if (startDate && endDate) {
          return `WHERE ${column} >= '${startDate} 00:00:00' AND ${column} <= '${endDate} 23:59:59'`;
        }
        return '';
      };

      const getAndDateCondition = (column) => {
        if (startDate && endDate) {
          return `AND ${column} >= '${startDate} 00:00:00' AND ${column} <= '${endDate} 23:59:59'`;
        }
        return '';
      };

      // 1. Tổng số lợn đang nuôi (Không bị ảnh hưởng bởi thời gian)
      const [activePigs] = await pool.query(`
        SELECT category, COUNT(*) as count 
        FROM pigs 
        WHERE lifecycle_status = 'ACTIVE' 
        GROUP BY category
      `);

      // 2. Tổng số lợn chết
      const [deadPigs] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM pig_deaths 
        ${getDateCondition('death_date')}
      `);

      // 3. Doanh thu xuất bán (Lãi = Giá bán - Giá nhập)
      const [soldData] = await pool.query(`
        SELECT COUNT(*) as count, SUM(l.total_amount - COALESCE(p.purchase_price, 0)) as revenue 
        FROM sale_batch_lines l
        JOIN sale_batches b ON l.sale_batch_id = b.id
        LEFT JOIN pigs p ON l.ear_tag = p.pig_code
        ${getDateCondition('b.sold_at')}
      `);

      // 4. Chuồng trại (sức chứa tổng)
      const [barnStats] = await pool.query(`
        SELECT COUNT(*) as total_barns, SUM(capacity) as total_capacity 
        FROM barns 
        WHERE status = 'ACTIVE'
      `);

      // 5. Tiêu thụ vật tư (cám)
      const [feedUsage] = await pool.query(`
        SELECT feed_type, SUM(quantity_kg) as total_kg 
        FROM feed_usages 
        WHERE 1=1 ${getAndDateCondition('used_at')}
        GROUP BY feed_type
      `);

      // 6. Thú y (Báo cáo bệnh chờ xử lý)
      const [pendingReports] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM pig_reports 
        WHERE status = 'cho_xu_ly' ${getAndDateCondition('created_at')}
      `);

      // 8. Doanh thu 6 tháng gần nhất (Lãi)
      const [revenueTrend] = await pool.query(`
        SELECT DATE_FORMAT(sb.sold_at, '%m/%Y') AS month, COALESCE(SUM(sbl.total_amount - COALESCE(p.purchase_price, 0)), 0) AS revenue
        FROM sale_batches sb
        JOIN sale_batch_lines sbl ON sb.id = sbl.sale_batch_id
        LEFT JOIN pigs p ON sbl.ear_tag = p.pig_code
        GROUP BY month 
        ORDER BY MAX(sb.sold_at) DESC LIMIT 6
      `);

      return reply.send({
        success: true,
        data: {
          activePigs,
          deadPigs: deadPigs[0].count,
          soldPigs: soldData[0].count,
          revenue: soldData[0].revenue || 0,
          barnStats: barnStats[0],
          feedUsage,
          pendingReports: pendingReports[0].count,
          revenueTrend: revenueTrend.reverse()
        }
      });
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải dữ liệu báo cáo' });
    }
  });
}