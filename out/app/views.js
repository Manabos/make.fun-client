// The four surfaces. Each one builds its DOM into the element main.js hands it and returns
// when its data has rendered, so the screenshot hook (window.__shotReady) can wait for it.
import { ApiError, competitions, competition, submissions, profile } from './api.js';
import { usd, usdExact, timeLeft, when, score } from './format.js';

/* ------------------------------------------------------------------ helpers */

function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

function loading(host, label = 'Loading…') {
  host.replaceChildren(el('div', { class: 'loading', text: label }));
}

function failure(host, err, retry) {
  const message = err instanceof ApiError ? err.message : String(err);
  const box = el('div', { class: 'err' },
    el('strong', { text: 'Could not load this view. ' }),
    document.createTextNode(message));
  if (retry) {
    const again = el('button', { class: 'more', text: 'Try again' });
    again.addEventListener('click', () => { void retry(); });
    box.append(again);
  }
  host.replaceChildren(box);
}

function statePill(iso) {
  const t = timeLeft(iso);
  const label = t.state === 'closed' ? 'closed' : t.state === 'soon' ? 'closing' : 'open';
  return el('span', { class: `pill ${t.state === 'closed' ? 'closed' : t.state === 'soon' ? 'soon' : 'live'}`, text: label });
}

/** A competition's live pot: the reward the board shows. */
function potOf(c) {
  const pot = c.potUsd ?? c.rewardAmount ?? (typeof c.rewardAmount === 'number' ? c.rewardAmount : null);
  return pot;
}

function entryFeeOf(c) {
  const fee = c.entryFeeUsd ?? (Array.isArray(c.entryFeesUsd) ? c.entryFeesUsd[0] : null);
  if (fee === null || fee === undefined || Number(fee) === 0) return 'free';
  return usdExact(fee);
}

/* ------------------------------------------------------------------ board */

export async function renderBoard(host) {
  loading(host);
  let page;
  try {
    page = await competitions({ limit: 24 });
  } catch (err) {
    failure(host, err, () => renderBoard(host));
    return;
  }

  const items = Array.isArray(page.items) ? page.items : [];
  const now = Date.now();
  const live = items.filter((c) => timeLeft(c.deadline, now).state !== 'closed');
  const done = items.filter((c) => timeLeft(c.deadline, now).state === 'closed');

  const board = el('div', { class: 'board' });
  for (const c of live) board.append(boardCard(c, now));

  const totalPot = live.reduce((sum, c) => sum + (Number(potOf(c)) || 0), 0);

  host.replaceChildren(
    el('h1', { text: 'Live bounties' }),
    el('p', { class: 'sub' },
      `${live.length} open · ${usd(totalPot)} in rewards · ${live.reduce((s, c) => s + (c.submissionCount || 0), 0).toLocaleString('en-US')} entries`),
    live.length === 0 ? el('div', { class: 'empty', text: 'No open bounties right now.' }) : board,
    done.length > 0 ? el('h2', { text: 'Closed, awaiting results' }) : null,
    done.length > 0 ? el('div', { class: 'board' }, ...done.slice(0, 6).map((c) => boardCard(c, now))) : null,
  );
}

function boardCard(c, now) {
  const t = timeLeft(c.deadline, now);
  return el('a', { class: 'card', href: `#/bounty/${c.slug}` },
    el('div', { class: 'card-top' },
      el('span', { class: 'card-title', text: c.title }),
      el('span', { class: 'pot', text: usd(potOf(c)) })),
    el('div', { class: 'card-meta' },
      statePill(c.deadline),
      el('span', {}, el('b', { text: t.state === 'closed' ? t.text : t.text }), t.state === 'closed' ? null : ' left'),
      el('span', {}, 'fee ', el('b', { text: entryFeeOf(c) })),
      el('span', {}, el('b', { text: (c.submissionCount || 0).toLocaleString('en-US') }), ' entries'),
      c.category ? el('span', { text: c.category }) : null));
}

