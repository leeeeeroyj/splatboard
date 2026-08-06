/* Splatboard -- renders splatboard.json. No dependencies, no build step. */

const CREATURES = ["🦑", "🐙", "🦐", "🦀", "🐡", "🐠", "🦞", "🐟", "🌊", "💥", "🎯", "⭐"];

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

/* Names are shown in the game's own lettering, outlined at export time rather
   than set in a webfont (see lettering.py). Anything the font couldn't set has
   no `wordmark` and falls back to plain text -- a scoreboard must never drop a
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

function render(data) {
  const totals = data.totals || {};
  document.getElementById("total").textContent = totals.splats ?? 0;
  document.getElementById("unique").textContent = totals.unique_players ?? 0;
  document.getElementById("top").textContent = totals.top ?? "—";
  document.getElementById("generated").textContent = whenText(data.generated_at) || "—";

  const players = data.players || [];
  const wall = document.getElementById("wall");
  wall.replaceChildren();

  if (!players.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No splats yet.";
    wall.append(empty);
  }

  const most = players.length ? players[0].splats : 1;
  players.forEach((p, i) => {
    const card = document.createElement("article");
    card.className = "card" + (i < 3 ? " podium" : "");

    if (i < 3) {
      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = `#${i + 1}`;
      card.append(rank);
    }

    const face = document.createElement("div");
    face.className = "face";
    face.textContent = creatureFor(p.name);

    const name = document.createElement("h3");
    name.append(nameNode(p, "namemark"));

    const count = document.createElement("p");
    count.className = "count";
    const n = document.createElement("b");
    n.textContent = p.splats;
    count.append(n, document.createTextNode(p.splats === 1 ? " splat" : " splats"));

    const meter = document.createElement("div");
    meter.className = "meter";
    const fill = document.createElement("span");
    fill.style.width = `${Math.max(3, (p.splats / most) * 100)}%`;
    meter.append(fill);

    card.append(face, name, count, meter);
    if (p.last) card.title = `Last splatted ${whenText(p.last)}`;
    wall.append(card);
  });

  const recent = data.recent || [];
  if (recent.length) {
    document.getElementById("recent-section").hidden = false;
    const list = document.getElementById("recent");
    list.replaceChildren();
    for (const r of recent.slice(0, 20)) {
      const li = document.createElement("li");
      const who = document.createElement("span");
      who.className = "who";
      who.append(nameNode(r, "namemark small"));
      const when = document.createElement("time");
      when.textContent = whenText(r.ts);
      li.append(who, when);
      list.append(li);
    }
  }
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
