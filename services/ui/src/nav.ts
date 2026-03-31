const NAV_EVENT = 'bersn:navigate';

export function navigate(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event(NAV_EVENT));
}

export function subscribeNavigation(listener: () => void): () => void {
  window.addEventListener('popstate', listener);
  window.addEventListener(NAV_EVENT, listener);

  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(NAV_EVENT, listener);
  };
}
