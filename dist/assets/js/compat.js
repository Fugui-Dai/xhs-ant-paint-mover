/* Chrome 61 行为检测与小红书小工具端能力桥接（ES2017） */
(function (global) {
  'use strict';

  function supportsFlexGap() {
    if (!document.body) return false;
    var flex = document.createElement('div');
    flex.style.position = 'absolute';
    flex.style.visibility = 'hidden';
    flex.style.display = 'flex';
    flex.style.flexDirection = 'column';
    flex.style.rowGap = '1px';
    flex.appendChild(document.createElement('div'));
    flex.appendChild(document.createElement('div'));
    document.body.appendChild(flex);
    var supported = flex.scrollHeight === 1;
    flex.parentNode.removeChild(flex);
    return supported;
  }

  function applyLayoutCapabilities() {
    if (supportsFlexGap()) {
      document.documentElement.classList.add('supports-flex-gap');
    }
  }

  function getMiniTool() {
    return global.xhs && global.xhs.miniTool ? global.xhs.miniTool : null;
  }

  function readBuildVersion(launchOptions) {
    var miniToolEnv = launchOptions && launchOptions.miniToolEnv;
    var val = Number(miniToolEnv && miniToolEnv.buildVersion);
    return isNaN(val) || val <= 0 ? null : val;
  }

  function getClientVersion(buildVersion) {
    if (buildVersion === null) return null;
    return Math.floor(buildVersion / 1000);
  }

  var cachedBuildVersion = null;

  async function getBuildVersion() {
    if (cachedBuildVersion !== null) return cachedBuildVersion;
    var xhs = global.xhs;
    var syncVal = readBuildVersion(xhs && xhs.launchOptions);
    if (syncVal !== null) {
      cachedBuildVersion = syncVal;
      return syncVal;
    }
    var miniTool = getMiniTool();
    if (!miniTool || typeof miniTool.getLaunchOptions !== 'function') return null;
    try {
      var opts = await miniTool.getLaunchOptions();
      var asyncVal = readBuildVersion(opts);
      if (asyncVal !== null) cachedBuildVersion = asyncVal;
      return asyncVal;
    } catch (e) {
      return null;
    }
  }

  async function isClientVersionAtLeast(minClientVer) {
    var buildVer = await getBuildVersion();
    var clientVer = getClientVersion(buildVer);
    if (clientVer === null) return false;
    return clientVer >= minClientVer;
  }

  /* 按在线文档 §3.7 规范：仅在端 Storage 可用且版本 >= 9.46.0 时使用，不回退浏览器本地存储 */
  var memoryFallbackStore = {};

  async function loadStorage(key) {
    var miniTool = getMiniTool();
    if (miniTool && typeof miniTool.getStorage === 'function') {
      var okVer = await isClientVersionAtLeast(9460);
      if (okVer) {
        try {
          var res = await miniTool.getStorage({ key: key });
          if (res && typeof res.data === 'string' && res.data.length > 0) {
            return JSON.parse(res.data);
          }
          return null;
        } catch (e) {
          return memoryFallbackStore[key] || null;
        }
      }
    }
    return memoryFallbackStore[key] || null;
  }

  async function saveStorage(key, value) {
    memoryFallbackStore[key] = value;
    var serialized;
    try {
      serialized = JSON.stringify(value);
    } catch (e) {
      return false;
    }
    var miniTool = getMiniTool();
    if (!miniTool || typeof miniTool.setStorage !== 'function') return false;
    var okVer = await isClientVersionAtLeast(9460);
    if (!okVer) return false;
    try {
      var res = await miniTool.setStorage({ key: key, data: serialized });
      return !!(res && res.errMsg === 'setStorage:ok');
    } catch (e) {
      return false;
    }
  }

  function isVisibleRect(rect) {
    return !!(rect && typeof rect.width === 'number' && typeof rect.height === 'number' && rect.width > 0 && rect.height > 0);
  }

  async function applyCapsuleSafeArea(topBarEl) {
    var miniTool = getMiniTool();
    if (!miniTool || typeof miniTool.getWindowInfo !== 'function') return;
    var okVer = await isClientVersionAtLeast(9490);
    if (!okVer) return;
    try {
      var info = await miniTool.getWindowInfo();
      if (!info || !topBarEl) return;
      var topOffset = 8;
      if (info.safeArea && typeof info.safeArea.top === 'number') {
        topOffset = Math.max(topOffset, info.safeArea.top + 4);
      }
      var menuButtons = info.menuButtons || {};
      var cap = menuButtons.capsule;
      var rightPad = 10;
      var leftPad = 10;
      var minBarH = 36;
      if (isVisibleRect(cap)) {
        if (typeof info.windowWidth === 'number' && typeof cap.left === 'number') {
          rightPad = Math.max(12, (info.windowWidth - cap.left) + 8);
        }
        if (typeof cap.top === 'number') topOffset = Math.max(topOffset, cap.top);
        minBarH = Math.max(minBarH, cap.height);
      } else {
        /* 兼容 < 9.55 原生导航栏的 back / me / share 按钮矩形避让 */
        if (isVisibleRect(menuButtons.back) && typeof menuButtons.back.right === 'number') {
          leftPad = Math.max(leftPad, menuButtons.back.right + 8);
          minBarH = Math.max(minBarH, menuButtons.back.height);
        }
        var rightBtns = [menuButtons.me, menuButtons.share];
        for (var rb = 0; rb < rightBtns.length; rb += 1) {
          var rRect = rightBtns[rb];
          if (isVisibleRect(rRect) && typeof info.windowWidth === 'number' && typeof rRect.left === 'number') {
            rightPad = Math.max(rightPad, (info.windowWidth - rRect.left) + 8);
            minBarH = Math.max(minBarH, rRect.height);
          }
        }
      }
      topBarEl.style.paddingTop = topOffset + 'px';
      topBarEl.style.paddingRight = rightPad + 'px';
      topBarEl.style.paddingLeft = leftPad + 'px';
      var inner = topBarEl.querySelector('.top-bar-inner');
      if (inner) inner.style.minHeight = minBarH + 'px';
    } catch (e) {
      /* 忽略窗口信息获取失败，沿用 CSS 安全区回退 */
    }
  }

  function vibrate(type) {
    var miniTool = getMiniTool();
    if (!miniTool || typeof miniTool.vibrateShort !== 'function') return;
    isClientVersionAtLeast(9500).then(function (okVer) {
      if (!okVer) return;
      try {
        miniTool.vibrateShort({ type: type || 'light' });
      } catch (e) {
        /* 静默降级 */
      }
    });
  }

  async function postArtworkNote(title, content, dataUrl) {
    var miniTool = getMiniTool();
    if (!miniTool || typeof miniTool.postNote !== 'function') {
      return { ok: false, reason: 'unavailable' };
    }
    try {
      var mediaUrl = dataUrl;
      if (typeof miniTool.writeTempFile === 'function') {
        var tmp = await miniTool.writeTempFile({ data: dataUrl });
        if (tmp && tmp.filePath) mediaUrl = tmp.filePath;
      }
      await miniTool.postNote({
        title: String(title || '蚂蚁搬画').slice(0, 20),
        content: String(content || '').slice(0, 1000),
        pageType: 'photo_publish',
        mediaInfo: { image_resources: [{ url: mediaUrl }] }
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: (e && e.errMsg) || 'failed' };
    }
  }

  async function savePosterToAlbum(dataUrl) {
    var miniTool = getMiniTool();
    if (!miniTool || typeof miniTool.saveImageToPhotosAlbum !== 'function') {
      return { ok: false, reason: 'unavailable' };
    }
    try {
      var filePath = dataUrl;
      if (typeof miniTool.writeTempFile === 'function') {
        var tmp = await miniTool.writeTempFile({ data: dataUrl });
        if (tmp && tmp.filePath) filePath = tmp.filePath;
      }
      await miniTool.saveImageToPhotosAlbum({ filePath: filePath });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: (e && e.errMsg) || 'failed' };
    }
  }

  async function shareArtwork(dataUrl) {
    var miniTool = getMiniTool();
    if (!miniTool || typeof miniTool.share !== 'function') {
      return { ok: false, reason: 'unavailable' };
    }
    var okVer = await isClientVersionAtLeast(9530);
    if (!okVer) return { ok: false, reason: 'version' };
    try {
      var mediaUrl = dataUrl;
      if (typeof miniTool.writeTempFile === 'function') {
        var tmp = await miniTool.writeTempFile({ data: dataUrl });
        if (tmp && tmp.filePath) mediaUrl = tmp.filePath;
      }
      await miniTool.share({ type: 'image', image_resource: mediaUrl });
      return { ok: true };
    } catch (e) {
      return { ok: false, errCode: e && e.errCode, reason: (e && e.errMsg) || 'failed' };
    }
  }

  /* ====== 云存储与排行榜（客户端 9.51+，内测能力，必须支持降级） ====== */
  var FEATURE_951_VERSION = 9510;
  var CLOUD_COLLECTION = 'ant_save';
  var cloudState = {
    recordId: null,
    disabled: false,
    lastSyncAt: 0,
    pendingSync: false,
    syncTimer: 0,
    statusText: 'local' /* local | synced | syncing | unavailable */
  };

  var rankState = {
    disabled: false,
    lastKnownReason: '',
    cache: {} /* key: board + '_' + period -> { ts, listRes, myRes } */
  };
  var RANK_CACHE_TTL_MS = 45000;

  function clonePlainObject(obj) {
    var out = {};
    if (!obj || typeof obj !== 'object') return out;
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i += 1) {
      out[keys[i]] = obj[keys[i]];
    }
    return out;
  }

  function mergeProgressData(localProg, remoteProg) {
    var a = localProg && typeof localProg === 'object' ? localProg : {};
    var b = remoteProg && typeof remoteProg === 'object' ? remoteProg : {};
    var starsA = a.stars && typeof a.stars === 'object' ? a.stars : {};
    var starsB = b.stars && typeof b.stars === 'object' ? b.stars : {};
    var mergedStars = clonePlainObject(starsA);
    var keysB = Object.keys(starsB);
    for (var i = 0; i < keysB.length; i += 1) {
      var k = keysB[i];
      var sb = Number(starsB[k]) || 0;
      var sa = Number(mergedStars[k]) || 0;
      if (sb > sa) mergedStars[k] = sb;
    }

    var unlockA = Number(a.unlockedLevel) || 1;
    var unlockB = Number(b.unlockedLevel) || 1;
    var endlessA = Number(a.endlessBest) || 0;
    var endlessB = Number(b.endlessBest) || 0;

    var toolsA = a.tools && typeof a.tools === 'object' ? a.tools : {};
    var toolsB = b.tools && typeof b.tools === 'object' ? b.tools : {};
    /* 若云端进度明显更靠前，工具数量优先继承云端，否则保留当前较多值 */
    var preferRemote = (unlockB > unlockA) || (Object.keys(starsB).length > Object.keys(starsA).length);
    var mergedTools = {
      undo: preferRemote && typeof toolsB.undo === 'number' ? toolsB.undo : (typeof toolsA.undo === 'number' ? toolsA.undo : 3),
      slot: preferRemote && typeof toolsB.slot === 'number' ? toolsB.slot : (typeof toolsA.slot === 'number' ? toolsA.slot : 2),
      rainbow: preferRemote && typeof toolsB.rainbow === 'number' ? toolsB.rainbow : (typeof toolsA.rainbow === 'number' ? toolsA.rainbow : 2)
    };

    var soundVal = typeof a.sound === 'boolean' ? a.sound : (typeof b.sound === 'boolean' ? b.sound : true);
    var changedLocal = (unlockB > unlockA) || (endlessB > endlessA) || (preferRemote && keysB.length > 0);
    if (!changedLocal) {
      for (var j = 0; j < keysB.length; j += 1) {
        var key = keysB[j];
        if ((Number(starsB[key]) || 0) > (Number(starsA[key]) || 0)) {
          changedLocal = true;
          break;
        }
      }
    }

    return {
      changedLocal: changedLocal,
      progress: {
        unlockedLevel: Math.max(unlockA, unlockB),
        stars: mergedStars,
        endlessBest: Math.max(endlessA, endlessB),
        tools: mergedTools,
        sound: soundVal
      }
    };
  }

  function buildCompactCloudPayload(progress) {
    var payload = {
      v: 1,
      unlockedLevel: Number(progress.unlockedLevel) || 1,
      stars: clonePlainObject(progress.stars),
      endlessBest: Number(progress.endlessBest) || 0,
      tools: {
        undo: progress.tools && typeof progress.tools.undo === 'number' ? progress.tools.undo : 3,
        slot: progress.tools && typeof progress.tools.slot === 'number' ? progress.tools.slot : 2,
        rainbow: progress.tools && typeof progress.tools.rainbow === 'number' ? progress.tools.rainbow : 2
      },
      sound: progress.sound !== false,
      updatedAt: Date.now()
    };
    /* 确保持久内容远低于 64KB（65536 字节）配额限制 */
    try {
      if (JSON.stringify(payload).length > 60000) {
        delete payload.tools;
      }
    } catch (e) {
      /* 忽略序列化检查异常 */
    }
    return payload;
  }

  function isCloudCapabilityError(err) {
    var code = err && typeof err.errCode === 'number' ? err.errCode : 0;
    return code === 1006 || code === 10003;
  }

  function isRankCapabilityError(err) {
    var code = err && typeof err.errCode === 'number' ? err.errCode : 0;
    return code === 1005 || code === 10003;
  }

  async function canUse951Api(methodNames) {
    var miniTool = getMiniTool();
    if (!miniTool) return { ok: false, reason: 'no_container' };
    var okVer = await isClientVersionAtLeast(FEATURE_951_VERSION);
    if (!okVer) return { ok: false, reason: 'version' };
    for (var i = 0; i < methodNames.length; i += 1) {
      if (typeof miniTool[methodNames[i]] !== 'function') {
        return { ok: false, reason: 'missing_api' };
      }
    }
    return { ok: true, miniTool: miniTool };
  }

  async function pullAndMergeCloudSave(localProgress) {
    if (cloudState.disabled) return { ok: false, reason: 'disabled', status: cloudState.statusText };
    var cap = await canUse951Api(['queryCloudStorage', 'addCloudStorage', 'updateCloudStorage']);
    if (!cap.ok) {
      cloudState.statusText = 'local';
      return { ok: false, reason: cap.reason, status: 'local' };
    }
    try {
      cloudState.statusText = 'syncing';
      var res = await cap.miniTool.queryCloudStorage({ collection: CLOUD_COLLECTION, limit: 20 });
      var items = res && Array.isArray(res.items) ? res.items : [];
      if (items.length === 0) {
        cloudState.statusText = 'synced';
        /* 本地已有进度时顺便备份到云端 */
        if ((localProgress.unlockedLevel || 1) > 1 || Object.keys(localProgress.stars || {}).length > 0 || (localProgress.endlessBest || 0) > 0) {
          pushCloudSave(localProgress, true);
        }
        return { ok: true, merged: false, progress: localProgress, status: 'synced' };
      }
      /* 选出进度最高的一条记录作为主档 */
      var bestItem = items[0];
      var merged = localProgress;
      var anyRemoteNewer = false;
      for (var i = 0; i < items.length; i += 1) {
        var it = items[i];
        if (!it || !it.content || typeof it.content !== 'object') continue;
        var resMerge = mergeProgressData(merged, it.content);
        if (resMerge.changedLocal) anyRemoteNewer = true;
        merged = resMerge.progress;
        if (!bestItem || (it.content.updatedAt || 0) > ((bestItem.content && bestItem.content.updatedAt) || 0)) {
          bestItem = it;
        }
      }
      if (bestItem && bestItem.id) cloudState.recordId = bestItem.id;
      cloudState.statusText = 'synced';
      return {
        ok: true,
        merged: anyRemoteNewer,
        progress: merged,
        status: 'synced'
      };
    } catch (e) {
      if (isCloudCapabilityError(e)) {
        cloudState.disabled = true;
        cloudState.statusText = 'unavailable';
        return { ok: false, reason: 'unauthorized', status: 'unavailable' };
      }
      /* 读失败不伪装为空数据 */
      cloudState.statusText = 'local';
      return { ok: false, reason: (e && e.errMsg) || 'query_failed', status: 'local' };
    }
  }

  async function pushCloudSaveImmediate(progress) {
    if (cloudState.disabled) return false;
    var cap = await canUse951Api(['addCloudStorage', 'updateCloudStorage', 'queryCloudStorage']);
    if (!cap.ok) return false;
    var payload = buildCompactCloudPayload(progress);
    cloudState.lastSyncAt = Date.now();
    cloudState.pendingSync = false;
    try {
      cloudState.statusText = 'syncing';
      if (cloudState.recordId) {
        var uRes = await cap.miniTool.updateCloudStorage({
          collection: CLOUD_COLLECTION,
          items: [{ id: cloudState.recordId, content: payload }]
        });
        var uItem = uRes && Array.isArray(uRes.data) ? uRes.data[0] : (uRes && Array.isArray(uRes.items) ? uRes.items[0] : null);
        if (uItem && uItem.status === 'FAILED') {
          cloudState.statusText = 'local';
          return false;
        }
        cloudState.statusText = 'synced';
        return true;
      }
      var aRes = await cap.miniTool.addCloudStorage({
        collection: CLOUD_COLLECTION,
        items: [{ content: payload }]
      });
      var aItem = aRes && Array.isArray(aRes.data) ? aRes.data[0] : null;
      if (aItem && aItem.id && aItem.status === 'SUCCESS') {
        cloudState.recordId = aItem.id;
        cloudState.statusText = 'synced';
        return true;
      }
      /* 若返回 UNKNOWN (或 errCode 2004)，禁止直接重发新增，待下次 query 对账 */
      cloudState.statusText = 'local';
      return false;
    } catch (e) {
      if (isCloudCapabilityError(e)) {
        cloudState.disabled = true;
        cloudState.statusText = 'unavailable';
      } else {
        /* 如遇 2004 写入结果未知，标记待对账不重发 */
        cloudState.statusText = 'local';
      }
      return false;
    }
  }

  function pushCloudSave(progress, immediate) {
    if (cloudState.disabled) return;
    var now = Date.now();
    var elapsed = now - cloudState.lastSyncAt;
    if (immediate || elapsed >= 15000) {
      if (cloudState.syncTimer) {
        clearTimeout(cloudState.syncTimer);
        cloudState.syncTimer = 0;
      }
      pushCloudSaveImmediate(progress);
      return;
    }
    cloudState.pendingSync = true;
    if (cloudState.syncTimer) clearTimeout(cloudState.syncTimer);
    cloudState.syncTimer = setTimeout(function () {
      cloudState.syncTimer = 0;
      if (cloudState.pendingSync) pushCloudSaveImmediate(progress);
    }, 15000 - elapsed);
  }

  async function checkRankSupport() {
    if (rankState.disabled) return { supported: false, inContainer: !!getMiniTool(), reason: rankState.lastKnownReason || 'disabled' };
    var miniTool = getMiniTool();
    if (!miniTool) {
      /* 非小红书容器（桌面预览）返回 preview 标记 */
      return { supported: false, inContainer: false, reason: 'no_container' };
    }
    var cap = await canUse951Api(['submitScore', 'getRankList', 'getMyRank']);
    if (!cap.ok) {
      return { supported: false, inContainer: true, reason: cap.reason };
    }
    return { supported: true, inContainer: true, reason: 'ok' };
  }

  async function submitRankScore(board, score) {
    if (rankState.disabled) return { ok: false, reason: 'disabled' };
    var val = Number(score);
    if (!isFinite(val) || val <= 0) return { ok: false, reason: 'non_positive' };
    if (val > 1000000) val = 1000000;
    var cap = await canUse951Api(['submitScore']);
    if (!cap.ok) return { ok: false, reason: cap.reason };
    try {
      var res = await cap.miniTool.submitScore({ board: board, score: val });
      /* 成绩变更后使对应榜单本地缓存失效 */
      var cKeys = Object.keys(rankState.cache);
      for (var i = 0; i < cKeys.length; i += 1) {
        if (cKeys[i].indexOf(board + '_') === 0) {
          delete rankState.cache[cKeys[i]];
        }
      }
      return { ok: true, highScore: res && typeof res.score === 'number' ? res.score : val };
    } catch (e) {
      if (isRankCapabilityError(e)) {
        rankState.disabled = true;
        rankState.lastKnownReason = String(e.errCode || 'unauthorized');
        return { ok: false, disabled: true, errCode: e.errCode, reason: 'unauthorized' };
      }
      return { ok: false, errCode: e && e.errCode, reason: (e && e.errMsg) || 'failed' };
    }
  }

  function delayMs(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  async function fetchRankData(board, period, forceRefresh) {
    if (rankState.disabled) {
      return { ok: false, disabled: true, inContainer: !!getMiniTool(), reason: rankState.lastKnownReason || 'unauthorized' };
    }
    var miniTool = getMiniTool();
    if (!miniTool) {
      return { ok: false, inContainer: false, reason: 'no_container' };
    }
    var cap = await canUse951Api(['getRankList', 'getMyRank']);
    if (!cap.ok) {
      return { ok: false, inContainer: true, reason: cap.reason };
    }

    var safeBoard = board || 1;
    var safePeriod = period || 'all';
    var cacheKey = safeBoard + '_' + safePeriod;
    var now = Date.now();
    var cached = rankState.cache[cacheKey];
    if (!forceRefresh && cached && (now - cached.ts) < RANK_CACHE_TTL_MS) {
      return {
        ok: true,
        cached: true,
        list: cached.list,
        myRank: cached.myRank
      };
    }

    var backoffs = [500, 1000, 2000];
    var attempt = 0;
    while (attempt <= backoffs.length) {
      try {
        var listRes = await cap.miniTool.getRankList({ board: safeBoard, period: safePeriod });
        var myRes = await cap.miniTool.getMyRank({ board: safeBoard, period: safePeriod });
        var rows = listRes && Array.isArray(listRes.data) ? listRes.data : [];
        var normalized = {
          ok: true,
          cached: false,
          list: rows,
          myRank: myRes || { status: 'NOT_PARTICIPATING', rank: null, score: null }
        };
        rankState.cache[cacheKey] = {
          ts: Date.now(),
          list: normalized.list,
          myRank: normalized.myRank
        };
        return normalized;
      } catch (e) {
        var code = e && typeof e.errCode === 'number' ? e.errCode : 0;
        if (isRankCapabilityError(e)) {
          rankState.disabled = true;
          rankState.lastKnownReason = String(code || 'unauthorized');
          return { ok: false, disabled: true, inContainer: true, errCode: code, reason: 'unauthorized' };
        }
        /* errCode 2002: 榜单缓存未就绪，按文档做有限次指数退避 */
        if (code === 2002 && attempt < backoffs.length) {
          await delayMs(backoffs[attempt]);
          attempt += 1;
          continue;
        }
        return {
          ok: false,
          inContainer: true,
          errCode: code,
          reason: code === 2009 ? 'rate_limit' : (code === 2002 ? 'not_ready' : 'failed')
        };
      }
    }
    return { ok: false, inContainer: true, reason: 'failed' };
  }

  global.AntCompat = {
    applyLayoutCapabilities: applyLayoutCapabilities,
    loadStorage: loadStorage,
    saveStorage: saveStorage,
    pullAndMergeCloudSave: pullAndMergeCloudSave,
    pushCloudSave: pushCloudSave,
    getCloudStatus: function () { return cloudState.statusText; },
    applyCapsuleSafeArea: applyCapsuleSafeArea,
    vibrate: vibrate,
    postArtworkNote: postArtworkNote,
    savePosterToAlbum: savePosterToAlbum,
    shareArtwork: shareArtwork,
    checkRankSupport: checkRankSupport,
    submitRankScore: submitRankScore,
    fetchRankData: fetchRankData,
    hasMiniTool: function () { return !!getMiniTool(); }
  };
})(window);
