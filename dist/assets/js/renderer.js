/* 2D 森林野餐绘本画布渲染器 + 顶部缩略重绘 + 海报生成（ES2017） */
(function (global) {
  'use strict';

  function roundRectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function lerpAngle(from, to, t) {
    var diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return from + diff * t;
  }

  var SKIN_ASSET_KEYS = {
    classic: 'antClassic',
    strawhat: 'antStrawhat',
    bee: 'antBee',
    glow: 'antGlow',
    royal: 'antRoyal'
  };
  var CRAWL_ASSET_KEYS = {
    classic: 'crawlClassic',
    strawhat: 'crawlStrawhat',
    bee: 'crawlBee',
    glow: 'crawlGlow',
    royal: 'crawlRoyal'
  };
  var PROP_ASSET_KEYS = {
    candy: 'propCandy',
    soda: 'propSoda',
    lavender: 'propLavender',
    caramel: 'propCaramel',
    ribbon: 'propRibbon',
    craft: 'propCraft'
  };
  var ASSET_MANIFEST = {
    antClassic: './assets/img/ant-classic.webp',
    antStrawhat: './assets/img/ant-strawhat.webp',
    antBee: './assets/img/ant-bee.webp',
    antGlow: './assets/img/ant-glow.webp',
    antRoyal: './assets/img/ant-royal.webp',
    crawlClassic: './assets/img/crawl-classic.webp',
    crawlStrawhat: './assets/img/crawl-strawhat.webp',
    crawlBee: './assets/img/crawl-bee.webp',
    crawlGlow: './assets/img/crawl-glow.webp',
    crawlRoyal: './assets/img/crawl-royal.webp',
    burrow: './assets/img/stage-burrow.webp',
    studio: './assets/img/stage-studio.webp',
    sanctuaryBg: './assets/img/sanctuary-bg.webp',
    posterFrame: './assets/img/poster-frame.webp',
    propCandy: './assets/img/prop-candy.webp',
    propSoda: './assets/img/prop-soda.webp',
    propLavender: './assets/img/prop-lavender.webp',
    propCaramel: './assets/img/prop-caramel.webp',
    propRibbon: './assets/img/prop-ribbon.webp',
    propCraft: './assets/img/prop-craft.webp'
  };
  var IMG_ASSETS = {};
  var IMG_READY = {};
  var assetReadyListeners = [];

  (function preloadLocalImages() {
    if (typeof Image !== 'function') return;
    var keys = Object.keys(ASSET_MANIFEST);
    for (var i = 0; i < keys.length; i += 1) {
      (function (k) {
        var img = new Image();
        img.onload = function () {
          IMG_READY[k] = true;
          for (var c = 0; c < assetReadyListeners.length; c += 1) {
            assetReadyListeners[c](k);
          }
        };
        img.src = ASSET_MANIFEST[k];
        IMG_ASSETS[k] = img;
      })(keys[i]);
    }
  })();

  function drawLoadedAsset(ctx, key, cx, cy, targetW, targetH) {
    if (!IMG_READY[key] || !IMG_ASSETS[key]) return false;
    var img = IMG_ASSETS[key];
    var iw = img.naturalWidth || img.width || 1;
    var ih = img.naturalHeight || img.height || 1;
    var dw = targetW;
    var dh = targetH;
    if (targetW && !targetH) {
      dh = targetW * (ih / iw);
    } else if (targetH && !targetW) {
      dw = targetH * (iw / ih);
    } else if (targetW && targetH) {
      var fit = Math.min(targetW / iw, targetH / ih);
      dw = iw * fit;
      dh = ih * fit;
    }
    ctx.drawImage(img, cx - dw * 0.5, cy - dh * 0.5, dw, dh);
    return { w: dw, h: dh };
  }

  function GameRenderer(mainCanvas) {
    this.canvas = mainCanvas;
    this.ctx = mainCanvas.getContext('2d');
    this.width = 320;
    this.height = 320;
    this.dpr = 1;
    this.time = 0;
    this.walkTime = 0;
    this.skinId = 'classic';
    this.themeId = 'candy';
    this.blockStyle = 'jelly';
    this.shakeEnabled = false;
    this.trailDots = [];
    this.sporePuffs = [];
    this.hitRegions = { mushroom: null, studio: null, flowers: [] };
  }

  GameRenderer.prototype.setSkin = function (skinId) {
    this.skinId = skinId || 'classic';
  };

  GameRenderer.prototype.setShakeEnabled = function (enabled) {
    this.shakeEnabled = !!enabled;
  };

  function collectCatalogIds(items, fallback) {
    if (global.AntCompat && typeof global.AntCompat.collectCatalogIds === 'function') {
      return global.AntCompat.collectCatalogIds(items, fallback);
    }
    return fallback;
  }

  GameRenderer.prototype.setTheme = function (themeId) {
    var ok = collectCatalogIds(global.AntLevels && global.AntLevels.UI_THEMES, ['candy', 'craft', 'soda', 'lavender', 'caramel', 'ribbon']);
    this.themeId = ok.indexOf(themeId) >= 0 ? themeId : 'candy';
  };

  GameRenderer.prototype.setBlockStyle = function (styleId) {
    var ok = collectCatalogIds(global.AntLevels && global.AntLevels.BLOCK_STYLES, ['jelly', 'bead', 'ice', 'gem', 'choco', 'sugar']);
    this.blockStyle = ok.indexOf(styleId) >= 0 ? styleId : 'jelly';
  };

  GameRenderer.prototype.resize = function () {
    if (!this.canvas || !this.canvas.parentElement) return;
    var rect = this.canvas.parentElement.getBoundingClientRect();
    var w = Math.max(240, Math.floor(rect.width));
    var h = Math.max(200, Math.floor(rect.height));
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
  };

  GameRenderer.prototype.resetEffects = function () {
    this.trailDots = [];
    this.sporePuffs = [];
  };

  GameRenderer.prototype.spawnSporeBurst = function (x, y, colors, count) {
    for (var i = 0; i < (count || 8); i += 1) {
      var ang = (Math.PI * 2 * i) / (count || 8) + Math.random() * 0.5;
      var spd = 22 + Math.random() * 26;
      this.sporePuffs.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 14,
        color: colors[i % colors.length],
        size: 2.2 + Math.random() * 1.8,
        life: 1
      });
    }
    if (this.sporePuffs.length > 60) {
      this.sporePuffs.splice(0, this.sporePuffs.length - 60);
    }
  };

  GameRenderer.prototype.handleStageTap = function (x, y) {
    var hr = this.hitRegions;
    if (!hr) return null;
    if (hr.mushroom) {
      var mdx = x - hr.mushroom.x;
      var mdy = y - hr.mushroom.y;
      if (mdx * mdx + mdy * mdy <= 484) {
        var tCols = ['#ffffff', '#ffd6e5', '#fde047'];
        if (this.themeId === 'candy') tCols = ['#ff85c0', '#ffd233', '#38bdf8', '#ffffff'];
        else if (this.themeId === 'soda') tCols = ['#ffffff', '#7dd3fc', '#fef08a'];
        else if (this.themeId === 'lavender') tCols = ['#e9d5ff', '#fef08a', '#c084fc'];
        else if (this.themeId === 'caramel') tCols = ['#fde68a', '#d97706', '#fff8ed'];
        else if (this.themeId === 'ribbon') tCols = ['#fb7185', '#fff5f7', '#fde047'];
        this.spawnSporeBurst(hr.mushroom.x, hr.mushroom.y - 4, tCols, 12);
        return 'mushroom';
      }
    }
    if (hr.studio) {
      var sdx = x - hr.studio.x;
      var sdy = y - hr.studio.y;
      if (Math.abs(sdx) <= 30 && Math.abs(sdy) <= 28) {
        this.spawnSporeBurst(hr.studio.x, hr.studio.y, ['#fde047', '#f490b3', '#6fc3df'], 8);
        return 'studio';
      }
    }
    for (var f = 0; f < hr.flowers.length; f += 1) {
      var fl = hr.flowers[f];
      var fdx = x - fl.x;
      var fdy = y - fl.y;
      if (fdx * fdx + fdy * fdy <= 324) {
        this.spawnSporeBurst(fl.x, fl.y, [fl.color, '#fde047', '#ffd4e2'], 8);
        return 'flower';
      }
    }
    return null;
  };

  /* 萌系吉卜力水彩工蚁渲染：主关卡使用俯视爬行形态并随路线转向；藏馆/横幅使用正立 Q 版萌态 */
  GameRenderer.prototype.drawAnt = function (ctx, x, y, angle, colorHex, carryingHex, scale, walkPhase, kind, carrySize, skinId, blockStyle, uprightMode) {
    var skin = skinId || 'classic';
    var walkP = walkPhase || 0;

    if (uprightMode) {
      var upKey = SKIN_ASSET_KEYS[skin] || 'antClassic';
      var flipX = Math.cos(angle || 0) < -0.15 ? -1 : 1;
      var hopY = -Math.abs(Math.sin(walkP)) * 2.1;
      var waddle = Math.sin(walkP) * 0.08 * flipX;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);

      ctx.fillStyle = 'rgba(59, 43, 34, 0.16)';
      ctx.beginPath();
      ctx.ellipse(0, 7.2, 6.2, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (skin === 'glow') {
        ctx.fillStyle = 'rgba(94, 234, 212, 0.32)';
        ctx.beginPath();
        ctx.arc(-flipX * 5, 1, 7.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.translate(0, hopY);
      ctx.rotate(waddle);
      ctx.save();
      ctx.scale(flipX, 1);

      if (!drawLoadedAsset(ctx, upKey, 0, -2.5, null, 22)) {
        ctx.fillStyle = colorHex || '#b46a3e';
        ctx.strokeStyle = '#3b2b22';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, -1, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      if (carryingHex && carryingHex !== '__OMIT__') {
        var upBoxSz = carrySize || 9.2;
        drawThemedBlock(ctx, 3.8, -upBoxSz * 0.5 + 1.5, upBoxSz, carryingHex, blockStyle || 'jelly', true);
      }

      ctx.restore();
      ctx.restore();
      return;
    }

    var crawlKey = CRAWL_ASSET_KEYS[skin] || 'crawlClassic';
    var heading = (angle || 0) + Math.PI * 0.5 + Math.sin(walkP) * 0.085;
    var strideY = Math.sin(walkP * 2) * 0.55;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    /* 柔和地面接触影 */
    ctx.fillStyle = 'rgba(59, 43, 34, 0.13)';
    ctx.beginPath();
    ctx.ellipse(0, 2.0, 6.2, 6.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(heading);

    if (kind === 'rainbow') {
      var trailCols = ['#ff6f91', '#f8cb46', '#67c873', '#6bc0ff'];
      for (var tc = 0; tc < trailCols.length; tc += 1) {
        ctx.globalAlpha = 0.38 - tc * 0.07;
        ctx.fillStyle = trailCols[tc];
        ctx.beginPath();
        ctx.arc(Math.sin(walkP + tc) * 1.4, 11 + tc * 3.1, 2.1 - tc * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (skin === 'glow') {
      ctx.fillStyle = 'rgba(94, 234, 212, 0.34)';
      ctx.beginPath();
      ctx.arc(0, 5.2, 7.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!drawLoadedAsset(ctx, crawlKey, 0, strideY, null, 22.5)) {
      ctx.fillStyle = colorHex || '#b46a3e';
      ctx.strokeStyle = '#3b2b22';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, strideY, 5.2, 7.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    /* 爆破工蚁小炸弹徽标 */
    if (kind === 'bomber') {
      ctx.fillStyle = '#2d221c';
      ctx.strokeStyle = '#ff6b2b';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(-5.6, -1.6 + strideY, 2.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-7.6, -3.4 + Math.sin(walkP * 1.4) * 0.4, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 去程背囊颜料辨识珠 / 返程头前双颚叼运像素块 */
    if (carryingHex && carryingHex !== '__OMIT__') {
      var boxSz = carrySize || 9.0;
      drawThemedBlock(ctx, -boxSz * 0.5, -10.0 - boxSz * 0.68 + strideY, boxSz, carryingHex, blockStyle || 'jelly', true);
    } else if (carryingHex !== '__OMIT__' && colorHex) {
      ctx.fillStyle = 'rgba(255, 252, 246, 0.92)';
      ctx.beginPath();
      ctx.arc(0, 2.2 + strideY, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colorHex;
      ctx.strokeStyle = '#4a3222';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.arc(0, 2.2 + strideY, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(-0.8, 1.4 + strideY, 0.85, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  function drawThemedBlock(ctx, x, y, size, colorObj, styleId, isTiny) {
    var s = Math.max(4, size);
    var colHex = (colorObj && colorObj.hex) ? colorObj.hex : (typeof colorObj === 'string' ? colorObj : '#ff476c');
    var colDark = (colorObj && colorObj.dark) ? colorObj.dark : colHex;
    var colHi = (colorObj && colorObj.hi) ? colorObj.hi : 'rgba(255,255,255,0.6)';
    var st = styleId || 'jelly';

    if (st === 'jelly') {
      var rJ = Math.min(s * 0.34, 6);
      roundRectPath(ctx, x, y, s, s, rJ);
      ctx.fillStyle = colDark;
      ctx.fill();
      roundRectPath(ctx, x, y, s, Math.max(3, s - (isTiny ? 1.3 : 2.3)), rJ);
      ctx.fillStyle = colHex;
      ctx.fill();
      /* 果冻底部柔暖透光反光 + 顶部饱满糖浆高光 */
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      roundRectPath(ctx, x + s * 0.2, y + s * 0.68, s * 0.6, Math.max(1.2, s * 0.14), 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.56)';
      roundRectPath(ctx, x + s * 0.15, y + s * 0.12, s * 0.7, Math.max(1.6, s * 0.22), 2.5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(59, 43, 34, 0.22)';
      ctx.lineWidth = isTiny ? 1.05 : 0.85;
      roundRectPath(ctx, x, y, s, s, rJ);
      ctx.stroke();
    } else if (st === 'bead') {
      var rB = Math.min(s * 0.3, 4.8);
      roundRectPath(ctx, x, y, s, s, rB);
      ctx.fillStyle = colDark;
      ctx.fill();
      roundRectPath(ctx, x + 0.4, y + 0.4, s - 0.8, Math.max(3, s - (isTiny ? 1.4 : 2.4)), rB * 0.9);
      ctx.fillStyle = colHex;
      ctx.fill();
      /* 真实拼豆中央深凹孔洞 + 孔缘高光圈 */
      var holeR = Math.max(1.4, s * 0.2);
      ctx.fillStyle = 'rgba(42, 26, 18, 0.36)';
      ctx.beginPath();
      ctx.arc(x + s * 0.5, y + s * 0.47, holeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = Math.max(0.7, s * 0.06);
      ctx.beginPath();
      ctx.arc(x + s * 0.5, y + s * 0.47, holeR + 0.45, Math.PI * 0.95, Math.PI * 1.9);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(59, 43, 34, 0.26)';
      ctx.lineWidth = isTiny ? 1.05 : 0.85;
      roundRectPath(ctx, x, y, s, s, rB);
      ctx.stroke();
    } else if (st === 'ice') {
      var rI = Math.min(s * 0.2, 3.2);
      roundRectPath(ctx, x, y, s, s, rI);
      ctx.fillStyle = colDark;
      ctx.fill();
      roundRectPath(ctx, x + 0.5, y + 0.5, s - 1, Math.max(3, s - 1.5), rI);
      ctx.fillStyle = colHex;
      ctx.fill();
      /* 晶透对角冰霜切光面 + 细亮冰棱斜纹 */
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.44;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.12, y + s * 0.12);
      ctx.lineTo(x + s * 0.82, y + s * 0.12);
      ctx.lineTo(x + s * 0.12, y + s * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.8, s * 0.07);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.28, y + s * 0.76);
      ctx.lineTo(x + s * 0.76, y + s * 0.28);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.lineWidth = 0.9;
      roundRectPath(ctx, x + 1, y + 1, s - 2, s - 2, Math.max(1, rI - 0.5));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(14, 70, 110, 0.3)';
      ctx.lineWidth = isTiny ? 1.05 : 0.8;
      roundRectPath(ctx, x, y, s, s, rI);
      ctx.stroke();
    } else if (st === 'gem') {
      /* 四向棱面钻石切割：顶最亮、底最深、中心台面 + 十字星芒 */
      ctx.fillStyle = colDark;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = colHi;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s * 0.5, y + s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = colHex;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + s * 0.5, y + s * 0.5);
      ctx.lineTo(x, y + s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(x + s, y);
      ctx.lineTo(x + s, y + s);
      ctx.lineTo(x + s * 0.5, y + s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = colHex;
      ctx.fillRect(x + s * 0.23, y + s * 0.23, s * 0.54, s * 0.54);
      /* 闪亮十字星芒高光 */
      ctx.fillStyle = '#ffffff';
      var gx = x + s * 0.34;
      var gy = y + s * 0.34;
      var gr = Math.max(1.2, s * 0.14);
      ctx.fillRect(gx - gr, gy - 0.55, gr * 2, 1.1);
      ctx.fillRect(gx - 0.55, gy - gr, 1.1, gr * 2);
      ctx.strokeStyle = 'rgba(42, 20, 74, 0.34)';
      ctx.lineWidth = isTiny ? 1.05 : 0.85;
      ctx.strokeRect(x, y, s, s);
    } else if (st === 'choco') {
      /* 模具压块生巧：厚实上左亮斜面 + 下右暗槽 + 中心微凸块 */
      ctx.fillStyle = colDark;
      ctx.fillRect(x, y, s, s);
      var bv = Math.max(1.8, s * 0.18);
      ctx.fillStyle = colHi;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s - bv, y + bv);
      ctx.lineTo(x + bv, y + bv);
      ctx.lineTo(x + bv, y + s - bv);
      ctx.lineTo(x, y + s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = colHex;
      ctx.fillRect(x + bv, y + bv, s - bv * 2, s - bv * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(x + bv + 0.5, y + bv + 0.5, Math.max(1, s - bv * 2 - 1), Math.max(1, s - bv * 2 - 1));
      ctx.strokeStyle = 'rgba(59, 32, 16, 0.42)';
      ctx.lineWidth = isTiny ? 1.05 : 0.85;
      ctx.strokeRect(x, y, s, s);
    } else {
      /* 奶油裱花方糖：顶部厚奶油波浪淋面 + 三色彩虹糖粒 */
      var rS = Math.min(s * 0.24, 4);
      roundRectPath(ctx, x, y, s, s, rS);
      ctx.fillStyle = colDark;
      ctx.fill();
      roundRectPath(ctx, x, y, s, Math.max(3, s - 1.8), rS);
      ctx.fillStyle = colHex;
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 252, 248, 0.84)';
      roundRectPath(ctx, x + s * 0.1, y + s * 0.1, s * 0.8, Math.max(2, s * 0.3), 2);
      ctx.fill();
      var spSz = Math.max(1.3, s * 0.13);
      ctx.fillStyle = '#ff5c8d';
      ctx.fillRect(x + s * 0.2, y + s * 0.54, spSz * 1.3, spSz);
      ctx.fillStyle = '#ffd233';
      ctx.fillRect(x + s * 0.48, y + s * 0.62, spSz * 1.3, spSz);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + s * 0.66, y + s * 0.48, spSz * 1.3, spSz);
      ctx.strokeStyle = 'rgba(130, 36, 68, 0.26)';
      ctx.lineWidth = isTiny ? 1.05 : 0.85;
      roundRectPath(ctx, x, y, s, s, rS);
      ctx.stroke();
    }
  }

  GameRenderer.prototype.drawFlower = function (ctx, x, y, petalColor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(this.time * 2.1 + x * 0.07) * 0.14);
    ctx.fillStyle = petalColor;
    for (var i = 0; i < 5; i += 1) {
      var a = (Math.PI * 2 * i) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 4, Math.sin(a) * 4, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f8cb46';
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  function drawPicnicCorner(ctx, burrowX, sandY, h, isNight, themeId, timeNow) {
    if (burrowX - 42 < 44) return;
    var picX = Math.max(26, Math.floor((burrowX - 42) * 0.46));
    var picY = sandY + Math.floor((h - sandY - 12) * 0.56);
    var t = timeNow || 0;
    var propKey = PROP_ASSET_KEYS[themeId] || 'propCraft';

    ctx.save();
    ctx.translate(picX, picY);

    ctx.fillStyle = isNight ? 'rgba(15, 23, 42, 0.28)' : 'rgba(59, 43, 34, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 15, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isNight && themeId === 'lavender') {
      ctx.fillStyle = 'rgba(233, 213, 255, 0.36)';
      ctx.beginPath();
      ctx.arc(0, -2, 16 + Math.sin(t * 2.8) * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(0, -1);
    ctx.rotate(Math.sin(t * 1.9) * 0.045);
    if (!drawLoadedAsset(ctx, propKey, 0, 0, 34, 34)) {
      ctx.fillStyle = '#fb85a4';
      ctx.strokeStyle = '#3b2b22';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function drawUndergroundStudio(ctx, engine, burrowX, burrowY, sandY, w, h, timeNow) {
    if (w - (burrowX + 42) < 60) return;
    var studioX = Math.min(w - 38, Math.floor((burrowX + 42 + w) * 0.52));
    var sandUsableH = Math.max(36, h - sandY - 14);
    var studioY = sandY + Math.floor(sandUsableH * 0.52);

    /* 虚线地下运画通道（柔暖浅沙点线） */
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 94, 60, 0.28)';
    ctx.lineWidth = 1.5;
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(burrowX + 30, burrowY + 3);
    ctx.quadraticCurveTo((burrowX + studioX) * 0.5, studioY + 9, studioX - 20, studioY + 4);
    ctx.stroke();
    if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
    ctx.restore();

    /* 手绘水彩迷你画架（实时缩略呈现收集像素画，收官金色光环点亮） */
    var isWinCeil = !!engine.isCelebrating;
    var baseFit = Math.min(0.96, Math.max(0.76, sandUsableH / 50));
    var sScale = baseFit * (isWinCeil
      ? (1.07 + Math.sin(timeNow * 14) * 0.03)
      : (1 + (engine.studioPulse || 0) * 0.07));
    ctx.save();
    ctx.translate(studioX, studioY);
    ctx.scale(sScale, sScale);

    ctx.fillStyle = 'rgba(59, 43, 34, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 19, 17, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isWinCeil) {
      ctx.save();
      ctx.globalAlpha = 0.52 + Math.sin(timeNow * 12) * 0.2;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      roundRectPath(ctx, -23, -25, 46, 48, 12);
      ctx.stroke();
      ctx.restore();
    }

    var studioDrawn = drawLoadedAsset(ctx, 'studio', 0, 0, 44, 48);
    if (!studioDrawn) {
      ctx.fillStyle = '#fbf6ea';
      ctx.strokeStyle = '#3b2b22';
      ctx.lineWidth = 1.6;
      roundRectPath(ctx, -18, -18, 36, 36, 8);
      ctx.fill();
      ctx.stroke();
    }

    /* 实时绘制地下收集到的像素画缩略成果（贴合画架内白纸区） */
    if (engine.galleryGrid && engine.rows && engine.cols) {
      var PALETTE = global.AntLevels.PALETTE;
      var boxSz = studioDrawn ? Math.min(studioDrawn.w * 0.5, studioDrawn.h * 0.39) : 24;
      var cPx = boxSz / Math.max(engine.rows, engine.cols);
      var ox = -(cPx * engine.cols) / 2;
      var oy = (studioDrawn ? -studioDrawn.h * 0.078 : 0) - (cPx * engine.rows) / 2;
      for (var r = 0; r < engine.rows; r += 1) {
        for (var c = 0; c < engine.cols; c += 1) {
          var ck = engine.galleryGrid[r][c];
          if (ck && PALETTE[ck]) {
            ctx.fillStyle = PALETTE[ck].hex;
            ctx.fillRect(ox + c * cPx, oy + r * cPx, Math.ceil(cPx), Math.ceil(cPx));
          }
        }
      }
    }

    ctx.restore();
  }

  function drawAntAccessories(ctx, isLeader, showShades, angle) {
    ctx.save();
    ctx.rotate((angle || 0) + Math.PI * 0.5);
    if (showShades) {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 0.7;
      roundRectPath(ctx, -4.1, -7.8, 3.4, 2.2, 0.9);
      ctx.fill();
      ctx.stroke();
      roundRectPath(ctx, 0.7, -7.8, 3.4, 2.2, 0.9);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.7, -6.7);
      ctx.lineTo(0.7, -6.7);
      ctx.stroke();
    }
    if (isLeader) {
      ctx.fillStyle = '#f8cb46';
      ctx.strokeStyle = '#3b2b22';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-3.1, -9.8);
      ctx.lineTo(-3.6, -12.4);
      ctx.lineTo(-1.3, -11.0);
      ctx.lineTo(0, -13.1);
      ctx.lineTo(1.3, -11.0);
      ctx.lineTo(3.6, -12.4);
      ctx.lineTo(3.1, -9.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEcologyCritters(ctx, w, sandY, boardX, boardW, isNight, timeNow) {
    if (isNight) {
      for (var f = 0; f < 5; f += 1) {
        var fx = (0.14 + ((f * 0.21) % 0.76)) * w + Math.sin(timeNow * 0.9 + f * 1.7) * 14;
        var fy = (0.14 + ((f * 0.19) % 0.7)) * sandY + Math.cos(timeNow * 1.1 + f * 2.1) * 10;
        var glow = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(timeNow * 3.4 + f * 1.9));
        ctx.save();
        ctx.globalAlpha = glow * 0.35;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(fx, fy, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#fff9d6';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    var bCols = ['#ffd4e2', '#fff1b8'];
    var leftBaseX = Math.max(9, boardX * 0.48);
    var rightBaseX = Math.min(w - 9, w - (w - boardX - boardW) * 0.48);
    for (var b = 0; b < 2; b += 1) {
      var bx = (b === 0 ? leftBaseX : rightBaseX) + Math.sin(timeNow * 0.85 + b * 2.5) * 3.5;
      var by = (b === 0 ? 0.28 : 0.66) * sandY + Math.cos(timeNow * 1.15 + b * 1.8) * 14;
      var flap = 0.35 + 0.65 * Math.abs(Math.sin(timeNow * 7.5 + b));
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(Math.sin(timeNow * 0.9 + b) * 0.35);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = bCols[b];
      ctx.strokeStyle = '#3b2b22';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(-2.5 * flap, -1.6, 3.4 * flap, 2.3, -0.35, 0, Math.PI * 2);
      ctx.ellipse(-2.5 * flap, 1.6, 3.4 * flap, 2.3, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3b2b22';
      ctx.fillRect(-0.8, -2.5, 1.6, 5);
      ctx.restore();
    }
  }

  function drawScratchWatermark(ctx, motif, cx, cy, span, clearRatio) {
    var alpha = 0.08 + Math.min(1, Math.max(0, clearRatio || 0)) * 0.42;
    var s = Math.max(24, span * 0.45);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#c49a76';
    ctx.fillStyle = 'rgba(244, 144, 179, 0.25)';
    ctx.lineWidth = Math.max(2, s * 0.08);

    if (motif === 'shell') {
      ctx.beginPath();
      ctx.arc(0, s * 0.14, s * 0.72, Math.PI, 0, false);
      ctx.quadraticCurveTo(s * 0.48, s * 0.56, 0, s * 0.62);
      ctx.quadraticCurveTo(-s * 0.48, s * 0.56, -s * 0.72, s * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (var sr = -2; sr <= 2; sr += 1) {
        ctx.beginPath();
        ctx.moveTo(0, s * 0.58);
        ctx.lineTo(sr * s * 0.24, -s * 0.46);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff5d6';
      ctx.beginPath();
      ctx.arc(0, s * 0.24, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (motif === 'wand') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, s * 0.62);
      ctx.lineTo(s * 0.22, -s * 0.22);
      ctx.stroke();
      ctx.fillStyle = 'rgba(253, 224, 71, 0.42)';
      ctx.beginPath();
      for (var wp = 0; wp < 10; wp += 1) {
        var wr = wp % 2 === 0 ? s * 0.42 : s * 0.18;
        var wa = -Math.PI / 2 + (wp * Math.PI) / 5;
        var wx = s * 0.3 + Math.cos(wa) * wr;
        var wy = -s * 0.3 + Math.sin(wa) * wr;
        if (wp === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (motif === 'planet') {
      ctx.fillStyle = 'rgba(111, 195, 223, 0.26)';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.92, s * 0.26, -0.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.65, -s * 0.52, s * 0.12, 0, Math.PI * 2);
      ctx.stroke();
    } else if (motif === 'crown') {
      ctx.fillStyle = 'rgba(248, 203, 70, 0.32)';
      ctx.beginPath();
      ctx.moveTo(-s * 0.68, s * 0.38);
      ctx.lineTo(-s * 0.78, -s * 0.36);
      ctx.lineTo(-s * 0.32, 0.02);
      ctx.lineTo(0, -s * 0.56);
      ctx.lineTo(s * 0.32, 0.02);
      ctx.lineTo(s * 0.78, -s * 0.36);
      ctx.lineTo(s * 0.68, s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (motif === 'teacup') {
      ctx.fillStyle = 'rgba(134, 199, 102, 0.24)';
      ctx.beginPath();
      ctx.moveTo(-s * 0.56, -s * 0.08);
      ctx.lineTo(s * 0.44, -s * 0.08);
      ctx.quadraticCurveTo(s * 0.38, s * 0.56, -s * 0.06, s * 0.56);
      ctx.quadraticCurveTo(-s * 0.5, s * 0.56, -s * 0.56, -s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.48, s * 0.16, s * 0.22, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.26, -s * 0.28);
      ctx.quadraticCurveTo(-s * 0.38, -s * 0.48, -s * 0.22, -s * 0.66);
      ctx.moveTo(s * 0.12, -s * 0.28);
      ctx.quadraticCurveTo(0, -s * 0.48, s * 0.16, -s * 0.66);
      ctx.stroke();
    } else if (motif === 'pan') {
      ctx.fillStyle = 'rgba(244, 140, 46, 0.22)';
      ctx.beginPath();
      ctx.arc(-s * 0.16, 0, s * 0.54, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.36, s * 0.14);
      ctx.lineTo(s * 0.88, s * 0.46);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 214, 92, 0.45)';
      ctx.beginPath();
      ctx.arc(-s * 0.16, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (var pt = 0; pt < 6; pt += 1) {
        var pa = (Math.PI * 2 * pt) / 6;
        ctx.beginPath();
        ctx.ellipse(Math.cos(pa) * s * 0.42, Math.sin(pa) * s * 0.42, s * 0.32, s * 0.2, pa, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(248, 203, 70, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWaxSeal(ctx, cx, cy, tNorm) {
    var t = Math.max(0.01, Math.min(1, tNorm || 0));
    var slam = t < 0.65 ? (1.6 - 0.68 * (t / 0.65)) : (0.92 + 0.08 * ((t - 0.65) / 0.35));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(slam, slam);
    ctx.rotate(-0.18);
    ctx.globalAlpha = Math.min(1, t * 1.6);

    ctx.fillStyle = '#cf3b4c';
    ctx.strokeStyle = '#6e1b26';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (var i = 0; i < 16; i += 1) {
      var ang = (Math.PI * 2 * i) / 16;
      var r = (i % 2 === 0) ? 21 : 18.2;
      var vx = Math.cos(ang) * r;
      var vy = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#fce09b';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff5d6';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('已入画', 0, 0.5);
    ctx.restore();
  }

  function drawThemeAmbientParticles(ctx, w, sandY, themeId, isNight, timeNow) {
    ctx.save();
    if (themeId === 'candy') {
      var bubbleCols = ['rgba(255, 168, 214, 0.55)', 'rgba(137, 232, 255, 0.55)', 'rgba(253, 224, 71, 0.5)'];
      for (var c = 0; c < 8; c += 1) {
        var bx = ((c * 59 + 24) % Math.max(80, w - 30)) + Math.sin(timeNow * 1.1 + c) * 9;
        var by = sandY - 12 - ((timeNow * (14 + c * 2) + c * 37) % Math.max(60, sandY - 20));
        var br = 3.2 + (c % 3) * 1.6;
        ctx.fillStyle = bubbleCols[c % bubbleCols.length];
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.beginPath();
        ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === 'lavender' && !isNight) {
      for (var lv = 0; lv < 9; lv += 1) {
        var lvx = ((lv * 63 + 22) % Math.max(80, w - 24)) + Math.sin(timeNow * 0.9 + lv) * 9;
        var lvy = ((timeNow * (12 + (lv % 3) * 3) + lv * 37) % Math.max(60, sandY - 12));
        ctx.globalAlpha = 0.52 + 0.35 * Math.sin(timeNow * 2.5 + lv);
        ctx.fillStyle = lv % 2 === 0 ? '#e9d5ff' : '#fef08a';
        ctx.beginPath();
        ctx.arc(lvx, lvy, 2.3 + (lv % 2) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === 'caramel' && !isNight) {
      for (var cm = 0; cm < 8; cm += 1) {
        var cmx = ((cm * 69 + 16) % Math.max(80, w - 24)) + Math.sin(timeNow * 0.8 + cm) * 8;
        var cmy = sandY - 10 - ((timeNow * (11 + cm * 2) + cm * 41) % Math.max(60, sandY - 16));
        ctx.globalAlpha = 0.58;
        ctx.fillStyle = cm % 2 === 0 ? '#fde68a' : '#fff8ed';
        ctx.beginPath();
        ctx.arc(cmx, cmy, 2.5 + (cm % 2) * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === 'ribbon' && !isNight) {
      for (var rb = 0; rb < 7; rb += 1) {
        var rbx = (w * ((rb * 0.16 + timeNow * 0.04) % 1.06)) - 6;
        var rby = ((timeNow * (14 + (rb % 3) * 3) + rb * 43) % Math.max(60, sandY - 10));
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = rb % 2 === 0 ? '#fb7185' : '#fecdd3';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('♥', rbx, rby);
      }
    } else if (themeId === 'soda' && !isNight) {
      var sodaCols = ['rgba(255, 255, 255, 0.78)', 'rgba(125, 211, 252, 0.65)', 'rgba(253, 224, 71, 0.6)'];
      for (var s = 0; s < 9; s += 1) {
        var sx = ((s * 61 + 18) % Math.max(80, w - 24)) + Math.sin(timeNow * 1.3 + s) * 7;
        var sy = sandY - 10 - ((timeNow * (18 + s * 2) + s * 31) % Math.max(60, sandY - 18));
        var sr = 2.6 + (s % 3) * 1.4;
        ctx.fillStyle = sodaCols[s % sodaCols.length];
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (isNight) {
      for (var m = 0; m < 9; m += 1) {
        var mx = ((m * 67 + 19) % Math.max(80, w - 24)) + Math.sin(timeNow * 0.7 + m * 1.5) * 11;
        var my = 18 + ((m * 43 + timeNow * 8) % Math.max(50, sandY - 26));
        var pulse = 0.28 + 0.5 * (0.5 + 0.5 * Math.sin(timeNow * 2.6 + m));
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(mx, my, 2.2 + (m % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (var p = 0; p < 7; p += 1) {
        var px = (w * ((p * 0.17 + timeNow * 0.045) % 1.08)) - 8;
        var py = ((timeNow * (15 + (p % 3) * 4) + p * 39) % Math.max(60, sandY - 8));
        ctx.globalAlpha = 0.62;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(timeNow * 1.4 + p);
        ctx.fillStyle = p % 2 === 0 ? '#ffc7dc' : '#fff0f6';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.6, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  GameRenderer.prototype.render = function (engine, dt) {
    if (!this.ctx || !engine.config) return;
    this.time += dt;
    this.walkTime += dt * 0.65 * (engine.speedMultiplier || 1);
    var ctx = this.ctx;
    var w = this.width;
    var h = this.height;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    if (this.shakeEnabled && engine.shakePower > 0.05) {
      var sxOff = (Math.random() - 0.5) * engine.shakePower * 2;
      var syOff = (Math.random() - 0.5) * engine.shakePower * 2;
      ctx.translate(sxOff, syOff);
    }

    /* 2D 动态主题舞台天空 + 紧凑浅沙蚁丘 */
    var isNight = !!(engine.config && engine.config.nightTheme);
    var themeId = this.themeId || 'candy';
    var sandH = Math.max(58, Math.min(68, Math.floor(h * 0.18)));
    var sandY = h - sandH;

    var skyTop = '#d2f0bc';
    var skyBot = '#a8dd91';
    var stripColor = '#97cf80';
    var sandCol = '#edd2a3';
    var frameFill = '#d39a58';
    var frameStroke = '#3b2b22';
    var paperFill = '#fbf6ea';

    if (themeId === 'candy') {
      skyTop = isNight ? '#3c2b66' : '#ffdced';
      skyBot = isNight ? '#2a1e4d' : '#c9f1ff';
      stripColor = isNight ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.32)';
      sandCol = isNight ? '#6e527c' : '#ffe5c4';
      frameFill = '#ff8ec6';
      frameStroke = '#882458';
      paperFill = '#fffafd';
    } else if (themeId === 'soda') {
      skyTop = isNight ? '#1e3a5f' : '#bae6fd';
      skyBot = isNight ? '#2c5385' : '#e6f7ff';
      stripColor = isNight ? 'rgba(125, 211, 252, 0.16)' : 'rgba(255, 255, 255, 0.45)';
      sandCol = isNight ? '#5f677d' : '#f7e2b8';
      frameFill = '#67c3f3';
      frameStroke = '#16527d';
      paperFill = '#fcfdff';
    } else if (themeId === 'lavender') {
      skyTop = isNight ? '#2e1b5b' : '#ede0ff';
      skyBot = isNight ? '#3b2470' : '#dbeafe';
      stripColor = isNight ? 'rgba(216, 180, 254, 0.18)' : 'rgba(255, 255, 255, 0.38)';
      sandCol = isNight ? '#56437a' : '#efe2ff';
      frameFill = '#b794f6';
      frameStroke = '#5b21b6';
      paperFill = '#fcf9ff';
    } else if (themeId === 'caramel') {
      skyTop = isNight ? '#3a2417' : '#fae8d4';
      skyBot = isNight ? '#4f3120' : '#f3d4b0';
      stripColor = isNight ? 'rgba(251, 191, 36, 0.14)' : 'rgba(255, 250, 240, 0.4)';
      sandCol = isNight ? '#694b37' : '#e9c69f';
      frameFill = '#d4955e';
      frameStroke = '#6e3717';
      paperFill = '#fffaf0';
    } else if (themeId === 'ribbon') {
      skyTop = isNight ? '#4a1d34' : '#ffe3ea';
      skyBot = isNight ? '#612543' : '#ffd1dc';
      stripColor = isNight ? 'rgba(253, 164, 175, 0.18)' : 'rgba(255, 255, 255, 0.42)';
      sandCol = isNight ? '#754158' : '#ffe9d6';
      frameFill = '#fb85a4';
      frameStroke = '#9f1239';
      paperFill = '#fff8fa';
    } else if (isNight) {
      skyTop = '#1f2b4d';
      skyBot = '#2b3d6b';
      stripColor = '#34477a';
      sandCol = '#7d6658';
    }

    var skyGrad = ctx.createLinearGradient(0, 0, 0, sandY);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, sandY);

    ctx.fillStyle = stripColor;
    ctx.fillRect(0, Math.floor(sandY * 0.35), w, 26);
    ctx.fillRect(0, Math.floor(sandY * 0.72), w, 20);

    var flowerPts = [
      { x: 22, y: 26, color: themeId === 'candy' ? '#ff9ecd' : (themeId === 'soda' ? '#fef08a' : '#ffffff') },
      { x: w - 24, y: 34, color: '#fff1b8' },
      { x: 26, y: sandY - 22, color: themeId === 'soda' ? '#a5f3fc' : '#ffd4e2' },
      { x: w - 28, y: sandY - 18, color: themeId === 'candy' ? '#a5f3fc' : '#ffffff' }
    ];
    this.hitRegions.flowers = [];

    if (isNight) {
      ctx.fillStyle = '#ffe58f';
      for (var st = 0; st < 12; st += 1) {
        var sx = ((st * 73 + 19) % Math.max(60, w - 20)) + 10;
        var sy = ((st * 41 + 11) % Math.max(40, sandY - 30)) + 12;
        ctx.beginPath();
        ctx.arc(sx, sy, st % 2 === 0 ? 2 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (var fli = 0; fli < flowerPts.length; fli += 1) {
        var fp = flowerPts[fli];
        this.drawFlower(ctx, fp.x, fp.y, fp.color);
        this.hitRegions.flowers.push(fp);
      }
    }

    /* 浅沙坡地 */
    ctx.fillStyle = sandCol;
    ctx.fillRect(0, sandY, w, h - sandY);
    ctx.strokeStyle = frameStroke;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, sandY);
    ctx.lineTo(w, sandY);
    ctx.stroke();

    /* 2D 画板几何参数（精准扣除画框+投影边距，确保画框底边与沙地分割线始终有清晰呼吸间距） */
    var woodPad = 9;
    var paperPad = 6;
    var totalPad = woodPad + paperPad;
    var maxBoardH = sandY - 22;
    var maxBoardW = w - 26;
    var cellSize = Math.floor(Math.min((maxBoardW - totalPad * 2) / engine.cols, (maxBoardH - totalPad * 2) / engine.rows));
    cellSize = Math.max(8, Math.min(28, cellSize));
    var gridW = cellSize * engine.cols;
    var gridH = cellSize * engine.rows;

    var boardW = gridW + totalPad * 2;
    var boardH = gridH + totalPad * 2;
    var boardX = Math.floor((w - boardW) / 2);
    var boardY = Math.max(8, Math.floor((sandY - 8 - boardH) / 2));

    var paperX = boardX + woodPad;
    var paperY = boardY + woodPad;
    var paperW = gridW + paperPad * 2;
    var paperH = gridH + paperPad * 2;
    var gridX = paperX + paperPad;
    var gridY = paperY + paperPad;

    var burrowX = Math.floor(w / 2);
    var burrowY = Math.min(h - 24, sandY + Math.floor((h - sandY - 12) * 0.48));
    this.hitRegions.mushroom = (burrowX - 42 >= 44)
      ? { x: Math.max(26, Math.floor((burrowX - 42) * 0.46)), y: sandY + Math.floor((h - sandY - 12) * 0.56) }
      : null;
    this.hitRegions.studio = (w - (burrowX + 42) >= 60)
      ? { x: Math.min(w - 38, Math.floor((burrowX + 42 + w) * 0.52)), y: sandY + Math.floor((h - sandY - 14) * 0.52) }
      : null;

    /* 画板投影 + 主题材质画框（狂热状态炫彩霓虹呼吸环） */
    if (engine.feverActive) {
      ctx.save();
      var fvCols = ['#ff6fa5', '#fbbf24', '#34d399', '#38bdf8', '#c084fc'];
      ctx.globalAlpha = 0.56 + Math.sin(this.time * 10) * 0.2;
      ctx.strokeStyle = fvCols[Math.floor(this.time * 7) % fvCols.length];
      ctx.lineWidth = 7;
      roundRectPath(ctx, boardX - 3, boardY - 3, boardW + 6, boardH + 6, 17);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = isNight ? 'rgba(15, 10, 28, 0.45)' : 'rgba(74, 34, 86, 0.16)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = frameFill;
    roundRectPath(ctx, boardX, boardY, boardW, boardH, 14);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = frameStroke;
    ctx.lineWidth = 2.2;
    roundRectPath(ctx, boardX, boardY, boardW, boardH, 14);
    ctx.stroke();

    /* 奶油手账画纸与四角铜钉 */
    ctx.fillStyle = paperFill;
    ctx.strokeStyle = frameStroke;
    ctx.lineWidth = 1.8;
    roundRectPath(ctx, paperX, paperY, paperW, paperH, 8);
    ctx.fill();
    ctx.stroke();

    /* 刮刮乐隐藏底画水彩水印：随着方块搬空逐渐清晰 */
    var clearRatio = engine.totalCarries > 0 ? Math.min(1, engine.doneCarries / engine.totalCarries) : 0;
    drawScratchWatermark(
      ctx,
      (engine.config && engine.config.scratchMotif) || 'flower',
      gridX + gridW / 2,
      gridY + gridH / 2,
      Math.min(gridW, gridH) * 0.62,
      clearRatio
    );

    ctx.fillStyle = '#f8cb46';
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 1;
    var pins = [
      [paperX + 4, paperY + 4],
      [paperX + paperW - 4, paperY + 4],
      [paperX + 4, paperY + paperH - 4],
      [paperX + paperW - 4, paperY + paperH - 4]
    ];
    for (var pn = 0; pn < pins.length; pn += 1) {
      ctx.beginPath();
      ctx.arc(pins[pn][0], pins[pn][1], 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    /* 淡格子底纹 */
    ctx.strokeStyle = '#ede2ca';
    ctx.lineWidth = 1;
    for (var r = 0; r <= engine.rows; r += 1) {
      ctx.beginPath();
      ctx.moveTo(gridX, gridY + r * cellSize);
      ctx.lineTo(gridX + gridW, gridY + r * cellSize);
      ctx.stroke();
    }
    for (var c = 0; c <= engine.cols; c += 1) {
      ctx.beginPath();
      ctx.moveTo(gridX + c * cellSize, gridY);
      ctx.lineTo(gridX + c * cellSize, gridY + gridH);
      ctx.stroke();
    }

    /* 绘制 2D 像素方块（不加外露作弊亮框，保持自然 2D 立体厚边） */
    var PALETTE = global.AntLevels.PALETTE;
    for (var rr = 0; rr < engine.rows; rr += 1) {
      for (var cc = 0; cc < engine.cols; cc += 1) {
        var cell = engine.grid[rr][cc];
        if (!cell) continue;
        var pColor = PALETTE[cell.color] || { hex: '#ccc', dark: '#999' };
        var tx = gridX + cc * cellSize + 0.5;
        var ty = gridY + rr * cellSize + 0.5;
        var ts = cellSize - 1;

        /* 礼物包装纸（隐藏真实底色，邻格清空后拆开） */
        if (cell.wrapped) {
          ctx.fillStyle = '#ffd6e5';
          ctx.fillRect(tx, ty, ts, ts);
          ctx.fillStyle = '#e85b88';
          ctx.fillRect(tx + ts * 0.4, ty, ts * 0.2, ts);
          ctx.fillRect(tx, ty + ts * 0.4, ts, ts * 0.2);
          ctx.strokeStyle = '#3b2b22';
          ctx.lineWidth = 1;
          ctx.strokeRect(tx, ty, ts, ts);
          continue;
        }

        drawThemedBlock(ctx, tx, ty, ts, pColor, this.blockStyle || 'jelly', false);

        if (cell.layers >= 2) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(tx + 2, ty + 2, ts - 4, ts - 4);
          ctx.fillStyle = '#3b2b22';
          ctx.fillRect(tx + ts - 8.5, ty + 1, 7.5, 7.5);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold ' + Math.max(7, Math.floor(cellSize * 0.42)) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('2', tx + ts - 4.7, ty + 5);
        }

        if (cell.mud) {
          ctx.fillStyle = 'rgba(116, 78, 49, 0.84)';
          ctx.fillRect(tx, ty, ts, ts);
          ctx.strokeStyle = '#3b2b22';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(tx + 2.5, ty + 2.5);
          ctx.lineTo(tx + ts - 2.5, ty + ts - 2.5);
          ctx.moveTo(tx + ts - 2.5, ty + 2.5);
          ctx.lineTo(tx + 2.5, ty + ts - 2.5);
          ctx.stroke();
        }

        /* 金钥匙标记 */
        if (cell.key) {
          ctx.fillStyle = '#fff3b0';
          ctx.strokeStyle = '#3b2b22';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(tx + ts * 0.5, ty + ts * 0.5, Math.max(4, ts * 0.34), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#b45309';
          ctx.font = 'bold ' + Math.max(8, Math.floor(cellSize * 0.52)) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('K', tx + ts * 0.5, ty + ts * 0.53);
        }

        /* 金锁封印标记 */
        if (cell.locked) {
          ctx.fillStyle = 'rgba(40, 28, 18, 0.58)';
          ctx.fillRect(tx, ty, ts, ts);
          ctx.fillStyle = '#f8cb46';
          ctx.strokeStyle = '#3b2b22';
          ctx.lineWidth = 1.1;
          var lx = tx + ts * 0.28;
          var ly = ty + ts * 0.42;
          var lw = ts * 0.44;
          var lh = ts * 0.38;
          ctx.fillRect(lx, ly, lw, lh);
          ctx.strokeRect(lx, ly, lw, lh);
          ctx.beginPath();
          ctx.arc(tx + ts * 0.5, ly, ts * 0.14, Math.PI, 0);
          ctx.stroke();
        } else if (cell.special === 'bolt') {
          ctx.fillStyle = '#0ea5e9';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(tx + ts * 0.5, ty + ts * 0.5, Math.max(4, ts * 0.36), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.moveTo(tx + ts * 0.56, ty + ts * 0.22);
          ctx.lineTo(tx + ts * 0.34, ty + ts * 0.53);
          ctx.lineTo(tx + ts * 0.51, ty + ts * 0.53);
          ctx.lineTo(tx + ts * 0.43, ty + ts * 0.78);
          ctx.lineTo(tx + ts * 0.67, ty + ts * 0.46);
          ctx.lineTo(tx + ts * 0.50, ty + ts * 0.46);
          ctx.closePath();
          ctx.fill();
        } else if (cell.special === 'honey') {
          ctx.fillStyle = '#fffbeb';
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(tx + ts * 0.5, ty + ts * 0.5, Math.max(4, ts * 0.36), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(tx + ts * 0.5, ty + ts * 0.23);
          ctx.quadraticCurveTo(tx + ts * 0.72, ty + ts * 0.58, tx + ts * 0.5, ty + ts * 0.75);
          ctx.quadraticCurveTo(tx + ts * 0.28, ty + ts * 0.58, tx + ts * 0.5, ty + ts * 0.23);
          ctx.fill();
        }
      }
    }

    /* 通关收尾：主画板保持已搬空干净 + 金色清光扫掠 + 烫金火漆盖章，呼应画已入地下小画室 */
    if (engine.isCelebrating) {
      var shineT = engine.winDelayTimer / 0.68;
      if (shineT > 0 && shineT < 1) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(paperX, paperY, paperW, paperH);
        ctx.clip();
        var sx = paperX - paperW * 0.35 + shineT * (paperW * 1.7);
        ctx.globalAlpha = 0.45 * (1 - Math.abs(shineT - 0.5));
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(sx, paperY);
        ctx.lineTo(sx + 34, paperY);
        ctx.lineTo(sx - 24, paperY + paperH);
        ctx.lineTo(sx - 58, paperY + paperH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      drawWaxSeal(ctx, paperX + paperW - 34, paperY + paperH - 34, Math.min(1, engine.winDelayTimer / 0.36));
    }

    /* 整块被蚂蚁夹起拿走后的高光闪白 + 弹性缩影过渡 */
    if (engine.popEffects && engine.popEffects.length > 0) {
      for (var pe = 0; pe < engine.popEffects.length; pe += 1) {
        var pop = engine.popEffects[pe];
        var pLife = Math.max(0, pop.life);
        var pScale = 0.6 + pLife * 0.52;
        var ps = (cellSize - 1) * pScale;
        var px = gridX + (pop.c + 0.5) * cellSize - ps / 2;
        var py = gridY + (pop.r + 0.5) * cellSize - ps / 2 - (1 - pLife) * 4.5;
        ctx.globalAlpha = pLife * 0.48;
        ctx.fillStyle = pLife > 0.6 ? '#ffffff' : (pop.colorHex || '#ffffff');
        ctx.fillRect(px, py, ps, ps);
        ctx.globalAlpha = pLife * 0.65;
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(px, py, ps, ps);
      }
      ctx.globalAlpha = 1;
    }

    /* ⚡ 十字电弧光束与 🍯 甜蜜花蜜扩散圈 */
    if (engine.lightningArcs && engine.lightningArcs.length > 0) {
      for (var la = 0; la < engine.lightningArcs.length; la += 1) {
        var arc = engine.lightningArcs[la];
        var aLife = Math.max(0, arc.life);
        var axBeam = gridX + (arc.c + 0.5) * cellSize;
        var ayBeam = gridY + (arc.r + 0.5) * cellSize;
        ctx.save();
        ctx.globalAlpha = aLife * 0.85;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(3, cellSize * 0.38) * aLife;
        ctx.beginPath();
        ctx.moveTo(gridX, ayBeam);
        ctx.lineTo(gridX + gridW, ayBeam);
        ctx.moveTo(axBeam, gridY);
        ctx.lineTo(axBeam, gridY + gridH);
        ctx.stroke();
        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = Math.max(1.5, cellSize * 0.14) * aLife;
        ctx.stroke();
        ctx.restore();
      }
    }
    if (engine.honeySplashes && engine.honeySplashes.length > 0) {
      for (var hs = 0; hs < engine.honeySplashes.length; hs += 1) {
        var hObj = engine.honeySplashes[hs];
        var hLife = Math.max(0, hObj.life);
        var hx = gridX + (hObj.c + 0.5) * cellSize;
        var hy = gridY + (hObj.r + 0.5) * cellSize;
        var hr = (0.5 + (1 - hLife) * hObj.maxRadius) * cellSize;
        ctx.save();
        ctx.globalAlpha = hLife * 0.34;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = hLife * 0.85;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }

    /* 炸弹 3x3 冲击波 / 金钥匙全屏解锁光环 */
    if (engine.shockwaves && engine.shockwaves.length > 0) {
      for (var sw = 0; sw < engine.shockwaves.length; sw += 1) {
        var wave = engine.shockwaves[sw];
        var wLife = Math.max(0, wave.life);
        var wr = (0.35 + (1 - wLife) * wave.maxRadius) * cellSize;
        var wx = gridX + (wave.c + 0.5) * cellSize;
        var wy = gridY + (wave.r + 0.5) * cellSize;
        ctx.globalAlpha = wLife * 0.72;
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 3.2 * wLife + 1;
        ctx.beginPath();
        ctx.arc(wx, wy, wr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    /* 左侧主题专属小景 + 右侧地下小画室 */
    drawPicnicCorner(ctx, burrowX, sandY, h, isNight, themeId, this.time);
    drawUndergroundStudio(ctx, engine, burrowX, burrowY, sandY, w, h, this.time);

    /* 斜俯视水彩小蚁丘（柔和沙地底影融入地面，工蚁从拱形洞门自然爬出与爬回） */
    var bScale = 1 + (engine.burrowPulse || 0) * 0.07;
    ctx.save();
    ctx.translate(burrowX, burrowY - 6);
    ctx.scale(bScale, bScale);
    ctx.fillStyle = 'rgba(110, 72, 38, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 19, 40, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!drawLoadedAsset(ctx, 'burrow', 0, 0, 88, 62)) {
      ctx.fillStyle = '#d7ac72';
      ctx.strokeStyle = '#3b2b22';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 4, 36, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#241811';
      ctx.beginPath();
      ctx.ellipse(0, 3, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    /* 预先计算每只蚂蚁的轨迹、进出洞缩放与层级 */
    var antScale = engine.cols >= 24 ? 0.84 : (engine.cols >= 18 ? 0.92 : 1.0);
    var carryBaseSz = Math.min(13.2, Math.max(6.8, cellSize * 0.72));
    var cacheKey = gridX + ',' + gridY + ',' + cellSize + ',' + burrowX + ',' + burrowY;
    var angleBlend = Math.min(1, dt * 18);
    var showShades = !!(engine.feverActive || engine.combo >= 25);

    var tunnelAntDraws = [];
    var fieldAntDraws = [];

    for (var a = 0; a < engine.activeAnts.length; a += 1) {
      var ant = engine.activeAnts[a];
      var t = ant.phase === 'to_target' ? ant.progress : (1 - ant.progress);

      if (ant.cachedKey !== cacheKey || !ant.cachedPts) {
        var holeOffX = Math.max(-6, Math.min(6, (ant.burrowOffsetX || 0) * 0.45));
        var holeX = burrowX - 7 + holeOffX;
        var holeY = burrowY + 6;
        var lipX = burrowX - 5 + holeOffX * 0.8;
        var lipY = burrowY - 6;
        var pts = [
          { x: holeX, y: holeY },
          { x: lipX, y: lipY }
        ];
        var gPath = ant.gridPath || [{ r: engine.rows + 0.5, c: ant.c }, { r: ant.r, c: ant.c }];
        for (var gp = 0; gp < gPath.length; gp += 1) {
          pts.push({
            x: gridX + (gPath[gp].c + 0.5) * cellSize + (gp === 0 ? ant.curveOffset : 0),
            y: gridY + (gPath[gp].r + 0.5) * cellSize
          });
        }
        var segLens = [];
        var totalLen = 0;
        for (var s = 0; s < pts.length - 1; s += 1) {
          var sdx = pts[s + 1].x - pts[s].x;
          var sdy = pts[s + 1].y - pts[s].y;
          var sl = Math.sqrt(sdx * sdx + sdy * sdy);
          segLens.push(sl);
          totalLen += sl;
        }
        ant.cachedKey = cacheKey;
        ant.cachedPts = pts;
        ant.cachedSegLens = segLens;
        ant.cachedTotalLen = totalLen;
      }

      var cPts = ant.cachedPts;
      var cLens = ant.cachedSegLens;
      var cTotal = ant.cachedTotalLen;
      var targetDist = Math.max(0, Math.min(cTotal, t * cTotal));
      var acc = 0;
      var ax = cPts[0].x;
      var ay = cPts[0].y;
      var targetAngle = -Math.PI / 2;
      for (var s2 = 0; s2 < cLens.length; s2 += 1) {
        var len = cLens[s2];
        if (acc + len >= targetDist || s2 === cLens.length - 1) {
          var localT = len > 0.001 ? (targetDist - acc) / len : 0;
          ax = cPts[s2].x + (cPts[s2 + 1].x - cPts[s2].x) * localT;
          ay = cPts[s2].y + (cPts[s2 + 1].y - cPts[s2].y) * localT;
          targetAngle = Math.atan2(cPts[s2 + 1].y - cPts[s2].y, cPts[s2 + 1].x - cPts[s2].x);
          break;
        }
        acc += len;
      }
      if (ant.phase === 'returning') targetAngle += Math.PI;
      if (ant.renderAngle === null || ant.renderAngle === undefined) {
        ant.renderAngle = targetAngle;
      } else {
        ant.renderAngle = lerpAngle(ant.renderAngle, targetAngle, angleBlend);
      }
      var angle = ant.renderAngle;

      /* 洞口段真实进出洞过渡 */
      var enterLen = Math.max(18, (cLens[0] || 16) + 2);
      var diveK = Math.max(0, Math.min(1, targetDist / enterLen));
      var depthScale = antScale * (0.36 + 0.64 * diveK);
      var depthAlpha = Math.min(1, Math.pow(diveK, 0.72) * 1.25);

      var antColorHex = ant.kind === 'rainbow'
        ? '#f472b6'
        : ((PALETTE[ant.color] && PALETTE[ant.color].ant) || '#56b2d1');
      var carryColObj = ant.phase === 'returning'
        ? (PALETTE[ant.color] || { hex: '#ffffff', hi: '#ffffff', dark: '#d6c8ab' })
        : null;

      var sway = Math.sin(this.walkTime * 9 + a * 1.7) * 0.72 * diveK;
      ax += -Math.sin(angle) * sway;
      ay += Math.cos(angle) * sway;

      if (diveK > 0.85 && this.trailDots.length < 55 && Math.random() < dt * 7.5) {
        var rainbowTrail = ['#f472b6', '#fbbf24', '#34d399', '#60a5fa'];
        var dotCol = (engine.combo >= 15 || engine.feverActive)
          ? rainbowTrail[(a + Math.floor(this.time * 12)) % rainbowTrail.length]
          : antColorHex;
        this.trailDots.push({ x: ax, y: ay, color: dotCol, life: 1 });
      }

      var carryBlockSz = carryBaseSz;
      if (carryColObj && ant.progress < 0.14) {
        var popK = ant.progress / 0.14;
        carryBlockSz *= (1.22 - popK * 0.22);
      }

      var drawItem = {
        ax: ax,
        ay: ay,
        angle: angle,
        walkPhase: this.walkTime * 11 + a * 1.3,
        scale: depthScale,
        alpha: depthAlpha,
        colorHex: antColorHex,
        kind: ant.kind,
        isLeader: !!ant.isLeader && this.skinId !== 'royal',
        isFeverNormal: !!(engine.feverActive && ant.kind !== 'rainbow'),
        carryHex: carryColObj,
        carrySz: carryBlockSz
      };
      if (diveK < 0.92) tunnelAntDraws.push(drawItem);
      else fieldAntDraws.push(drawItem);
    }

    var selfRenderer = this;
    function renderAntItem(item) {
      ctx.save();
      ctx.globalAlpha = item.alpha;
      if (item.isFeverNormal) {
        ctx.fillStyle = 'rgba(253, 224, 71, 0.52)';
        ctx.beginPath();
        ctx.arc(item.ax, item.ay + 6, 6.2 * item.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      selfRenderer.drawAnt(
        ctx,
        item.ax,
        item.ay,
        item.angle,
        item.colorHex,
        item.carryHex,
        item.scale,
        item.walkPhase,
        item.kind,
        item.carrySz / item.scale,
        selfRenderer.skinId,
        selfRenderer.blockStyle
      );
      if (item.isLeader || showShades) {
        ctx.save();
        ctx.translate(item.ax, item.ay);
        ctx.scale(item.scale, item.scale);
        drawAntAccessories(ctx, item.isLeader, showShades, item.angle);
        ctx.restore();
      }
      ctx.restore();
    }

    /* 1) 先画刚钻出/正钻入洞口的蚂蚁与叼着的画块 */
    for (var ta = 0; ta < tunnelAntDraws.length; ta += 1) {
      renderAntItem(tunnelAntDraws[ta]);
    }

    /* 3) 搬回洞口时的“咕噜”吸纳波纹 */
    if (engine.ripples && engine.ripples.length > 0) {
      for (var rp = 0; rp < engine.ripples.length; rp += 1) {
        var rip = engine.ripples[rp];
        var rl = Math.max(0, rip.life);
        var grow = 1 - rl;
        ctx.globalAlpha = rl * 0.75;
        ctx.strokeStyle = rip.colorHex;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(burrowX, burrowY + 1, 22 + grow * 26, 9 + grow * 11, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    /* 5) 蚁群信息素足迹渐隐虚点 */
    for (var td = selfRenderer.trailDots.length - 1; td >= 0; td -= 1) {
      var dot = selfRenderer.trailDots[td];
      dot.life -= dt * 1.45;
      if (dot.life <= 0) {
        selfRenderer.trailDots.splice(td, 1);
        continue;
      }
      ctx.globalAlpha = dot.life * 0.42;
      ctx.fillStyle = dot.color;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* 6) 最后绘制地面行军中的大部队 */
    for (var fa = 0; fa < fieldAntDraws.length; fa += 1) {
      renderAntItem(fieldAntDraws[fa]);
    }

    /* 材质联动碎屑粒子（果冻滴 / 拼豆环 / 冰晶菱 / 宝石星芒 / 可可块 / 彩虹糖针） */
    var pStyle = this.blockStyle || 'jelly';
    for (var p = 0; p < engine.particles.length; p += 1) {
      var pt = engine.particles[p];
      var ppx = gridX + (pt.c + 0.5) * cellSize + pt.vx * (1 - pt.life);
      var ppy = gridY + (pt.r + 0.5) * cellSize + pt.vy * (1 - pt.life);
      var psz = pt.size;
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      if (pStyle === 'jelly') {
        ctx.beginPath();
        ctx.arc(ppx, ppy, psz * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.beginPath();
        ctx.arc(ppx - psz * 0.2, ppy - psz * 0.2, psz * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (pStyle === 'bead') {
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = Math.max(1.2, psz * 0.36);
        ctx.beginPath();
        ctx.arc(ppx, ppy, psz * 0.58, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pStyle === 'ice') {
        var ir = psz * 0.72;
        ctx.beginPath();
        ctx.moveTo(ppx, ppy - ir);
        ctx.lineTo(ppx + ir * 0.65, ppy);
        ctx.lineTo(ppx, ppy + ir);
        ctx.lineTo(ppx - ir * 0.65, ppy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      } else if (pStyle === 'gem') {
        var gr2 = psz * 0.85;
        ctx.fillRect(ppx - gr2, ppy - 0.8, gr2 * 2, 1.6);
        ctx.fillRect(ppx - 0.8, ppy - gr2, 1.6, gr2 * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ppx - 0.7, ppy - 0.7, 1.4, 1.4);
      } else if (pStyle === 'sugar') {
        ctx.save();
        ctx.translate(ppx, ppy);
        ctx.rotate(pt.vx * 0.08 + p);
        roundRectPath(ctx, -psz * 0.75, -psz * 0.28, psz * 1.5, psz * 0.56, 1.2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(ppx, ppy);
        ctx.rotate((1 - pt.life) * 3.5 + p);
        ctx.fillRect(-psz / 2, -psz / 2, psz, psz);
        ctx.strokeStyle = 'rgba(59, 32, 16, 0.45)';
        ctx.lineWidth = 0.7;
        ctx.strokeRect(-psz / 2, -psz / 2, psz, psz);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    /* 爽感飘字提示（狂热/连击里程碑/钥匙解锁/爆破） */
    if (engine.floatTexts && engine.floatTexts.length > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px sans-serif';
      for (var ft = 0; ft < engine.floatTexts.length; ft += 1) {
        var fObj = engine.floatTexts[ft];
        var fl = Math.max(0, fObj.life);
        var fx = gridX + (fObj.c + 0.5) * cellSize;
        var fy = gridY + (fObj.r + 0.5) * cellSize - (1 - fl) * 26;
        fx = Math.max(54, Math.min(w - 54, fx));
        fy = Math.max(20, fy);
        ctx.globalAlpha = Math.min(1, fl * 1.4);
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = '#3b2b22';
        ctx.strokeText(fObj.text, fx, fy);
        ctx.fillStyle = fObj.color;
        ctx.fillText(fObj.text, fx, fy);
      }
      ctx.globalAlpha = 1;
    }

    drawEcologyCritters(ctx, w, sandY, boardX, boardW, isNight, this.time);
    drawThemeAmbientParticles(ctx, w, sandY, themeId, isNight, this.time);

    /* 可点击小彩蛋爆发孢子/花瓣 */
    for (var sp = this.sporePuffs.length - 1; sp >= 0; sp -= 1) {
      var puff = this.sporePuffs[sp];
      puff.life -= dt * 1.45;
      if (puff.life <= 0) {
        this.sporePuffs.splice(sp, 1);
        continue;
      }
      var pAge = 1 - puff.life;
      ctx.globalAlpha = Math.max(0, puff.life);
      ctx.fillStyle = puff.color;
      ctx.beginPath();
      ctx.arc(puff.x + puff.vx * pAge, puff.y + puff.vy * pAge, puff.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  GameRenderer.drawArtworkToCanvas = function (canvas, levelConfig, stars, isPoster) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var PALETTE = global.AntLevels.PALETTE;
    ctx.clearRect(0, 0, w, h);

    if (!isPoster) {
      ctx.fillStyle = '#fbf6ea';
      ctx.fillRect(0, 0, w, h);
      var cell = Math.floor((Math.min(w, h) - 8) / Math.max(levelConfig.rows, levelConfig.cols));
      var ox = Math.floor((w - cell * levelConfig.cols) / 2);
      var oy = Math.floor((h - cell * levelConfig.rows) / 2);
      for (var r = 0; r < levelConfig.rows; r += 1) {
        for (var c = 0; c < levelConfig.cols; c += 1) {
          var g = levelConfig.grid[r][c];
          if (g && PALETTE[g.origColor]) {
            ctx.fillStyle = PALETTE[g.origColor].hex;
            ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
          }
        }
      }
      return;
    }

    if (IMG_READY.posterFrame && IMG_ASSETS.posterFrame) {
      ctx.drawImage(IMG_ASSETS.posterFrame, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#fff9f0';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = '#4a2b1c';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('蚂蚁搬画 · 森林画廊', w / 2, 66);

    ctx.fillStyle = '#7b6455';
    ctx.font = 'bold 15px sans-serif';
    var posterSub = levelConfig.isDaily
      ? ('每日一画 · ' + levelConfig.name)
      : (levelConfig.isDiy
        ? ((levelConfig.diySource === 'studio' ? '手绘拼豆 · ' : '相册 DIY · ') + levelConfig.name)
        : (levelConfig.isEndless
          ? ('无尽第 ' + (levelConfig.endlessStage || 1) + ' 关 · ' + levelConfig.name)
          : ('第 ' + levelConfig.id + ' 关 · ' + levelConfig.name)));
    ctx.fillText(posterSub, w / 2, 92);

    var frameSize = 236;
    var fx = Math.floor((w - frameSize) / 2);
    var fy = 112;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#8b5e3c';
    ctx.lineWidth = 3;
    roundRectPath(ctx, fx, fy, frameSize, frameSize, 14);
    ctx.fill();
    ctx.stroke();

    var pCell = Math.floor((frameSize - 20) / Math.max(levelConfig.rows, levelConfig.cols));
    var px0 = Math.floor((w - pCell * levelConfig.cols) / 2);
    var py0 = Math.floor(fy + (frameSize - pCell * levelConfig.rows) / 2);
    for (var pr = 0; pr < levelConfig.rows; pr += 1) {
      for (var pc = 0; pc < levelConfig.cols; pc += 1) {
        var cellObj = levelConfig.grid[pr][pc];
        if (cellObj && PALETTE[cellObj.origColor]) {
          var pal = PALETTE[cellObj.origColor];
          ctx.fillStyle = pal.dark;
          ctx.fillRect(px0 + pc * pCell, py0 + pr * pCell, pCell - 1, pCell - 1);
          ctx.fillStyle = pal.hex;
          ctx.fillRect(px0 + pc * pCell, py0 + pr * pCell, pCell - 1, Math.max(2, pCell - 3));
        }
      }
    }

    var starCount = (typeof stars === 'number') ? stars : 3;
    if (starCount > 0) {
      var starStr = '';
      for (var s = 0; s < 3; s += 1) {
        starStr += s < starCount ? '★' : '☆';
      }
      ctx.fillStyle = '#f48c2e';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(starStr, w / 2, 376);
    } else {
      ctx.fillStyle = '#7b6455';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('效果图预览 · 待搬运', w / 2, 374);
    }

    /* 拼豆色卡颗数统计图谱（安全置于手账纸内框中） */
    var counts = {};
    for (var cr = 0; cr < levelConfig.rows; cr += 1) {
      for (var cc = 0; cc < levelConfig.cols; cc += 1) {
        var cObj = levelConfig.grid[cr][cc];
        if (cObj && cObj.origColor) {
          counts[cObj.origColor] = (counts[cObj.origColor] || 0) + 1;
        }
      }
    }
    var cKeys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 6);
    var chipW = 50;
    var startX = Math.floor((w - cKeys.length * chipW) / 2);
    for (var ci = 0; ci < cKeys.length; ci += 1) {
      var ck = cKeys[ci];
      var palInfo = PALETTE[ck];
      var cx = startX + ci * chipW + 2;
      ctx.fillStyle = palInfo ? palInfo.hex : '#ccc';
      ctx.strokeStyle = '#6b4228';
      ctx.lineWidth = 1.4;
      roundRectPath(ctx, cx, 396, 14, 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4a2b1c';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('×' + counts[ck], cx + 17, 407);
    }

    ctx.fillStyle = '#6b5649';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('拼豆色卡清单 · 森林藏画廊珍藏', w / 2, 438);
  };

  GameRenderer.drawBlockStylePreview = function (canvas, styleId) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var PALETTE = global.AntLevels ? global.AntLevels.PALETTE : {};
    var keys = ['R', 'Y', 'B', 'V'];
    var pad = 3;
    var sz = Math.floor((Math.min(w, h) - pad * 3) / 2);
    for (var i = 0; i < 4; i += 1) {
      var r = Math.floor(i / 2);
      var c = i % 2;
      var colObj = PALETTE[keys[i]] || { hex: '#ff476c', hi: '#ffb3c3', dark: '#bf1742' };
      drawThemedBlock(ctx, pad + c * (sz + pad), pad + r * (sz + pad), sz, colObj, styleId || 'jelly', false);
    }
  };

  GameRenderer.drawAtelierStage = function (canvas, themeId, skinId, timeSec, blockStyle) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var t = timeSec || 0;
    var theme = themeId || 'candy';
    ctx.clearRect(0, 0, w, h);

    var skyTop = '#d7f3be';
    var skyBot = '#b5e399';
    var groundCol = '#edd2a3';
    var strokeCol = '#3b2b22';
    var badgeLabel = '奶油手账';

    if (theme === 'candy') {
      skyTop = '#ffe0f0';
      skyBot = '#cdeeff';
      groundCol = '#ffe9cc';
      strokeCol = '#882458';
      badgeLabel = '果冻盲盒';
    } else if (theme === 'soda') {
      skyTop = '#bae6fd';
      skyBot = '#e6f7ff';
      groundCol = '#f7e2b8';
      strokeCol = '#16527d';
      badgeLabel = '海盐苏打';
    } else if (theme === 'lavender') {
      skyTop = '#ede0ff';
      skyBot = '#dbeafe';
      groundCol = '#efe2ff';
      strokeCol = '#5b21b6';
      badgeLabel = '薰衣草梦';
    } else if (theme === 'caramel') {
      skyTop = '#fae8d4';
      skyBot = '#f3d4b0';
      groundCol = '#e9c69f';
      strokeCol = '#6e3717';
      badgeLabel = '焦糖咖啡';
    } else if (theme === 'ribbon') {
      skyTop = '#ffe3ea';
      skyBot = '#ffd1dc';
      groundCol = '#ffe9d6';
      strokeCol = '#9f1239';
      badgeLabel = '草莓甜心';
    }

    var grad = ctx.createLinearGradient(0, 0, 0, h * 0.72);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h * 0.72);

    if (theme === 'candy' || theme === 'ribbon') {
      ctx.save();
      ctx.globalAlpha = 0.45;
      var rbCols = ['#ff85b3', '#ffd166', '#6ee7b7', '#7dd3fc'];
      for (var rbi = 0; rbi < rbCols.length; rbi += 1) {
        ctx.strokeStyle = rbCols[rbi];
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.74, w * 0.34 - rbi * 5, Math.PI, 0);
        ctx.stroke();
      }
      ctx.restore();
    } else if (theme === 'soda') {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      var clOff = Math.sin(t * 0.7) * 8;
      ctx.beginPath();
      ctx.arc(w * 0.28 + clOff, h * 0.3, 16, 0, Math.PI * 2);
      ctx.arc(w * 0.33 + clOff, h * 0.27, 20, 0, Math.PI * 2);
      ctx.arc(w * 0.39 + clOff, h * 0.31, 14, 0, Math.PI * 2);
      ctx.arc(w * 0.74 - clOff, h * 0.25, 14, 0, Math.PI * 2);
      ctx.arc(w * 0.79 - clOff, h * 0.23, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (theme === 'lavender') {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(w * 0.84, h * 0.24, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skyTop;
      ctx.beginPath();
      ctx.arc(w * 0.86, h * 0.21, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = groundCol;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.lineTo(w, h * 0.72);
    ctx.stroke();

    drawThemeAmbientParticles(ctx, w, h * 0.72, theme, false, t);

    var PALETTE = global.AntLevels ? global.AntLevels.PALETTE : {};
    var carryObjs = [
      PALETTE.R || '#ff476c',
      PALETTE.Y || '#ffd233',
      PALETTE.B || '#38bdf8'
    ];
    var antColors = ['#ff7b2e', '#ff85c0', '#4ade80'];
    for (var a = 0; a < 3; a += 1) {
      var prog = (t * 0.22 + a * 0.33) % 1;
      var ax = -20 + prog * (w + 40);
      var ay = h * 0.66 + (a === 1 ? -4 : (a === 2 ? 5 : 0)) + Math.abs(Math.sin(t * 7 + a)) * -2;
      GameRenderer.prototype.drawAnt(
        ctx,
        ax,
        ay,
        0,
        antColors[a],
        carryObjs[a],
        1.15,
        t * 5.2 + a,
        a === 0 ? 'leader' : 'normal',
        9,
        skinId || 'classic',
        blockStyle || 'jelly',
        true
      );
    }

    ctx.fillStyle = 'rgba(255, 250, 240, 0.92)';
    roundRectPath(ctx, 10, 10, 82, 24, 12);
    ctx.fill();
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = strokeCol;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeLabel, 51, 22);
  };

  GameRenderer.drawSanctuaryScene = function (canvas, clearedMetaList, skinId, themeId, sanctState, timeSec) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var t = timeSec || 0;
    var st = sanctState || { lantern: true, candies: [], frames: [] };
    st.frames = [];
    if (!st._previewCache) st._previewCache = {};
    var PALETTE = global.AntLevels ? global.AntLevels.PALETTE : {};

    ctx.clearRect(0, 0, w, h);

    var lanternOn = st.lantern !== false;
    if (IMG_READY.sanctuaryBg && IMG_ASSETS.sanctuaryBg) {
      ctx.drawImage(IMG_ASSETS.sanctuaryBg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#ebd7bc';
      ctx.fillRect(0, 0, w, h);
    }

    /* 夜间模式：柔和夜幕罩层 + 两侧暖金吊灯微光 */
    if (!lanternOn) {
      ctx.fillStyle = 'rgba(20, 16, 44, 0.56)';
      ctx.fillRect(0, 0, w, h);
    } else {
      var lampXs = [w * 0.135, w * 0.865];
      for (var li = 0; li < lampXs.length; li += 1) {
        var lx = lampXs[li];
        var ly = h * 0.31;
        var lg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 46);
        lg.addColorStop(0, 'rgba(255, 226, 128, 0.42)');
        lg.addColorStop(1, 'rgba(255, 226, 128, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, ly, 46, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* 墙上悬挂最多 4 幅已通关收藏画框（可点击查看大图） */
    var list = clearedMetaList || [];
    var showCount = Math.min(4, list.length);
    var frameW = 48;
    var frameH = 48;
    var gap = showCount > 1 ? Math.min(18, (w - 96 - showCount * frameW) / Math.max(1, showCount - 1)) : 0;
    var totalWallW = showCount * frameW + Math.max(0, showCount - 1) * gap;
    var startX = Math.floor((w - totalWallW) / 2);

    if (showCount === 0) {
      ctx.fillStyle = lanternOn ? 'rgba(139, 94, 60, 0.12)' : 'rgba(255, 248, 234, 0.16)';
      roundRectPath(ctx, w * 0.5 - 92, 64, 184, 48, 12);
      ctx.fill();
      ctx.fillStyle = lanternOn ? '#6e472b' : '#f8e6cb';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('完成关卡后，画作会挂在这里展览哦', w * 0.5, 88);
    } else {
      for (var fi = 0; fi < showCount; fi += 1) {
        var meta = list[fi];
        var fx = startX + fi * (frameW + gap);
        var fy = 56;
        ctx.fillStyle = '#d4955e';
        ctx.strokeStyle = '#6e3717';
        ctx.lineWidth = 1.8;
        roundRectPath(ctx, fx, fy, frameW, frameH, 7);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fbf6ea';
        ctx.fillRect(fx + 5, fy + 5, frameW - 10, frameH - 10);

        var pCfg = null;
        if (meta.previewConfig) {
          pCfg = meta.previewConfig;
        } else {
          if (!st._previewCache[meta.id] && global.AntLevels) {
            st._previewCache[meta.id] = global.AntLevels.getArtworkPreview(meta.id);
          }
          pCfg = st._previewCache[meta.id];
        }
        if (pCfg && pCfg.grid) {
          var step = Math.max(1, Math.floor(pCfg.rows / 12));
          var cellPix = (frameW - 12) / Math.ceil(pCfg.rows / step);
          for (var rr = 0; rr < pCfg.rows; rr += step) {
            for (var cc = 0; cc < pCfg.cols; cc += step) {
              var cell = pCfg.grid[rr] && pCfg.grid[rr][cc];
              if (!cell) continue;
              var colInfo = PALETTE[cell.origColor || cell.color];
              ctx.fillStyle = colInfo ? colInfo.hex : '#eb5858';
              ctx.fillRect(fx + 6 + (cc / step) * cellPix, fy + 6 + (rr / step) * cellPix, Math.ceil(cellPix), Math.ceil(cellPix));
            }
          }
        }
        st.frames.push({ x: fx, y: fy, w: frameW, h: frameH, levelId: meta.id, customItem: meta.customItem || null, name: meta.name });
      }
    }

    var floorY = Math.floor(h * 0.85);

    /* 计算真互动时间步长 dt */
    var sDt = st.lastT ? Math.min(0.05, Math.max(0.001, t - st.lastT)) : 0.016;
    st.lastT = t;

    /* 蜂蜜糖果与啃食变形（直到蚂蚁啃光消失！） */
    var candies = st.candies || [];
    for (var ci = candies.length - 1; ci >= 0; ci -= 1) {
      var candy = candies[ci];
      if (candy.size === undefined) candy.size = 1;
      if (candy.bites === undefined) candy.bites = 0;
      candy.age += sDt;
      if (candy.eatPulse > 0) candy.eatPulse = Math.max(0, candy.eatPulse - sDt * 4.5);
      if (candy.bites >= 4 || candy.age > 16) {
        candies.splice(ci, 1);
        continue;
      }
      var rad = 5.0 * Math.max(0.28, candy.size) * (1 + (candy.eatPulse || 0) * 0.25);
      var cyPos = floorY - rad + 0.5 - (candy.eatPulse || 0) * 3;
      ctx.fillStyle = candy.color || '#f8cb46';
      ctx.strokeStyle = '#3b2b22';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(candy.x, cyPos, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.beginPath();
      ctx.arc(candy.x - rad * 0.3, cyPos - rad * 0.3, rad * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 关灯模式下的萤火虫 */
    if (!lanternOn) {
      for (var nf = 0; nf < 6; nf += 1) {
        var nfx = ((nf * 61 + 20) % Math.max(80, w - 20)) + Math.sin(t + nf) * 12;
        var nfy = 36 + ((nf * 37) % Math.max(40, floorY - 48)) + Math.cos(t * 1.2 + nf) * 8;
        ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t * 3.1 + nf);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(nfx, nfy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* 室友工蚁真巡游与闻香抢糖啃食互动 */
    var sanctColors = ['#ff7b2e', '#4ade80', '#38bdf8', '#ff85c0'];
    if (!st.ants || st.ants.length !== 4) {
      st.ants = [];
      for (var initAi = 0; initAi < 4; initAi += 1) {
        st.ants.push({
          x: 44 + initAi * Math.max(40, (w - 88) / 3),
          dir: initAi % 2 === 0 ? 1 : -1,
          eatCd: 0,
          heartTimer: 0,
          walkPhase: initAi * 1.4
        });
      }
    }
    for (var ai = 0; ai < 4; ai += 1) {
      var sAnt = st.ants[ai];
      if (sAnt.eatCd > 0) sAnt.eatCd -= sDt;
      if (sAnt.heartTimer > 0) sAnt.heartTimer -= sDt;
      var targetCandy = null;
      if (candies.length > 0) {
        var bestDist = Infinity;
        for (var cFind = 0; cFind < candies.length; cFind += 1) {
          var distC = Math.abs(candies[cFind].x - sAnt.x);
          if (distC < bestDist) {
            bestDist = distC;
            targetCandy = candies[cFind];
          }
        }
      }
      var antY = floorY + 2 + (ai % 2) * 5;
      var isNibbling = false;
      if (targetCandy) {
        var dxCandy = targetCandy.x - sAnt.x;
        if (Math.abs(dxCandy) <= 9) {
          sAnt.dir = dxCandy >= 0 ? 1 : -1;
          isNibbling = true;
          sAnt.walkPhase += sDt * 2.2;
          if (sAnt.eatCd <= 0) {
            sAnt.eatCd = 0.42;
            sAnt.heartTimer = 0.78;
            targetCandy.bites = (targetCandy.bites || 0) + 1;
            targetCandy.size = Math.max(0.28, 1 - targetCandy.bites * 0.24);
            targetCandy.eatPulse = 1;
          }
        } else {
          sAnt.dir = dxCandy > 0 ? 1 : -1;
          sAnt.x += sAnt.dir * 66 * sDt;
          sAnt.walkPhase += sDt * 8.5;
        }
      } else {
        var strollSpd = 24 + ai * 4;
        sAnt.x += sAnt.dir * strollSpd * sDt;
        if (sAnt.x < 48) { sAnt.x = 48; sAnt.dir = 1; }
        if (sAnt.x > w - 48) { sAnt.x = w - 48; sAnt.dir = -1; }
        sAnt.walkPhase += sDt * 4.8;
      }

      var heading = sAnt.dir >= 0 ? 0 : Math.PI;
      var bobY = isNibbling ? Math.abs(Math.sin(t * 14 + ai)) * -1.4 : 0;
      GameRenderer.prototype.drawAnt(
        ctx,
        sAnt.x,
        antY + bobY,
        heading,
        sanctColors[ai],
        null,
        1.02,
        sAnt.walkPhase,
        ai === 0 ? 'leader' : 'normal',
        0,
        skinId || 'classic',
        null,
        true
      );
      if (sAnt.heartTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, sAnt.heartTimer * 1.5);
        ctx.fillStyle = '#ff476c';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♥', sAnt.x, antY - 12 - (0.78 - sAnt.heartTimer) * 16);
        ctx.restore();
      }
    }
  };

  /* 为暂存槽、小队按钮与工坊装扮卡绘制高清日系水彩 Q 版工蚁图标（浅奶油圆形贴纸托底） */
  GameRenderer.drawAntIcon = function (canvas, bodyHex, skinId) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var skinKey = SKIN_ASSET_KEYS[skinId || 'classic'] || 'antClassic';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255, 250, 240, 0.94)';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = bodyHex || 'rgba(107, 66, 40, 0.25)';
    ctx.lineWidth = Math.max(1.5, w * 0.045);
    ctx.stroke();
    if (!drawLoadedAsset(ctx, skinKey, w * 0.5, h * 0.5, null, Math.min(w, h) * 0.78)) {
      ctx.fillStyle = bodyHex || '#b46a3e';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.24, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  GameRenderer.onAssetsReady = function (cb) {
    if (typeof cb === 'function') assetReadyListeners.push(cb);
  };

  global.AntRenderer = GameRenderer;
})(window);
