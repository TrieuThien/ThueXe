import { confirmPaymentByCode } from "./paymentGatewayService.js";

export async function confirmSandboxPaymentOnRedirect(code) {
    await confirmPaymentByCode(code);
}
