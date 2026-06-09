// Hàm tính toán thời gian tương đối (VD: Vừa xong, 5 phút trước)
export function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const time = new Date(dateString).getTime();
  if (Number.isNaN(time)) return "";
  const diffMs = Date.now() - time;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} ngày trước`;
}