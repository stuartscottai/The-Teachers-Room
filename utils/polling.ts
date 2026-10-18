// Schedule the next refresh only after the current one finishes. Returning to
// the tab refreshes immediately, without overlapping an in-flight request.
export const startPolling = (refresh: () => Promise<number>) => {
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    if (stopped || running) return;
    if (timer) clearTimeout(timer);
    running = true;
    let delay = 5000;
    try {
      delay = await refresh();
    } catch (error) {
      console.warn('Refresh failed; retrying shortly.', error);
    } finally {
      running = false;
      if (!stopped) timer = setTimeout(run, delay);
    }
  };
  const onVisible = () => {
    if (!document.hidden) void run();
  };
  document.addEventListener('visibilitychange', onVisible);
  void run();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
};
