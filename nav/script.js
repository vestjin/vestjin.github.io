/* =========================================================
 * 个人导航页 - 主逻辑 (完整版：Gist ID手动配置 + 笔记徽章 + 帮助
 *                  + 同步合并/时间戳 + 墓碑删除记录)
 * ========================================================= */
(function () {
  'use strict';

  const LS_KEY = 'personal-nav-bookmarks-v1';
  const LS_META = 'personal-nav-meta-v1';
  const LS_ENGINE = 'personal-nav-engine-v1';
  const LS_SYNC = 'personal-nav-sync-v1';
  const LS_PROXY = 'personal-nav-proxy-v1';
  const LS_COLLAPSED = 'personal-nav-collapsed-v1';
  const LS_CAT_ORDER = 'personal-nav-cat-order-v1';
  const LS_CURRENT_CAT = 'personal-nav-current-cat-v1';
  const LS_TOMBSTONES = 'personal-nav-tombstones-v1';
  const CACHE_TTL = 1000 * 60 * 60 * 24 * 7;
  const TOMBSTONE_TTL = 1000 * 60 * 60 * 24 * 30; // 墓碑保留 30 天

  const PLACEHOLDER_GIST_ID = '***********';

  const ENGINES = {
    bing: { name: 'Bing', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
    google: { name: 'Google', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    duckduckgo: { name: 'DuckDuckGo', url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
    yandex: { name: 'Yandex', url: (q) => `https://yandex.com/search/?text=${encodeURIComponent(q)}` },
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const showToast = (msg, ms = 1800) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.add('hidden'), ms);
  };

  const nowTs = () => Date.now();
  const uid = () => 'bm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const safeHost = (url) => { try { return new URL(url).host; } catch { return url; } };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const touch = (bm) => { if (bm) bm.updatedAt = nowTs(); return bm; };

  // ---------- 书签 ----------
  const loadBookmarks = () => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return (window.DEFAULT_BOOKMARKS || []).map((b) => ({ ...b }));
  };
  const saveBookmarks = (list) => localStorage.setItem(LS_KEY, JSON.stringify(list));

  // ---------- 删除墓碑（记录删除时间，供同步合并判定） ----------
  const loadTombstones = () => {
    try { const raw = localStorage.getItem(LS_TOMBSTONES); if (raw) { const t = JSON.parse(raw); if (t && typeof t === 'object') return t; } } catch (e) {}
    return {};
  };
  const saveTombstones = (t) => localStorage.setItem(LS_TOMBSTONES, JSON.stringify(t));
  const addTombstone = (id) => {
    const t = loadTombstones();
    t[id] = nowTs();
    saveTombstones(t);
  };
  const pruneTombstones = (t) => {
    const now = nowTs();
    const out = {};
    Object.keys(t || {}).forEach((id) => { if (now - (t[id] || 0) < TOMBSTONE_TTL) out[id] = t[id]; });
    return out;
  };

  let collapsedSet = new Set((() => { try { return JSON.parse(localStorage.getItem(LS_COLLAPSED)) || []; } catch { return []; } })());
  const saveCollapsed = () => localStorage.setItem(LS_COLLAPSED, JSON.stringify(Array.from(collapsedSet)));
  const isCollapsed = (cat) => collapsedSet.has(cat);
  const toggleCollapsed = (cat) => { if (collapsedSet.has(cat)) collapsedSet.delete(cat); else collapsedSet.add(cat); saveCollapsed(); };

  let categoryOrder = (() => { try { const arr = JSON.parse(localStorage.getItem(LS_CAT_ORDER)); return Array.isArray(arr) ? arr : []; } catch { return []; } })();
  const saveCategoryOrder = () => localStorage.setItem(LS_CAT_ORDER, JSON.stringify(categoryOrder));

  let currentCategory = (() => { try { return localStorage.getItem(LS_CURRENT_CAT) || '__all__'; } catch { return '__all__'; } })();
  const saveCurrentCategory = (cat) => { currentCategory = cat; localStorage.setItem(LS_CURRENT_CAT, cat); };

  const loadMeta = () => { try { return JSON.parse(localStorage.getItem(LS_META)) || {}; } catch { return {}; } };
  const saveMeta = (m) => localStorage.setItem(LS_META, JSON.stringify(m));

  const buildFaviconUrl = (pageUrl) => {
    const host = safeHost(pageUrl);
    if (!host) return '';
    return `https://favicon.im/${encodeURIComponent(host)}?larger=true`;
  };

  const FALLBACK_PROXIES = [
    (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];

  const formatProxyUrl = (proxyStr, targetUrl) => {
    const enc = encodeURIComponent(targetUrl);
    if (proxyStr.includes('{url}')) return proxyStr.replace('{url}', enc);
    if (proxyStr.endsWith('=')) return proxyStr + enc;
    const hasQuery = proxyStr.includes('?');
    if (hasQuery) return `${proxyStr}&url=${enc}`;
    return `${proxyStr}?url=${enc}`;
  };

  const extractTitle = (html) => {
    if (!html) return '';
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (m) return m[1].trim();
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i);
    if (og) return og[1].trim();
    return '';
  };

  const fetchTitle = async (pageUrl) => {
    const customProxy = (localStorage.getItem(LS_PROXY) || '').trim();
    const proxies = [];
    if (customProxy) {
      proxies.push((u) => formatProxyUrl(customProxy, u));
    }
    proxies.push(...FALLBACK_PROXIES);

    for (const build of proxies) {
      try {
        const endpoint = build(pageUrl);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(endpoint, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) continue;

        const ct = res.headers.get('content-type') || '';
        let html = '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          html = data.contents || data.body || data || '';
        } else {
          html = await res.text();
        }
        const title = extractTitle(typeof html === 'string' ? html : '');
        if (title) return title;
      } catch (e) { continue; }
    }
    return '';
  };

  const enrichBookmark = async (bm, force = false) => {
    const meta = loadMeta();
    const cached = meta[bm.id];
    const needTitle = force || !bm.name || !cached || !cached.title || Date.now() - (cached.ts || 0) > CACHE_TTL;
    const needIcon = force || !bm.icon || !cached || !cached.icon || Date.now() - (cached.ts || 0) > CACHE_TTL;
    let title = bm.name || (cached && cached.title) || safeHost(bm.url);
    let icon = bm.icon || (cached && cached.icon) || buildFaviconUrl(bm.url);
    if (needTitle) { const t = await fetchTitle(bm.url); if (t) title = t; }
    if (needIcon) { icon = buildFaviconUrl(bm.url); }
    meta[bm.id] = { title, icon, ts: Date.now() };
    saveMeta(meta);
    return { title, icon };
  };

  // ---------- 时钟 ----------
  const tickClock = () => {
    const display = $('#clockDisplay');
    if (!display) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    display.textContent = `${h}:${m}:${s}`;

    const dateEl = $('#clockDate');
    if (dateEl) {
      const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${weekdays[now.getDay()]}`;
      dateEl.textContent = dateStr;
    }
  };

  let bookmarks = loadBookmarks();

  // ---------- 渲染书签 ----------
  const getSortedCategories = (keys) => {
    return keys.sort((a, b) => {
      const ai = categoryOrder.indexOf(a); const bi = categoryOrder.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      if (a === '常用') return -1;
      if (b === '常用') return 1;
      return a.localeCompare(b, 'zh-CN');
    });
  };

  const renderSidebar = () => {
    const nav = $('#categoryNav');
    if (!nav) return;
    const counts = {};
    bookmarks.forEach((b) => { const cat = b.category || '未分类'; counts[cat] = (counts[cat] || 0) + 1; });
    if (currentCategory !== '__all__' && !counts[currentCategory]) saveCurrentCategory('__all__');

    const cats = getSortedCategories(Object.keys(counts));
    let html = `<button type="button" class="cat-item ${currentCategory === '__all__' ? 'active' : ''}" data-cat="__all__"><span class="cat-name">全部</span><span class="cat-count">${bookmarks.length}</span></button>`;
    cats.forEach((cat) => {
      html += `<button type="button" class="cat-item ${currentCategory === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}"><span class="cat-name">${escapeHtml(cat)}</span><span class="cat-count">${counts[cat]}</span></button>`;
    });
    nav.innerHTML = html;
  };

  const render = (filter = '') => {
    const container = $('#navContainer');
    const kw = filter.trim().toLowerCase();

    const effectiveCategory = (kw ? '__all__' : currentCategory);

    const allCats = {};
    bookmarks.forEach((b) => { const cat = b.category || '未分类'; if (!allCats[cat]) allCats[cat] = { all: [], shown: [] }; allCats[cat].all.push(b); });

    const orderChanged = Object.keys(allCats).some((c) => !categoryOrder.includes(c)) || categoryOrder.some((c) => !Object.prototype.hasOwnProperty.call(allCats, c));
    if (orderChanged) {
      const present = categoryOrder.filter((c) => Object.prototype.hasOwnProperty.call(allCats, c));
      const newOnes = Object.keys(allCats).filter((c) => !categoryOrder.includes(c));
      categoryOrder = present.concat(newOnes); saveCategoryOrder();
    }

    if (effectiveCategory !== '__all__' && !allCats[effectiveCategory]) saveCurrentCategory('__all__');

    let scopedCats;
    if (effectiveCategory === '__all__') { scopedCats = allCats; }
    else { scopedCats = {}; if (allCats[effectiveCategory]) scopedCats[effectiveCategory] = allCats[effectiveCategory]; }

    Object.keys(scopedCats).forEach((cat) => {
      scopedCats[cat].shown = scopedCats[cat].all.filter((b) => {
        if (!kw) return true;
        return ((b.name || '').toLowerCase().includes(kw) ||
                b.url.toLowerCase().includes(kw) ||
                (b.category || '').toLowerCase().includes(kw) ||
                (b.note || '').toLowerCase().includes(kw));
      });
    });

    const filtered = Object.keys(scopedCats).flatMap((cat) => scopedCats[cat].shown);
    const scopedTotal = Object.keys(scopedCats).reduce((sum, cat) => sum + scopedCats[cat].all.length, 0);

    const groupNameEl = $('#currentGroupName');
    const groupCountEl = $('#currentGroupCount');
    if (groupNameEl) {
      groupNameEl.textContent = kw ? '全部书签' : (currentCategory === '__all__' ? '全部书签' : currentCategory);
    }
    if (groupCountEl) groupCountEl.textContent = (kw && scopedTotal > 0) ? `${filtered.length} / ${scopedTotal}` : `${scopedTotal} 项`;

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty">${kw ? '没有匹配的书签' : '暂无书签，点击右上角 ＋ 添加一个吧'}</div>`;
      updateTotalCount(scopedTotal, filtered.length, kw);
      renderSidebar();
      return;
    }

    const meta = loadMeta();
    const sortedCats = getSortedCategories(Object.keys(scopedCats));

    container.innerHTML = sortedCats.map((cat) => {
      const items = scopedCats[cat].shown.map((bm) => {
        const m = meta[bm.id] || {};
        const displayName = bm.name || m.title || safeHost(bm.url);
        const iconUrl = bm.icon || m.icon || buildFaviconUrl(bm.url);
        const firstChar = (displayName || '?').trim().charAt(0).toUpperCase();
        const tooltip = (bm.name || safeHost(bm.url)) + (bm.note ? ' · ' + bm.note : '');
        const hasNote = bm.note && bm.note.trim().length > 0;
        return `
          <a class="card" href="${escapeHtml(bm.url)}" target="_blank" rel="noopener noreferrer" data-id="${escapeHtml(bm.id)}" draggable="true" title="${escapeHtml(tooltip)}">
            <div class="card-drag" aria-hidden="true" title="拖动排序">⠿</div>
            ${hasNote ? `<div class="note-badge" title="含有笔记">📝</div>` : ''}
            <div class="card-icon">
              <img src="${escapeHtml(iconUrl)}" alt="" decoding="async" draggable="false" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
              <div class="fallback" style="display:none">${escapeHtml(firstChar)}</div>
            </div>
            <div class="card-name">${escapeHtml(displayName)}</div>
            <div class="card-url">${escapeHtml(safeHost(bm.url))}</div>
            <div class="card-actions">
              <button type="button" data-action="edit" data-id="${escapeHtml(bm.id)}" title="编辑" draggable="false">✎</button>
              <button type="button" data-action="del" data-id="${escapeHtml(bm.id)}" title="删除" draggable="false" class="del">🗑</button>
            </div>
          </a>`;
      }).join('');

      const collapsed = isCollapsed(cat);
      return `
        <section class="category${collapsed ? ' collapsed' : ''}" data-category="${escapeHtml(cat)}">
          <div class="category-header" data-toggle-category role="button" tabindex="0" aria-expanded="${!collapsed}" title="点击收起/展开">
            <span class="category-drag" data-category-drag role="button" tabindex="-1" aria-label="拖动调整分类顺序" title="拖动调整分类顺序">⠿</span>
            <div class="category-title">${escapeHtml(cat)}</div>
            <div class="category-meta">
              <div class="category-count">${kw ? `${scopedCats[cat].shown.length} / ${scopedCats[cat].all.length}` : scopedCats[cat].all.length}</div>
              <div class="category-toggle" aria-hidden="true">▸</div>
            </div>
          </div>
          <div class="cards">${items}</div>
        </section>`;
    }).join('');

    updateTotalCount(scopedTotal, filtered.length, kw);
    renderSidebar();
  };

  const updateTotalCount = (total, shown, kw) => {
    const el = $('#totalCount');
    if (!el) return;
    if (kw && total > 0) { el.textContent = `${shown} / ${total}`; el.title = `显示 ${shown} 项，共 ${total} 项`; }
    else { el.textContent = String(total); el.title = `共 ${total} 项书签`; }
  };

  // ---------- 事件绑定 ----------
  const onCategoryNavClick = (e) => {
    const btn = e.target.closest('.cat-item');
    if (!btn) return;
    const cat = btn.dataset.cat;
    if (!cat || cat === currentCategory) return;
    saveCurrentCategory(cat);
    render($('#searchInput').value);
  };

  const onCardAction = (e) => {
    const header = e.target.closest('[data-toggle-category]');
    if (header) {
      const section = header.closest('.category');
      const cat = section && section.dataset.category;
      if (cat) {
        toggleCollapsed(cat);
        section.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', !section.classList.contains('collapsed'));
      }
      return;
    }
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const id = btn.dataset.id; const action = btn.dataset.action;
    const bm = bookmarks.find((b) => b.id === id);
    if (!bm) return;
    if (action === 'edit') openModal(bm);
    if (action === 'del') {
      if (confirm(`确定要删除 "${bm.name || safeHost(bm.url)}" 吗？`)) {
        bookmarks = bookmarks.filter((b) => b.id !== id);
        addTombstone(id); // 记录删除墓碑，供同步合并
        saveBookmarks(bookmarks);
        render($('#searchInput').value);
        showToast('已删除');
        markPending();
      }
    }
  };

  // ---------- 拖拽 ----------
  const drag = { kind: null, id: null, cat: null };
  const clearDragStates = () => { document.querySelectorAll('.dragging, .drag-over, .drag-over-before, .drag-over-after').forEach((el) => el.classList.remove('dragging', 'drag-over', 'drag-over-before', 'drag-over-after')); };
  const onDragStart = (e) => {
    const card = e.target.closest('.card[draggable="true"]');
    if (card) {
      drag.kind = 'card'; drag.id = card.dataset.id; drag.cat = card.closest('.category').dataset.category;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', 'card:' + drag.id); } catch {}
      requestAnimationFrame(() => card.classList.add('dragging'));
      return;
    }
    const handle = e.target.closest('[data-category-drag]');
    if (handle) {
      const section = handle.closest('.category');
      if (!section) return;
      drag.kind = 'category'; drag.cat = section.dataset.category;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', 'cat:' + drag.cat); } catch {}
      const ghost = section.cloneNode(true);
      ghost.style.position = 'absolute'; ghost.style.top = '-9999px'; ghost.style.left = '-9999px';
      ghost.style.width = section.offsetWidth + 'px'; ghost.style.opacity = '0.85'; ghost.style.pointerEvents = 'none';
      const cards = ghost.querySelector('.cards');
      if (cards) cards.style.display = 'none';
      document.body.appendChild(ghost);
      try { e.dataTransfer.setDragImage(ghost, 12, 14); } catch {}
      setTimeout(() => ghost.remove(), 0);
      requestAnimationFrame(() => section.classList.add('dragging'));
    }
  };
  const onDragEnd = () => { drag.kind = null; drag.id = null; drag.cat = null; clearDragStates(); };
  const isBeforeTarget = (target, clientY) => { const r = target.getBoundingClientRect(); return clientY - r.top < r.height / 2; };
  const onDragOver = (e) => {
    if (!drag.kind) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    // 修复：三个选择器必须写在同一个参数字符串中
    document.querySelectorAll('.drag-over, .drag-over-before, .drag-over-after').forEach((el) => el.classList.remove('drag-over', 'drag-over-before', 'drag-over-after'));
    if (drag.kind === 'card') {
      const targetCard = e.target.closest('.card[draggable="true"]');
      const targetSection = e.target.closest('.category');
      if (!targetSection) return;
      if (targetCard && targetCard.dataset.id === drag.id) return;
      if (targetCard) { const before = isBeforeTarget(targetCard, e.clientY); targetCard.classList.add(before ? 'drag-over-before' : 'drag-over-after'); }
      else if (e.target.closest('[data-toggle-category]') || e.target.closest('.cards')) { targetSection.classList.add('drag-over'); }
    } else if (drag.kind === 'category') {
      const targetSection = e.target.closest('.category');
      if (!targetSection) return;
      if (targetSection.dataset.category === drag.cat) return;
      if (e.target.closest('[data-toggle-category]')) { const before = isBeforeTarget(targetSection, e.clientY); targetSection.classList.add(before ? 'drag-over-before' : 'drag-over-after'); }
    }
  };
  const onDragLeave = () => {};
  const onDrop = (e) => {
    if (!drag.kind) return;
    e.preventDefault();
    if (drag.kind === 'card') {
      const targetCard = e.target.closest('.card[draggable="true"]');
      const targetSection = e.target.closest('.category');
      if (!targetSection) return;
      const targetCat = targetSection.dataset.category;
      if (targetCard && targetCard.dataset.id !== drag.id) {
        const before = targetCard.classList.contains('drag-over-before');
        reorderCard(drag.id, drag.cat, targetCard.dataset.id, targetCat, before);
      } else if (!targetCard) {
        moveCardToCategory(drag.id, drag.cat, targetCat);
      }
    } else if (drag.kind === 'category') {
      const targetSection = e.target.closest('.category');
      if (!targetSection || targetSection.dataset.category === drag.cat) { onDragEnd(); return; }
      const before = targetSection.classList.contains('drag-over-before');
      reorderCategory(drag.cat, targetSection.dataset.category, before);
    }
    saveBookmarks(bookmarks);
    render($('#searchInput').value);
    markPending();
    onDragEnd();
  };
  const reorderCard = (draggedId, sourceCat, targetId, targetCat, before) => {
    const dragIdx = bookmarks.findIndex((b) => b.id === draggedId);
    if (dragIdx < 0) return;
    const [moved] = bookmarks.splice(dragIdx, 1);
    if (sourceCat !== targetCat) moved.category = targetCat;
    touch(moved); // 打时间戳，供同步合并判定
    const tgtIdx = bookmarks.findIndex((b) => b.id === targetId);
    if (tgtIdx < 0) {
      let last = -1;
      for (let i = 0; i < bookmarks.length; i++) { if ((bookmarks[i].category || '未分类') === targetCat) last = i; }
      bookmarks.splice(last + 1, 0, moved);
    } else {
      bookmarks.splice(before ? tgtIdx : tgtIdx + 1, 0, moved);
    }
  };
  const moveCardToCategory = (draggedId, sourceCat, targetCat) => {
    if (sourceCat === targetCat) return;
    const dragIdx = bookmarks.findIndex((b) => b.id === draggedId);
    if (dragIdx < 0) return;
    const [moved] = bookmarks.splice(dragIdx, 1);
    moved.category = targetCat;
    touch(moved); // 打时间戳
    let last = -1;
    for (let i = 0; i < bookmarks.length; i++) { if ((bookmarks[i].category || '未分类') === targetCat) last = i; }
    bookmarks.splice(last + 1, 0, moved);
  };

  // 修复：先移除源分组再插入，避免重复 push 产生重复项
  const reorderCategory = (sourceCat, targetCat, before) => {
    const next = categoryOrder.filter((c) => c !== sourceCat);
    const tgtIdx = next.indexOf(targetCat);
    if (tgtIdx < 0) {
      next.push(sourceCat);
    } else {
      next.splice(before ? tgtIdx : tgtIdx + 1, 0, sourceCat);
    }
    categoryOrder = next;
    saveCategoryOrder();
  };

  // ---------- 模态框 ----------
  const openModal = (bm) => {
    $('#modalTitle').textContent = bm ? '编辑书签' : '添加书签';
    $('#bmId').value = bm ? bm.id : '';
    $('#bmName').value = bm ? bm.name || '' : '';
    $('#bmUrl').value = bm ? bm.url || '' : '';
    $('#bmCategory').value = bm ? (bm.category || '') : (currentCategory !== '__all__' ? currentCategory : '');
    $('#bmIcon').value = bm ? bm.icon || '' : '';
    $('#bmNote').value = bm ? (bm.note || '') : '';
    refreshCategoryDatalist();
    $('#modal').classList.remove('hidden');
    setTimeout(() => $('#bmUrl').focus(), 50);
  };
  const closeModal = () => $('#modal').classList.add('hidden');

  const openHelp = () => { document.getElementById('helpModal').classList.remove('hidden'); };
  const closeHelp = () => { document.getElementById('helpModal').classList.add('hidden'); };

  const refreshCategoryDatalist = () => {
    const cats = Array.from(new Set(bookmarks.map((b) => b.category).filter(Boolean)));
    $('#categoryList').innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}">`).join('');
  };
  const onFormSubmit = async (e) => {
    e.preventDefault();
    const id = $('#bmId').value;
    const name = $('#bmName').value.trim();
    const url = $('#bmUrl').value.trim();
    const cat = $('#bmCategory').value.trim() || '未分类';
    const icon = $('#bmIcon').value.trim();
    const note = $('#bmNote').value.trim();
    if (!url) { showToast('请输入网址'); return; }
    try { new URL(url); } catch { showToast('网址格式不正确'); return; }
    if (id) {
      const bm = bookmarks.find((b) => b.id === id);
      if (bm) { bm.name = name; bm.url = url; bm.category = cat; bm.icon = icon; bm.note = note; touch(bm); }
    } else {
      bookmarks.push({ id: uid(), name, url, category: cat, icon, note, updatedAt: nowTs() });
    }
    saveBookmarks(bookmarks);
    closeModal();
    render($('#searchInput').value);
    showToast('已保存');
    markPending();
    enrichAll(false);
  };

  // ---------- 分组管理 ----------
  const openGroupManager = () => {
    const listEl = $('#groupList');
    if (!listEl) return;
    const cats = Array.from(new Set(bookmarks.map(b => b.category || '未分类')));
    const ordered = getSortedCategories([...new Set([...categoryOrder, ...cats])]);

    let html = '';
    ordered.forEach(cat => {
      const count = bookmarks.filter(b => (b.category || '未分类') === cat).length;
      html += `
        <div class="group-mgr-item" data-cat="${escapeHtml(cat)}">
          <input type="text" class="group-mgr-input" value="${escapeHtml(cat)}" data-old="${escapeHtml(cat)}" />
          <span class="group-mgr-count">${count} 项</span>
          <button type="button" class="btn ghost danger group-mgr-del" data-cat="${escapeHtml(cat)}">删除</button>
        </div>
      `;
    });
    listEl.innerHTML = html;
    $('#groupModal').classList.remove('hidden');
  };
  const closeGroupManager = () => {
    const modal = $('#groupModal');
    if (modal) modal.classList.add('hidden');
  };

  const onGroupMgrChange = (e) => {
    if (!e.target.classList.contains('group-mgr-input')) return;
    const oldName = e.target.dataset.old;
    let newName = e.target.value.trim() || '未分类';

    if (oldName === newName) return;
    const isMerge = bookmarks.some(b => (b.category || '未分类') === newName);

    bookmarks.forEach(b => {
      if ((b.category || '未分类') === oldName) { b.category = newName; touch(b); }
    });

    const idx = categoryOrder.indexOf(oldName);
    if (idx >= 0) {
      if (isMerge) {
        categoryOrder.splice(idx, 1);
      } else {
        categoryOrder[idx] = newName;
      }
    }
    saveCategoryOrder();

    if (currentCategory === oldName) saveCurrentCategory(isMerge ? '__all__' : newName);

    saveBookmarks(bookmarks);
    render($('#searchInput').value);
    openGroupManager();
  };

  const onGroupMgrDel = (e) => {
    const btn = e.target.closest('.group-mgr-del');
    if (!btn) return;
    const cat = btn.dataset.cat;
    const count = bookmarks.filter(b => (b.category || '未分类') === cat).length;

    if (!confirm(`确定删除分组 "${cat}" 吗？\n该分组下的 ${count} 个书签将被移动至"未分类"。`)) return;

    bookmarks.forEach(b => {
      if ((b.category || '未分类') === cat) { b.category = '未分类'; touch(b); }
    });
    const idx = categoryOrder.indexOf(cat);
    if (idx >= 0) categoryOrder.splice(idx, 1);

    if (currentCategory === cat) saveCurrentCategory('__all__');

    saveBookmarks(bookmarks);
    saveCategoryOrder();
    render($('#searchInput').value);
    openGroupManager();
  };

  // ---------- 导入导出 ----------
  const exportData = () => {
    const data = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nav-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('已导出 JSON');
  };
  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('格式错误');
        const map = new Map(bookmarks.map((b) => [b.url, b]));
        arr.forEach((b) => {
          if (!b || !b.url) return;
          if (!map.has(b.url)) {
            map.set(b.url, { id: b.id || uid(), name: b.name || '', url: b.url, category: b.category || '未分类', icon: b.icon || '', note: b.note || '', updatedAt: nowTs() });
          }
        });
        bookmarks = Array.from(map.values());
        saveBookmarks(bookmarks);
        render($('#searchInput').value);
        enrichAll(false);
        showToast(`已导入，共 ${bookmarks.length} 项`);
        markPending();
      } catch (err) { showToast('导入失败：' + err.message); }
    };
    input.click();
  };

  // ---------- 抓取 ----------
  const runWithConcurrency = async (items, limit, fn) => {
    const results = new Array(items.length);
    let idx = 0;
    const workers = Array.from({ length: limit }, async () => {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        try { results[i] = await fn(items[i], i); } catch (e) { results[i] = null; }
      }
    });
    await Promise.all(workers);
    return results;
  };
  const enrichAll = async (force = false) => {
    const meta = loadMeta();
    const targets = bookmarks.filter((bm) => {
      if (force) return true;
      const c = meta[bm.id];
      const expired = !c || !c.ts || Date.now() - c.ts > CACHE_TTL;
      return (!bm.name && (!c || !c.title)) || (!bm.icon && (!c || !c.icon)) || expired;
    });
    if (targets.length === 0) return;
    await runWithConcurrency(targets, 2, (bm) => enrichBookmark(bm, force));
    render($('#searchInput').value);
  };

  // ---------- 云同步（含合并逻辑）----------
  const GIST_API = 'https://api.github.com';
  const GIST_FILE = 'nav-bookmarks.json';

  const loadSyncConfig = () => { try { return JSON.parse(localStorage.getItem(LS_SYNC)) || {}; } catch { return {}; } };
  const saveSyncConfig = (c) => localStorage.setItem(LS_SYNC, JSON.stringify(c));

  const getGistId = () => {
    const cfg = loadSyncConfig();
    const id = (cfg.gistId && cfg.gistId.trim()) || '';
    if (id === PLACEHOLDER_GIST_ID) return '';
    return id;
  };

  const setSyncIndicator = (state, text) => { const el = $('#syncIndicator'); if (!el) return; el.className = 'sync-indicator' + (state ? ' ' + state : ''); el.textContent = text || ''; el.title = text || ''; };
  const setSyncStatus = (text, cls) => { const el = $('#syncStatus'); if (!el) return; el.className = 'sync-status' + (cls ? ' ' + cls : ''); el.textContent = text; };
  const gistRequest = async (path, method = 'GET', body) => {
    const cfg = loadSyncConfig();
    if (!cfg.token) throw new Error('请先填写 GitHub Token');
    const res = await fetch(GIST_API + path, {
      method, headers: { 'Authorization': 'token ' + cfg.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || ('HTTP ' + res.status)); }
    return res.json();
  };

  /**
   * 双向合并书签：
   * - 按 id 去重，同 id 取 updatedAt 较大（较新）的一份；
   * - 删除墓碑与修改冲突时：若副本的 updatedAt 晚于墓碑时间，则"复活"该书签，否则丢弃；
   * - 顺序：以较新的一端为基础顺序，另一端的新条目追加在后；
   * - 合并后清除已复活条目的墓碑。
   */
  const mergeBookmarks = (localList, remoteList, localTomb, remoteTomb, remoteOrderFirst) => {
    const mergedTomb = { ...localTomb, ...remoteTomb };
    Object.keys(remoteTomb || {}).forEach((id) => {
      if (localTomb && localTomb[id] !== undefined) mergedTomb[id] = Math.max(localTomb[id] || 0, remoteTomb[id] || 0);
    });

    const pick = new Map();
    const order = [];
    const consider = (bm) => {
      if (!bm || !bm.id) return;
      const tombTs = mergedTomb[bm.id] || 0;
      const bmTs = bm.updatedAt || 0;
      if (tombTs && bmTs <= tombTs) return; // 删除晚于最后修改，丢弃
      const cur = pick.get(bm.id);
      if (!cur) { pick.set(bm.id, bm); order.push(bm.id); return; }
      if (bmTs > (cur.updatedAt || 0)) pick.set(bm.id, bm); // 同 id 取较新
    };

    const seq = remoteOrderFirst ? [remoteList, localList] : [localList, remoteList];
    seq.forEach((list) => (list || []).forEach(consider));

    const mergedList = order.filter((id) => pick.has(id)).map((id) => pick.get(id));
    // 已保留（复活）的条目不应再被墓碑压制
    mergedList.forEach((bm) => { delete mergedTomb[bm.id]; });

    return { bookmarks: mergedList, tombstones: mergedTomb };
  };

  const buildSyncPayload = () => {
    const tombstones = pruneTombstones(loadTombstones());
    saveTombstones(tombstones);
    return { version: 2, updatedAt: nowTs(), bookmarks, tombstones };
  };

  const pullFromGist = async () => {
    const cfg = loadSyncConfig();
    if (!cfg.token) throw new Error('请先配置 Token');
    const effectiveGistId = getGistId();
    if (!effectiveGistId) throw new Error('没有有效的 Gist ID，请在设置中填写');
    const data = await gistRequest('/gists/' + effectiveGistId);
    const file = data.files[GIST_FILE];
    if (!file) return null;
    let content = file.content || '';
    if (!content && file.truncated && file.raw_url) {
      const res = await fetch(file.raw_url, { headers: { 'Authorization': 'token ' + cfg.token } });
      if (!res.ok) throw new Error('拉取 raw 内容失败 HTTP ' + res.status);
      content = await res.text();
    }
    if (!content) return null;
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error('Gist 内容不是有效的 JSON');
    }

    let remoteBookmarks = [];
    let remoteTombstones = {};
    let remoteUpdatedAt = 0;
    if (Array.isArray(parsed)) {
      // 旧格式：纯书签数组
      remoteBookmarks = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      // 新格式（v2）：{ version, updatedAt, bookmarks, tombstones }
      remoteBookmarks = Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [];
      if (parsed.tombstones && typeof parsed.tombstones === 'object') remoteTombstones = parsed.tombstones;
      remoteUpdatedAt = Number(parsed.updatedAt) || 0;
    } else {
      throw new Error('Gist 内容格式无效，既不是数组也不是对象');
    }
    return { bookmarks: remoteBookmarks, tombstones: remoteTombstones, updatedAt: remoteUpdatedAt, updated_at: data.updated_at };
  };

  const pushToGist = async () => {
    const cfg = loadSyncConfig();
    if (!cfg.token) throw new Error('请先配置 Token');
    const effectiveGistId = getGistId();
    if (!effectiveGistId) throw new Error('未配置 Gist ID，请先在设置中填写有效的 Gist ID');
    const payload = buildSyncPayload();
    await gistRequest('/gists/' + effectiveGistId, 'PATCH', { files: { [GIST_FILE]: { content: JSON.stringify(payload, null, 2) } } });
    cfg.lastSync = nowTs();
    cfg.lastPushTs = payload.updatedAt; // 记录最后一次推送的时间戳
    saveSyncConfig(cfg);
  };

  let syncing = false; let pendingPush = false;
  const markPending = () => { if (!loadSyncConfig().enabled) return; pendingPush = true; setSyncIndicator('unsaved', '●'); setSyncStatus('本地有未推送的修改', 'busy'); };

  const doPull = async (silent = false) => {
    if (syncing) return;
    syncing = true;
    setSyncIndicator('syncing', '⏳');
    setSyncStatus('正在拉取并合并…', 'busy');
    try {
      const result = await pullFromGist();
      if (result === null) {
        if (!silent) setSyncStatus('Gist 为空', '');
        return;
      }
      const cfg = loadSyncConfig();
      const remoteOrderFirst = (result.updatedAt || 0) > (cfg.lastPushTs || 0);

      const beforeState = JSON.stringify({ b: bookmarks, t: loadTombstones() });
      const merged = mergeBookmarks(bookmarks, result.bookmarks, loadTombstones(), result.tombstones, remoteOrderFirst);
      bookmarks = merged.bookmarks;
      saveBookmarks(bookmarks);
      saveTombstones(pruneTombstones(merged.tombstones));
      render($('#searchInput').value);
      const afterState = JSON.stringify({ b: bookmarks, t: loadTombstones() });

      cfg.lastSync = result.updated_at ? new Date(result.updated_at).getTime() : nowTs();
      saveSyncConfig(cfg);

      if (beforeState !== afterState) {
        // 合并结果与本地不同，需要推送回 Gist 以达成一致
        pendingPush = true;
        setSyncIndicator('unsaved', '●');
        setSyncStatus('已合并远程修改，建议推送一次以达成一致', 'busy');
      } else {
        pendingPush = false;
        setSyncIndicator('synced', '✓');
        const syncTime = result.updated_at ? new Date(result.updated_at).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN');
        setSyncStatus('已同步 · ' + syncTime, 'ok');
        setTimeout(() => setSyncIndicator('', ''), 1500);
      }
      if (!silent) showToast(`已拉取并合并，共 ${bookmarks.length} 项书签`);
    } catch (err) {
      setSyncIndicator('error', '⚠');
      setSyncStatus('拉取失败：' + err.message, 'error');
      if (!silent) showToast('拉取失败：' + err.message);
    } finally {
      syncing = false;
    }
  };

  const doPush = async () => {
    if (syncing) return;
    syncing = true;
    setSyncIndicator('syncing', '⏳');
    setSyncStatus('正在推送…', 'busy');
    try {
      await pushToGist();
      setSyncIndicator('synced', '✓');
      setSyncStatus('已同步 · ' + new Date().toLocaleString('zh-CN'), 'ok');
      showToast('已推送到 Gist');
      setTimeout(() => setSyncIndicator('', ''), 1500);
      pendingPush = false;
    } catch (err) {
      setSyncIndicator('error', '⚠');
      setSyncStatus('推送失败：' + err.message, 'error');
      showToast('推送失败：' + err.message);
    } finally {
      syncing = false;
    }
  };

  const openSettings = () => {
    const cfg = loadSyncConfig();
    const lastSyncTime = cfg.lastSync ? new Date(cfg.lastSync).toLocaleString('zh-CN') : '从未同步';
    setSyncStatus(`上次同步：${lastSyncTime}`, cfg.lastSync ? 'ok' : '');
    const effectiveId = getGistId();
    $('#ghToken').value = cfg.token || '';
    $('#ghGistId').value = cfg.gistId || '';
    $('#ghGistId').placeholder = '例如：abc123... 请手动创建 Gist 并填写 ID';
    $('#enableSync').checked = !!cfg.enabled;
    $('#proxyUrl').value = localStorage.getItem(LS_PROXY) || '';
    let infoLine = '';
    if (effectiveId) { infoLine = `当前 Gist: ${effectiveId}`; }
    if (cfg.lastSync) { setSyncStatus(`上次同步：${new Date(cfg.lastSync).toLocaleString('zh-CN')}\n${infoLine}`, 'ok'); }
    else if (cfg.token) { setSyncStatus(`已配置 Token${infoLine ? '\n' + infoLine : ''}`, ''); }
    else { setSyncStatus('未配置', ''); }
    $('#settingsModal').classList.remove('hidden');
  };
  const closeSettings = () => $('#settingsModal').classList.add('hidden');
  const saveSettings = (e) => {
    if (e) e.preventDefault();
    const cfg = loadSyncConfig();
    cfg.token = $('#ghToken').value.trim();
    cfg.gistId = $('#ghGistId').value.trim();
    cfg.enabled = $('#enableSync').checked;
    saveSyncConfig(cfg);
    localStorage.setItem(LS_PROXY, $('#proxyUrl').value.trim());
    showToast('设置已保存');
    if (cfg.enabled && (!cfg.token || !getGistId())) {
      showToast('提醒：启用同步但未填写 Token 或 Gist ID，同步将无法工作', 3000);
    }
    if (cfg.enabled && cfg.token && getGistId()) {
      doPull(true);
    } else {
      setSyncIndicator('', '');
    }
  };

  // ---------- 注册事件 ----------
  const bindEvents = () => {
    const engineSel = $('#webEngine');
    const savedEngine = localStorage.getItem(LS_ENGINE);
    if (savedEngine && ENGINES[savedEngine]) engineSel.value = savedEngine;
    engineSel.addEventListener('change', () => { localStorage.setItem(LS_ENGINE, engineSel.value); });

    const clockToggle = $('#clockToggle');
    if (clockToggle) {
      clockToggle.addEventListener('click', () => {
        document.body.classList.toggle('focus-mode');
      });
    }

    $('#webSearch').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#searchInput').value.trim();
      if (!q) { $('#searchInput').focus(); return; }
      const engine = ENGINES[engineSel.value] ? engineSel.value : 'bing';
      window.open(ENGINES[engine].url(q), '_blank', 'noopener,noreferrer');
    });

    $('#searchInput').addEventListener('input', (e) => { render(e.target.value); });

    $('#addBtn').addEventListener('click', () => openModal(null));
    $('#cancelBtn').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    $('#bookmarkForm').addEventListener('submit', onFormSubmit);
    $('#importBtn').addEventListener('click', importData);
    $('#exportBtn').addEventListener('click', exportData);
    $('#refreshBtn').addEventListener('click', () => { showToast('开始抓取元数据…'); enrichAll(true).then(() => showToast('抓取完成')); });

    $('#syncBtn').addEventListener('click', openSettings);
    $('#cancelSettings').addEventListener('click', closeSettings);
    $('#settingsModal').addEventListener('click', (e) => { if (e.target.id === 'settingsModal') closeSettings(); });
    $('#settingsForm').addEventListener('submit', saveSettings);
    // 合并逻辑下拉取不再破坏本地，直接拉取合并即可
    $('#pullNow').addEventListener('click', () => doPull(false));
    $('#pushNow').addEventListener('click', () => doPush());

    // 帮助
    document.getElementById('helpBtnSide').addEventListener('click', openHelp);
    document.getElementById('closeHelpBtn').addEventListener('click', closeHelp);
    document.getElementById('helpModal').addEventListener('click', (e) => {
      if (e.target.id === 'helpModal') closeHelp();
    });

    // 分组管理
    const manageGroupBtn = $('#manageGroupBtn');
    const cancelGroupBtn = $('#cancelGroup');
    const groupModal = $('#groupModal');
    const groupList = $('#groupList');

    if (manageGroupBtn) manageGroupBtn.addEventListener('click', openGroupManager);
    if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', closeGroupManager);
    if (groupModal) groupModal.addEventListener('click', (e) => { if (e.target.id === 'groupModal') closeGroupManager(); });
    if (groupList) {
      groupList.addEventListener('change', onGroupMgrChange);
      groupList.addEventListener('click', onGroupMgrDel);
    }

    // 分类导航
    $('#categoryNav').addEventListener('click', onCategoryNavClick);
    $('#navContainer').addEventListener('click', onCardAction);

    // 拖拽
    const navEl = $('#navContainer');
    navEl.addEventListener('dragstart', onDragStart);
    navEl.addEventListener('dragend', onDragEnd);
    navEl.addEventListener('dragover', onDragOver);
    navEl.addEventListener('dragleave', onDragLeave);
    navEl.addEventListener('drop', onDrop);

    $('#navContainer').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const header = e.target.closest('[data-toggle-category]');
      if (!header) return;
      e.preventDefault(); header.click();
    });

    // 全局快捷键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeSettings();
        closeGroupManager();
        closeHelp();
        if (document.body.classList.contains('focus-mode')) document.body.classList.remove('focus-mode');
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#searchInput').focus(); $('#searchInput').select(); }
    });

    // 年份
    $('#year').textContent = new Date().getFullYear();
  };

  // ---------- Service Worker ----------
  const registerSW = () => {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol) && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      if (reg.navigationPreload) { reg.navigationPreload.enable(); }
      reg.update().catch(() => {});
      reg.addEventListener('updatefound', () => {
        const newSw = reg.installing;
        if (!newSw) return;
        newSw.addEventListener('statechange', () => { if (newSw.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast(); });
      });
    }).catch((err) => { console.warn('[SW] 注册失败:', err); });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
  };
  const showUpdateToast = () => {
    const t = document.createElement('div');
    t.className = 'update-toast';
    t.innerHTML = `<span>新版本已就绪</span><button type="button" class="btn primary" style="padding:4px 12px;font-size:12px;">刷新</button>`;
    t.querySelector('button').addEventListener('click', () => { navigator.serviceWorker.getRegistration().then((reg) => { reg && reg.waiting && reg.waiting.postMessage('SKIP_WAITING'); }); });
    document.body.appendChild(t);
  };

  // ---------- 初始化 ----------
  const init = () => {
    bindEvents();
    tickClock();
    setInterval(tickClock, 1000);
    render('');

    const startBackgroundTasks = () => {
      const cfg = loadSyncConfig();
      if (cfg.enabled && cfg.token) { doPull(true).catch(() => {}); }
      enrichAll(false);
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(startBackgroundTasks, { timeout: 2000 });
    } else {
      setTimeout(startBackgroundTasks, 500);
    }
    setTimeout(registerSW, 300);
  };

  document.addEventListener('DOMContentLoaded', init);
})()