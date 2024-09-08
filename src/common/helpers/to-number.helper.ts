export function toNumber(value: string): number {
  try {
    return parseInt(value);
  } catch (error) {
    console.log(error);
  }
}
