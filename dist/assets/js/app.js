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
    progress: {
      unlockedLevel: 1,
      stars: {},
      endlessBest: 0,
      tools: { undo: 3, slot: 2, rainbow: 2 },
      sound: true
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

  function switchScreen(name) {
    state.screen = name;
    els.screenHome.hidden = name !== 'home';
    els.screenGame.hidden = name !== 'game';
    els.screenGallery.hidden = name !== 'gallery';
    els.miniCanvas.hidden = name !== 'game';
    els.galleryIcon.hidden = name === 'game';

    if (name === 'home') {
      els.headerTitle.textContent = '选择关卡';
      els.headerSub.textContent = '18 大主题章节 · ' + global.AntLevels.TOTAL_LEVELS + ' 关 + 无尽';
      renderHome();
    } else if (name === 'gallery') {
      els.headerTitle.textContent = '蚁巢藏画廊';
      els.headerSub.textContent = '珍藏已搬回的森林画作';
      renderGallery();
    } else if (name === 'game') {
      if (engine && engine.config) {
        var cfg = engine.config;
        els.headerTitle.textContent = cfg.isEndless ? ('无尽第' + cfg.endlessStage + '关') : ('第' + cfg.id + '关 · ' + cfg.name);
        els.headerSub.textContent = cfg.chapterName + ' · ' + cfg.cols + '×' + cfg.rows;
      }
      setTimeout(function () {
        if (renderer) renderer.resize();
      }, 20);
    }
  }

  function renderHome() {
    var stats = countStats();
    els.galleryCountBadge.textContent = stats.cleared + '/' + global.AntLevels.TOTAL_LEVELS;
    els.statCleared.textContent = stats.cleared + ' / ' + global.AntLevels.TOTAL_LEVELS;
    els.statStars.textContent = stats.totalStars + ' ★';
    els.statEndless.textContent = String(state.progress.endlessBest || 0);
    els.continueLevelNum.textContent = String(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));

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
    var config = global.AntLevels.getLevelConfig(levelId);
    beginGameWithConfig(config);
  }

  function startEndless(stageNum) {
    state.inEndless = true;
    state.endlessStage = stageNum || 1;
    var config = global.AntLevels.getEndlessConfig(state.endlessStage);
    beginGameWithConfig(config);
  }

  function beginGameWithConfig(config) {
    closeModal();
    switchScreen('game');
    els.headerTitle.textContent = config.isEndless ? ('无尽第' + config.endlessStage + '关') : ('第' + config.id + '关 · ' + config.name);
    els.headerSub.textContent = config.chapterName + ' · ' + config.cols + '×' + config.rows;
    els.hudChapterTag.textContent = config.chapterName;

    var slotLimit = config.baseSlots || 5;
    var tipText = '外围先露什么颜色就先点什么！' + slotLimit + ' 个槽位切勿乱点内层色';
    if (config.id <= 5) tipText = '新手引导：从外边一圈圈剥开搬画，轻松 3 星过关';
    else if (config.chapter === 2 || config.chapter === 3) tipText = slotLimit + ' 槽进阶：冰霜厚涂格（带2）需同色蚂蚁搬运 2 次';
    else if (config.chapter === 4 || config.chapter === 5) tipText = slotLimit + ' 槽挑战：泥块封印格需搬空相邻格子震碎泥壳';
    else if (config.chapter === 6) tipText = slotLimit + ' 槽秘宝：先搬带 K 金钥匙方块解锁全部金锁！';
    else if (config.chapter === 7) tipText = '粉色礼物盒需清空相邻像素拆开后才显色';
    else if (config.chapter === 10) tipText = '带“？”盲盒小队入槽后揭晓，先留空槽再用';
    else if (config.chapter === 11) tipText = '魔法学院：金钥匙与礼物礼盒双机关齐发！';
    else if (config.chapter >= 12 && config.chapter < 16) tipText = '善用带💣爆破工蚁，可一次性震碎周围泥壳与礼盒！';
    else if (config.chapter >= 16) tipText = '星夜幻境高阶挑战！先观局再出兵';
    state.baseTipText = tipText;
    els.stageTip.textContent = tipText;

    engine.setSpeedMultiplier(state.speed);
    engine.initLevel(config);
    if (renderer) {
      renderer.resize();
      renderer.renderMiniGallery(engine);
    }
  }

  var dockDomSlots = [];
  var poolDomButtons = [];

  /* 用 Canvas 2D 绘制生物拟真小蚂蚁头像；爆破工蚁保留本体颜色并在角标标出💣 */
  function createKawaiiAntNode(bodyHex, isBomber) {
    var cv = document.createElement('canvas');
    cv.width = 32;
    cv.height = 32;
    cv.className = 'kawaii-ant-svg';
    cv.setAttribute('aria-hidden', 'true');
    if (global.AntRenderer && typeof global.AntRenderer.drawAntIcon === 'function') {
      global.AntRenderer.drawAntIcon(cv, bodyHex);
    }
    if (!isBomber) return cv;
    var frag = document.createDocumentFragment();
    frag.appendChild(cv);
    var chip = document.createElement('span');
    chip.className = 'bomber-chip';
    chip.textContent = '💣';
    frag.appendChild(chip);
    return frag;
  }

  function ensureDockDom() {
    if (dockDomSlots.length > 0) return;
    els.dockSlots.textContent = '';
    for (var i = 0; i < 6; i += 1) {
      var slot = document.createElement('div');
      slot.className = 'dock-slot' + (i >= 5 ? ' is-extra' : '');
      var antGlyph = document.createElement('span');
      antGlyph.className = 'slot-ant';
      var cntEl = document.createElement('span');
      cntEl.className = 'slot-count';
      slot.appendChild(antGlyph);
      slot.appendChild(cntEl);
      els.dockSlots.appendChild(slot);
      dockDomSlots.push({ el: slot, glyph: antGlyph, count: cntEl, lastSig: '' });
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
      var numSpan = document.createElement('span');
      btn.appendChild(iconSpan);
      btn.appendChild(numSpan);
      els.supplyGrid.appendChild(btn);
      poolDomButtons.push({ btn: btn, icon: iconSpan, num: numSpan, lastSig: '' });
    }
  }

  function renderGameHud() {
    if (!engine || !engine.config) return;
    var remain = Math.max(0, engine.totalCarries - engine.doneCarries);
    var pct = engine.totalCarries > 0 ? Math.min(100, Math.round((engine.doneCarries / engine.totalCarries) * 100)) : 0;
    els.hudRemainText.textContent = remain + ' 块';
    els.hudProgressFill.style.width = pct + '%';

    if (engine.combo >= 4) {
      els.hudComboBadge.classList.remove('is-hidden');
      els.hudComboBadge.setAttribute('aria-hidden', 'false');
      els.hudComboNum.textContent = String(engine.combo);
    } else {
      els.hudComboBadge.classList.add('is-hidden');
      els.hudComboBadge.setAttribute('aria-hidden', 'true');
    }

    /* 原地更新 5/6 个暂存槽，避免动画刷新销毁 DOM；剩最后 1 个空槽时温和预警 */
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
        dObj.el.classList.add('is-filled');
        dObj.el.classList.remove('is-warn');
        dObj.el.style.background = pal.hex;
        dObj.el.classList.toggle('is-working', engine.exposedColors[sq.color] > 0 && sq.count > 0);
        var dSig = sq.color + '|' + sq.kind;
        if (dObj.lastSig !== dSig) {
          dObj.lastSig = dSig;
          dObj.glyph.textContent = '';
          dObj.glyph.appendChild(createKawaiiAntNode(pal.ant || '#fff8ea', sq.kind === 'bomber'));
        }
        dObj.count.textContent = String(sq.count);
      } else {
        dObj.el.classList.remove('is-filled', 'is-working');
        dObj.el.classList.toggle('is-warn', lastOneFree);
        dObj.el.style.background = '';
        if (dObj.lastSig !== '') {
          dObj.lastSig = '';
          dObj.glyph.textContent = '';
        }
        dObj.count.textContent = '';
      }
    }

    if (els.stageTip) {
      els.stageTip.textContent = lastOneFree
        ? '⚠️ 只剩最后 1 个空槽位，优先点画上外露同色小队或用道具解围'
        : (state.baseTipText || '');
    }

    /* 原地更新底部 2×4 全可点小队阵：蚂蚁爬行期间绝不销毁重绘按钮，保证每次点击 100% 响应！ */
    els.supplyReserveText.textContent = engine.reserveDeck.length > 0
      ? ('后续还有 ' + engine.reserveDeck.length + ' 队')
      : '已全部登场';

    ensurePoolDom(engine.visiblePool.length);
    for (var pIdx = 0; pIdx < engine.visiblePool.length; pIdx += 1) {
      var item = engine.visiblePool[pIdx];
      var cell = poolDomButtons[pIdx];
      var sig = item ? (item.color + '|' + item.count + '|' + item.kind + '|' + (item.mystery ? 1 : 0)) : 'EMPTY';
      if (cell.lastSig === sig) continue;
      cell.lastSig = sig;
      if (!item) {
        cell.btn.className = 'squad-placeholder';
        cell.btn.style.background = '';
        cell.btn.disabled = true;
        cell.icon.textContent = '';
        cell.num.textContent = '';
      } else if (item.mystery) {
        cell.btn.className = 'squad-btn is-mystery';
        cell.btn.style.background = '';
        cell.btn.disabled = false;
        cell.icon.textContent = '?';
        cell.num.textContent = '×' + item.count;
      } else {
        var pInfo = PALETTE[item.color] || { hex: '#888', dark: '#555' };
        cell.btn.className = 'squad-btn' + (item.kind === 'bomber' ? ' is-bomber' : '');
        cell.btn.style.background = pInfo.hex;
        cell.btn.disabled = false;
        cell.icon.textContent = '';
        cell.icon.appendChild(createKawaiiAntNode(pInfo.ant || '#fff8ea', item.kind === 'bomber'));
        cell.num.textContent = String(item.count);
      }
    }

    els.toolUndoCount.textContent = String(state.progress.tools.undo);
    els.toolSlotCount.textContent = String(state.progress.tools.slot);
    els.toolRainbowCount.textContent = String(state.progress.tools.rainbow);
    els.toolUndo.classList.toggle('is-disabled', !engine.canUndo() || state.progress.tools.undo <= 0);
    els.toolSlot.classList.toggle('is-disabled', engine.maxSlots >= (engine.baseSlots || 5) + 1 || state.progress.tools.slot <= 0);
    els.toolRainbow.classList.toggle('is-disabled', state.progress.tools.rainbow <= 0);

    if (renderer) renderer.renderMiniGallery(engine);
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
      if (state.lastWinChapterBonus) {
        els.modalDesc.textContent = '🎉 完成整章 20 关！蚁后加赠：撤回+2 · 扩槽+1 · 彩虹蚁+1';
      } else if (config.isEndless) {
        els.modalDesc.textContent = '无尽第 ' + (config.endlessStage || 1) + ' 关达成！已获撤回 +1';
      } else if (stars === 3) {
        els.modalDesc.textContent = '第 ' + config.id + ' 关 · 零道具完美三星 · 已入画廊';
      } else {
        els.modalDesc.textContent = '第 ' + config.id + ' 关 · 已入画廊（全程不用道具可得 ★★★）';
      }
    } else if (cleared) {
      els.modalDesc.textContent = '第 ' + config.id + ' 关 · ' + config.chapterName + '（已珍藏于森林画廊）';
    } else {
      els.modalDesc.textContent = '第 ' + config.id + ' 关 · ' + config.chapterName + '（效果图预览 · 含拼豆色卡）';
    }

    els.modalPreviewWrap.hidden = false;
    global.AntRenderer.drawArtworkToCanvas(els.posterCanvas, config, cleared ? stars : 0, true);

    els.modalActions.textContent = '';

    function createPostBtn(cls, label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', async function () {
        var dataUrl = els.posterCanvas.toDataURL('image/png');
        var res = await global.AntCompat.postArtworkNote(
          ('蚂蚁搬画：' + config.name).slice(0, 20),
          '小蚂蚁把像素一块块搬进森林藏画廊啦！#蚂蚁搬画 #小红书小工具 #像素画',
          dataUrl
        );
        if (res.ok) showToast('已打开笔记发布页！');
        else showToast('请在小红书客户端内使用发笔记功能');
      });
      return btn;
    }

    function createShareBtn(cls, label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', async function () {
        var dataUrl = els.posterCanvas.toDataURL('image/png');
        var res = await global.AntCompat.shareArtwork(dataUrl);
        if (res.ok) showToast('已调起分享！');
        else if (res.errCode === 15503) showToast('今日分享次数已达上限（每天最多 10 次）');
        else if (res.errCode === 15502) showToast('请在全屏容器中使用分享');
        else showToast('请在小红书客户端 9.53+ 中使用分享');
      });
      return btn;
    }

    function createSaveBtn(cls, label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', async function () {
        var dataUrl = els.posterCanvas.toDataURL('image/png');
        var res = await global.AntCompat.savePosterToAlbum(dataUrl);
        if (res.ok) showToast('海报已保存到系统相册！');
        else showToast('请在小红书真机环境使用相册保存');
      });
      return btn;
    }

    if (isVictoryModal) {
      /* 通关弹窗极简布局：1 个主按钮（下一关）+ 1 排紧凑轻量次级按钮 */
      var nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'primary-btn';
      if (config.isEndless) {
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

      var compactRow = document.createElement('div');
      compactRow.className = 'modal-actions-row';
      compactRow.appendChild(createPostBtn('modal-mini-btn', '📸 发笔记'));
      compactRow.appendChild(createSaveBtn('modal-mini-btn', '💾 存相册'));
      var levelsBtn = document.createElement('button');
      levelsBtn.type = 'button';
      levelsBtn.className = 'modal-mini-btn';
      levelsBtn.textContent = '🗺️ 选关';
      levelsBtn.addEventListener('click', function () {
        closeModal();
        switchScreen('home');
      });
      compactRow.appendChild(levelsBtn);
      els.modalActions.appendChild(compactRow);
    } else {
      if (!cleared && config.id <= state.progress.unlockedLevel) {
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

      var galleryRow = document.createElement('div');
      galleryRow.className = 'modal-actions-row';
      if (cleared) {
        galleryRow.appendChild(createPostBtn('modal-mini-btn', '📸 发笔记'));
        galleryRow.appendChild(createShareBtn('modal-mini-btn', '📤 分享'));
      }
      galleryRow.appendChild(createSaveBtn('modal-mini-btn', cleared ? '💾 存相册' : '💾 存拼豆图谱'));
      els.modalActions.appendChild(galleryRow);

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
    var localBest = board === 1 ? stats.totalStars : (state.progress.endlessBest || 0);
    var unit = board === 1 ? '★' : '关';

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
    rankUiState.board = defaultBoard || (state.inEndless ? 2 : 1);
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

  function renderGallery() {
    els.galleryGrid.textContent = '';
    var chapters = global.AntLevels.CHAPTERS;
    var metaList = global.AntLevels.getMetaList();
    var currentCh = Math.ceil(state.progress.unlockedLevel / 20);
    state.galleryExpanded[currentCh] = true;

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
    if (state.inEndless) startEndless(state.endlessStage);
    else startLevel(state.currentLevelId);
    if (gaveAid) showToast('🐜 蚁后暖心补给：已补充 1 次撤回道具');
  }

  function handleWin() {
    global.AntAudio.playWin();
    global.AntCompat.vibrate('medium');
    var stars = engine.toolsUsed === 0 ? 3 : (engine.toolsUsed === 1 ? 2 : 1);
    var cfg = engine.config;
    state.lastWinChapterBonus = false;

    if (cfg.isEndless) {
      if (cfg.endlessStage > (state.progress.endlessBest || 0)) {
        state.progress.endlessBest = cfg.endlessStage;
      }
      state.progress.tools.undo += 1;
    } else {
      var prev = state.progress.stars[String(cfg.id)] || 0;
      if (stars > prev) state.progress.stars[String(cfg.id)] = stars;
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
    els.galleryCountBadge.textContent = stats.cleared + '/' + global.AntLevels.TOTAL_LEVELS;
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
    }
    rafId = global.requestAnimationFrame(loop);
  }

  function bindEvents() {
    els.btnLevels.addEventListener('click', function () {
      global.AntAudio.playTap();
      if (state.screen === 'home') {
        if (engine && engine.status === 'won') {
          if (state.inEndless) startEndless(state.endlessStage + 1);
          else startLevel(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));
        } else {
          switchScreen('game');
        }
      } else {
        switchScreen('home');
      }
    });
    els.btnGallery.addEventListener('click', function () {
      global.AntAudio.playTap();
      switchScreen('gallery');
    });
    els.btnGalleryBack.addEventListener('click', function () {
      global.AntAudio.playTap();
      if (engine && engine.status === 'won') {
        if (state.inEndless) startEndless(state.endlessStage + 1);
        else startLevel(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));
      } else {
        switchScreen('game');
      }
    });
    els.btnSpeed.addEventListener('click', function () {
      state.speed = state.speed === 1 ? 2 : (state.speed === 2 ? 3 : 1);
      els.speedLabel.textContent = 'x' + state.speed;
      els.btnSpeed.classList.toggle('is-fast', state.speed > 1);
      if (engine) engine.setSpeedMultiplier(state.speed);
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
    els.btnContinue.addEventListener('click', function () {
      global.AntAudio.playTap();
      startLevel(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));
    });
    els.btnEndless.addEventListener('click', function () {
      global.AntAudio.playTap();
      startEndless((state.progress.endlessBest || 0) + 1);
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

    els.supplyGrid.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.squad-btn') : e.target;
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
      topBar: $('top-bar'),
      btnLevels: $('btn-levels'),
      btnSpeed: $('btn-speed'),
      speedLabel: $('speed-label'),
      btnRank: $('btn-rank'),
      btnGallery: $('btn-gallery'),
      galleryIcon: $('gallery-icon'),
      btnSound: $('btn-sound'),
      soundIcon: $('sound-icon'),
      headerTitle: $('header-title'),
      headerSub: $('header-sub'),
      galleryCountBadge: $('gallery-count-badge'),
      screenHome: $('screen-home'),
      screenGame: $('screen-game'),
      screenGallery: $('screen-gallery'),
      btnContinue: $('btn-continue'),
      btnEndless: $('btn-endless'),
      btnRankHome: $('btn-rank-home'),
      cloudSyncHint: $('cloud-sync-hint'),
      continueLevelNum: $('continue-level-num'),
      statCleared: $('stat-cleared'),
      statStars: $('stat-stars'),
      statEndless: $('stat-endless'),
      chapterList: $('chapter-list'),
      hudChapterTag: $('hud-chapter-tag'),
      hudRemainText: $('hud-remain-text'),
      hudProgressFill: $('hud-progress-fill'),
      hudComboBadge: $('hud-combo-badge'),
      hudComboNum: $('hud-combo-num'),
      gameCanvas: $('game-canvas'),
      miniCanvas: $('mini-canvas'),
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
      btnGalleryBack: $('btn-gallery-back'),
      galleryGrid: $('gallery-grid'),
      modalBackdrop: $('modal-backdrop'),
      modalStars: $('modal-stars'),
      modalTitle: $('modal-title'),
      modalDesc: $('modal-desc'),
      modalPreviewWrap: $('modal-preview-wrap'),
      posterCanvas: $('poster-canvas'),
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
      if (typeof saved.unlockedLevel === 'number') state.progress.unlockedLevel = saved.unlockedLevel;
      if (saved.stars && typeof saved.stars === 'object') state.progress.stars = saved.stars;
      if (typeof saved.endlessBest === 'number') state.progress.endlessBest = saved.endlessBest;
      if (saved.tools && typeof saved.tools === 'object') state.progress.tools = saved.tools;
      if (typeof saved.sound === 'boolean') state.progress.sound = saved.sound;
    }

    global.AntAudio.setEnabled(state.progress.sound);
    els.soundIcon.textContent = state.progress.sound ? '🔊' : '🔇';

    renderer = new global.AntRenderer(els.gameCanvas, els.miniCanvas);
    engine = new global.AntEngine({
      onUpdate: renderGameHud,
      onPick: function (combo) { global.AntAudio.playPick(combo); },
      onReturn: function () { global.AntAudio.playReturn(); },
      onSlotClear: function (slotIdx) {
        global.AntAudio.playSquadDone();
        var slotObj = dockDomSlots[slotIdx];
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
        showToast('🔑 金钥匙已解锁画上全部金锁！');
      },
      onMudCrack: function () {
        global.AntAudio.playCrack();
        global.AntCompat.vibrate('light');
      },
      onBomber: function () {
        global.AntAudio.playBoom();
        global.AntCompat.vibrate('medium');
      },
      onWin: handleWin,
      onLoss: handleLoss
    });

    bindEvents();
    var initialStats = countStats();
    els.galleryCountBadge.textContent = initialStats.cleared + '/' + global.AntLevels.TOTAL_LEVELS;
    startLevel(Math.min(state.progress.unlockedLevel, global.AntLevels.TOTAL_LEVELS));

    /* 后台探测 9.51+ 排行榜与云存档能力，未支持/未授权时自动降级隐藏 */
    global.AntCompat.checkRankSupport().then(function (rk) {
      if (rk && rk.inContainer && !rk.supported) {
        hideRankEntries();
      }
    });
    global.AntCompat.pullAndMergeCloudSave(state.progress).then(function (syncRes) {
      updateCloudHint();
      if (!syncRes || !syncRes.ok || !syncRes.merged) return;
      state.progress = syncRes.progress;
      saveProgress(false);
      var mergedStats = countStats();
      els.galleryCountBadge.textContent = mergedStats.cleared + '/' + global.AntLevels.TOTAL_LEVELS;
      if (state.screen === 'home') {
        renderHome();
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
