import "dotenv/config";
import mysql from 'mysql2/promise'; // Sử dụng bản /promise để code gọn hơn

// Tạo pool kết nối trực tiếp bằng bản promise
// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',      
//   password: process.env.DB_PASSWORD || '', 
//   database: process.env.DB_NAME || 'thuexe',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });


export const pool = mysql.createPool(process.env.DATABASE_URL);

async function checkConnection() {
  try {
    // Thực hiện truy vấn đơn giản để kiểm tra kết nối
    await pool.query('SELECT 1');
    console.log('Connected to SQL Database successfully!');
  } catch (err) {
    console.error('Error connecting to SQL Database:', err.message);
  }
}

checkConnection();

export default pool;