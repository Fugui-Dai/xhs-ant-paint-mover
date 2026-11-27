/* 主应用控制器：2D 森林绘本布局、全可点混合小队、慢速解压切换、画廊与端能力（ES2017） */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'ant_paint_mover_save_v1';

  var state = {
    screen: 'home',
    modalKind: null,
    collapsedChapters: {},
    galleryExpanded: { 1: true },
    currentLevelId: 1,
    endlessStage: 1,
    inEndless: false,
    speed: 1,
    actionBusy: false,
    studioColor: 'R',
    studioMirror: true,
    studioEraser: false,
    studioDrawing: false,
    studioGrid: null,
    sanctuaryState: { lantern: true, candies: [], frames: [], _previewCache: {} },
    sanctuaryClearedCache: [],
    progress: {
      unlockedLevel: 1,
      stars: {},
      hardStars: {},
      customGallery: [],
      endlessBest: 0,
      endlessHardBest: 0,
      tools: { undo: 3, slot: 2, rainbow: 2 },
      sound: true,
      vibrate: false,
      daily: { lastDate: '', streak: 0, hardLastDate: '' },
      selectedSkin: 'classic',
      selectedTheme: 'candy',
      selectedBlockStyle: 'jelly',
      selectedSoundPack: 'pudding',
      hardMode: false,
      diyCount: 0
    }
  };

  var els = {};
  var engine = null;
  var renderer = null;
  var rafId = 0;
  var lastTs = 0;
  var toastTimer = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.hidden = true;
    }, 2200);
  }

  function saveProgress(syncCloud) {
    global.AntCompat.saveStorage(STORAGE_KEY, state.progress);
    if (syncCloud) {
      global.AntCompat.pushCloudSave(state.progress, false);
      updateCloudHint();
    }
  }

  function updateCloudHint() {
    if (!els.cloudSyncHint) return;
    var st = global.AntCompat.getCloudStatus();
    els.cloudSyncHint.hidden = !(st === 'synced' || st === 'syncing');
    if (st === 'syncing') {
      els.cloudSyncHint.textContent = '☁️ 正在同步云端存档...';
    } else if (st === 'synced') {
      els.cloudSyncHint.textContent = '☁️ 云存档已开启（同账号跨端同步）';
    }
  }

  function hideRankEntries() {
    if (els.btnRank) els.btnRank.hidden = true;
    if (els.btnRankHome) els.btnRankHome.hidden = true;
  }

  function countStats() {
    var cleared = 0;
    var totalStars = 0;
    var keys = Object.keys(state.progress.stars);
    for (var i = 0; i < keys.length; i += 1) {
      var st = state.progress.stars[keys[i]];
      if (st > 0) {
        cleared += 1;
        totalStars += st;
      }
    }
    return { cleared: cleared, totalStars: totalStars };
  }

  function pickCatalogId(items, targetId, fallback) {
    if (Array.isArray(items)) {
      for (var i = 0; i < items.length; i += 1) {
        if (items[i] && items[i].id === targetId) return targetId;
      }
    }
    return fallback;
  }

  function applyTheme(themeId) {
    var items = global.AntLevels && global.AntLevels.UI_THEMES;
    var valid = pickCatalogId(items, themeId, 'candy');
    state.progress.selectedTheme = valid;
    if (els.appShell) els.appShell.setAttribute('data-theme', valid);
    if (renderer && renderer.setTheme) renderer.setTheme(valid);
  }

  function applyBlockStyle(styleId) {
    var items = global.AntLevels && global.AntLevels.BLOCK_STYLES;
    var valid = pickCatalogId(items, styleId, 'jelly');
    state.progress.selectedBlockStyle = valid;
    if (renderer && renderer.setBlockStyle) renderer.setBlockStyle(valid);
  }

  function applySoundPack(packId) {
    var items = global.AntAudio && global.AntAudio.SOUND_PACKS;
    var valid = pickCatalogId(items, packId, 'pudding');
    state.progress.selectedSoundPack = valid;
    if (global.AntAudio && global.AntAudio.setSoundPack) {
      global.AntAudio.setSoundPack(valid);
    }
  }

  function applyVibrateSetting(enabled) {
    var on = !!enabled;
    state.progress.vibrate = on;
    if (global.AntCompat && global.AntCompat.setVibrateEnabled) {
      global.AntCompat.setVibrateEnabled(on);
    }
    if (renderer && renderer.setShakeEnabled) {
      renderer.setShakeEnabled(on);
    }
    if (els.btnVibrate) {
      els.btnVibrate.classList.toggle('is-on', on);
      els.btnVibrate.setAttribute('aria-label', on ? '震动与抖屏开关（已开启）' : '震动与抖屏开关（已关闭）');
      els.btnVibrate.setAttribute('title', on ? '震动与抖屏：已开启' : '震动与抖屏：已关闭');
    }
    if (els.btnAtelierVibrate) {
      els.btnAtelierVibrate.classList.toggle('is-on', on);
    }
    if (els.atelierVibrateTag) {
      els.atelierVibrateTag.textContent = on ? '已开启 ✓' : '默认关闭';
    }
  }

  function toggleVibrateSetting() {
    var next = !state.progress.vibrate;
    applyVibrateSetting(next);
    saveProgress(true);
    global.AntAudio.playTap();
    if (next) global.AntCompat.vibrate('light');
    showToast(next ? '📳 已开启震动与抖屏特效' : '已关闭震动与抖屏特效');
  }

  function switchScreen(name) {
    state.screen = name;
    els.screenHome.hidden = name !== 'home';
    els.screenGame.hidden = name !== 'game';
    els.screenGallery.hidden = name !== 'gallery';
    if (els.screenStudio) els.screenStudio.hidden = name !== 'studio';
    if (els.screenAtelier) els.screenAtelier.hidden = name !== 'atelier';
    if (els.bottomNav) {
      var navBtns = els.bottomNav.querySelectorAll('.bnav-btn');
      for (var ni = 0; ni < navBtns.length; ni += 1) {
        navBtns[ni].classList.toggle('is-active', navBtns[ni].getAttribute('data-nav-screen') === name);
      }
    }

    if (name === 'home') {
      els.headerTitle.textContent = '关卡地图';
      els.headerSub.textContent = '18 大主题章节 · ' + global.AntLevels.TOTAL_LEVELS + ' 关 + 无尽';
      renderHome();
    } else if (name === 'gallery') {
      els.headerTitle.textContent = '蚁巢藏馆';
      els.headerSub.textContent = '点挂画看海报 · 喂糖逗小工蚁';
      renderGallery();
    } else if (name === 'studio') {
      els.headerTitle.textContent = '像素创作';
      els.headerSub.textContent = '16×16 对称画板 · 召唤蚂蚁来搬';
      renderStudio();
    } else if (name === 'atelier') {
      els.headerTitle.textContent = '装扮工坊';
      els.headerSub.textContent = '主题、材质、音效与工蚁装扮';
      renderAtelier();
    } else if (name === 'game') {
      if (engine && engine.config) {
        var cfg = engine.config;
        if (cfg.isDaily) els.headerTitle.textContent = '每日一画 · ' + (cfg.dateKey ? cfg.dateKey.slice(5) : '今日');
        else if (cfg.isDiy) els.headerTitle.textContent = 'DIY 像素画 · ' + cfg.name;
        else els.headerTitle.textContent = cfg.isEndless ? ('无尽第' + cfg.endlessStage + '关') : ('第' + cfg.id + '关 · ' + cfg.name);
        els.headerSub.textContent = cfg.chapterName + ' · ' + cfg.cols + '×' + cfg.rows;
      }
      setTimeout(function () {
        if (renderer) renderer.resize();
      }, 20);
    }
  }

  function renderHome() {
    var stats = countStats();
    var daily = state.progress.daily || { lastDate: '', streak: 0 };
    var todayKey = global.AntLevels.getTodayKey();
    var clearedToday = daily.lastDate === todayKey;
    els.statCleared.textContent = stats.cleared + ' / ' + global.AntLevels.TOTAL_LEVELS;
    els.statStars.textContent = stats.totalStars + ' ★';
    if (els.statDaily) els.statDaily.textContent = (daily.streak || 0) + ' 天';
    els.statEndless.textContent = String(state.progress.endlessBest || 0);
    els.continueLevelNum.textContent = String(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));
    if (els.dailyStatusTag) els.dailyStatusTag.textContent = clearedToday ? '今日已完成 ✓' : '今日待挑战';
    if (els.btnDaily) els.btnDaily.classList.toggle('is-cleared', clearedToday);
    if (els.endlessBestTag) els.endlessBestTag.textContent = '纪录 第' + (state.progress.endlessBest || 0) + '关';
    if (els.btnHardMode) {
      var isHard = !!state.progress.hardMode;
      var hardCnt = Object.keys(state.progress.hardStars || {}).length;
      els.btnHardMode.classList.toggle('is-hard', isHard);
      if (els.hardModeTitle) els.hardModeTitle.textContent = isHard ? '🔥 烧脑 4 槽（已开）' : '🛡️ 休闲 5 槽（标准）';
      if (els.hardModeTag) els.hardModeTag.textContent = '🔥已破 ' + hardCnt + ' 关 · ' + (isHard ? '切5槽' : '切4槽');
    }

    els.chapterList.textContent = '';
    var chapters = global.AntLevels.CHAPTERS;
    var metaList = global.AntLevels.getMetaList();

    for (var i = 0; i < chapters.length; i += 1) {
      var ch = chapters[i];
      var currentCh = Math.ceil(state.progress.unlockedLevel / 20);
      if (state.collapsedChapters[ch.id] === undefined) {
        /* 默认展开当前章与第1章，其余远期章节默认收起，上下滑动超清爽 */
        state.collapsedChapters[ch.id] = (ch.id !== 1 && ch.id !== currentCh);
      }
      var isCollapsed = !!state.collapsedChapters[ch.id];

      var block = document.createElement('div');
      block.className = 'chapter-block' + (isCollapsed ? ' is-collapsed' : '');

      var chLevels = [];
      var chCleared = 0;
      for (var m = 0; m < metaList.length; m += 1) {
        if (metaList[m].chapter === ch.id) {
          chLevels.push(metaList[m]);
          if ((state.progress.stars[String(metaList[m].id)] || 0) > 0) chCleared += 1;
        }
      }

      var headBtn = document.createElement('button');
      headBtn.type = 'button';
      headBtn.className = 'chapter-block-head';
      headBtn.setAttribute('data-toggle-chapter', String(ch.id));

      var leftWrap = document.createElement('div');
      leftWrap.className = 'chapter-head-left';
      var titleEl = document.createElement('div');
      titleEl.className = 'chapter-head-title';
      titleEl.textContent = ch.id + '. ' + ch.name + '（' + ch.badge + '）';
      var descEl = document.createElement('div');
      descEl.className = 'chapter-head-desc';
      descEl.textContent = ch.desc;
      leftWrap.appendChild(titleEl);
      leftWrap.appendChild(descEl);

      var badgeEl = document.createElement('span');
      badgeEl.className = 'chapter-head-badge';
      badgeEl.textContent = chCleared + '/' + chLevels.length + (isCollapsed ? ' ▸' : ' ▾');

      headBtn.appendChild(leftWrap);
      headBtn.appendChild(badgeEl);
      block.appendChild(headBtn);

      if (!isCollapsed) {
        var grid = document.createElement('div');
        grid.className = 'level-grid';
        for (var k = 0; k < chLevels.length; k += 1) {
          var lv = chLevels[k];
          var st = state.progress.stars[String(lv.id)] || 0;
          var unlocked = lv.id <= state.progress.unlockedLevel;
          var isCurrent = lv.id === state.progress.unlockedLevel;

          var tile = document.createElement('button');
          tile.type = 'button';
          tile.className = 'level-tile';
          if (st > 0) tile.classList.add('is-cleared');
          else if (isCurrent) tile.classList.add('is-current');
          else if (!unlocked) tile.classList.add('is-locked');
          tile.setAttribute('data-level-id', String(lv.id));

          var numEl = document.createElement('span');
          numEl.className = 'level-num';
          numEl.textContent = unlocked ? String(lv.id) : '🔒';

          var nameEl = document.createElement('span');
          nameEl.className = 'level-name';
          nameEl.textContent = lv.name;

          var starsEl = document.createElement('span');
          starsEl.className = 'level-stars';
          starsEl.textContent = st > 0 ? ('★★★'.slice(0, st) + '☆☆☆'.slice(0, 3 - st)) : (unlocked ? '待搬运' : '未解锁');

          tile.appendChild(numEl);
          tile.appendChild(nameEl);
          tile.appendChild(starsEl);
          if ((state.progress.hardStars && state.progress.hardStars[String(lv.id)]) > 0) {
            var hBadge = document.createElement('span');
            hBadge.className = 'hard-badge-corner';
            hBadge.textContent = '🔥';
            tile.appendChild(hBadge);
          }
          grid.appendChild(tile);
        }
        block.appendChild(grid);
      }

      els.chapterList.appendChild(block);
    }
  }

  function startLevel(levelId) {
    state.inEndless = false;
    state.currentLevelId = levelId;
    var config = global.AntLevels.getLevelConfig(levelId, { hardMode: !!state.progress.hardMode });
    beginGameWithConfig(config);
  }

  function startEndless(stageNum) {
    state.inEndless = true;
    state.endlessStage = stageNum || 1;
    var config = global.AntLevels.getEndlessConfig(state.endlessStage, { hardMode: !!state.progress.hardMode });
    beginGameWithConfig(config);
  }

  function startDailyChallenge() {
    state.inEndless = false;
    var config = global.AntLevels.getDailyConfig(global.AntLevels.getTodayKey(), { hardMode: !!state.progress.hardMode });
    beginGameWithConfig(config);
  }

  function handleDiyFileSelection(file) {
    if (!file) return;
    if (file.type && file.type.indexOf('image/') !== 0) {
      showToast('请选择手机相册中的图片文件（暂不支持视频）');
      return;
    }
    var objectUrl = null;
    var usedUrl = false;
    function processImage(img) {
      try {
        var dim = 20;
        var off = document.createElement('canvas');
        off.width = dim;
        off.height = dim;
        var ctx = off.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        var minSide = Math.min(img.width, img.height);
        var sx = Math.floor((img.width - minSide) / 2);
        var sy = Math.floor((img.height - minSide) / 2);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, dim, dim);
        var rgba = ctx.getImageData(0, 0, dim, dim).data;
        var rawName = (file.name || '').replace(/\.[^.]+$/, '').trim() || '我的照片画';
        var built = global.AntLevels.buildCustomConfigFromPixels(rgba, dim, rawName, { hardMode: !!state.progress.hardMode, diySource: 'photo' });
        if (!built.ok) {
          showToast('照片有效像素太少，换一张色彩更鲜明的图试试');
          return;
        }
        state.inEndless = false;
        state.lastDiyConfig = built.config;
        beginGameWithConfig(built.config);
        showToast('📷 已从照片生成 20×20 像素关卡！');
      } catch (e) {
        showToast('图片解析失败，请换一张图片再试');
      } finally {
        if (usedUrl && objectUrl && global.URL && global.URL.revokeObjectURL) {
          global.URL.revokeObjectURL(objectUrl);
        }
      }
    }

    var img = new Image();
    img.onload = function () { processImage(img); };
    img.onerror = function () {
      if (usedUrl && objectUrl && global.URL && global.URL.revokeObjectURL) {
        global.URL.revokeObjectURL(objectUrl);
      }
      showToast('无法读取所选图片，请重新选择');
    };
    if (global.URL && typeof global.URL.createObjectURL === 'function') {
      usedUrl = true;
      objectUrl = global.URL.createObjectURL(file);
      img.src = objectUrl;
    } else if (global.FileReader) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        img.src = ev.target && ev.target.result;
      };
      reader.onerror = function () { showToast('读取图片失败'); };
      reader.readAsDataURL(file);
    }
  }

  function getEffectiveSpeed(mode) {
    if (mode === 2) return 1.35;
    if (mode === 3) return 1.75;
    return 1;
  }

  function beginGameWithConfig(config) {
    closeModal();
    switchScreen('game');
    if (config.isDaily) els.headerTitle.textContent = '每日一画 · ' + (config.dateKey ? config.dateKey.slice(5) : '今日');
    else if (config.isDiy) els.headerTitle.textContent = 'DIY 像素画 · ' + config.name;
    else els.headerTitle.textContent = config.isEndless ? ('无尽第' + config.endlessStage + '关') : ('第' + config.id + '关 · ' + config.name);
    els.headerSub.textContent = config.chapterName + ' · ' + config.cols + '×' + config.rows;
    if (els.hudHardBadge) els.hudHardBadge.hidden = !config.isHard;

    var slotLimit = config.baseSlots || 5;
    var tipText = '外围先露什么颜色就先点什么！' + slotLimit + ' 个槽位切勿乱点内层色';
    if (config.isDaily) tipText = '今日全服同图限时挑战！通关可累计每日连签天数';
    else if (config.isDiy) tipText = (config.chapterName === '手绘拼豆工坊') ? '🎨 你的手绘像素画已铺上画架，点底部蚂蚁小队开搬！' : '📷 自选照片已转为 20×20 像素关，通关可晒出专属拼豆色卡！';
    else if (config.id <= 5) tipText = '从外边一圈圈剥开搬画！多槽可同时出兵，注意别堵满';
    else if (config.chapter === 2 || config.chapter === 3) tipText = slotLimit + ' 槽进阶：冰霜厚涂格（带2）需同色蚂蚁搬运 2 次';
    else if (config.chapter === 4 || config.chapter === 5) tipText = slotLimit + ' 槽挑战：泥块封印格需搬空相邻格子震碎泥壳';
    else if (config.chapter === 6) tipText = slotLimit + ' 槽秘宝：先搬带 K 金钥匙方块解锁全部金锁！';
    else if (config.chapter === 7) tipText = '粉色礼物盒需清空相邻像素拆开后才显色';
    else if (config.chapter === 10) tipText = '带“？”盲盒小队入槽后揭晓，先留空槽再用';
    else if (config.chapter === 11) tipText = '魔法学院：金钥匙与礼物礼盒双机关齐发！';
    else if (config.chapter >= 12 && config.chapter < 16) tipText = '善用带💣爆破工蚁，可一次性震碎周围泥壳与礼盒！';
    else if (config.chapter >= 16) tipText = '星夜幻境高阶挑战！先观局再出兵';
    state.baseTipText = tipText;
    state.lastStageTip = tipText;
    els.stageTip.textContent = tipText;

    engine.setSpeedMultiplier(getEffectiveSpeed(state.speed));
    engine.initLevel(config);
    if (renderer) {
      if (renderer.resetEffects) renderer.resetEffects();
      renderer.resize();
    }
  }

  var dockDomSlots = [];
  var poolDomButtons = [];
  var lastPointerDispatchAt = 0;

  function triggerPopAnim(el) {
    if (!el) return;
    el.classList.remove('is-entering');
    /* 强制重排以重播短动画 */
    void el.offsetWidth;
    el.classList.add('is-entering');
    setTimeout(function () {
      el.classList.remove('is-entering');
    }, 220);
  }

  function paintAntCanvas(cv, bodyHex) {
    if (cv && global.AntRenderer && typeof global.AntRenderer.drawAntIcon === 'function') {
      global.AntRenderer.drawAntIcon(cv, bodyHex, state.progress.selectedSkin || 'classic');
    }
  }

  function invalidateAntIcons() {
    for (var d = 0; d < dockDomSlots.length; d += 1) {
      dockDomSlots[d].lastSig = '';
    }
    for (var p = 0; p < poolDomButtons.length; p += 1) {
      poolDomButtons[p].lastSig = '';
    }
  }

  function ensureDockDom() {
    if (dockDomSlots.length > 0) return;
    els.dockSlots.textContent = '';
    for (var i = 0; i < 6; i += 1) {
      var slot = document.createElement('div');
      slot.className = 'dock-slot' + (i >= 5 ? ' is-extra' : '');
      var antGlyph = document.createElement('span');
      antGlyph.className = 'slot-ant';
      var cv = document.createElement('canvas');
      cv.width = 48;
      cv.height = 48;
      cv.className = 'kawaii-ant-svg';
      cv.setAttribute('aria-hidden', 'true');
      cv.hidden = true;
      var chip = document.createElement('span');
      chip.className = 'bomber-chip';
      chip.textContent = '💣';
      chip.hidden = true;
      antGlyph.appendChild(cv);
      antGlyph.appendChild(chip);

      var cntEl = document.createElement('span');
      cntEl.className = 'slot-count';
      slot.appendChild(antGlyph);
      slot.appendChild(cntEl);
      els.dockSlots.appendChild(slot);
      dockDomSlots.push({ el: slot, glyph: antGlyph, canvas: cv, chip: chip, count: cntEl, lastSig: '' });
    }
  }

  function ensurePoolDom(totalSlots) {
    if (poolDomButtons.length === totalSlots) return;
    els.supplyGrid.textContent = '';
    poolDomButtons = [];
    for (var i = 0; i < totalSlots; i += 1) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'squad-btn';
      btn.setAttribute('data-pool-idx', String(i));
      var iconSpan = document.createElement('span');
      iconSpan.className = 'squad-icon-wrap';
      var cv = document.createElement('canvas');
      cv.width = 48;
      cv.height = 48;
      cv.className = 'kawaii-ant-svg';
      cv.setAttribute('aria-hidden', 'true');
      cv.hidden = true;
      var chip = document.createElement('span');
      chip.className = 'bomber-chip';
      chip.textContent = '💣';
      chip.hidden = true;
      var qText = document.createElement('span');
      qText.hidden = true;
      iconSpan.appendChild(cv);
      iconSpan.appendChild(chip);
      iconSpan.appendChild(qText);

      var numSpan = document.createElement('span');
      btn.appendChild(iconSpan);
      btn.appendChild(numSpan);
      els.supplyGrid.appendChild(btn);
      poolDomButtons.push({ btn: btn, icon: iconSpan, canvas: cv, chip: chip, qText: qText, num: numSpan, lastSig: '' });
    }
  }

  function renderGameHud() {
    if (!engine || !engine.config) return;
    var remain = Math.max(0, engine.totalCarries - engine.doneCarries);
    var pct = engine.totalCarries > 0 ? Math.min(100, Math.round((engine.doneCarries / engine.totalCarries) * 100)) : 0;
    els.hudRemainText.textContent = remain + ' 块';
    els.hudProgressFill.style.width = pct + '%';

    if (engine.combo >= 4 || engine.feverActive) {
      els.hudComboBadge.classList.remove('is-hidden');
      els.hudComboBadge.setAttribute('aria-hidden', 'false');
      els.hudComboBadge.classList.toggle('is-fever', !!engine.feverActive);
      els.hudComboNum.textContent = (engine.feverActive ? '🔥x' : 'x') + engine.combo;
    } else {
      els.hudComboBadge.classList.add('is-hidden');
      els.hudComboBadge.classList.remove('is-fever');
      els.hudComboBadge.setAttribute('aria-hidden', 'true');
    }
    els.hudProgressFill.classList.toggle('is-fever', !!engine.feverActive);

    /* 原地复用 DOM 与持久化 Canvas，零节点重建开销 */
    ensureDockDom();
    var PALETTE = global.AntLevels.PALETTE;
    var lastOneFree = (engine.dock.length === engine.maxSlots - 1) && remain > 0;
    for (var i = 0; i < 6; i += 1) {
      var dObj = dockDomSlots[i];
      dObj.el.hidden = i >= engine.maxSlots;
      if (i >= engine.maxSlots) continue;
      dObj.el.classList.toggle('is-extra', i >= (engine.baseSlots || 5));
      var sq = engine.dock[i];
      if (sq) {
        var pal = PALETTE[sq.color] || { hex: '#888', dark: '#555' };
        var wasEmpty = dObj.lastSig === '';
        dObj.el.classList.add('is-filled');
        dObj.el.classList.remove('is-warn');
        dObj.el.style.background = pal.hex;
        dObj.el.classList.toggle('is-working', engine.exposedColors[sq.color] > 0 && sq.count > 0);
        var dSig = sq.id + '|' + sq.color + '|' + sq.kind;
        if (dObj.lastSig !== dSig) {
          dObj.lastSig = dSig;
          dObj.canvas.hidden = false;
          dObj.chip.hidden = sq.kind !== 'bomber';
          paintAntCanvas(dObj.canvas, pal.ant || '#fff8ea');
          if (wasEmpty) triggerPopAnim(dObj.el);
        }
        dObj.count.textContent = String(sq.count);
      } else {
        dObj.el.classList.remove('is-filled', 'is-working');
        dObj.el.classList.toggle('is-warn', lastOneFree);
        dObj.el.style.background = '';
        if (dObj.lastSig !== '') {
          dObj.lastSig = '';
          dObj.canvas.hidden = true;
          dObj.chip.hidden = true;
        }
        dObj.count.textContent = '';
      }
    }

    if (els.stageTip) {
      var nextTip = lastOneFree
        ? '⚠️ 只剩最后 1 个空槽位，优先点画上外露同色小队或用道具解围'
        : (state.baseTipText || '');
      if (nextTip !== state.lastStageTip) {
        state.lastStageTip = nextTip;
        els.stageTip.textContent = nextTip;
      }
    }

    /* 原地更新底部 2×4 全可点小队阵：补位平滑弹入 */
    els.supplyReserveText.textContent = engine.reserveDeck.length > 0
      ? ('后续还有 ' + engine.reserveDeck.length + ' 队')
      : '已全部登场';

    var hintSlotIdx = -1;
    if (engine.idleTime >= 4.0 && engine.dock.length < engine.maxSlots && !engine.isCelebrating) {
      for (var hi = 0; hi < engine.visiblePool.length; hi += 1) {
        var hItem = engine.visiblePool[hi];
        if (hItem && !hItem.mystery && engine.exposedColors[hItem.color] > 0) {
          hintSlotIdx = hi;
          break;
        }
      }
    }

    ensurePoolDom(engine.visiblePool.length);
    for (var pIdx = 0; pIdx < engine.visiblePool.length; pIdx += 1) {
      var item = engine.visiblePool[pIdx];
      var cell = poolDomButtons[pIdx];
      var sig = item ? (item.color + '|' + item.count + '|' + item.kind + '|' + (item.mystery ? 1 : 0)) : 'EMPTY';
      if (cell.lastSig !== sig) {
        var hadPrev = cell.lastSig !== '' && cell.lastSig !== 'EMPTY';
        cell.lastSig = sig;
        if (!item) {
          cell.btn.className = 'squad-placeholder';
          cell.btn.style.background = '';
          cell.btn.disabled = true;
          cell.canvas.hidden = true;
          cell.chip.hidden = true;
          cell.qText.hidden = true;
          cell.num.textContent = '';
        } else if (item.mystery) {
          cell.btn.className = 'squad-btn is-mystery';
          cell.btn.style.background = '';
          cell.btn.disabled = false;
          cell.canvas.hidden = true;
          cell.chip.hidden = true;
          cell.qText.hidden = false;
          cell.qText.textContent = '?';
          cell.num.textContent = '×' + item.count;
          if (hadPrev) triggerPopAnim(cell.btn);
        } else {
          var pInfo = PALETTE[item.color] || { hex: '#888', dark: '#555' };
          cell.btn.className = 'squad-btn' + (item.kind === 'bomber' ? ' is-bomber' : '');
          cell.btn.style.background = pInfo.hex;
          cell.btn.disabled = false;
          cell.qText.hidden = true;
          cell.canvas.hidden = false;
          cell.chip.hidden = item.kind !== 'bomber';
          paintAntCanvas(cell.canvas, pInfo.ant || '#fff8ea');
          cell.num.textContent = String(item.count);
          if (hadPrev) triggerPopAnim(cell.btn);
        }
      }
      if (item) {
        cell.btn.classList.toggle('is-hint', pIdx === hintSlotIdx);
      }
    }

    els.toolUndoCount.textContent = String(state.progress.tools.undo);
    els.toolSlotCount.textContent = String(state.progress.tools.slot);
    els.toolRainbowCount.textContent = String(state.progress.tools.rainbow);
    els.toolUndo.classList.toggle('is-disabled', !engine.canUndo() || state.progress.tools.undo <= 0);
    els.toolSlot.classList.toggle('is-disabled', engine.maxSlots >= (engine.baseSlots || 5) + 1 || state.progress.tools.slot <= 0);
    els.toolRainbow.classList.toggle('is-disabled', state.progress.tools.rainbow <= 0);
  }

  function openPosterModal(config, stars, isVictoryModal) {
    state.modalKind = isVictoryModal ? 'win' : 'gallery';
    if (els.modalRankWrap) els.modalRankWrap.hidden = true;
    var cleared = (stars || 0) > 0;
    els.modalStars.hidden = !cleared;
    if (cleared) {
      els.modalStars.textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
    }
    els.modalTitle.textContent = isVictoryModal ? ('搬画完成：' + config.name) : config.name;
    if (isVictoryModal) {
      if (config.isDaily) {
        var streakNow = (state.progress.daily && state.progress.daily.streak) || 1;
        els.modalDesc.textContent = state.lastWinDailyBonus
          ? ('📅 今日挑战达成！已连续打卡 ' + streakNow + ' 天 · 加赠撤回+1 彩虹蚁+1')
          : ('📅 今日限定画卷重温完成！当前连签 ' + streakNow + ' 天');
      } else if (config.isDiy) {
        els.modalDesc.textContent = (config.chapterName === '手绘拼豆工坊') ? '🎨 你的手绘作品已搬成像素画！下方附上拼豆色卡清单' : '📷 你的相册照片已搬成像素画！下方附上 6 色拼豆色卡清单';
      } else if (state.lastWinChapterBonus) {
        els.modalDesc.textContent = '🎉 完成整章 20 关！蚁后加赠：撤回+2 · 扩槽+1 · 彩虹蚁+1';
      } else if (config.isEndless) {
        els.modalDesc.textContent = '无尽第 ' + (config.endlessStage || 1) + ' 关达成！已获撤回 +1';
      } else if (stars === 3) {
        els.modalDesc.textContent = '第 ' + config.id + ' 关 · 零道具完美三星 · 已入画廊';
      } else {
        els.modalDesc.textContent = '第 ' + config.id + ' 关 · 已入画廊（全程不用道具可得 ★★★）';
      }
      if (config.isHard) {
        els.modalDesc.textContent += ' · 🔥4槽烧脑达成';
      }
      if (state.lastWinHardBonus === 'main') {
        els.modalDesc.textContent += '（首通加赠 🌈+1 ➕+1）';
      } else if (state.lastWinHardBonus === 'rainbow') {
        els.modalDesc.textContent += '（首通加赠 🌈+1）';
      }
    } else if (config._customItem) {
      els.modalDesc.textContent = (config.diySource === 'studio' ? '🎨 手绘拼豆工坊原创' : '📷 照片转像素创作') + ' · 已珍藏于创作画架';
    } else if (cleared) {
      els.modalDesc.textContent = '第 ' + config.id + ' 关 · ' + config.chapterName + '（已珍藏于森林画廊）';
    } else {
      els.modalDesc.textContent = '第 ' + config.id + ' 关 · ' + config.chapterName + '（效果图预览 · 含拼豆色卡）';
    }

    els.modalPreviewWrap.hidden = false;
    global.AntRenderer.drawArtworkToCanvas(els.posterCanvas, config, cleared ? stars : 0, true);

    els.modalActions.textContent = '';

    function withBusyLock(btn, fn) {
      if (state.actionBusy) {
        showToast('正在处理上一项操作，请稍候…');
        return;
      }
      state.actionBusy = true;
      btn.classList.add('is-busy');
      btn.disabled = true;
      Promise.resolve().then(fn).then(function () {
        state.actionBusy = false;
        btn.classList.remove('is-busy');
        btn.disabled = false;
      }, function () {
        state.actionBusy = false;
        btn.classList.remove('is-busy');
        btn.disabled = false;
      });
    }

    function createPostBtn(cls, label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', function () {
        withBusyLock(btn, async function () {
          var dataUrl = els.posterCanvas.toDataURL('image/png');
          var res = await global.AntCompat.postArtworkNote(
            ('蚂蚁搬画：' + config.name).slice(0, 20),
            '小蚂蚁把像素一块块搬进森林藏画廊啦！#蚂蚁搬画 #小红书小工具 #像素画',
            dataUrl
          );
          if (res.ok) showToast('已打开笔记发布页！');
          else showToast('请在小红书客户端内使用发笔记功能');
        });
      });
      return btn;
    }

    function createShareBtn(cls, label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', function () {
        withBusyLock(btn, async function () {
          var dataUrl = els.posterCanvas.toDataURL('image/png');
          var res = await global.AntCompat.shareArtwork(dataUrl);
          if (res.ok) showToast('已调起分享！');
          else if (res.errCode === 15503) showToast('今日分享次数已达上限（每天最多 10 次）');
          else if (res.errCode === 15502) showToast('请在全屏容器中使用分享');
          else showToast('请在小红书客户端 9.53+ 中使用分享');
        });
      });
      return btn;
    }

    function createSaveBtn(cls, label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', function () {
        withBusyLock(btn, async function () {
          var dataUrl = els.posterCanvas.toDataURL('image/png');
          var res = await global.AntCompat.savePosterToAlbum(dataUrl);
          if (res.ok) showToast('海报已保存到系统相册！');
          else showToast('请在小红书真机环境使用相册保存');
        });
      });
      return btn;
    }

    if (isVictoryModal) {
      var nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'primary-btn';
      if (config.isDiy) {
        if (config.diySource === 'studio') {
          nextBtn.textContent = '🎨 回创作再画一幅';
          nextBtn.addEventListener('click', function () {
            closeModal();
            switchScreen('studio');
          });
        } else {
          nextBtn.textContent = '📷 再选照片做一关';
          nextBtn.addEventListener('click', function () {
            closeModal();
            switchScreen('home');
            if (els.diyFileInput) els.diyFileInput.click();
          });
        }
      } else if (config.isDaily) {
        nextBtn.textContent = '▶ 继续主线第 ' + Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS) + ' 关';
        nextBtn.addEventListener('click', function () {
          startLevel(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));
        });
      } else if (config.isEndless) {
        nextBtn.textContent = '继续无尽第 ' + (config.endlessStage + 1) + ' 关';
        nextBtn.addEventListener('click', function () { startEndless(config.endlessStage + 1); });
      } else if (config.id < global.AntLevels.TOTAL_LEVELS) {
        nextBtn.textContent = '下一关（第 ' + (config.id + 1) + ' 关）';
        nextBtn.addEventListener('click', function () { startLevel(config.id + 1); });
      } else {
        nextBtn.textContent = '挑战无尽模式';
        nextBtn.addEventListener('click', function () { startEndless(1); });
      }
      els.modalActions.appendChild(nextBtn);

      var compactRow1 = document.createElement('div');
      compactRow1.className = 'modal-actions-row';
      compactRow1.appendChild(createPostBtn('modal-mini-btn', '📸 发笔记'));
      compactRow1.appendChild(createShareBtn('modal-mini-btn', '📤 分享'));
      compactRow1.appendChild(createSaveBtn('modal-mini-btn', '💾 存相册'));
      els.modalActions.appendChild(compactRow1);

      var levelsBtn = document.createElement('button');
      levelsBtn.type = 'button';
      levelsBtn.className = 'secondary-btn';
      levelsBtn.textContent = '🗺️ 返回关卡';
      levelsBtn.addEventListener('click', function () {
        closeModal();
        switchScreen('home');
      });
      els.modalActions.appendChild(levelsBtn);
    } else {
      if (config._customItem) {
        var replayBtn = document.createElement('button');
        replayBtn.type = 'button';
        replayBtn.className = 'primary-btn';
        replayBtn.textContent = '▶ 再搬一次';
        replayBtn.addEventListener('click', function () {
          var itemObj = config._customItem;
          var rebuilt = global.AntLevels.buildCustomConfigFromCharRows(itemObj.rows, itemObj.name, {
            diySource: itemObj.diySource,
            hardMode: !!state.progress.hardMode
          });
          if (!rebuilt || !rebuilt.ok) {
            showToast('无法重开该创作画作');
            return;
          }
          state.inEndless = false;
          state.lastDiyConfig = rebuilt.config;
          closeModal();
          beginGameWithConfig(rebuilt.config);
        });
        els.modalActions.appendChild(replayBtn);
        if (config._customItem.diySource === 'studio') {
          var editStudioBtn = document.createElement('button');
          editStudioBtn.type = 'button';
          editStudioBtn.className = 'secondary-btn';
          editStudioBtn.textContent = '🎨 回画板修改';
          editStudioBtn.addEventListener('click', function () {
            var rows = Array.isArray(config._customItem.rows) ? config._customItem.rows : [];
            var PAL = global.AntLevels ? global.AntLevels.PALETTE : {};
            clearStudioGrid();
            for (var sr = 0; sr < STUDIO_DIM && sr < rows.length; sr += 1) {
              var line = String(rows[sr] || '');
              for (var sc = 0; sc < STUDIO_DIM && sc < line.length; sc += 1) {
                var ch = line.charAt(sc);
                state.studioGrid[sr][sc] = (ch && ch !== '.' && PAL[ch]) ? ch : null;
              }
            }
            closeModal();
            switchScreen('studio');
            showToast('🎨 已将画作载入拼豆画板，可继续改色编辑');
          });
          els.modalActions.appendChild(editStudioBtn);
        }
      } else if (!cleared && config.id <= state.progress.unlockedLevel) {
        var playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'primary-btn';
        playBtn.textContent = '▶ 立即去搬这幅画';
        playBtn.addEventListener('click', function () {
          closeModal();
          startLevel(config.id);
        });
        els.modalActions.appendChild(playBtn);
      }

      var galleryRow1 = document.createElement('div');
      galleryRow1.className = 'modal-actions-row';
      if (cleared) {
        galleryRow1.appendChild(createPostBtn('modal-mini-btn', '📸 发笔记'));
        galleryRow1.appendChild(createShareBtn('modal-mini-btn', '📤 分享'));
      }
      galleryRow1.appendChild(createSaveBtn('modal-mini-btn', cleared ? '💾 存相册' : '💾 存拼豆图谱'));
      els.modalActions.appendChild(galleryRow1);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'secondary-btn';
      closeBtn.textContent = '关闭';
      closeBtn.addEventListener('click', closeModal);
      els.modalActions.appendChild(closeBtn);
    }

    els.modalBackdrop.hidden = false;
  }

  function openLossModal() {
    state.modalKind = 'loss';
    if (els.modalRankWrap) els.modalRankWrap.hidden = true;
    els.modalStars.hidden = true;
    els.modalPreviewWrap.hidden = true;
    els.modalTitle.textContent = '暂存槽被堵住啦！';
    els.modalDesc.textContent = '这 ' + engine.maxSlots + ' 个暂存槽中的蚂蚁都找不到当前外露的同色方块。可用道具解围，或看清外露边缘重规划顺序。';
    els.modalActions.textContent = '';

    if (state.progress.tools.rainbow > 0) {
      var rBtn = document.createElement('button');
      rBtn.type = 'button';
      rBtn.className = 'primary-btn';
      rBtn.textContent = '🌈 召唤彩虹蚁解围（剩余 ' + state.progress.tools.rainbow + '）';
      rBtn.addEventListener('click', function () {
        closeModal();
        triggerRainbowTool();
      });
      els.modalActions.appendChild(rBtn);
    }

    if (engine.maxSlots < (engine.baseSlots || 5) + 1 && state.progress.tools.slot > 0) {
      var sBtn = document.createElement('button');
      sBtn.type = 'button';
      sBtn.className = 'secondary-btn';
      sBtn.textContent = '➕ 扩充第 ' + (engine.maxSlots + 1) + ' 个临时槽位（剩余 ' + state.progress.tools.slot + '）';
      sBtn.addEventListener('click', function () {
        closeModal();
        triggerExpandSlotTool();
      });
      els.modalActions.appendChild(sBtn);
    }

    if (engine.undoStack && engine.undoStack.length > 0 && state.progress.tools.undo > 0) {
      var uBtn = document.createElement('button');
      uBtn.type = 'button';
      uBtn.className = 'secondary-btn';
      uBtn.textContent = '↩️ 撤回上一步（剩余 ' + state.progress.tools.undo + '）';
      uBtn.addEventListener('click', function () {
        closeModal();
        if (engine.status === 'lost') engine.status = 'playing';
        triggerUndoTool();
      });
      els.modalActions.appendChild(uBtn);
    }

    var retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'secondary-btn';
    retryBtn.textContent = '🔄 重新挑战本关';
    retryBtn.addEventListener('click', function () {
      restartWithToolAid();
    });
    els.modalActions.appendChild(retryBtn);

    var chooseBtn = document.createElement('button');
    chooseBtn.type = 'button';
    chooseBtn.className = 'secondary-btn';
    chooseBtn.textContent = '🗺️ 选择其他关卡';
    chooseBtn.addEventListener('click', function () {
      closeModal();
      switchScreen('home');
    });
    els.modalActions.appendChild(chooseBtn);

    els.modalBackdrop.hidden = false;
  }

  function closeModal() {
    state.modalKind = null;
    els.modalBackdrop.hidden = true;
    if (els.modalRankWrap) els.modalRankWrap.hidden = true;
  }

  function renderAtelier() {
    var stats = countStats();
    var totalStars = stats.totalStars;
    if (els.atelierStarsBadge) els.atelierStarsBadge.textContent = totalStars + ' ★';

    if (els.atelierThemeList) {
      els.atelierThemeList.textContent = '';
      var themes = global.AntLevels.UI_THEMES || [];
      var activeTheme = state.progress.selectedTheme || 'candy';
      for (var ti = 0; ti < themes.length; ti += 1) {
        var th = themes[ti];
        var isThActive = activeTheme === th.id;
        var tCard = document.createElement('button');
        tCard.type = 'button';
        tCard.className = 'theme-card' + (isThActive ? ' is-active' : '');
        tCard.setAttribute('data-theme-id', th.id);

        var swatch = document.createElement('span');
        swatch.className = 'theme-swatch-badge';
        swatch.style.background = th.swatch || '#ff85c0';

        var tInfo = document.createElement('div');
        tInfo.className = 'skin-info';
        var tName = document.createElement('div');
        tName.className = 'skin-title';
        tName.textContent = th.name;
        var tDesc = document.createElement('div');
        tDesc.className = 'skin-desc';
        tDesc.textContent = th.desc;
        tInfo.appendChild(tName);
        tInfo.appendChild(tDesc);

        var tTag = document.createElement('span');
        tTag.className = 'skin-tag';
        tTag.textContent = isThActive ? '✓' : '切换';

        tCard.appendChild(swatch);
        tCard.appendChild(tInfo);
        tCard.appendChild(tTag);
        els.atelierThemeList.appendChild(tCard);
      }
    }

    if (els.atelierBlockList) {
      els.atelierBlockList.textContent = '';
      var blocks = global.AntLevels.BLOCK_STYLES || [];
      var activeBlock = state.progress.selectedBlockStyle || 'jelly';
      for (var bi = 0; bi < blocks.length; bi += 1) {
        var bs = blocks[bi];
        var isBActive = activeBlock === bs.id;
        var bCard = document.createElement('button');
        bCard.type = 'button';
        bCard.className = 'block-style-card' + (isBActive ? ' is-active' : '');
        bCard.setAttribute('data-block-style', bs.id);

        var bCv = document.createElement('canvas');
        bCv.width = 32;
        bCv.height = 32;
        bCv.className = 'block-style-preview';
        if (global.AntRenderer && global.AntRenderer.drawBlockStylePreview) {
          global.AntRenderer.drawBlockStylePreview(bCv, bs.id);
        }

        var bInfo = document.createElement('div');
        bInfo.className = 'skin-info';
        var bName = document.createElement('div');
        bName.className = 'skin-title';
        bName.textContent = bs.name;
        var bDesc = document.createElement('div');
        bDesc.className = 'skin-desc';
        bDesc.textContent = bs.desc;
        bInfo.appendChild(bName);
        bInfo.appendChild(bDesc);

        bCard.appendChild(bCv);
        bCard.appendChild(bInfo);
        els.atelierBlockList.appendChild(bCard);
      }
    }

    if (els.atelierSoundList && global.AntAudio && global.AntAudio.SOUND_PACKS) {
      els.atelierSoundList.textContent = '';
      var packs = global.AntAudio.SOUND_PACKS;
      var activePack = (global.AntAudio.getSoundPack && global.AntAudio.getSoundPack()) || state.progress.selectedSoundPack || 'pudding';
      for (var pi = 0; pi < packs.length; pi += 1) {
        var pk = packs[pi];
        var isPActive = activePack === pk.id;
        var pCard = document.createElement('button');
        pCard.type = 'button';
        pCard.className = 'theme-card' + (isPActive ? ' is-active' : '');
        pCard.setAttribute('data-sound-pack', pk.id);

        var pInfo = document.createElement('div');
        pInfo.className = 'skin-info';
        var pName = document.createElement('div');
        pName.className = 'skin-title';
        pName.textContent = pk.name;
        var pDesc = document.createElement('div');
        pDesc.className = 'skin-desc';
        pDesc.textContent = pk.desc;
        pInfo.appendChild(pName);
        pInfo.appendChild(pDesc);

        var pTag = document.createElement('span');
        pTag.className = 'skin-tag';
        pTag.textContent = isPActive ? '使用中' : '试听';

        pCard.appendChild(pInfo);
        pCard.appendChild(pTag);
        els.atelierSoundList.appendChild(pCard);
      }
    }

    if (els.skinList) {
      els.skinList.textContent = '';
      var skins = global.AntLevels.ANT_SKINS || [];
      for (var i = 0; i < skins.length; i += 1) {
        var sk = skins[i];
        var unlocked = totalStars >= sk.reqStars;
        var isEquipped = (state.progress.selectedSkin || 'classic') === sk.id;

        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'skin-card' + (isEquipped ? ' is-active' : (unlocked ? '' : ' is-locked'));
        card.setAttribute('data-skin-id', sk.id);

        var cv = document.createElement('canvas');
        cv.width = 96;
        cv.height = 96;
        cv.className = 'skin-preview';
        global.AntRenderer.drawAntIcon(cv, '#f08334', sk.id);

        var info = document.createElement('div');
        info.className = 'skin-info';
        var tEl = document.createElement('div');
        tEl.className = 'skin-title';
        tEl.textContent = sk.name;
        var dEl = document.createElement('div');
        dEl.className = 'skin-desc';
        dEl.textContent = sk.desc;
        info.appendChild(tEl);
        info.appendChild(dEl);

        var tag = document.createElement('span');
        tag.className = 'skin-tag';
        tag.textContent = isEquipped ? '已穿戴' : (unlocked ? '点击切换' : ('需 ' + sk.reqStars + '★'));

        card.appendChild(cv);
        card.appendChild(info);
        card.appendChild(tag);
        els.skinList.appendChild(card);
      }
    }

    if (els.atelierPreviewCanvas && global.AntRenderer && global.AntRenderer.drawAtelierStage) {
      global.AntRenderer.drawAtelierStage(
        els.atelierPreviewCanvas,
        state.progress.selectedTheme || 'candy',
        state.progress.selectedSkin || 'classic',
        Date.now() / 1000,
        state.progress.selectedBlockStyle || 'jelly'
      );
    }
  }

  var STUDIO_DIM = 16;

  function ensureStudioGrid() {
    if (state.studioGrid) return;
    seedRandomStudioPattern(0);
  }

  function clearStudioGrid() {
    var g = [];
    for (var r = 0; r < STUDIO_DIM; r += 1) {
      var row = [];
      for (var c = 0; c < STUDIO_DIM; c += 1) row.push(null);
      g.push(row);
    }
    state.studioGrid = g;
  }

  function seedRandomStudioPattern(variantIdx) {
    clearStudioGrid();
    var pKeys = Object.keys(global.AntLevels.PALETTE);
    var seed = typeof variantIdx === 'number' ? variantIdx : Math.floor(Math.random() * 4);
    var c1 = pKeys[(seed * 3 + 5) % pKeys.length];
    var c2 = pKeys[(seed * 5 + 2) % pKeys.length];
    var c3 = pKeys[(seed * 7 + 8) % pKeys.length];
    for (var r = 2; r < STUDIO_DIM - 2; r += 1) {
      for (var c = 2; c < STUDIO_DIM / 2; c += 1) {
        var dx = STUDIO_DIM / 2 - 0.5 - c;
        var dy = STUDIO_DIM / 2 - 0.5 - r;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var pick = null;
        if (seed % 3 === 0) {
          if (Math.abs(dist - 4.8) < 1.2) pick = c1;
          else if (dist < 3.6) pick = ((r + c) % 2 === 0 ? c2 : c3);
        } else if (seed % 3 === 1) {
          if (r >= 4 && r <= 11 && c >= 3 && Math.abs(dy) <= 4 - c * 0.2) pick = (c < 5 ? c1 : c2);
          if (r === 7 && c === 6) pick = c3;
        } else {
          if ((r + c + seed) % 3 === 0 && dist <= 6.2) pick = (dist < 2.6 ? c3 : c1);
          else if (dist <= 5.5 && r >= 6) pick = c2;
        }
        if (pick) {
          state.studioGrid[r][c] = pick;
          state.studioGrid[r][STUDIO_DIM - 1 - c] = pick;
        }
      }
    }
  }

  function renderStudioPalette() {
    if (!els.studioPalette) return;
    els.studioPalette.textContent = '';
    var PALETTE = global.AntLevels.PALETTE;
    var keys = Object.keys(PALETTE);
    for (var i = 0; i < keys.length; i += 1) {
      var k = keys[i];
      var sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'studio-swatch' + (!state.studioEraser && state.studioColor === k ? ' is-active' : '');
      sw.setAttribute('data-color-key', k);
      sw.setAttribute('aria-label', PALETTE[k].name || k);
      sw.style.backgroundColor = PALETTE[k].hex;
      els.studioPalette.appendChild(sw);
    }
    if (els.btnStudioMirror) {
      els.btnStudioMirror.classList.toggle('is-toggled', !!state.studioMirror);
      els.btnStudioMirror.textContent = state.studioMirror ? '⇄ 对称: 开' : '⇄ 对称: 关';
    }
    if (els.btnStudioEraser) {
      els.btnStudioEraser.classList.toggle('is-toggled', !!state.studioEraser);
    }
  }

  function drawStudioCanvas() {
    if (!els.studioCanvas) return;
    ensureStudioGrid();
    var ctx = els.studioCanvas.getContext('2d');
    var w = els.studioCanvas.width;
    var h = els.studioCanvas.height;
    var pad = 12;
    var cell = Math.floor((Math.min(w, h) - pad * 2) / STUDIO_DIM);
    var ox = Math.floor((w - cell * STUDIO_DIM) / 2);
    var oy = Math.floor((h - cell * STUDIO_DIM) / 2);
    var PALETTE = global.AntLevels.PALETTE;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(0, 0, w, h);

    for (var r = 0; r < STUDIO_DIM; r += 1) {
      for (var c = 0; c < STUDIO_DIM; c += 1) {
        var x = ox + c * cell;
        var y = oy + r * cell;
        var ck = state.studioGrid[r][c];
        if (ck && PALETTE[ck]) {
          ctx.fillStyle = PALETTE[ck].hex;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.arc(x + cell * 0.5, y + cell * 0.5, Math.max(2, cell * 0.14), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#f6eee0' : '#efe3cd';
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }
    }

    if (state.studioMirror) {
      ctx.save();
      ctx.strokeStyle = 'rgba(235, 88, 88, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ox + (STUDIO_DIM * cell) / 2, oy);
      ctx.lineTo(ox + (STUDIO_DIM * cell) / 2, oy + STUDIO_DIM * cell);
      ctx.stroke();
      ctx.restore();
    }
  }

  function renderStudio() {
    ensureStudioGrid();
    renderStudioPalette();
    drawStudioCanvas();
  }

  function paintStudioCellAtClient(clientX, clientY) {
    if (!els.studioCanvas) return;
    ensureStudioGrid();
    var rect = els.studioCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var w = els.studioCanvas.width;
    var h = els.studioCanvas.height;
    var x = ((clientX - rect.left) / rect.width) * w;
    var y = ((clientY - rect.top) / rect.height) * h;
    var pad = 12;
    var cell = Math.floor((Math.min(w, h) - pad * 2) / STUDIO_DIM);
    var ox = Math.floor((w - cell * STUDIO_DIM) / 2);
    var oy = Math.floor((h - cell * STUDIO_DIM) / 2);
    var col = Math.floor((x - ox) / cell);
    var row = Math.floor((y - oy) / cell);
    if (row < 0 || row >= STUDIO_DIM || col < 0 || col >= STUDIO_DIM) return;
    var nextVal = state.studioEraser ? null : (state.studioColor || 'R');
    if (state.studioGrid[row][col] === nextVal && (!state.studioMirror || state.studioGrid[row][STUDIO_DIM - 1 - col] === nextVal)) {
      return;
    }
    state.studioGrid[row][col] = nextVal;
    if (state.studioMirror) {
      state.studioGrid[row][STUDIO_DIM - 1 - col] = nextVal;
    }
    drawStudioCanvas();
  }

  function playStudioArtwork() {
    ensureStudioGrid();
    var PALETTE = global.AntLevels.PALETTE;
    var charRows = [];
    for (var r = 0; r < STUDIO_DIM; r += 1) {
      var rowStr = '';
      for (var c = 0; c < STUDIO_DIM; c += 1) {
        var ck = state.studioGrid[r][c];
        rowStr += (ck && PALETTE[ck]) ? ck : '.';
      }
      charRows.push(rowStr);
    }
    var custom = global.AntLevels.buildCustomConfigFromCharRows(charRows, '我的手绘拼豆', { hardMode: !!state.progress.hardMode, diySource: 'studio' });
    if (!custom || !custom.ok) {
      showToast('请至少在画板上涂色 8 个拼豆格子哦');
      return;
    }
    state.inEndless = false;
    state.lastDiyConfig = custom.config;
    beginGameWithConfig(custom.config);
    showToast('🎨 蚂蚁小队出动，正在搬运你的原创画作！');
  }

  var rankUiState = { board: 1, period: 'all', reqSeq: 0 };

  function updateRankTabUi() {
    if (!els.rankBoardTabs || !els.rankPeriodTabs) return;
    var bBtns = els.rankBoardTabs.querySelectorAll('.rank-tab');
    for (var i = 0; i < bBtns.length; i += 1) {
      var bVal = Number(bBtns[i].getAttribute('data-rank-board'));
      bBtns[i].classList.toggle('is-active', bVal === rankUiState.board);
    }
    var pBtns = els.rankPeriodTabs.querySelectorAll('.rank-period-btn');
    for (var j = 0; j < pBtns.length; j += 1) {
      var pVal = pBtns[j].getAttribute('data-rank-period');
      pBtns[j].classList.toggle('is-active', pVal === rankUiState.period);
    }
  }

  function formatMyRankStatus(myRes, unit) {
    if (!myRes || !myRes.status) return '暂未上榜';
    if (myRes.status === 'EXACT') {
      return '第 ' + myRes.rank + ' 名（' + (myRes.score !== null && myRes.score !== undefined ? myRes.score : 0) + ' ' + unit + '）';
    }
    if (myRes.status === 'OVER_LIMIT') return '500+ 名外';
    if (myRes.status === 'NO_SCORE') return '本期暂无成绩';
    return '暂未参与';
  }

  async function loadAndRenderRank(forceRefresh) {
    var seq = ++rankUiState.reqSeq;
    updateRankTabUi();

    var board = rankUiState.board;
    var period = rankUiState.period;
    var stats = countStats();
    var dailyStreak = (state.progress.daily && state.progress.daily.streak) || 0;
    var localBest = board === 1 ? stats.totalStars : (board === 2 ? (state.progress.endlessBest || 0) : dailyStreak);
    var unit = board === 1 ? '★' : (board === 2 ? '关' : '天');

    els.rankMyBanner.textContent = '';
    var myLeft = document.createElement('span');
    myLeft.textContent = '我的战绩：' + localBest + ' ' + unit;
    var myRight = document.createElement('span');
    myRight.textContent = '查询排名中...';
    els.rankMyBanner.appendChild(myLeft);
    els.rankMyBanner.appendChild(myRight);

    els.rankList.textContent = '';
    var loadingDiv = document.createElement('div');
    loadingDiv.className = 'rank-empty';
    loadingDiv.textContent = '正在连接小红书排行榜...';
    els.rankList.appendChild(loadingDiv);

    var res = await global.AntCompat.fetchRankData(board, period, !!forceRefresh);
    if (seq !== rankUiState.reqSeq) return;

    if (!res.ok) {
      els.rankList.textContent = '';
      var msgDiv = document.createElement('div');
      msgDiv.className = 'rank-empty';
      if (!res.inContainer) {
        myRight.textContent = '本地预览';
        msgDiv.textContent = '当前为离线预览环境。发布至小红书（开启头像昵称授权）并在 9.51+ 客户端打开，即可同步全站实时排行榜。';
      } else if (res.disabled) {
        hideRankEntries();
        myRight.textContent = '未开启';
        msgDiv.textContent = '当前版本或小工具权限暂未开通排行榜能力，单机与本地存档可正常游玩。';
      } else if (res.reason === 'version' || res.reason === 'missing_api') {
        hideRankEntries();
        myRight.textContent = '版本不兼容';
        msgDiv.textContent = '需小红书客户端 9.51 及以上版本支持排行榜功能。';
      } else {
        myRight.textContent = '暂不可用';
        msgDiv.textContent = '排行榜加载受限（' + (res.reason === 'rate_limit' ? '请求较频繁' : '缓存预热中') + '），可稍后点击刷新。';
      }
      els.rankList.appendChild(msgDiv);
      return;
    }

    myRight.textContent = formatMyRankStatus(res.myRank, unit);
    els.rankList.textContent = '';
    var rows = res.list || [];
    if (rows.length === 0) {
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'rank-empty';
      emptyDiv.textContent = '本期排行榜还是空的，快去闯关抢占第 1 名！';
      els.rankList.appendChild(emptyDiv);
      return;
    }

    for (var i = 0; i < rows.length; i += 1) {
      var item = rows[i] || {};
      var rowEl = document.createElement('div');
      rowEl.className = 'rank-row';

      var posEl = document.createElement('span');
      var rNum = typeof item.rank === 'number' ? item.rank : (i + 1);
      posEl.className = 'rank-pos' + (rNum <= 3 ? ' is-top' : '');
      posEl.textContent = '#' + rNum;

      var nickEl = document.createElement('span');
      nickEl.className = 'rank-nick';
      nickEl.textContent = (typeof item.nickname === 'string' && item.nickname.length > 0) ? item.nickname : '匿名画师';

      var scEl = document.createElement('span');
      scEl.className = 'rank-score';
      scEl.textContent = (typeof item.score === 'number' ? item.score : 0) + ' ' + unit;

      rowEl.appendChild(posEl);
      rowEl.appendChild(nickEl);
      rowEl.appendChild(scEl);
      els.rankList.appendChild(rowEl);
    }
  }

  function openRankModal(defaultBoard) {
    state.modalKind = 'rank';
    rankUiState.board = defaultBoard || ((engine && engine.config && engine.config.isDaily) ? 3 : (state.inEndless ? 2 : 1));
    els.modalStars.hidden = true;
    els.modalPreviewWrap.hidden = true;
    els.modalRankWrap.hidden = false;
    els.modalTitle.textContent = '森林画师排行榜';
    els.modalDesc.textContent = '每周期保留最高成绩，同分先达标者排前（前 100 名展示）';

    els.modalActions.textContent = '';
    var refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'secondary-btn';
    refreshBtn.textContent = '🔄 刷新最新榜单';
    refreshBtn.addEventListener('click', function () {
      global.AntAudio.playTap();
      loadAndRenderRank(true);
    });
    els.modalActions.appendChild(refreshBtn);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'primary-btn';
    closeBtn.textContent = '关闭';
    closeBtn.addEventListener('click', closeModal);
    els.modalActions.appendChild(closeBtn);

    els.modalBackdrop.hidden = false;
    loadAndRenderRank(false);
  }

  function encodeCustomRows(config) {
    var rows = [];
    if (!config || !Array.isArray(config.grid)) return rows;
    for (var r = 0; r < config.grid.length; r += 1) {
      var line = '';
      var row = config.grid[r] || [];
      for (var c = 0; c < row.length; c += 1) {
        var cell = row[c];
        line += (cell && (cell.origColor || cell.color)) ? (cell.origColor || cell.color) : '.';
      }
      rows.push(line);
    }
    return rows;
  }

  function hashStringShort(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h.toString(36);
  }

  function saveCustomArtworkToGallery(cfg, stars) {
    var rows = encodeCustomRows(cfg);
    if (rows.length < 8) return null;
    if (!Array.isArray(state.progress.customGallery)) state.progress.customGallery = [];
    var diySrc = cfg.diySource === 'studio' ? 'studio' : 'photo';
    var uid = diySrc + '_' + hashStringShort(rows.join('|'));
    var prevStars = 0;
    var prevHard = false;
    var filtered = [];
    for (var i = 0; i < state.progress.customGallery.length; i += 1) {
      var cur = state.progress.customGallery[i];
      if (!cur || !cur.uid) continue;
      if (cur.uid === uid) {
        prevStars = Math.max(prevStars, cur.stars || 0);
        if (cur.isHard) prevHard = true;
      } else {
        filtered.push(cur);
      }
    }
    filtered.unshift({
      uid: uid,
      name: String(cfg.name || '原创画').slice(0, 12),
      diySource: diySrc,
      size: rows.length,
      rows: rows,
      stars: Math.max(prevStars, stars || 3),
      isHard: !!(prevHard || cfg.isHard),
      at: Date.now()
    });
    state.progress.customGallery = filtered.slice(0, 6);
    return { uid: uid, prevHard: prevHard };
  }

  function buildCustomPreviewConfig(item) {
    var rows = Array.isArray(item && item.rows) ? item.rows : [];
    var dim = Number(item && item.size) || rows.length || 16;
    var PALETTE = global.AntLevels ? global.AntLevels.PALETTE : {};
    var grid = [];
    for (var r = 0; r < dim; r += 1) {
      var line = String(rows[r] || '');
      var row = [];
      for (var c = 0; c < dim; c += 1) {
        var ch = line.charAt(c);
        if (!ch || ch === '.' || !PALETTE[ch]) row.push(null);
        else row.push({ color: ch, origColor: ch, layers: 1 });
      }
      grid.push(row);
    }
    return {
      id: 9001,
      isDiy: true,
      diySource: item.diySource === 'studio' ? 'studio' : 'photo',
      chapterName: item.diySource === 'studio' ? '手绘拼豆工坊' : '相册 DIY',
      name: item.name || '我的原创画',
      rows: dim,
      cols: dim,
      grid: grid,
      _customItem: item
    };
  }

  function renderGallery() {
    els.galleryGrid.textContent = '';
    var chapters = global.AntLevels.CHAPTERS;
    var metaList = global.AntLevels.getMetaList();
    var currentCh = Math.ceil(state.progress.unlockedLevel / 20);
    state.galleryExpanded[currentCh] = true;

    var customList = Array.isArray(state.progress.customGallery) ? state.progress.customGallery : [];
    var clearedMeta = [];
    for (var cu = 0; cu < customList.length && clearedMeta.length < 2; cu += 1) {
      var cItem = customList[cu];
      if (!cItem || !Array.isArray(cItem.rows)) continue;
      clearedMeta.push({
        id: 9001,
        name: cItem.name,
        customItem: cItem,
        previewConfig: buildCustomPreviewConfig(cItem)
      });
    }
    for (var cm = metaList.length - 1; cm >= 0 && clearedMeta.length < 4; cm -= 1) {
      if ((state.progress.stars[String(metaList[cm].id)] || 0) > 0) {
        clearedMeta.push(metaList[cm]);
      }
    }
    state.sanctuaryClearedCache = clearedMeta;
    if (els.btnToggleLantern) {
      els.btnToggleLantern.textContent = state.sanctuaryState.lantern ? '🏮 关灯看萤火' : '🏮 点亮暖壁灯';
    }
    if (els.sanctuaryCanvas && global.AntRenderer && global.AntRenderer.drawSanctuaryScene) {
      global.AntRenderer.drawSanctuaryScene(
        els.sanctuaryCanvas,
        state.sanctuaryClearedCache,
        state.progress.selectedSkin || 'classic',
        state.progress.selectedTheme || 'candy',
        state.sanctuaryState,
        Date.now() / 1000
      );
    }

    if (customList.length > 0) {
      if (state.galleryExpanded[0] === undefined) state.galleryExpanded[0] = true;
      var cExpanded = !!state.galleryExpanded[0];
      var cBlock = document.createElement('div');
      cBlock.className = 'chapter-block' + (cExpanded ? '' : ' is-collapsed');
      var cHead = document.createElement('button');
      cHead.type = 'button';
      cHead.className = 'chapter-block-head';
      cHead.setAttribute('data-gallery-chapter', '0');
      var cLeft = document.createElement('div');
      cLeft.className = 'chapter-head-left';
      var cTitle = document.createElement('div');
      cTitle.className = 'chapter-head-title';
      cTitle.textContent = '🎨 自创作品架';
      var cDesc = document.createElement('div');
      cDesc.className = 'chapter-head-desc';
      cDesc.textContent = '珍藏手绘与照片作品，点开可重玩或编辑';
      cLeft.appendChild(cTitle);
      cLeft.appendChild(cDesc);
      var cBadge = document.createElement('span');
      cBadge.className = 'chapter-head-badge';
      cBadge.textContent = customList.length + ' 幅' + (cExpanded ? ' ▾' : ' ▸');
      cHead.appendChild(cLeft);
      cHead.appendChild(cBadge);
      cBlock.appendChild(cHead);
      if (cExpanded) {
        var cGrid = document.createElement('div');
        cGrid.className = 'gallery-grid';
        for (var ci = 0; ci < customList.length; ci += 1) {
          var ciItem = customList[ci];
          var cCard = document.createElement('button');
          cCard.type = 'button';
          cCard.className = 'gallery-item';
          cCard.setAttribute('data-custom-uid', ciItem.uid);
          var cThumb = document.createElement('canvas');
          cThumb.className = 'gallery-thumb';
          cThumb.width = 96;
          cThumb.height = 96;
          global.AntRenderer.drawArtworkToCanvas(cThumb, buildCustomPreviewConfig(ciItem), ciItem.stars || 3, false);
          var ctEl = document.createElement('div');
          ctEl.className = 'gallery-item-title';
          ctEl.textContent = ciItem.name;
          var cmEl = document.createElement('div');
          cmEl.className = 'gallery-item-meta';
          cmEl.textContent = (ciItem.diySource === 'studio' ? '手绘 · ' : '照片 · ') + ('★★★'.slice(0, ciItem.stars || 3));
          cCard.appendChild(cThumb);
          cCard.appendChild(ctEl);
          cCard.appendChild(cmEl);
          if (ciItem.isHard) {
            var chBadge = document.createElement('span');
            chBadge.className = 'hard-badge-corner';
            chBadge.textContent = '🔥';
            cCard.appendChild(chBadge);
          }
          cGrid.appendChild(cCard);
        }
        cBlock.appendChild(cGrid);
      }
      els.galleryGrid.appendChild(cBlock);
    }

    for (var i = 0; i < chapters.length; i += 1) {
      var ch = chapters[i];
      var isExpanded = !!state.galleryExpanded[ch.id];

      var chLevels = [];
      var chCleared = 0;
      for (var m = 0; m < metaList.length; m += 1) {
        if (metaList[m].chapter === ch.id) {
          chLevels.push(metaList[m]);
          if ((state.progress.stars[String(metaList[m].id)] || 0) > 0) chCleared += 1;
        }
      }

      var block = document.createElement('div');
      block.className = 'chapter-block' + (isExpanded ? '' : ' is-collapsed');

      var headBtn = document.createElement('button');
      headBtn.type = 'button';
      headBtn.className = 'chapter-block-head';
      headBtn.setAttribute('data-gallery-chapter', String(ch.id));

      var leftWrap = document.createElement('div');
      leftWrap.className = 'chapter-head-left';
      var titleEl = document.createElement('div');
      titleEl.className = 'chapter-head-title';
      titleEl.textContent = ch.id + '. ' + ch.name + '（' + ch.badge + '）';
      var descEl = document.createElement('div');
      descEl.className = 'chapter-head-desc';
      descEl.textContent = isExpanded ? ch.desc : '点击展开查看本章节 20 幅效果图';
      leftWrap.appendChild(titleEl);
      leftWrap.appendChild(descEl);

      var badgeEl = document.createElement('span');
      badgeEl.className = 'chapter-head-badge';
      badgeEl.textContent = chCleared + '/' + chLevels.length + (isExpanded ? ' ▾' : ' ▸');

      headBtn.appendChild(leftWrap);
      headBtn.appendChild(badgeEl);
      block.appendChild(headBtn);

      if (isExpanded) {
        var grid = document.createElement('div');
        grid.className = 'gallery-grid';
        for (var k = 0; k < chLevels.length; k += 1) {
          var lv = chLevels[k];
          var stars = state.progress.stars[String(lv.id)] || 0;
          var cleared = stars > 0;

          var card = document.createElement('button');
          card.type = 'button';
          card.className = 'gallery-item' + (cleared ? '' : ' is-preview');
          card.setAttribute('data-gallery-id', String(lv.id));

          var thumb = document.createElement('canvas');
          thumb.className = 'gallery-thumb';
          thumb.width = 96;
          thumb.height = 96;
          var previewCfg = global.AntLevels.getArtworkPreview(lv.id);
          global.AntRenderer.drawArtworkToCanvas(thumb, previewCfg, stars, false);

          var title = document.createElement('div');
          title.className = 'gallery-item-title';
          title.textContent = lv.id + '. ' + lv.name;

          var meta = document.createElement('div');
          meta.className = 'gallery-item-meta' + (cleared ? '' : ' is-pending');
          meta.textContent = cleared
            ? ('★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars))
            : (lv.id <= state.progress.unlockedLevel ? '效果图 · 可挑战' : '效果图 · 待解锁');

          card.appendChild(thumb);
          card.appendChild(title);
          card.appendChild(meta);
          if ((state.progress.hardStars && state.progress.hardStars[String(lv.id)]) > 0) {
            var ghBadge = document.createElement('span');
            ghBadge.className = 'hard-badge-corner';
            ghBadge.textContent = '🔥';
            card.appendChild(ghBadge);
          }
          grid.appendChild(card);
        }
        block.appendChild(grid);
      }

      els.galleryGrid.appendChild(block);
    }
  }

  function triggerUndoTool() {
    if (!engine || engine.isCelebrating || engine.status !== 'playing') return;
    if (state.progress.tools.undo <= 0) {
      showToast('撤回次数已用完，过关可补充');
      return;
    }
    if (engine.undo()) {
      if (renderer && renderer.resetEffects) renderer.resetEffects();
      state.progress.tools.undo -= 1;
      saveProgress();
      global.AntAudio.playTap();
      global.AntCompat.vibrate('light');
      renderGameHud();
      showToast('已撤回上一步出兵');
    } else {
      showToast('当前没有可撤回的操作');
    }
  }

  function triggerExpandSlotTool() {
    if (!engine || engine.isCelebrating || engine.status === 'won') return;
    if (engine.maxSlots >= (engine.baseSlots || 5) + 1) {
      showToast('本关已扩充至 ' + engine.maxSlots + ' 个暂存槽');
      return;
    }
    if (state.progress.tools.slot <= 0) {
      showToast('扩槽次数已用完，过关可补充');
      return;
    }
    if (engine.status === 'lost') engine.status = 'playing';
    if (engine.expandSlot()) {
      state.progress.tools.slot -= 1;
      saveProgress();
      global.AntAudio.playTap();
      global.AntCompat.vibrate('medium');
      renderGameHud();
      showToast('已临时解锁第 ' + engine.maxSlots + ' 个暂存槽！');
    }
  }

  function triggerRainbowTool() {
    if (!engine || engine.isCelebrating || engine.status === 'won') return;
    if (state.progress.tools.rainbow <= 0) {
      showToast('彩虹蚁次数已用完，过关可补充');
      return;
    }
    if (engine.status === 'lost') engine.status = 'playing';
    if (engine.summonRainbowAnts()) {
      state.progress.tools.rainbow -= 1;
      saveProgress();
      global.AntAudio.playBoom();
      global.AntCompat.vibrate('medium');
      renderGameHud();
      showToast('🌈 4 只彩虹蚁已出动清障！');
    } else {
      showToast('当前没有可搬运的外露像素');
    }
  }

  function restartWithToolAid() {
    var tl = state.progress.tools;
    var gaveAid = false;
    if ((tl.undo || 0) <= 0 && (tl.slot || 0) <= 0 && (tl.rainbow || 0) <= 0) {
      tl.undo = 1;
      gaveAid = true;
      saveProgress(false);
    }
    if (engine && engine.config && engine.config.isDaily) startDailyChallenge();
    else if (engine && engine.config && engine.config.isDiy && state.lastDiyConfig) beginGameWithConfig(state.lastDiyConfig);
    else if (state.inEndless) startEndless(state.endlessStage);
    else startLevel(state.currentLevelId);
    if (gaveAid) showToast('🐜 蚁后暖心补给：已补充 1 次撤回道具');
  }

  function getYesterdayKey(dateKey) {
    var parts = String(dateKey || '').split('-');
    if (parts.length !== 3) return '';
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) - 1);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length < 2) m = '0' + m;
    var day = String(d.getDate());
    if (day.length < 2) day = '0' + day;
    return y + '-' + m + '-' + day;
  }

  function handleWin() {
    global.AntAudio.playWin();
    global.AntCompat.vibrate('medium');
    var stars = engine.toolsUsed === 0 ? 3 : (engine.toolsUsed === 1 ? 2 : 1);
    var cfg = engine.config;
    var statsBefore = countStats();
    state.lastWinChapterBonus = false;
    state.lastWinDailyBonus = false;
    state.lastWinHardBonus = false;

    if (cfg.isDaily) {
      if (!state.progress.daily || typeof state.progress.daily !== 'object') {
        state.progress.daily = { lastDate: '', streak: 0, hardLastDate: '' };
      }
      var todayKey = cfg.dateKey || global.AntLevels.getTodayKey();
      var yesterdayKey = getYesterdayKey(todayKey);
      if (state.progress.daily.lastDate !== todayKey) {
        state.progress.daily.streak = (state.progress.daily.lastDate === yesterdayKey)
          ? ((state.progress.daily.streak || 0) + 1)
          : 1;
        state.progress.daily.lastDate = todayKey;
        state.progress.tools.undo += 1;
        state.progress.tools.rainbow += 1;
        state.lastWinDailyBonus = true;
      }
      if (cfg.isHard && state.progress.daily.hardLastDate !== todayKey) {
        state.progress.daily.hardLastDate = todayKey;
        state.progress.tools.rainbow += 1;
        state.lastWinHardBonus = 'rainbow';
      }
    } else if (cfg.isDiy) {
      state.progress.diyCount = (state.progress.diyCount || 0) + 1;
      var cgMeta = saveCustomArtworkToGallery(cfg, stars);
      if (state.progress.diyCount % 2 === 1) {
        state.progress.tools.undo += 1;
      }
      if (cfg.isHard && (!cgMeta || !cgMeta.prevHard)) {
        state.progress.tools.rainbow += 1;
        state.lastWinHardBonus = 'rainbow';
      }
    } else if (cfg.isEndless) {
      if (cfg.endlessStage > (state.progress.endlessBest || 0)) {
        state.progress.endlessBest = cfg.endlessStage;
      }
      state.progress.tools.undo += 1;
      if (cfg.isHard && cfg.endlessStage > (state.progress.endlessHardBest || 0)) {
        state.progress.endlessHardBest = cfg.endlessStage;
        state.progress.tools.rainbow += 1;
        state.lastWinHardBonus = 'rainbow';
      }
    } else {
      var prev = state.progress.stars[String(cfg.id)] || 0;
      if (stars > prev) state.progress.stars[String(cfg.id)] = stars;
      if (cfg.isHard) {
        if (!state.progress.hardStars || typeof state.progress.hardStars !== 'object') {
          state.progress.hardStars = {};
        }
        var prevHard = state.progress.hardStars[String(cfg.id)] || 0;
        if (stars > prevHard) state.progress.hardStars[String(cfg.id)] = stars;
        if (prevHard === 0) {
          state.progress.tools.rainbow += 1;
          state.progress.tools.slot += 1;
          state.lastWinHardBonus = 'main';
        }
      }
      if (cfg.id >= state.progress.unlockedLevel && cfg.id < global.AntLevels.TOTAL_LEVELS) {
        state.progress.unlockedLevel = cfg.id + 1;
        var nextCh = Math.ceil(state.progress.unlockedLevel / 20);
        state.collapsedChapters[nextCh] = false;
      }
      if (prev === 0) {
        state.progress.tools.undo += 1;
        if (cfg.id % 2 === 0) state.progress.tools.rainbow += 1;
        if (cfg.id % 3 === 0) state.progress.tools.slot += 1;
        if (cfg.id % 20 === 0) {
          state.progress.tools.undo += 2;
          state.progress.tools.slot += 1;
          state.progress.tools.rainbow += 1;
          state.lastWinChapterBonus = true;
        }
      }
    }
    saveProgress(true);
    var stats = countStats();
    var skins = global.AntLevels.ANT_SKINS || [];
    for (var skIdx = 0; skIdx < skins.length; skIdx += 1) {
      var reqS = skins[skIdx].reqStars;
      if (reqS > 0 && statsBefore.totalStars < reqS && stats.totalStars >= reqS) {
        showToast('🎨 解锁新装扮「' + skins[skIdx].name + '」！点底部「装扮」切换');
        break;
      }
    }
    if (stats.totalStars > 0) {
      global.AntCompat.submitRankScore(1, stats.totalStars).then(function (r) {
        if (r && r.disabled) hideRankEntries();
      });
    }
    if ((state.progress.endlessBest || 0) > 0) {
      global.AntCompat.submitRankScore(2, state.progress.endlessBest).then(function (r) {
        if (r && r.disabled) hideRankEntries();
      });
    }
    if (state.progress.daily && state.progress.daily.streak > 0) {
      global.AntCompat.submitRankScore(3, state.progress.daily.streak).then(function (r) {
        if (r && r.disabled) hideRankEntries();
      });
    }
    openPosterModal(cfg, stars, true);
  }

  function handleLoss() {
    global.AntAudio.playFail();
    global.AntCompat.vibrate('heavy');
    openLossModal();
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
    lastTs = ts;
    if (state.screen === 'game' && !document.hidden && engine && renderer) {
      engine.update(dt);
      renderer.render(engine, dt);
    } else if (state.screen === 'gallery' && !document.hidden && els.sanctuaryCanvas && global.AntRenderer && global.AntRenderer.drawSanctuaryScene) {
      global.AntRenderer.drawSanctuaryScene(
        els.sanctuaryCanvas,
        state.sanctuaryClearedCache,
        state.progress.selectedSkin || 'classic',
        state.progress.selectedTheme || 'candy',
        state.sanctuaryState,
        ts / 1000
      );
    } else if (state.screen === 'atelier' && !document.hidden && els.atelierPreviewCanvas && global.AntRenderer && global.AntRenderer.drawAtelierStage) {
      global.AntRenderer.drawAtelierStage(
        els.atelierPreviewCanvas,
        state.progress.selectedTheme || 'candy',
        state.progress.selectedSkin || 'classic',
        ts / 1000,
        state.progress.selectedBlockStyle || 'jelly'
      );
    }
    rafId = global.requestAnimationFrame(loop);
  }

  function bindEvents() {
    function returnToGameScreen() {
      if (engine && engine.status === 'won') {
        if (state.inEndless) startEndless(state.endlessStage + 1);
        else startLevel(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));
      } else {
        switchScreen('game');
        if (engine && engine.status === 'lost') openLossModal();
      }
    }

    if (els.bottomNav) {
      els.bottomNav.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.bnav-btn') : e.target;
        var targetScreen = btn && btn.getAttribute('data-nav-screen');
        if (!targetScreen || targetScreen === state.screen) return;
        global.AntAudio.playTap();
        if (targetScreen === 'game') returnToGameScreen();
        else switchScreen(targetScreen);
      });
    }
    els.btnSpeed.addEventListener('click', function () {
      state.speed = state.speed === 1 ? 2 : (state.speed === 2 ? 3 : 1);
      els.speedLabel.textContent = 'x' + state.speed;
      els.btnSpeed.classList.toggle('is-fast', state.speed > 1);
      if (engine) engine.setSpeedMultiplier(getEffectiveSpeed(state.speed));
      global.AntAudio.playTap();
    });
    els.btnSound.addEventListener('click', function () {
      var next = !global.AntAudio.isEnabled();
      global.AntAudio.setEnabled(next);
      state.progress.sound = next;
      els.soundIcon.textContent = next ? '🔊' : '🔇';
      saveProgress();
      if (next) global.AntAudio.playTap();
    });
    if (els.btnVibrate) {
      els.btnVibrate.addEventListener('click', toggleVibrateSetting);
    }
    if (els.btnAtelierVibrate) {
      els.btnAtelierVibrate.addEventListener('click', toggleVibrateSetting);
    }
    els.btnContinue.addEventListener('click', function () {
      global.AntAudio.playTap();
      startLevel(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));
    });
    if (els.btnDaily) {
      els.btnDaily.addEventListener('click', function () {
        global.AntAudio.playTap();
        startDailyChallenge();
      });
    }
    els.btnEndless.addEventListener('click', function () {
      global.AntAudio.playTap();
      startEndless((state.progress.endlessBest || 0) + 1);
    });
    if (els.btnDiy && els.diyFileInput) {
      els.btnDiy.addEventListener('click', function () {
        global.AntAudio.playTap();
        els.diyFileInput.click();
      });
      els.diyFileInput.addEventListener('change', function (e) {
        var f = e.target && e.target.files && e.target.files[0];
        if (f) handleDiyFileSelection(f);
        els.diyFileInput.value = '';
      });
    }
    if (els.atelierThemeList) {
      els.atelierThemeList.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.theme-card') : e.target;
        var thId = card && card.getAttribute('data-theme-id');
        if (!thId) return;
        applyTheme(thId);
        var themes = global.AntLevels.UI_THEMES || [];
        var thObj = null;
        for (var ti = 0; ti < themes.length; ti += 1) {
          if (themes[ti].id === thId) { thObj = themes[ti]; break; }
        }
        if (thObj && thObj.defaultBlock) applyBlockStyle(thObj.defaultBlock);
        renderAtelier();
        saveProgress(true);
        global.AntAudio.playTap();
        showToast('✨ 已切换「' + (thObj ? thObj.name : thId) + '」及联动方块样式');
      });
    }
    if (els.atelierBlockList) {
      els.atelierBlockList.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.block-style-card') : e.target;
        var bId = card && card.getAttribute('data-block-style');
        if (!bId) return;
        applyBlockStyle(bId);
        renderAtelier();
        saveProgress(true);
        global.AntAudio.playPick(3);
        showToast('🧱 已切换方块材质，进关立即生效');
      });
    }
    if (els.atelierSoundList) {
      els.atelierSoundList.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.theme-card') : e.target;
        var pId = card && card.getAttribute('data-sound-pack');
        if (!pId) return;
        applySoundPack(pId);
        if (global.AntAudio && global.AntAudio.playPackPreview) {
          global.AntAudio.playPackPreview(pId);
        }
        renderAtelier();
        saveProgress(true);
        showToast('🎧 已切换音效包并试听！');
      });
    }
    if (els.btnHardMode) {
      els.btnHardMode.addEventListener('click', function () {
        state.progress.hardMode = !state.progress.hardMode;
        saveProgress(true);
        renderHome();
        global.AntAudio.playTap();
        showToast(state.progress.hardMode ? '🔥 已开启烧脑 4 槽模式（开新局生效）' : '🛡️ 已恢复休闲 5 槽标准模式');
      });
    }
    if (els.skinList) {
      els.skinList.addEventListener('click', function (e) {
        var card = e.target.closest ? e.target.closest('.skin-card') : e.target;
        var skId = card && card.getAttribute('data-skin-id');
        if (!skId) return;
        var skins = global.AntLevels.ANT_SKINS || [];
        var picked = null;
        for (var i = 0; i < skins.length; i += 1) {
          if (skins[i].id === skId) { picked = skins[i]; break; }
        }
        if (!picked) return;
        var totalStars = countStats().totalStars;
        if (totalStars < picked.reqStars) {
          showToast('还差 ' + (picked.reqStars - totalStars) + ' ★ 即可解锁「' + picked.name + '」');
          return;
        }
        state.progress.selectedSkin = picked.id;
        if (renderer && renderer.setSkin) renderer.setSkin(picked.id);
        invalidateAntIcons();
        renderGameHud();
        saveProgress(true);
        global.AntAudio.playTap();
        renderAtelier();
        showToast('🐜 已切换为「' + picked.name + '」');
      });
    }
    if (els.btnStudioMirror) {
      els.btnStudioMirror.addEventListener('click', function () {
        state.studioMirror = !state.studioMirror;
        global.AntAudio.playTap();
        renderStudio();
      });
    }
    if (els.btnStudioEraser) {
      els.btnStudioEraser.addEventListener('click', function () {
        state.studioEraser = !state.studioEraser;
        global.AntAudio.playTap();
        renderStudioPalette();
      });
    }
    if (els.btnStudioRandom) {
      els.btnStudioRandom.addEventListener('click', function () {
        global.AntAudio.playTap();
        seedRandomStudioPattern();
        drawStudioCanvas();
      });
    }
    if (els.btnStudioClear) {
      els.btnStudioClear.addEventListener('click', function () {
        global.AntAudio.playTap();
        clearStudioGrid();
        drawStudioCanvas();
      });
    }
    if (els.studioPalette) {
      els.studioPalette.addEventListener('click', function (e) {
        var sw = e.target.closest ? e.target.closest('.studio-swatch') : e.target;
        var cKey = sw && sw.getAttribute('data-color-key');
        if (!cKey) return;
        state.studioColor = cKey;
        state.studioEraser = false;
        global.AntAudio.playTap();
        renderStudioPalette();
      });
    }
    if (els.btnStudioPlay) {
      els.btnStudioPlay.addEventListener('click', function () {
        global.AntAudio.playTap();
        playStudioArtwork();
      });
    }
    if (els.studioCanvas) {
      if (global.PointerEvent) {
        els.studioCanvas.addEventListener('pointerdown', function (e) {
          state.studioDrawing = true;
          paintStudioCellAtClient(e.clientX, e.clientY);
        });
        els.studioCanvas.addEventListener('pointermove', function (e) {
          if (!state.studioDrawing) return;
          paintStudioCellAtClient(e.clientX, e.clientY);
        });
        global.addEventListener('pointerup', function () { state.studioDrawing = false; });
      } else {
        els.studioCanvas.addEventListener('click', function (e) {
          paintStudioCellAtClient(e.clientX, e.clientY);
        });
      }
    }
    if (els.btnFeedAnts) {
      els.btnFeedAnts.addEventListener('click', function () {
        var candyCols = ['#fbbf24', '#f472b6', '#60a5fa', '#6ee7b7'];
        for (var ci = 0; ci < 2; ci += 1) {
          state.sanctuaryState.candies.push({
            x: 42 + Math.random() * 276,
            color: candyCols[Math.floor(Math.random() * candyCols.length)],
            age: 0
          });
        }
        if (state.sanctuaryState.candies.length > 14) {
          state.sanctuaryState.candies.splice(0, state.sanctuaryState.candies.length - 14);
        }
        global.AntAudio.playHoney();
        showToast('🍯 投喂蜂蜜糖果！巡逻小工蚁飞奔过来啦');
      });
    }
    if (els.btnToggleLantern) {
      els.btnToggleLantern.addEventListener('click', function () {
        state.sanctuaryState.lantern = !state.sanctuaryState.lantern;
        els.btnToggleLantern.textContent = state.sanctuaryState.lantern ? '🏮 关灯看萤火' : '🏮 点亮暖壁灯';
        global.AntAudio.playTap();
      });
    }
    if (els.sanctuaryCanvas) {
      els.sanctuaryCanvas.addEventListener('click', function (e) {
        var rect = els.sanctuaryCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var sx = ((e.clientX - rect.left) / rect.width) * els.sanctuaryCanvas.width;
        var sy = ((e.clientY - rect.top) / rect.height) * els.sanctuaryCanvas.height;
        var frames = state.sanctuaryState.frames || [];
        for (var fi = 0; fi < frames.length; fi += 1) {
          var fr = frames[fi];
          if (sx >= fr.x && sx <= fr.x + fr.w && sy >= fr.y && sy <= fr.y + fr.h) {
            global.AntAudio.playTap();
            if (fr.customItem) {
              openPosterModal(buildCustomPreviewConfig(fr.customItem), fr.customItem.stars || 3, false);
            } else {
              var stars = state.progress.stars[String(fr.levelId)] || 0;
              openPosterModal(global.AntLevels.getArtworkPreview(fr.levelId), stars, false);
            }
            return;
          }
        }
        state.sanctuaryState.candies.push({ x: Math.max(24, Math.min(336, sx)), color: '#fbbf24', age: 0 });
        global.AntAudio.playPick(1);
      });
    }
    if (els.gameCanvas) {
      els.gameCanvas.addEventListener('click', function (e) {
        if (!renderer || !renderer.handleStageTap) return;
        var rect = els.gameCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var sx = e.clientX - rect.left;
        var sy = e.clientY - rect.top;
        var hit = renderer.handleStageTap(sx, sy);
        if (hit === 'mushroom') {
          var thNow = state.progress.selectedTheme || 'candy';
          var landmarkTips = {
            candy: '🍭 彩虹棒棒糖炸出一团果冻糖珠！',
            soda: '🍹 海盐冰饮冒出一串冰爽气泡！',
            lavender: '🔮 星月水晶灯洒下梦幻星尘！',
            caramel: '🍩 焦糖甜甜圈飘出浓香可可碎！',
            ribbon: '🍰 草莓蛋糕撒出一阵甜蜜糖霜！',
            craft: '🍄 森林蘑菇弹出一团荧光孢子！'
          };
          global.AntAudio.playPick(4);
          showToast(landmarkTips[thNow] || landmarkTips.craft);
        } else if (hit === 'flower') {
          global.AntAudio.playPick(2);
          showToast('🌸 花香微风拂过森林画板');
        } else if (hit === 'studio') {
          if (engine) engine.studioPulse = 1;
          global.AntAudio.playReturn();
          showToast('🎨 地下小画师干劲满满！');
        }
      });
    }
    var CHEER_WORDS = ['蚂蚁冲呀!', '排好队咯!', '稳稳叼住!', '画快成啦!', '加油搬画!'];
    var cheerCursor = 0;
    els.dockSlots.addEventListener('click', function (e) {
      if (!engine || engine.status !== 'playing' || engine.isCelebrating) return;
      var slotEl = e.target.closest ? e.target.closest('.dock-slot.is-filled') : null;
      if (!slotEl) return;
      var slotIdx = -1;
      for (var d = 0; d < dockDomSlots.length; d += 1) {
        if (dockDomSlots[d].el === slotEl) { slotIdx = d; break; }
      }
      if (slotIdx < 0 || !engine.dock[slotIdx]) return;
      var sq = engine.dock[slotIdx];
      var pal = global.AntLevels.PALETTE[sq.color] || { hex: '#fff8ea' };
      global.AntAudio.playTap();
      global.AntCompat.vibrate('light');
      slotEl.classList.add('is-nudge');
      setTimeout(function () { slotEl.classList.remove('is-nudge'); }, 180);
      var phrase = CHEER_WORDS[cheerCursor % CHEER_WORDS.length];
      cheerCursor += 1;
      engine.spawnFloatText(Math.max(1, Math.floor(engine.rows * 0.85)), Math.floor(engine.cols * 0.5), phrase, pal.hex);
    });
    els.btnRank.addEventListener('click', function () {
      global.AntAudio.playTap();
      openRankModal();
    });
    els.btnRankHome.addEventListener('click', function () {
      global.AntAudio.playTap();
      openRankModal();
    });
    els.rankBoardTabs.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.rank-tab') : e.target;
      var bStr = btn && btn.getAttribute('data-rank-board');
      if (!bStr) return;
      rankUiState.board = Number(bStr);
      global.AntAudio.playTap();
      loadAndRenderRank(false);
    });
    els.rankPeriodTabs.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.rank-period-btn') : e.target;
      var pStr = btn && btn.getAttribute('data-rank-period');
      if (!pStr) return;
      rankUiState.period = pStr;
      global.AntAudio.playTap();
      loadAndRenderRank(false);
    });

    els.chapterList.addEventListener('click', function (e) {
      var headBtn = e.target.closest ? e.target.closest('.chapter-block-head') : null;
      var chIdStr = headBtn && headBtn.getAttribute('data-toggle-chapter');
      if (chIdStr) {
        var chId = Number(chIdStr);
        state.collapsedChapters[chId] = !state.collapsedChapters[chId];
        global.AntAudio.playTap();
        renderHome();
        return;
      }

      var tile = e.target.closest ? e.target.closest('.level-tile') : e.target;
      var idStr = tile && tile.getAttribute('data-level-id');
      if (!idStr) return;
      var id = Number(idStr);
      if (id > state.progress.unlockedLevel) {
        showToast('请先完成前面的关卡解锁');
        return;
      }
      global.AntAudio.playTap();
      startLevel(id);
    });

    function unlockFirstAudio() {
      global.AntAudio.unlock();
      document.removeEventListener('pointerdown', unlockFirstAudio);
      document.removeEventListener('touchstart', unlockFirstAudio);
    }
    document.addEventListener('pointerdown', unlockFirstAudio);
    document.addEventListener('touchstart', unlockFirstAudio);

    function handlePoolDispatch(targetEl) {
      var btn = targetEl && targetEl.closest ? targetEl.closest('.squad-btn') : targetEl;
      var idxStr = btn && btn.getAttribute('data-pool-idx');
      if (idxStr === null || idxStr === undefined || idxStr === '') return;
      var res = engine.dispatchFromPool(Number(idxStr));
      if (res.ok) {
        global.AntAudio.playTap();
        global.AntCompat.vibrate('light');
      } else if (res.reason === 'dock_full') {
        global.AntAudio.playFail();
        showToast('暂存槽已满，可使用道具或等待蚂蚁搬空');
      }
    }

    if (global.PointerEvent) {
      els.supplyGrid.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        lastPointerDispatchAt = Date.now();
        handlePoolDispatch(e.target);
      });
    }
    els.supplyGrid.addEventListener('click', function (e) {
      if (Date.now() - lastPointerDispatchAt < 380) return;
      handlePoolDispatch(e.target);
    });

    els.toolUndo.addEventListener('click', triggerUndoTool);
    els.toolSlot.addEventListener('click', triggerExpandSlotTool);
    els.toolRainbow.addEventListener('click', triggerRainbowTool);
    els.toolRestart.addEventListener('click', function () {
      global.AntAudio.playTap();
      restartWithToolAid();
    });

    els.galleryGrid.addEventListener('click', function (e) {
      var chHead = e.target.closest ? e.target.closest('.chapter-block-head') : null;
      var gChStr = chHead && chHead.getAttribute('data-gallery-chapter');
      if (gChStr) {
        var gCh = Number(gChStr);
        state.galleryExpanded[gCh] = !state.galleryExpanded[gCh];
        global.AntAudio.playTap();
        renderGallery();
        return;
      }

      var item = e.target.closest ? e.target.closest('.gallery-item') : e.target;
      var customUid = item && item.getAttribute('data-custom-uid');
      if (customUid) {
        var cgList = Array.isArray(state.progress.customGallery) ? state.progress.customGallery : [];
        for (var ci = 0; ci < cgList.length; ci += 1) {
          if (cgList[ci].uid === customUid) {
            global.AntAudio.playTap();
            openPosterModal(buildCustomPreviewConfig(cgList[ci]), cgList[ci].stars || 3, false);
            return;
          }
        }
      }
      var idStr = item && item.getAttribute('data-gallery-id');
      if (!idStr) return;
      var id = Number(idStr);
      var stars = state.progress.stars[String(id)] || 0;
      global.AntAudio.playTap();
      openPosterModal(global.AntLevels.getArtworkPreview(id), stars, false);
    });

    global.addEventListener('resize', function () {
      if (renderer) renderer.resize();
    });

    document.addEventListener('visibilitychange', function () {
      lastTs = 0;
    });

    /* 仅画廊欣赏 / 排行榜弹窗允许点遮罩或按 Escape 关闭；通关与失败弹窗必须通过操作按钮离开 */
    els.modalBackdrop.addEventListener('click', function (e) {
      if (e.target === els.modalBackdrop && (state.modalKind === 'gallery' || state.modalKind === 'rank')) {
        closeModal();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.modalBackdrop.hidden && (state.modalKind === 'gallery' || state.modalKind === 'rank')) {
        closeModal();
      }
    });
  }

  async function init() {
    global.AntCompat.applyLayoutCapabilities();

    els = {
      appShell: $('app'),
      topBar: $('top-bar'),
      btnSpeed: $('btn-speed'),
      speedLabel: $('speed-label'),
      btnRank: $('btn-rank'),
      btnSound: $('btn-sound'),
      soundIcon: $('sound-icon'),
      btnVibrate: $('btn-vibrate'),
      btnAtelierVibrate: $('btn-atelier-vibrate'),
      atelierVibrateTag: $('atelier-vibrate-tag'),
      headerTitle: $('header-title'),
      headerSub: $('header-sub'),
      bottomNav: $('bottom-nav'),
      screenHome: $('screen-home'),
      screenGame: $('screen-game'),
      screenGallery: $('screen-gallery'),
      screenStudio: $('screen-studio'),
      screenAtelier: $('screen-atelier'),
      btnContinue: $('btn-continue'),
      btnDaily: $('btn-daily'),
      dailyStatusTag: $('daily-status-tag'),
      btnEndless: $('btn-endless'),
      endlessBestTag: $('endless-best-tag'),
      btnDiy: $('btn-diy'),
      diyFileInput: $('diy-file-input'),
      btnRankHome: $('btn-rank-home'),
      cloudSyncHint: $('cloud-sync-hint'),
      continueLevelNum: $('continue-level-num'),
      statCleared: $('stat-cleared'),
      statStars: $('stat-stars'),
      statDaily: $('stat-daily'),
      statEndless: $('stat-endless'),
      chapterList: $('chapter-list'),
      hudHardBadge: $('hud-hard-badge'),
      btnHardMode: $('btn-hard-mode'),
      hardModeTitle: $('hard-mode-title'),
      hardModeTag: $('hard-mode-tag'),
      hudRemainText: $('hud-remain-text'),
      hudProgressFill: $('hud-progress-fill'),
      hudComboBadge: $('hud-combo-badge'),
      hudComboNum: $('hud-combo-num'),
      gameCanvas: $('game-canvas'),
      stageTip: $('stage-tip'),
      dockSlots: $('dock-slots'),
      supplyReserveText: $('supply-reserve-text'),
      supplyGrid: $('supply-grid'),
      toolUndo: $('tool-undo'),
      toolSlot: $('tool-slot'),
      toolRainbow: $('tool-rainbow'),
      toolRestart: $('tool-restart'),
      toolUndoCount: $('tool-undo-count'),
      toolSlotCount: $('tool-slot-count'),
      toolRainbowCount: $('tool-rainbow-count'),
      sanctuaryCanvas: $('sanctuary-canvas'),
      btnFeedAnts: $('btn-feed-ants'),
      btnToggleLantern: $('btn-toggle-lantern'),
      galleryGrid: $('gallery-grid'),
      studioCanvas: $('studio-canvas'),
      btnStudioMirror: $('btn-studio-mirror'),
      btnStudioEraser: $('btn-studio-eraser'),
      btnStudioRandom: $('btn-studio-random'),
      btnStudioClear: $('btn-studio-clear'),
      studioPalette: $('studio-palette'),
      btnStudioPlay: $('btn-studio-play'),
      atelierPreviewCanvas: $('atelier-preview-canvas'),
      atelierThemeList: $('atelier-theme-list'),
      atelierBlockList: $('atelier-block-list'),
      atelierSoundList: $('atelier-sound-list'),
      atelierStarsBadge: $('atelier-stars-badge'),
      modalBackdrop: $('modal-backdrop'),
      modalStars: $('modal-stars'),
      modalTitle: $('modal-title'),
      modalDesc: $('modal-desc'),
      modalPreviewWrap: $('modal-preview-wrap'),
      posterCanvas: $('poster-canvas'),
      skinList: $('skin-list'),
      modalRankWrap: $('modal-rank-wrap'),
      rankBoardTabs: $('rank-board-tabs'),
      rankPeriodTabs: $('rank-period-tabs'),
      rankMyBanner: $('rank-my-banner'),
      rankList: $('rank-list'),
      modalActions: $('modal-actions'),
      toast: $('toast')
    };

    await global.AntCompat.applyCapsuleSafeArea(els.topBar);
    var saved = await global.AntCompat.loadStorage(STORAGE_KEY);
    if (saved && typeof saved === 'object') {
      if (typeof saved.unlockedLevel === 'number' && isFinite(saved.unlockedLevel)) {
        state.progress.unlockedLevel = Math.max(1, Math.floor(saved.unlockedLevel));
      }
      if (saved.stars && typeof saved.stars === 'object') state.progress.stars = saved.stars;
      if (saved.hardStars && typeof saved.hardStars === 'object') state.progress.hardStars = saved.hardStars;
      if (Array.isArray(saved.customGallery)) state.progress.customGallery = saved.customGallery.slice(0, 6);
      if (typeof saved.endlessBest === 'number' && isFinite(saved.endlessBest)) {
        state.progress.endlessBest = Math.max(0, Math.floor(saved.endlessBest));
      }
      if (typeof saved.endlessHardBest === 'number' && isFinite(saved.endlessHardBest)) {
        state.progress.endlessHardBest = Math.max(0, Math.floor(saved.endlessHardBest));
      }
      if (saved.tools && typeof saved.tools === 'object') {
        state.progress.tools = {
          undo: (typeof saved.tools.undo === 'number' && isFinite(saved.tools.undo)) ? Math.max(0, Math.floor(saved.tools.undo)) : 3,
          slot: (typeof saved.tools.slot === 'number' && isFinite(saved.tools.slot)) ? Math.max(0, Math.floor(saved.tools.slot)) : 2,
          rainbow: (typeof saved.tools.rainbow === 'number' && isFinite(saved.tools.rainbow)) ? Math.max(0, Math.floor(saved.tools.rainbow)) : 2
        };
      }
      if (typeof saved.sound === 'boolean') state.progress.sound = saved.sound;
      if (typeof saved.vibrate === 'boolean') state.progress.vibrate = saved.vibrate;
      if (saved.daily && typeof saved.daily === 'object') {
        state.progress.daily = {
          lastDate: typeof saved.daily.lastDate === 'string' ? saved.daily.lastDate : '',
          streak: (typeof saved.daily.streak === 'number' && isFinite(saved.daily.streak)) ? Math.max(0, Math.floor(saved.daily.streak)) : 0,
          hardLastDate: typeof saved.daily.hardLastDate === 'string' ? saved.daily.hardLastDate : ''
        };
      }
      if (typeof saved.selectedSkin === 'string' && saved.selectedSkin) {
        state.progress.selectedSkin = saved.selectedSkin;
      }
      if (typeof saved.selectedTheme === 'string' && saved.selectedTheme) {
        state.progress.selectedTheme = saved.selectedTheme;
      }
      if (typeof saved.selectedBlockStyle === 'string' && saved.selectedBlockStyle) {
        state.progress.selectedBlockStyle = saved.selectedBlockStyle;
      }
      if (typeof saved.selectedSoundPack === 'string' && saved.selectedSoundPack) {
        state.progress.selectedSoundPack = saved.selectedSoundPack;
      }
      if (typeof saved.hardMode === 'boolean') {
        state.progress.hardMode = saved.hardMode;
      }
      if (typeof saved.diyCount === 'number' && isFinite(saved.diyCount)) {
        state.progress.diyCount = Math.max(0, Math.floor(saved.diyCount));
      }
    }

    global.AntAudio.setEnabled(state.progress.sound);
    els.soundIcon.textContent = state.progress.sound ? '🔊' : '🔇';
    applySoundPack(state.progress.selectedSoundPack || 'pudding');

    renderer = new global.AntRenderer(els.gameCanvas);
    if (renderer.setSkin) renderer.setSkin(state.progress.selectedSkin || 'classic');
    applyVibrateSetting(!!state.progress.vibrate);
    applyTheme(state.progress.selectedTheme || 'candy');
    applyBlockStyle(state.progress.selectedBlockStyle || 'jelly');
    engine = new global.AntEngine({
      onUpdate: renderGameHud,
      onPick: function (combo) { global.AntAudio.playPick(combo); },
      onComboMilestone: function () {
        global.AntAudio.playComboMilestone();
        global.AntCompat.vibrate('light');
        triggerPopAnim(els.hudComboBadge);
      },
      onFever: function () {
        global.AntAudio.playFever();
        global.AntCompat.vibrate('medium');
        triggerPopAnim(els.hudComboBadge);
      },
      onReturn: function () { global.AntAudio.playReturn(); },
      onSlotClear: function (slotIdx, remainingLen) {
        global.AntAudio.playSquadDone();
        var flashIdx = (typeof remainingLen === 'number') ? remainingLen : slotIdx;
        var slotObj = dockDomSlots[flashIdx];
        if (slotObj && slotObj.el) {
          slotObj.el.classList.add('is-clearing');
          setTimeout(function () {
            slotObj.el.classList.remove('is-clearing');
          }, 230);
        }
      },
      onUnlock: function () {
        global.AntAudio.playBoom();
        global.AntCompat.vibrate('medium');
      },
      onMudCrack: function () {
        global.AntAudio.playCrack();
        global.AntCompat.vibrate('light');
      },
      onWrapOpen: function () {
        global.AntAudio.playWrapOpen();
        global.AntCompat.vibrate('light');
      },
      onBomber: function () {
        global.AntAudio.playBoom();
        global.AntCompat.vibrate('medium');
      },
      onZap: function () {
        global.AntAudio.playZap();
        global.AntCompat.vibrate('medium');
      },
      onHoney: function () {
        global.AntAudio.playHoney();
        global.AntCompat.vibrate('medium');
      },
      onWin: handleWin,
      onLoss: handleLoss
    });

    bindEvents();
    if (global.AntRenderer && global.AntRenderer.onAssetsReady) {
      var assetRedrawTimer = 0;
      global.AntRenderer.onAssetsReady(function () {
        if (assetRedrawTimer) return;
        assetRedrawTimer = setTimeout(function () {
          assetRedrawTimer = 0;
          invalidateAntIcons();
          renderGameHud();
          if (state.screen === 'atelier') renderAtelier();
          else if (state.screen === 'gallery') renderGallery();
        }, 25);
      });
    }
    startLevel(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));

    /* 端外浏览器/未支持容器下默认隐身排行榜；仅小红书 9.51+ 宿主持有效权限探活成功后才显示 */
    hideRankEntries();
    global.AntCompat.checkRankSupport().then(function (rk) {
      if (!rk || !rk.inContainer || !rk.supported) {
        hideRankEntries();
        return;
      }
      global.AntCompat.fetchRankData(1, 'all', false).then(function (probe) {
        if (probe && probe.ok) {
          if (els.btnRank) els.btnRank.hidden = false;
          if (els.btnRankHome) els.btnRankHome.hidden = false;
        } else {
          hideRankEntries();
        }
      });
    });
    global.AntCompat.pullAndMergeCloudSave(state.progress).then(function (syncRes) {
      updateCloudHint();
      if (!syncRes || !syncRes.ok || !syncRes.merged) return;
      state.progress = syncRes.progress;
      global.AntAudio.setEnabled(state.progress.sound);
      if (els.soundIcon) els.soundIcon.textContent = state.progress.sound ? '🔊' : '🔇';
      applyVibrateSetting(!!state.progress.vibrate);
      applyTheme(state.progress.selectedTheme || 'candy');
      applyBlockStyle(state.progress.selectedBlockStyle || 'jelly');
      applySoundPack(state.progress.selectedSoundPack || 'pudding');
      if (renderer && renderer.setSkin) {
        renderer.setSkin(state.progress.selectedSkin || 'classic');
        invalidateAntIcons();
      }
      saveProgress(false);
      if (state.screen === 'home') {
        renderHome();
      } else if (state.screen === 'gallery') {
        renderGallery();
      } else if (state.screen === 'atelier') {
        renderAtelier();
      } else if (state.screen === 'game' && !state.inEndless && engine && engine.doneCarries === 0 && engine.activeAnts.length === 0 && (!engine.undoStack || engine.undoStack.length === 0)) {
        var targetLv = Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS);
        if (targetLv !== state.currentLevelId) {
          startLevel(targetLv);
          showToast('☁️ 已从云端恢复进度至第 ' + targetLv + ' 关');
          return;
        }
      }
      showToast('☁️ 已同步云端存档');
    });
    if (rafId) global.cancelAnimationFrame(rafId);
    rafId = global.requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
