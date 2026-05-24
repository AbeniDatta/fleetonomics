/** Deterministic pseudo heat values for UI demo (0–1). */
export function fatigueHeatGrid(rows: number, cols: number): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const v = ((Math.sin((r + 1) * 1.7 + (c + 1) * 0.9) + 1) / 2) * 0.85 + ((r * c) % 7) / 100;
      row.push(Math.min(1, Math.max(0, v)));
    }
    out.push(row);
  }
  return out;
}
