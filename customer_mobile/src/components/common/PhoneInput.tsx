import { APP_CONFIG } from "../../constants";
import { TextField } from "./TextField";

interface PhoneInputProps {
  value: string;
  onChangeText: (value: string) => void;
  errorMessage?: string;
}

export function PhoneInput({ value, onChangeText, errorMessage }: PhoneInputProps) {
  return (
    <TextField
      label="Số điện thoại"
      keyboardType="phone-pad"
      value={value}
      onChangeText={onChangeText}
      errorMessage={errorMessage}
      placeholder={`${APP_CONFIG.defaultCountryCode} 0xxxxxxxx`}
      maxLength={10}
    />
  );
}
