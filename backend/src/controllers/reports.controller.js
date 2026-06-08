import prisma from '../config/prisma.js';

export const reportsController = {
  getOverview: async (request, reply) => {
    try {
      const { start_date, end_date } = request.query;

      // Chuẩn bị điều kiện lọc theo ngày chung
      let dateFilter = {};
      if (start_date && end_date) {
        dateFilter = {
          gte: new Date(`${start_date}T00:00:00.000Z`),
          lte: new Date(`${end_date}T23:59:59.999Z`)
        };
      }

      // 1. Lợn đang nuôi (Cơ cấu đàn)
      const activePigsAgg = await prisma.pigs.groupBy({
        by: ['category'],
        _count: { _all: true },
        where: { lifecycle_status: 'ACTIVE' }
      });
      const activePigs = activePigsAgg.map(p => ({
        category: p.category,
        count: p._count._all
      }));

      // 2. Lợn chết
      const dead_pigs = await prisma.pig_deaths.count({
        where: start_date && end_date ? { death_date: dateFilter } : {}
      });

      // 3. Xuất bán, Doanh thu & 7. Xu hướng doanh thu theo ngày
      const saleBatches = await prisma.sale_batches.findMany({
        where: start_date && end_date ? { sold_at: dateFilter } : {},
        include: {
          sale_batch_lines: {
            include: { pigs: true }
          }
        },
        orderBy: { sold_at: 'asc' }
      });

      let sold_pigs = 0;
      let revenue = 0;
      const revenueTrendMap = {};

      saleBatches.forEach(batch => {
        const soldAt = batch.sold_at;
        // Format ngày: DD/MM/YYYY
        const dateStr = [
          String(soldAt.getDate()).padStart(2, '0'),
          String(soldAt.getMonth() + 1).padStart(2, '0'),
          soldAt.getFullYear()
        ].join('/');

        if (!revenueTrendMap[dateStr]) {
          revenueTrendMap[dateStr] = { date: dateStr, revenue: 0, time: soldAt.getTime() };
        }

        batch.sale_batch_lines.forEach(line => {
          sold_pigs += 1;
          const purchasePrice = line.pigs?.purchase_price || 0;
          const profit = Number(line.total_amount || 0) - Number(purchasePrice);
          revenue += profit;
          revenueTrendMap[dateStr].revenue += profit;
        });
      });

      const revenue_trend = Object.values(revenueTrendMap)
        .sort((a, b) => a.time - b.time)
        .map(r => ({ date: r.date, revenue: r.revenue }));

      // 4. Chuồng trại (hiện tại)
      const barnAgg = await prisma.barns.aggregate({
        _count: { _all: true },
        _sum: { capacity: true },
        where: { status: { not: 'MAINTENANCE' } }
      });
      const barn_stats = {
        total_barns: barnAgg._count._all || 0,
        total_capacity: Number(barnAgg._sum.capacity || 0)
      };

      // 5. Tiêu thụ thức ăn
      const feedAgg = await prisma.feed_usages.groupBy({
        by: ['feed_id'],
        _sum: { quantity_kg: true },
        where: start_date && end_date ? { used_at: dateFilter } : {}
      });
      const feedIds = feedAgg.map(f => f.feed_id).filter(Boolean);
      const feedsInfo = await prisma.feeds.findMany({ where: { id: { in: feedIds } } });
      const feedMap = Object.fromEntries(feedsInfo.map(f => [f.id, f.name]));
      
      const feed_usage = feedAgg.map(f => ({
        feed_type: feedMap[f.feed_id] || 'Không xác định',
        total_kg: Number(f._sum.quantity_kg || 0)
      }));

      // 6. Báo cáo bệnh chờ xử lý (hiện tại)
      const pending_reports = await prisma.pig_reports.count({
        where: { status: 'cho_xu_ly' }
      });

      // 8. Thống kê mũi tiêm vaccine
      const vacAgg = await prisma.vaccine_usages.groupBy({
        by: ['vaccine_id'],
        _count: { _all: true },
        where: start_date && end_date ? { vaccinated_at: dateFilter } : {}
      });
      const vacIds = vacAgg.map(v => v.vaccine_id).filter(Boolean);
      const vaccinesInfo = await prisma.vaccines.findMany({ where: { id: { in: vacIds } } });
      const vacMap = Object.fromEntries(vaccinesInfo.map(v => [v.id, v.name]));
      
      const vaccine_stats = vacAgg.map(v => ({
        vaccine_name: vacMap[v.vaccine_id] || 'Không xác định',
        total_doses: v._count._all
      })).sort((a, b) => b.total_doses - a.total_doses);

      // 9. Thống kê sử dụng thuốc
      const medAgg = await prisma.medicine_usages.groupBy({
        by: ['medicine_id', 'unit'],
        _sum: { quantity: true },
        where: start_date && end_date ? { used_at: dateFilter } : {}
      });
      const medIds = medAgg.map(m => m.medicine_id).filter(Boolean);
      const medicinesInfo = await prisma.medicines.findMany({ where: { id: { in: medIds } } });
      const medMap = Object.fromEntries(medicinesInfo.map(m => [m.id, m.name]));
      
      const medicine_usage = medAgg.map(m => ({
        medicine_name: medMap[m.medicine_id] || 'Không xác định',
        total_quantity: Number(m._sum.quantity || 0),
        unit: m.unit || ''
      })).sort((a, b) => b.total_quantity - a.total_quantity);

      return reply.send({
        success: true,
        data: {
          active_pigs: activePigs,
          dead_pigs: dead_pigs,
          sold_pigs: sold_pigs,
          revenue: revenue,
          barn_stats: barn_stats,
          feed_usage: feed_usage,
          pending_reports: pending_reports,
          revenue_trend: revenue_trend,
          vaccine_stats: vaccine_stats,
          medicine_usage: medicine_usage
        }
      });
    } catch (error) {
      request.log?.error?.(error) || console.error(error);
      return reply.code(500).send({ success: false, message: 'Lỗi tải báo cáo tổng quan' });
    }
  }
};