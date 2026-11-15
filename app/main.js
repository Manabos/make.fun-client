// The router. Four surfaces, each with its own hash route, so every view is linkable and
// the back button works. Rendering swaps the contents of <main> and never reloads the page;
// a view already shown is kept in memory for the life of the route change.
import { renderBoard, renderBounty, renderLeaderboard, renderProfile } from './views.js';

/** Signals to any screenshot script that the current route has finished painting. */
function shotReady(done) {
  window.__shotReady = done;
}

const NAV = [
  { hash: '#/', label: 'Board', match: (r) => r === '/' || r === '' },
  { hash: '#/bounties', label: 'Bounties', match: (r) => r.startsWith('/bount') },
  { hash: '#/u/lively-koala-76', label: 'Profile', match: (r) => r.startsWith('/u/') },
];

function paintNav(route) {
  const nav = document.getElementById('nav');
  const links = Array.from(nav.querySelectorAll('a'));
  for (const link of links) {
    link.classList.toggle('on', link.hash === '#/' ? route === '/' || route === '' : route.startsWith(link.hash.slice(1)));
  }
}

function parseRoute() {
  const raw = location.hash.replace(/^#/, '');
  const parts = raw.split('/').filter((p) => p !== '');
  return { raw, parts };
}

async function route() {
  const main = document.getElementById('view');
  const { raw, parts } = parseRoute();
  paintNav(raw);
  shotReady(false);

  try {
    if (parts.length === 0 || parts[0] === 'bounties') {
      await renderBoard(main);
    } else if (parts[0] === 'bounty' && parts.length >= 2) {
      const slug = decodeURIComponent(parts[1]);
      if (parts[2] === 'leaderboard') await renderLeaderboard(main, slug);
      else await renderBounty(main, slug);
    } else if (parts[0] === 'u' && parts.length >= 2) {
      await renderProfile(main, decodeURIComponent(parts[1]));
    } else {
      await renderBoard(main);
    }
  } catch (err) {
    main.replaceChildren(Object.assign(document.createElement('div'), {
      className: 'err',
      textContent: 'This view failed to render: ' + (err && err.message ? err.message : String(err)),
    }));
  } finally {
    shotReady(true);
    window.scrollTo(0, 0);
  }
}

export function start() {
  const nav = document.getElementById('nav');
  for (const item of NAV) {
    nav.append(Object.assign(document.createElement('a'), { href: item.hash, textContent: item.label }));
  }
  window.addEventListener('hashchange', () => { void route(); });
  void route();
}

// The page loads this module as its only entry point, so it boots itself.
start();

