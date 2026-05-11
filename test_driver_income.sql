-- SQL script để cập nhật test data cho driver income testing
-- Cập nhật các bookings existing để có driver_id = 1 và tính toán doanh thu

-- 1. Cập nhật driver_id cho các bookings (gán cho driver_id = 1)
UPDATE bookings 
SET driver_id = 1 
WHERE id IN (1, 2, 3, 4, 5);

-- 2. Cập nhật actual_cost và status = 3 (completed) cho bookings hôm nay (2026-05-11)
UPDATE bookings 
SET 
  actual_cost = 163600,  -- Thiết lập actual_cost
  status = 3,             -- Set to completed
  date_completed = NOW()  -- Set date_completed to now
WHERE id = 5 AND DATE(date_created) = CURDATE();

-- 3. Kiểm tra kết quả
SELECT 
  id,
  driver_id,
  user_id,
  estimated_cost,
  actual_cost,
  date_created,
  date_completed,
  status,
  driver_commision
FROM bookings
WHERE driver_id = 1
ORDER BY id;

-- 4. Query Income Summary (thử trực tiếp)
SELECT
    COUNT(*) AS total_trips,
    SUM(CASE WHEN DATE(b.date_created) = CURDATE() THEN 1 ELSE 0 END) AS today_trips,
    SUM(ROUND(COALESCE(NULLIF(b.actual_cost, 0), b.estimated_cost, 0) * b.driver_commision / 100, 2)) AS total_earnings,
    SUM(CASE WHEN DATE(b.date_created) = CURDATE()
             THEN ROUND(COALESCE(NULLIF(b.actual_cost, 0), b.estimated_cost, 0) * b.driver_commision / 100, 2)
             ELSE 0 END) AS today_earnings
FROM bookings b
WHERE b.driver_id = 1;
