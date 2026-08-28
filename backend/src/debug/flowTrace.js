/** Dev-only: POST play path to Vite so the agent can tail it. No keys. */
export function flowTrace(event) {
  if (!import.meta.env.DEV) return;
  const payload = { t: Date.now(), ...event };
  console.info('[flow-trace]', payload);
  fetch('/__flow-trace', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
