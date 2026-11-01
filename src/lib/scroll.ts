/** After a filter link is followed, bring the results into view (the hash change re-renders the list). */
export function scrollToResults() {
  requestAnimationFrame(() => {
    document.getElementById('search')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
}
