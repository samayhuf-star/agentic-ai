const PLACEHOLDERS = new Set(["+919999999999", "+910000000000", "9999999999", "0000000000"]);

export function normalizePhone(input: string | null | undefined) {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

export function isPlaceholderPhone(phone: string) {
  return PLACEHOLDERS.has(phone) || PLACEHOLDERS.has(phone.replace(/\D/g, ""));
}

export function displayPhone(phone: string | null | undefined) {
  if (!phone) return "Not added";
  if (phone.startsWith("+91") && phone.length === 13) return phone.slice(3);
  return phone;
}
