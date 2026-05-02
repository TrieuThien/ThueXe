import { confirmSandboxPaymentOnRedirect } from "../services/paymentResultService.js";

export async function paymentResultHandler(req, res) {
    const status    = String(req.query.status || "success").toLowerCase();
    const code      = String(req.query.code   || "").trim();
    const isSuccess = status === "success";
    const isCancel  = status === "cancel";

    if (isSuccess && code) {
        try {
            await confirmSandboxPaymentOnRedirect(code);
        } catch (_) {
            // Lỗi xác nhận không chặn trang kết quả hiển thị
        }
    }

    const icon    = isSuccess ? "✅" : isCancel ? "⚠️" : "❌";
    const title   = isSuccess ? "Thanh toán thành công" : isCancel ? "Đã hủy thanh toán" : "Thanh toán thất bại";
    const message = isSuccess
        ? "Giao dịch đã được xác nhận. Số dư ví ThueXe của bạn đã được cập nhật."
        : isCancel
        ? "Bạn đã hủy giao dịch. Không có khoản tiền nào bị trừ."
        : "Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.";
    const bg    = isSuccess ? "#f0fdf4" : isCancel ? "#fffbeb" : "#fef2f2";
    const color = isSuccess ? "#15803d" : isCancel ? "#92400e" : "#b91c1c";

    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: ${bg}; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; padding: 24px; }
    .card { background: #fff; border-radius: 20px; padding: 40px 32px; text-align: center;
            max-width: 400px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: ${color}; margin-bottom: 12px; }
    p { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 28px; }
    button { background: ${color}; color: #fff; border: none; border-radius: 12px;
             padding: 14px 28px; font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <button onclick="window.close()">Đóng trang này</button>
  </div>
</body>
</html>`);
}
