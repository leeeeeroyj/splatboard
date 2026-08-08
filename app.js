/* Splatboard -- renders splatboard.json. No dependencies, no build step. */

const CREATURES = ["🦑", "🐙", "🦐", "🦀", "🐡", "🐠", "🦞", "🐟", "🌊", "💥", "🎯", "⭐"];

const TROPHY = "🏆";
const WALL_LIMIT = 10;   // the wall is a podium, not a directory -- search finds the rest
const PAGE_SIZE = 20;

let RANKED = [];         // every player, rank attached before any slicing
let RECENT = [];         // the full history, newest first
let query = "";
let page = 1;

/* Same name always gets the same creature, so a player keeps their face
   between exports. A hash, not an index -- ranks shuffle as counts change. */
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

/* Names are shown in the game's own lettering, either as live text in a subset
   of the face or as outlines rendered at export time -- config's
   web.name_style picks, and export.py writes the output to match.

   Either way an entry without a `wordmark` is set as text, so this branch
   serves both: in font mode nothing has one. A scoreboard must never drop a
   player just because it can't style them. */
function nameNode(entry, className) {
  if (entry.wordmark) {
    const img = document.createElement("img");
    img.className = className;
    img.src = entry.wordmark;
    img.alt = entry.name;                  // the name stays readable as text
    img.loading = "lazy";
    return img;
  }
  const span = document.createElement("span");
  span.className = className + " plain";
  span.textContent = entry.name;           // textContent: names are user data
  return span;
}

/* Plain substring, deliberately. Nametags are already stylised unicode
   (`☆Vαмρlιηg☆`), so anything cleverer would be guessing at what someone meant
   to type rather than matching what they did. */
function matches(name) {
  return !query || name.toLowerCase().includes(query);
}

function emptyNote(text) {
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = text;              // textContent: `text` can carry the query
  return p;
}

/* Scaled against the board leader, not the leader of this view, so a meter means
   the same thing whether or not a search is running. */
function meterFor(p) {
  const meter = document.createElement("div");
  meter.className = "meter";
  const fill = document.createElement("span");
  fill.style.width = `${Math.max(3, (p.splats / RANKED[0].splats) * 100)}%`;
  meter.append(fill);
  return meter;
}

/* `badge` is the corner mark -- a rank, a trophy, or null for no mark. */
function playerCard(p, badge) {
  const card = document.createElement("article");
  card.className = "card" + (p.rank <= 3 ? " podium" : "");

  if (badge) {
    const mark = document.createElement("span");
    mark.className = badge === TROPHY ? "rank trophy" : "rank";
    mark.textContent = badge;
    card.append(mark);
  }

  // A real avatar off the results scoreboard when there is one, and the
  // generated creature when there isn't. Both branches have to keep working:
  // an avatar only exists for players seen on a scoreboard, so anyone splatted
  // before match tracking existed -- or in a match whose results were missed --
  // still needs a face.
  const face = document.createElement("div");
  face.className = "face";
  if (p.avatar) {
    const img = document.createElement("img");
    img.src = p.avatar;
    img.alt = "";
    img.loading = "lazy";
    img.width = 96;
    img.height = 96;
    // If the file is missing the card falls back rather than showing a broken
    // image, since the JSON and the folder are written separately.
    img.addEventListener("error", () => {
      face.textContent = creatureFor(p.name);
    });
    face.classList.add("photo");
    face.append(img);
  } else {
    face.textContent = creatureFor(p.name);
  }

  const name = document.createElement("h3");
  name.append(nameNode(p, "namemark"));

  const count = document.createElement("p");
  count.className = "count";
  const n = document.createElement("b");
  n.textContent = p.splats;
  count.append(n, document.createTextNode(p.splats === 1 ? " splat" : " splats"));

  // The player's own splashtag where the meter used to be. Without one the card
  // falls back to the meter: a tag only exists for someone seen on an intro
  // screen, and a card with a blank strip would read as broken.
  let footer;
  if (p.splashtag) {
    footer = document.createElement("img");
    footer.className = "splashtag";
    footer.src = p.splashtag;
    footer.alt = "";
    footer.loading = "lazy";
    footer.addEventListener("error", () => footer.replaceWith(meterFor(p)));
  } else {
    footer = meterFor(p);
  }

  card.append(face, name, count, footer);
  if (p.last) card.title = `Last splatted ${whenText(p.last)}`;
  return card;
}

