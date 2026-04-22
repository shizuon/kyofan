(function () {
  'use strict';

  // ===== i18n =====
  const I18N = {
    ja: {
      title: 'kyoの歌リスト～',
      searchPlaceholder: '歌名 / アーティスト名で検索...',
      filters: 'フィルター',
      reset: 'リセット',
      languageLabel: '言語',
      categoryLabel: 'カテゴリ',
      tagLabel: 'タグ',
      artistLabel: 'アーティスト',
      all: 'すべて',
      recommendedOnly: 'おすすめのみ',
      countUnit: '件',
      sortBy: '並び替え:',
      sortTitle: '歌名順',
      sortArtist: 'アーティスト順',
      emptyTitle: '該当する曲が見つかりません',
      emptyHint: '検索条件を変更してみてください',
      langNames: { Japanese: '日本語', Chinese: '中文', English: 'English', French: 'Français', Korean: '한국어' },
      catNames: { Band: 'バンド', Solo: 'ソロ', Group: 'グループ', Vocaloid: 'ボカロ', Touhou: '東方', Chinese: '中国語', Western: '洋楽' },
      tagNames: {
        'Bands & Groups': 'バンド・グループ',
        'Solo Artists': 'ソロアーティスト',
        'Anime Groups': 'アニメグループ',
        'Vocaloid/Niconico': 'ボカロ・ニコニコ',
        'Touhou': '東方',
        'Anisong/J-POP': 'アニソン・J-POP',
        'Chinese': '中国語',
        'Western': '洋楽'
      }
    },
    zh: {
      title: 'kyo的歌单～',
      searchPlaceholder: '搜索歌名 / 歌手名...',
      filters: '筛选',
      reset: '重置',
      languageLabel: '语言',
      categoryLabel: '分类',
      tagLabel: '标签',
      artistLabel: '歌手',
      all: '全部',
      recommendedOnly: '仅推荐',
      countUnit: '首',
      sortBy: '排序:',
      sortTitle: '按歌名',
      sortArtist: '按歌手',
      emptyTitle: '未找到匹配的歌曲',
      emptyHint: '请尝试更改搜索条件',
      langNames: { Japanese: '日语', Chinese: '中文', English: '英语', French: '法语', Korean: '韩语' },
      catNames: { Band: '乐队', Solo: '个人', Group: '团体', Vocaloid: 'V家', Touhou: '东方', Chinese: '中文', Western: '西洋' },
      tagNames: {
        'Bands & Groups': '乐队/团体',
        'Solo Artists': '个人歌手',
        'Anime Groups': '动画团体',
        'Vocaloid/Niconico': 'V家/N站',
        'Touhou': '东方Project',
        'Anisong/J-POP': '动画歌曲/J-POP',
        'Chinese': '中文歌曲',
        'Western': '西洋音乐'
      }
    }
  };

  let currentLang = localStorage.getItem('lang') || 'zh';

  function t(key) {
    return I18N[currentLang][key] || I18N.ja[key] || key;
  }

  // ===== State =====
  const state = {
    query: '',
    activeLanguages: new Set(),
    activeCategories: new Set(),
    activeTags: new Set(),
    artist: '',
    recommendedOnly: false,
    sortBy: 'title',
  };

  // ===== DOM refs =====
  const $ = (sel) => document.querySelector(sel);
  const searchInput = $('#searchInput');
  const languageFilters = $('#languageFilters');
  const categoryFilters = $('#categoryFilters');
  const tagFilters = $('#tagFilters');
  const artistFilter = $('#artistFilter');
  const recommendedOnly = $('#recommendedOnly');
  const sortBy = $('#sortBy');
  const resetBtn = $('#resetFilters');
  const resultCount = $('#resultCount');
  const songList = $('#songList');
  const emptyState = $('#emptyState');
  const themeToggle = $('#themeToggle');
  const themeIcon = $('#themeIcon');
  const langToggle = $('#langToggle');
  const langLabel = $('#langLabel');

  // ===== Theme =====
  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.body.classList.add('light-theme');
      themeIcon.textContent = '☾';
    }
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeIcon.textContent = isLight ? '☾' : '☀';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });

  // ===== Language =====
  function applyI18n() {
    // Static text via data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    // Placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    // Update lang toggle label
    langLabel.textContent = currentLang === 'ja' ? '中文' : '日本語';
  }

  function rebuildFilters() {
    languageFilters.innerHTML = '';
    categoryFilters.innerHTML = '';
    tagFilters.innerHTML = '';
    artistFilter.innerHTML = '';

    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = t('all');
    artistFilter.appendChild(optAll);

    initFilters();
  }

  langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'ja' ? 'zh' : 'ja';
    localStorage.setItem('lang', currentLang);
    applyI18n();
    rebuildFilters();
    // Restore active chip states
    restoreChipStates();
    render();
  });

  function restoreChipStates() {
    // Re-apply active class to chips based on state
    languageFilters.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('active', state.activeLanguages.has(c.dataset.value));
    });
    categoryFilters.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('active', state.activeCategories.has(c.dataset.value));
    });
    tagFilters.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('active', state.activeTags.has(c.dataset.value));
    });
    artistFilter.value = state.artist;
    recommendedOnly.checked = state.recommendedOnly;
    sortBy.value = state.sortBy;
  }

  // ===== Build Filter Chips =====
  function initFilters() {
    const langCounts = {};
    const catCounts = {};
    const tagCounts = {};

    SONGS.forEach((s) => {
      langCounts[s.language] = (langCounts[s.language] || 0) + 1;
      catCounts[s.category] = (catCounts[s.category] || 0) + 1;
      s.tags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    const langDisplay = t('langNames');
    const catDisplay = t('catNames');
    const tagDisplay = t('tagNames');

    function buildChipsWithCount(container, items, stateKey, displayMap, counts) {
      items.forEach((item) => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        const count = counts[item] || 0;
        const label = (displayMap && displayMap[item]) || item;
        chip.innerHTML = `${label}<span class="chip__count">(${count})</span>`;
        chip.dataset.value = item;
        chip.addEventListener('click', () => {
          const set = state[stateKey];
          if (set.has(item)) {
            set.delete(item);
            chip.classList.remove('active');
          } else {
            set.add(item);
            chip.classList.add('active');
          }
          render();
        });
        container.appendChild(chip);
      });
    }

    buildChipsWithCount(languageFilters, FILTER_OPTIONS.languages, 'activeLanguages', langDisplay, langCounts);
    buildChipsWithCount(categoryFilters, FILTER_OPTIONS.categories, 'activeCategories', catDisplay, catCounts);
    buildChipsWithCount(tagFilters, FILTER_OPTIONS.tags, 'activeTags', tagDisplay, tagCounts);

    // Artist dropdown
    const artists = [...new Set(SONGS.flatMap((s) =>
      s.artist.split(/[,/]/).map((a) => a.trim())
    ))].sort((a, b) => a.localeCompare(b, 'ja'));

    artists.forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      artistFilter.appendChild(opt);
    });
  }

  // ===== Filter Logic =====
  function getFilteredSongs() {
    const query = state.query.toLowerCase().normalize('NFKC');

    return SONGS.filter((song) => {
      if (state.recommendedOnly && !song.recommended) return false;
      if (state.activeLanguages.size > 0 && !state.activeLanguages.has(song.language)) return false;
      if (state.activeCategories.size > 0 && !state.activeCategories.has(song.category)) return false;
      if (state.activeTags.size > 0) {
        for (const tag of state.activeTags) {
          if (!song.tags.includes(tag)) return false;
        }
      }
      if (state.artist) {
        const songArtists = song.artist.split(/[,/]/).map((a) => a.trim());
        if (!songArtists.includes(state.artist)) return false;
      }
      if (query) {
        const titleMatch = song.title.toLowerCase().normalize('NFKC').includes(query);
        const artistMatch = song.artist.toLowerCase().normalize('NFKC').includes(query);
        if (!titleMatch && !artistMatch) return false;
      }
      return true;
    });
  }

  // ===== Sort =====
  function sortSongs(songs) {
    const collator = new Intl.Collator('ja');
    return [...songs].sort((a, b) => {
      if (state.sortBy === 'artist') {
        const cmp = collator.compare(a.artist, b.artist);
        return cmp !== 0 ? cmp : collator.compare(a.title, b.title);
      }
      return collator.compare(a.title, b.title);
    });
  }

  // ===== Highlight =====
  function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeRegExp(query);
    const regex = new RegExp(`(${escaped})`, 'gi');
    return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ===== Render =====
  function render() {
    const filtered = getFilteredSongs();
    const sorted = sortSongs(filtered);

    resultCount.textContent = sorted.length;

    if (sorted.length === 0) {
      songList.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    const query = state.query;
    const langDisplay = t('langNames');
    const tagDisplay = t('tagNames');

    const fragment = document.createDocumentFragment();
    sorted.forEach((song) => {
      const card = document.createElement('div');
      card.className = 'song-card';

      const star = document.createElement('span');
      star.className = `song-card__star ${song.recommended ? 'recommended' : 'empty'}`;
      star.textContent = song.recommended ? '★' : '☆';

      const info = document.createElement('div');
      info.className = 'song-card__info';

      const title = document.createElement('div');
      title.className = 'song-card__title';
      title.innerHTML = highlightText(song.title, query);

      const artist = document.createElement('div');
      artist.className = 'song-card__artist';
      artist.innerHTML = highlightText(song.artist, query);
      artist.title = song.artist;
      artist.addEventListener('click', (e) => {
        e.stopPropagation();
        const clickedText = e.target.closest('.song-card__artist').textContent.trim();
        artistFilter.value = clickedText;
        state.artist = clickedText;
        render();
      });

      info.appendChild(title);
      info.appendChild(artist);

      const meta = document.createElement('div');
      meta.className = 'song-card__meta';

      const lang = document.createElement('span');
      lang.className = 'song-card__lang';
      lang.textContent = (langDisplay && langDisplay[song.language]) || song.language;
      meta.appendChild(lang);

      song.tags.forEach((tag) => {
        const tagEl = document.createElement('span');
        tagEl.className = 'song-card__tag';
        tagEl.textContent = (tagDisplay && tagDisplay[tag]) || tag;
        meta.appendChild(tagEl);
      });

      card.appendChild(star);
      card.appendChild(info);
      card.appendChild(meta);
      fragment.appendChild(card);
    });

    songList.innerHTML = '';
    songList.appendChild(fragment);
  }

  // ===== Event Listeners =====
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.query = searchInput.value.trim();
      render();
    }, 150);
  });

  artistFilter.addEventListener('change', () => {
    state.artist = artistFilter.value;
    render();
  });

  recommendedOnly.addEventListener('change', () => {
    state.recommendedOnly = recommendedOnly.checked;
    render();
  });

  sortBy.addEventListener('change', () => {
    state.sortBy = sortBy.value;
    render();
  });

  resetBtn.addEventListener('click', () => {
    state.query = '';
    state.activeLanguages.clear();
    state.activeCategories.clear();
    state.activeTags.clear();
    state.artist = '';
    state.recommendedOnly = false;
    state.sortBy = 'title';

    searchInput.value = '';
    artistFilter.value = '';
    recommendedOnly.checked = false;
    sortBy.value = 'title';

    document.querySelectorAll('.chip.active').forEach((c) => c.classList.remove('active'));
    render();
  });

  // ===== Init =====
  initTheme();
  applyI18n();
  initFilters();
  render();
})();
