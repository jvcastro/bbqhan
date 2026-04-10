/** Amounts stored as integer centavos (1 PHP = 100 centavos). */
export function formatPhp(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const pesos = Math.floor(abs / 100);
  const centavos = abs % 100;
  return `${sign}₱${pesos.toLocaleString("en-PH")}.${centavos.toString().padStart(2, "0")}`;
}

export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}
