export function indianMobile(input: string | null | undefined): { ok: true; digits: string; e164: string } | { ok: false; error: string } {
  if (!input || !String(input).trim()) return { ok: false, error: "Enter your mobile number." };
  let digits = String(input).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return { ok: false, error: "Enter a 10-digit Indian mobile number." };
  return { ok: true, digits, e164: `+91${digits}` };
}

export function normalizePhone(input: string | null | undefined) {
  const mobile = indianMobile(input);
  if (mobile.ok) return mobile.e164;
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

export function displayPhone(phone: string | null | undefined) {
  if (!phone) return "Not added";
  if (phone.startsWith("+91") && phone.length === 13) return phone.slice(3);
  return phone;
}