/* Career figures, rendered only where there is something to say. A stat that
   has never been recorded is left out rather than shown as a dash: an empty row
   reads as a broken number, where an absent one reads as "not yet". */
function renderCareer(totals, career) {
  const c = career || {};
  const quickest = c.quickest_splat;
  const rows = [
    ["Total Splats", totals.splats ?? 0],
    ["Unique Players", totals.unique_players ?? 0],
    ["Matches", c.matches],
    ["Record", c.wins != null
      ? `${c.wins}W ${c.losses}L${c.draws ? ` ${c.draws}D` : ""}` : null],
    ["Best Match", c.best_splats],
    ["Splats / Match", c.avg_splats],
    ["Best Turf", c.best_points != null ? `${c.best_points}p` : null],
    ["Average Turf", c.avg_points != null ? `${c.avg_points}p` : null],
    ["Quickest Splat", quickest ? `${quickest.seconds}s` : null],
    ["Quickest Victim", quickest ? quickest.name : null],
    ["Assists", totals.assists],
    ["Disconnects", c.disconnects],
  ].filter(([, value]) => value !== null && value !== undefined);

  // Each pair is its own box so the value can sit above its label without
  // breaking the term/definition pairing a <dl> is for -- CSS reverses them.
  const list = document.getElementById("career");
  list.replaceChildren();
  for (const [label, value] of rows) {
    const cell = document.createElement("div");
    cell.className = "stat";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = String(value);       // textContent: a name lands in here
    cell.append(dt, dd);
    list.append(cell);
  }
}

/* Ten cards unfiltered; a search shows every hit instead, because the whole
   point of searching is to find yourself wherever you actually sit. */
function renderWall() {
  const wall = document.getElementById("wall");
  wall.replaceChildren();

  const shown = query ? RANKED.filter((p) => matches(p.name)) : RANKED.slice(0, WALL_LIMIT);

  if (!shown.length) {
    wall.append(emptyNote(query ? "No player matches that name." : "No splats yet."));
    return;
  }

  for (const p of shown) {
    // The leader gets the trophy: "#1" would only repeat what first place
    // already says. Off the podium a badge is noise -- under a search it's
    // the answer, so every hit carries its real position.
    const badge = p.rank === 1 ? TROPHY : p.rank <= 3 || query ? `#${p.rank}` : null;
    wall.append(playerCard(p, badge));
  }
}

function renderRecent() {
  // Hidden on an empty history, but not on an empty search -- a section that
  // vanishes as you type reads as a bug.
  document.getElementById("recent-section").hidden = !RECENT.length;
  if (!RECENT.length) return;

  const hits = RECENT.filter((r) => matches(r.name));
  const pages = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  page = Math.min(Math.max(1, page), pages);
  const start = (page - 1) * PAGE_SIZE;

  const list = document.getElementById("recent");
  list.replaceChildren();
  list.start = start + 1;            // keeps numbering global if it's ever shown

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
  // Points CSS at the shipped face, and is the only thing that does -- so an
  // export that shipped no font leaves the family unreferenced and unfetched.
  document.documentElement.classList.toggle("font-names", Boolean(data.name_font));

  const totals = data.totals || {};
  document.getElementById("generated").textContent = whenText(data.generated_at) || "—";
  renderCareer(totals, data.career);

  const players = data.players || [];
  RANKED = players.map((p, i) => ({ ...p, rank: i + 1 }));
  RECENT = data.recent || [];

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

  renderWall();
  renderRecent();
}

fetch("splatboard.json", { cache: "no-store" })
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
