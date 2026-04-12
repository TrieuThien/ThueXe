import { getFriendlyErrorMessage } from "../services";

export function getApiErrorMessage(error: unknown): string {
  return getFriendlyErrorMessage(error);
}
