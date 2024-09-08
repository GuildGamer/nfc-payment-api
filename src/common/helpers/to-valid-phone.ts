export function toValidPhoneNumber(value: string): string {
  if (value[0] === '0') {
    return value.substring(0, 0) + '+234' + value.substring(0 + 1);
  }

  return value;
}
