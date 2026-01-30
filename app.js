/* FreeBeats MVP — funciona 100% no navegador (LocalStorage) */

const STORAGE_KEY = "freebeats_tracks_v1";

const $ = (sel) => document.querySelector(sel);

const listEl = $("#list");
const emptyEl = $("#emptyState");
const searchEl = $("#search");
const tagFilterEl = $("#tagFilter");
const clearAllBtn = $("#clearAll");

const dialog = $("#uploadDialog");
const openUploadBtn = $("#openUpload");
const closeUploadBtn = $("#closeUpload");
const cancelUploadBtn = $("#cancelUpload");
const uploadForm = $("#uploadForm");

const titleEl = $("#title");
const artistEl = $("#artist");
const tagsEl = $("#tags");
const licenseEl = $("#license");
const audioFileEl = $("#audioFile");
const confirmEl = $("#confirm");

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

function loadTracks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveTracks(tracks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
}

function parseTags(text) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Lê um File e converte para DataURL (base64) para persistir no LocalStorage.
 * Observação: LocalStorage tem limites (geralmente 5-10MB).
 */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function buildTagOptions(tracks) {
  const tagSet = new Set();
  tracks.forEach((t) => (t.tags || []).forEach((tag) => tagSet.add(tag)));

  const current = tagFilterEl.value;
  const tags = ["", ...Array.from(tagSet).sort((a, b) => a.localeCompare(b))];

  tagFilterEl.innerHTML = "";
  tags.forEach((tag) => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag ? tag : "Todas";
    tagFilterEl.appendChild(opt);
  });

  // tenta manter o filtro atual
  if (tags.includes(current)) tagFilterEl.value = current;
}

function matchesQuery(track, q) {
  if (!q) return true;
  const hay = [
    track.title,
    track.artist,
    track.license,
    ...(track.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  return hay.includes(q.toLowerCase());
}

function matchesTag(track, tag) {
  if (!tag) return true;
  return (track.tags || []).includes(tag);
}

function render() {
  const tracks = loadTracks();

  buildTagOptions(tracks);

  const q = searchEl.value.trim();
  const tag = tagFilterEl.value;

  const filtered = tracks
    .filter((t) => matchesQuery(t, q))
    .filter((t) => matchesTag(t, tag))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  listEl.innerHTML = "";

  emptyEl.hidden = filtered.length !== 0;

  for (const track of filtered) {
    const card = document.createElement("article");
    card.className = "card";

    const meta = document.createElement("div");
    meta.className = "meta";

    const left = document.createElement("div");
    const h = document.createElement("h3");
    h.className = "title";
    h.textContent = track.title;

    const sub = document.createElement("p");
    sub.className = "sub";
    sub.textContent = `por ${track.artist} • publicado em ${formatDate(track.createdAt)}`;

    left.appendChild(h);
    left.appendChild(sub);

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = track.license;

    meta.appendChild(left);
    meta.appendChild(badge);

    const tagsWrap = document.createElement("div");
    tagsWrap.className = "tags";
    (track.tags || []).forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "tag";
      chip.textContent = t;
      chip.title = "Clique para filtrar";
      chip.style.cursor = "pointer";
      chip.addEventListener("click", () => {
        tagFilterEl.value = t;
        render();
      });
      tagsWrap.appendChild(chip);
    });

    const player = document.createElement("div");
    player.className = "player";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.src = track.audioDataUrl;

    // pausa outros players quando der play em um
    audio.addEventListener("play", () => {
      document.querySelectorAll("audio").forEach((a) => {
        if (a !== audio) a.pause();
      });
    });

    player.appendChild(audio);

    const row = document.createElement("div");
    row.className = "row";

    const small = document.createElement("div");
    small.className = "small";
    small.textContent = track.license === "CC-BY"
      ? "Atribuição obrigatória (cite o autor)"
      : track.license === "CC0"
        ? "Uso livre (sem atribuição)"
        : "Uso permitido pelo autor";

    const del = document.createElement("button");
    del.className = "icon-btn";
    del.title = "Remover (local)";
    del.textContent = "🗑️";
    del.addEventListener("click", () => removeTrack(track.id));

    row.appendChild(small);
    row.appendChild(del);

    card.appendChild(meta);
    if ((track.tags || []).length) card.appendChild(tagsWrap);
    card.appendChild(player);
    card.appendChild(row);

    listEl.appendChild(card);
  }
}

function removeTrack(id) {
  const tracks = loadTracks();
  const next = tracks.filter((t) => t.id !== id);
  saveTracks(next);
  render();
}

function openDialog() {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else alert("Seu navegador não suporta <dialog>. Use um navegador moderno.");
}

function closeDialog() {
  dialog.close();
}

openUploadBtn.addEventListener("click", openDialog);
closeUploadBtn.addEventListener("click", closeDialog);
cancelUploadBtn.addEventListener("click", closeDialog);

dialog.addEventListener("click", (e) => {
  // clique fora do card fecha
  const rect = dialog.getBoundingClientRect();
  const isInDialog =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom;
  // em alguns browsers, o clique no backdrop é capturado no dialog.
  // então checamos se o alvo é o próprio dialog
  if (e.target === dialog && isInDialog) closeDialog();
});

searchEl.addEventListener("input", () => render());
tagFilterEl.addEventListener("change", () => render());

clearAllBtn.addEventListener("click", () => {
  const ok = confirm("Isso vai apagar todas as músicas salvas localmente neste navegador. Continuar?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  render();
});

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleEl.value.trim();
  const artist = artistEl.value.trim();
  const tags = parseTags(tagsEl.value);
  const license = licenseEl.value;
  const file = audioFileEl.files?.[0];

  if (!title || !artist || !license || !file) return;

  if (!confirmEl.checked) {
    alert("Você precisa aceitar a declaração de autorização.");
    return;
  }

  // validações simples
  if (!file.type.startsWith("audio/")) {
    alert("Selecione um arquivo de áudio válido.");
    return;
  }

  // tentativa de evitar explodir o LocalStorage
  // (ainda assim depende do navegador)
  const MAX_MB = 6;
  if (file.size > MAX_MB * 1024 * 1024) {
    alert(`Arquivo grande demais para este MVP (máx. ${MAX_MB}MB).`);
    return;
  }

  try {
    const audioDataUrl = await fileToDataURL(file);

    const track = {
      id: uid(),
      title,
      artist,
      tags,
      license,
      createdAt: new Date().toISOString(),
      audioDataUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };

    const tracks = loadTracks();
    tracks.push(track);
    saveTracks(tracks);

    uploadForm.reset();
    closeDialog();
    render();
  } catch (err) {
    console.error(err);
    alert("Não foi possível publicar. Tente novamente.");
  }
});

// Inicializa
render();