/* ------------------------------------------------------------------ bounty */

export async function renderBounty(host, slug) {
  loading(host);

  let c;
  try {
    c = await competition(slug);
  } catch (err) {
    failure(host, err, () => renderBounty(host, slug));
    return;
  }

  const now = Date.now();
  const t = timeLeft(c.deadline, now);
  const rewards = Array.isArray(c.rewardsNow) && c.rewardsNow.length > 0 ? c.rewardsNow
    : Array.isArray(c.rewards) ? c.rewards : [];

  const facts = el('dl', { class: 'facts' },
    el('div', { class: 'fact' },
      el('dt', { text: 'Live pot' }),
      el('dd', { text: usd(potOf(c)) })),
    el('div', { class: 'fact' },
      el('dt', { text: 'Time left' }),
      el('dd', { text: t.state === 'closed' ? 'closed' : t.text })),
    el('div', { class: 'fact' },
      el('dt', { text: 'Entry fee' }),
      el('dd', { class: 'small', text: entryFeeOf(c) })),
    el('div', { class: 'fact' },
      el('dt', { text: 'Entries' }),
      el('dd', { text: (c.submissionCount || 0).toLocaleString('en-US') })),
    el('div', { class: 'fact' },
      el('dt', { text: 'Deadline' }),
      el('dd', { class: 'small', text: when(c.deadline) })),
  );

  const sections = [];
  sections.push(el('div', { class: 'prose' },
    el('h3', { text: 'Summary' }),
    el('p', { text: c.summary || 'No summary published.' })));

  if (rewards.length > 0) {
    const list = el('ul', {});
    for (const r of rewards.slice(0, 12)) {
      const place = r.place ?? r.rank ?? '?';
      const amount = r.amountUsd ?? r.amount ?? r.value ?? r.prize_usd ?? null;
      list.append(el('li', {}, el('b', { text: `#${place}` }), ' — ', usdExact(amount)));
    }
    sections.push(el('div', { class: 'prose' },
      el('h3', { text: 'Rewards' }), list,
      el('p', {}, `Live pot ${usd(potOf(c))}.`)));
  }

  if (c.description) {
    const body = el('div', { class: 'prose' });
    body.append(el('h3', { text: 'Description' }));
    for (const para of String(c.description).split(/\n{2,}/).slice(0, 40)) {
      const trimmed = para.trim();
      if (trimmed === '') continue;
      if (trimmed.startsWith('#')) {
        body.append(el('h3', { text: trimmed.replace(/^#+\s*/, '') }));
      } else {
        body.append(el('p', { text: trimmed }));
      }
    }
    sections.push(body);
  }

  if (c.rules) {
    const body = el('div', { class: 'prose' });
    body.append(el('h3', { text: 'Rules' }));
    for (const para of String(c.rules).split(/\n{2,}/).slice(0, 30)) {
      const trimmed = para.trim();
      if (trimmed === '') continue;
      if (trimmed.startsWith('- ')) {
        body.append(el('ul', {}, ...trimmed.split('\n').map((line) => el('li', { text: line.replace(/^-\s*/, '') }))));
      } else if (trimmed.startsWith('#')) {
        body.append(el('h3', { text: trimmed.replace(/^#+\s*/, '') }));
      } else {
        body.append(el('p', { text: trimmed }));
      }
    }
    sections.push(body);
  }

  host.replaceChildren(
    el('div', { class: 'bounty-head' },
      el('h1', { text: c.title }),
      statePill(c.deadline),
      c.category ? el('span', { class: 'pill', text: c.category }) : null),
    facts,
    el('p', {},
      el('a', { href: `#/bounty/${c.slug}/leaderboard`, text: 'View the leaderboard →' })),
    ...sections,
  );
}

/* ------------------------------------------------------------------ leaderboard */

export async function renderLeaderboard(host, slug) {
  loading(host);

  let c;
  let page;
  try {
    [c, page] = await Promise.all([competition(slug), submissions(slug, { limit: 25 })]);
  } catch (err) {
    failure(host, err, () => renderLeaderboard(host, slug));
    return;
  }

  const rows = Array.isArray(page.items) ? page.items : [];
  const table = el('table', { class: 'lb' });

  const head = el('tr', {},
    el('th', { text: '#' }),
    el('th', { text: 'Entrant' }),
    el('th', { text: 'Entry' }),
    el('th', { text: 'Score' }),
    el('th', { text: 'Status' }));
  const thead = el('thead', {}, head);
  const tbody = el('tbody', {});

  for (const r of rows) {
    const rank = r.rank ?? null;
    const sc = r.score && typeof r.score === 'object' ? (r.score.value ?? r.score.display) : r.score;
    const handle = r.handle || 'unknown';
    tbody.append(el('tr', { class: rank !== null && rank <= 3 ? 'podium' : '' },
      el('td', { class: 'num', text: rank !== null ? String(rank) : '—' }),
      el('td', {}, el('a', { href: `#/u/${encodeURIComponent(handle)}`, text: handle })),
      el('td', { text: r.title || '—' }),
      el('td', { class: 'num', text: score(sc) }),
      el('td', { text: r.status || '—' })));
  }
  table.append(thead, tbody);

  const ranked = typeof page.ranked === 'number' ? page.ranked : rows.length;

  host.replaceChildren(
    el('h1', { text: `${c.title} — leaderboard` }),
    el('p', { class: 'sub' },
      `${ranked.toLocaleString('en-US')} ranked entries · ${usd(potOf(c))} pot · ` +
      (timeLeft(c.deadline).state === 'closed' ? 'closed' : timeLeft(c.deadline).text + ' left')),
    el('p', {}, el('a', { href: `#/bounty/${c.slug}`, text: '← Back to the bounty' })),
    rows.length === 0 ? el('div', { class: 'empty', text: 'No entries on the board yet.' }) : table,
  );
}

/* ------------------------------------------------------------------ profile */

export async function renderProfile(host, handle) {
  loading(host);

  let p;
  try {
    p = await profile(handle);
  } catch (err) {
    failure(host, err, () => renderProfile(host, handle));
    return;
  }

  const name = p.display_name || p.handle;
  const avatar = p.image || p.avatar;
  let avatarNode;
  if (avatar) {
    // The API serves avatars with CORP: same-origin, so the img must ask for CORS.
    const img = el('img', { class: 'avatar', crossorigin: 'anonymous', alt: '', loading: 'lazy' });
    img.src = avatar;
    img.addEventListener('error', () => {
      img.replaceWith(el('div', { class: 'avatar', text: String(name).slice(0, 1).toUpperCase() }));
    });
    avatarNode = img;
  } else {
    avatarNode = el('div', { class: 'avatar', text: String(name).slice(0, 1).toUpperCase() });
  }

  const kv = el('dl', { class: 'kv' },
    el('dt', { text: 'Handle' }), el('dd', { text: p.handle }),
    el('dt', { text: 'Display name' }), el('dd', { text: p.display_name || '—' }),
    el('dt', { text: 'Bio' }), el('dd', { text: p.bio || '—' }),
    el('dt', { text: 'Joined' }), el('dd', { text: when(p.joined_at) }),
    p.github_login ? el('dt', { text: 'GitHub' }) : null,
    p.github_login ? el('dd', { text: p.github_login }) : null,
    p.wallet && p.wallet.address ? el('dt', { text: 'Wallet' }) : null,
    p.wallet && p.wallet.address ? el('dd', {}, el('code', { text: p.wallet.address })) : null,
    el('dt', { text: 'House' }), el('dd', { text: p.house ? 'yes' : 'no' }),
  );

  host.replaceChildren(
    el('div', { class: 'profile-head' }, avatarNode, el('h1', { text: name })),
    el('div', { class: 'prose' }, kv),
    el('p', {}, el('a', { href: '#/', text: '← Back to the board' })),
  );
}
