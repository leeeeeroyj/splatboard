const CREATURES = ["🦑", "🐙", "🦐", "🦀", "🐡", "🐠", "🦞", "🐟", "🌊", "💥", "🎯", "⭐"];
const TROPHY = "🏆";
const WALL_LIMIT = 10;
const PAGE_SIZE = 20;
let RANKED = [];
let RECENT = [];
let query = "";
let page = 1;
function creatureFor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return CREATURES[h % CREATURES.length];
}
function whenText(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  if (isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days}d ago` : then.toLocaleDateString();
}
function nameNode(entry, className) {
  if (entry.wordmark) {
    const img = document.createElement("img");
    img.className = className;
    img.src = entry.wordmark;
    img.alt = entry.name;
    img.loading = "lazy";
    return img;
  }
  const span = document.createElement("span");
  span.className = className + " plain";
  span.textContent = entry.name;
  return span;
}
function matches(name) {
  return !query || name.toLowerCase().includes(query);
}
function emptyNote(text) {
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = text;
  return p;
}
function meterFor(p) {
  const meter = document.createElement("div");
  meter.className = "meter";
  const fill = document.createElement("span");
  fill.style.width = `${Math.max(3, (p.splats / RANKED[0].splats) * 100)}%`;
  meter.append(fill);
  return meter;
}
function faceNode(p) {
  const face = document.createElement("div");
  face.className = "face";
  if (p.avatar) {
    const img = document.createElement("img");
    img.src = p.avatar;
    img.alt = "";
    img.loading = "lazy";
    img.width = 96;
    img.height = 96;
    img.addEventListener("error", () => {
      face.textContent = creatureFor(p.name);
    });
    face.classList.add("photo");
    face.append(img);
  } else {
    face.textContent = creatureFor(p.name);
  }
  return face;
}
function countLine(...parts) {
  const line = document.createElement("p");
  line.className = "count";
  parts.forEach((part, i) => {
    if (i % 2) {
      line.append(document.createTextNode(part));
    } else {
      const figure = document.createElement("b");
      figure.textContent = part;
      line.append(figure);
    }
  });
  return line;
}
function splatLine(p) {
  return p.matches
    ? countLine(p.splats, " times in ", p.matches,
                p.matches === 1 ? " match" : " matches")
    : countLine(p.splats, p.splats === 1 ? " splat" : " splats");
}
function playerCard(p, badge) {
  const card = document.createElement("article");
  card.className = "card" + (p.rank <= 3 ? " podium" : "");
  if (badge) {
    const mark = document.createElement("span");
    mark.className = badge === TROPHY ? "rank trophy" : "rank";
    mark.textContent = badge;
    card.append(mark);
  }
  const face = faceNode(p);
  const name = document.createElement("h3");
  name.append(nameNode(p, "namemark"));
  const count = splatLine(p);
  const met = metLines(p);
  let tag;
  if (p.splashtag) {
    tag = document.createElement("img");
    tag.className = "splashtag";
    tag.src = p.splashtag;
    tag.alt = "";
    tag.loading = "lazy";
    tag.addEventListener("error", () => tag.replaceWith(meterFor(p)));
  } else {
    tag = meterFor(p);
  }
  const front = document.createElement("div");
  front.className = "card-front";
  front.append(face, name, count, tag);
  if (met) front.append(met);
  const inner = document.createElement("div");
  inner.className = "card-inner";
  inner.append(front);
  const back = cardBack(p);
  if (back) {
    inner.append(back);
    makeFlippable(card, `${p.name} — more`);
  }
  card.append(inner);
  if (p.last) card.title = `Last splatted ${whenText(p.last)}`;
  return card;
}
function stat(label, value) {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  return [dt, dd];
}
function record(block) {
  return `${block.wins}-${block.losses}`;
}
function theirRecord(block) {
  return `${block.losses}-${block.wins}`;
}
function metLines(p) {
  if (!p.met) return null;
  const seen = [p.met.first, p.met.last].map((when) =>
    `${new Date(when.at).toLocaleDateString()} - `
    + (when.side === "with" ? "Good Guy" : "Bad Guy"));
  const rows = seen[0] === seen[1]
    ? [["Seen", seen[0]]]
    : [["First seen", seen[0]], ["Last seen", seen[1]]];
  const list = document.createElement("dl");
  list.className = "met";
  for (const [label, when] of rows) {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = `${label}:`;
    const dd = document.createElement("dd");
    dd.textContent = when;
    row.append(dt, dd);
    list.append(row);
  }
  return list;
}
function cardBack(p) {
  if (!p.versus && !p.alongside) return null;
  const back = document.createElement("div");
  back.className = "card-back";
  if (p.versus) {
    const list = document.createElement("dl");
    list.className = "record-list";
    list.append(...stat("faced", p.versus.matches),
                ...stat("their record", theirRecord(p.versus)));
    if (p.best_match) list.append(...stat("best", p.best_match));
    if (p.per_match) list.append(...stat("average", p.per_match));
    back.append(heading("Bad Guy Stats"), list);
  }
  if (p.alongside) {
    const list = document.createElement("dl");
    list.className = "record-list";
    list.append(...stat("together", p.alongside.matches),
                ...stat("our record", record(p.alongside)));
    if (p.alongside.their_best != null) {
      list.append(...stat("their best", p.alongside.their_best));
    }
    if (p.alongside.their_splats != null) {
      list.append(...stat("average", p.alongside.their_splats));
    }
    back.append(heading("Good Guy Stats"), list);
  }
  return back;
}
function heading(text) {
  const head = document.createElement("h4");
  head.textContent = text;
  return head;
}
function makeFlippable(card, label) {
  card.classList.add("flippable");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", "false");
  card.setAttribute("aria-label", label);
  const toggle = () => {
    const open = card.classList.toggle("flipped");
    card.setAttribute("aria-pressed", String(open));
  };
  card.addEventListener("click", toggle);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  });
}
function renderCareer(totals, career) {
  const c = career || {};
  const blocks = [
    [
      ["Matches", c.matches],
      ["Record", c.wins != null
        ? `${c.wins}W ${c.losses}L${c.draws ? ` ${c.draws}D` : ""}` : null],
      ["Disconnects", c.disconnects],
      ["Total Splats", totals.splats ?? 0],
      ["Assists", totals.assists],
      ["Unique Victims", totals.unique_players ?? 0],
    ],
    [
      ["Best Match", c.best_splats],
      ["Best Turf", c.best_points != null ? `${c.best_points}p` : null],
      ["Splats / Match", c.avg_splats],
      ["Average Turf", c.avg_points != null ? `${c.avg_points}p` : null],
    ],
  ];
  const wrap = document.getElementById("career");
  wrap.replaceChildren();
  for (const rows of blocks) {
    const shown = rows.filter(([, v]) => v !== null && v !== undefined);
    if (!shown.length) continue;
    const list = document.createElement("dl");
    list.className = "career";
    for (const [label, value] of shown) {
      const cell = document.createElement("div");
      cell.className = "stat";
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = String(value);
      cell.append(dt, dd);
      list.append(cell);
    }
    wrap.append(list);
  }
}
function plural(n, one, many) {
  return n === 1 ? one : (many || `${one}s`);
}
const AWARDS = [
  { key: "assassin", art: "assets/svg/h-splat-assassin.svg", title: "Splat Assassin",
    blurb: "Most splats recorded",
    line: (a) => [a.splats, plural(a.splats, " splat") + " in ", a.matches,
                  plural(a.matches, " match", " matches")] },
  { key: "public_enemy", art: "assets/svg/h-public-enemy.svg", title: "Public Enemy",
    blurb: "Most splats against my team",
    line: (a) => [a.splats, plural(a.splats, " splat") + " Good Guys splatted"] },
  { key: "quickest", art: "assets/svg/h-fastest-splat.svg", title: "Fastest Splat",
    blurb: "…LEEEEROYJ got 'em fast!",
    line: (a) => [`${a.seconds}s`, " into a match"] },
  { key: "nemesis", art: "assets/svg/h-nemesis.svg", title: "Nemesis",
    blurb: "Frequent Bad Guy",
    line: (a) => [a.matches, plural(a.matches, " match", " matches") + " faced"] },
  { key: "turf_king", art: "assets/svg/h-turf-king.svg", title: "Turf King",
    blurb: "Inks the most turf, match for match",
    line: (a) => [`${a.avg_points}p`, " a match"] },
  { key: "hard_to_kill", art: "assets/svg/h-hard-to-kill.svg", title: "Hard to Kill",
    blurb: "Most likely to survive",
    line: (a) => [a.their_deaths, " times a match"] },
  { key: "lucky_charm", art: "assets/svg/h-lucky-charm.svg", title: "Lucky Charm",
    blurb: "Teammate I win with the most",
    line: (a) => [a.wins, " of ", a.matches, " won together"] },
  { key: "boogeyman", art: "assets/svg/h-boogeyman.svg", title: "Boogeyman",
    blurb: "Beat me the most",
    line: (a) => [a.losses, plural(a.losses, " loss", " losses") + " against them"] },
  { key: "squad", art: "assets/svg/h-top-squad.svg", title: "Top Squad", wide: true,
    blurb: (owner) => `${owner || "My"}'s top teammates.` },
];
function laureate(who, line) {
  const block = document.createElement("div");
  block.className = "laureate";
  block.append(faceNode(who), nameNode(who, "namemark"), line);
  return block;
}
function squadSeats(squad) {
  const list = document.createElement("ul");
  list.className = "squad-list";
  for (const mate of squad) {
    const li = document.createElement("li");
    li.append(faceNode(mate), nameNode(mate, "namemark small"),
              countLine(mate.matches, plural(mate.matches, " match", " matches")));
    if (mate.wins != null) li.append(countLine(record(mate)));
    list.append(li);
  }
  return list;
}
function renderAwards(data, squad) {
  const row = document.getElementById("awards");
  row.replaceChildren();
  for (const award of AWARDS) {
    const won = award.key === "squad" ? squad : (data.awards || {})[award.key];
    if (!won || (Array.isArray(won) && !won.length)) continue;
    const block = document.createElement("div");
    block.className = "award" + (award.wide ? " wide" : "");
    const head = document.createElement("h2");
    const art = document.createElement("img");
    art.className = "heading";
    art.src = award.art;
    art.alt = award.title;
    head.append(art);
    const blurb = document.createElement("p");
    blurb.className = "blurb";
    blurb.textContent = typeof award.blurb === "function"
      ? award.blurb(data.owner) : award.blurb;
    const card = document.createElement("article");
    card.className = "card award-card";
    card.append(award.key === "squad"
      ? squadSeats(won)
      : laureate(won, countLine(...award.line(won))));
    block.append(head, blurb, card);
    row.append(block);
  }
  document.getElementById("awards-section").hidden = !row.children.length;
}
function renderWall() {
  const wall = document.getElementById("wall");
  wall.replaceChildren();
  const shown = query ? RANKED.filter((p) => matches(p.name)) : RANKED.slice(0, WALL_LIMIT);
  if (!shown.length) {
    wall.append(emptyNote(query ? "No player matches that name." : "No splats yet."));
    return;
  }
  for (const p of shown) {
    const badge = p.rank === 1 ? TROPHY : `#${p.rank}`;
    wall.append(playerCard(p, badge));
  }
}
function renderRecent() {
  document.getElementById("recent-section").hidden = !RECENT.length;
  if (!RECENT.length) return;
  const hits = RECENT.filter((r) => matches(r.name));
  const pages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), pages);
  const start = (page - 1) * PAGE_SIZE;
  const list = document.getElementById("recent");
  list.replaceChildren();
  list.start = start + 1;
  const note = document.getElementById("recent-empty");
  note.hidden = hits.length > 0;
  note.textContent = "No splats by that name.";
  for (const r of hits.slice(start, start + PAGE_SIZE)) {
    const li = document.createElement("li");
    const who = document.createElement("span");
    who.className = "who";
    who.append(nameNode(r, "namemark small"));
    const when = document.createElement("time");
    when.textContent = whenText(r.ts);
    li.append(who, when);
    list.append(li);
  }
  document.getElementById("recent-pager").hidden = pages < 2;
  document.getElementById("page-label").textContent = `Page ${page} of ${pages}`;
  document.getElementById("prev").disabled = page === 1;
  document.getElementById("next").disabled = page === pages;
}
function render(data) {
  document.documentElement.classList.toggle("font-names", Boolean(data.name_font));
  const totals = data.totals || {};
  document.getElementById("generated").textContent = whenText(data.generated_at) || "—";
  renderCareer(totals, data.career);
  const players = data.players || [];
  RANKED = players.map((p, i) => ({ ...p, rank: i + 1 }));
  RECENT = data.recent || [];
  document.getElementById("wall-blurb").textContent = data.owner
    ? `Players splatted the most by ${data.owner}.`
    : "Players splatted the most.";
  document.getElementById("search").addEventListener("input", (e) => {
    query = e.target.value.trim().toLowerCase();
    page = 1;
    renderWall();
    renderRecent();
  });
  document.getElementById("prev").addEventListener("click", () => {
    page -= 1;
    renderRecent();
  });
  document.getElementById("next").addEventListener("click", () => {
    page += 1;
    renderRecent();
  });
  renderAwards(data, data.squad || []);
  renderWall();
  renderRecent();
}
fetch("assets/data/splatboard.json", { cache: "no-store" })
  .then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  })
  .then(render)
  .catch((err) => {
    document.getElementById("wall").innerHTML =
      '<p class="empty">Could not load splatboard.json.</p>';
    console.error(err);
  });
