/** Keep the camera scene inside the fullscreen surface: browsers lock the
 * fullscreen element's own transform, so it cannot serve as the zoom camera. */
export const requestGameFullscreen = (container: HTMLElement | null): Promise<void> => {
  const viewport = container?.closest<HTMLElement>('.gameplay-viewport') || container;
  return viewport ? viewport.requestFullscreen() : Promise.resolve();
};
