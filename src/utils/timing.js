export function startTimer() {
  const t0 = Date.now();
  return () => Date.now() - t0;
}
