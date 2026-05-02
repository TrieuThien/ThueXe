import { handleSepayIpn, getSepayCheckoutHtml, handleMomoIpn } from "../services/paymentGatewayService.js";

export async function momoIpnGatewayHandler(req, res, next) {
    try {
        const result = await handleMomoIpn(req.body);
        return res.status(200).json(result);
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ resultCode: 1, message: "Invalid signature" });
        }
        next(error);
    }
}

export async function sepayIpnGatewayHandler(req, res, next) {
    try {
        await handleSepayIpn(req.body);
        return res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
}

export async function sepayCheckoutGatewayHandler(req, res, next) {
    try {
        const code = String(req.query.code || "").trim();
        if (!code) return res.status(400).send("Missing payment code.");

        const html = await getSepayCheckoutHtml(code);
        res.setHeader(
            "Content-Security-Policy",
            "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action https://pay-sandbox.sepay.vn https://pay.sepay.vn"
        );
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
    } catch (error) {
        return next(error);
    }
}
