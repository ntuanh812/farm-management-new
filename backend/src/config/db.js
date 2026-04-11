import mysql from 'mysql2/promise'

// Tạo pool kết nối — dùng chung toàn app, không tạo mới mỗi request
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'farmpro_pig',
  waitForConnections: true,
  connectionLimit: 10,
})

export default pool
