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

  function GameRenderer(mainCanvas, miniCanvas) {
    this.canvas = mainCanvas;
    this.ctx = mainCanvas.getContext('2d');
    this.miniCanvas = miniCanvas;
    this.miniCtx = miniCanvas ? miniCanvas.getContext('2d') : null;
    this.width = 320;
    this.height = 320;
    this.dpr = 1;
    this.time = 0;
  }

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

  /* 写实工蚁（Canvas 2D 生物拟真：三节躯体+腹柄节、膝状触角、大颚钳夹完整像素块、六足三角步态） */
  GameRenderer.prototype.drawAnt = function (ctx, x, y, angle, colorHex, carryingHex, scale, walkPhase, kind, carrySize) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    if (kind === 'rainbow') {
      var trailCols = ['#ff6f91', '#f8cb46', '#67c873', '#6bc0ff'];
      for (var tc = 0; tc < trailCols.length; tc += 1) {
        ctx.globalAlpha = 0.32 - tc * 0.06;
        ctx.fillStyle = trailCols[tc];
        ctx.beginPath();
        ctx.arc(-13 - tc * 3.5, Math.sin(walkPhase + tc) * 1.2, 2.2 - tc * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* 1. 真实昆虫六足“三角步态”（L1+R2+L3 与 R1+L2+R3 交替，双节关节腿） */
    ctx.strokeStyle = '#241811';
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var legMounts = [
      { bx: 1.5, reachX: 4.5, spanY: 5.8, baseDir: 0.45 },  /* 前足 */
      { bx: -0.3, reachX: -0.6, spanY: 6.6, baseDir: -0.1 }, /* 中足 */
      { bx: -2.0, reachX: -5.8, spanY: 6.4, baseDir: -0.6 }  /* 后足 */
    ];
    for (var s = -1; s <= 1; s += 2) {
      var sideIdx = s < 0 ? 0 : 1;
      for (var li = 0; li < 3; li += 1) {
        var m = legMounts[li];
        var tripodPhase = ((li + sideIdx) % 2 === 0) ? 0 : Math.PI;
        var stride = Math.sin(walkPhase + tripodPhase) * 1.9;
        var kneeX = m.bx + (m.reachX - m.bx) * 0.48 + stride * 0.4;
        var kneeY = s * (m.spanY * 0.56);
        var footX = m.reachX + stride;
        var footY = s * m.spanY;

        ctx.beginPath();
        ctx.moveTo(m.bx, s * 1.1);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.stroke();
      }
    }

    /* 2. 后腹部（尖尾水滴形 + 甲壳分节纹 + 光泽） */
    ctx.fillStyle = colorHex;
    ctx.strokeStyle = '#241811';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(-3.4, 0);
    ctx.bezierCurveTo(-4.2, -3.7, -9.2, -3.5, -11.6, 0);
    ctx.bezierCurveTo(-9.2, 3.5, -4.2, 3.7, -3.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    /* 腹部几丁质分节暗纹 */
    ctx.strokeStyle = 'rgba(30, 18, 10, 0.38)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-6.2, -2.5);
    ctx.quadraticCurveTo(-5.6, 0, -6.2, 2.5);
    ctx.moveTo(-8.4, -2.1);
    ctx.quadraticCurveTo(-7.9, 0, -8.4, 2.1);
    ctx.stroke();

    /* 腹部高光 */
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-7.1, -1.2, 2.2, 0.8, -0.15, 0, Math.PI * 2);
    ctx.fill();

    /* 3. 腹柄节（细腰节点）与胸部（拱形中躯） */
    ctx.fillStyle = colorHex;
    ctx.strokeStyle = '#241811';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.arc(-2.8, 0, 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-0.1, 0, 2.5, 1.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    /* 4. 头部（盾卵形头 + 侧面深色复眼） */
    ctx.beginPath();
    ctx.ellipse(4.1, 0, 2.75, 2.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    /* 复眼 */
    ctx.fillStyle = '#1b110c';
    ctx.beginPath();
    ctx.ellipse(4.4, -1.75, 0.85, 0.55, 0.25, 0, Math.PI * 2);
    ctx.ellipse(4.4, 1.75, 0.85, 0.55, -0.25, 0, Math.PI * 2);
    ctx.fill();

    /* 5. 膝状触角（柄节 + 鞭节折弯探测） */
    var feeler = Math.sin(walkPhase * 0.65) * 0.55;
    ctx.strokeStyle = '#241811';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(5.8, -1.0);
    ctx.lineTo(7.9, -2.8 + feeler * 0.4);
    ctx.lineTo(10.3, -1.9 + feeler);
    ctx.moveTo(5.8, 1.0);
    ctx.lineTo(7.9, 2.8 - feeler * 0.4);
    ctx.lineTo(10.3, 1.9 - feeler);
    ctx.stroke();

    /* 6. 一对上颚大颚（返程时钳夹搬运像素块在头前方！） */
    ctx.strokeStyle = '#241811';
    ctx.lineWidth = 1.35;
    if (carryingHex) {
      var boxSz = carrySize || 9.2;
      var halfBox = boxSz / 2;
      /* 先画大颚外侧牢牢钳住整块方块 */
      ctx.beginPath();
      ctx.moveTo(6.4, -1.1);
      ctx.quadraticCurveTo(8.3, -Math.min(3.5, halfBox * 0.6), 9.4, -Math.min(2.8, halfBox * 0.45));
      ctx.moveTo(6.4, 1.1);
      ctx.quadraticCurveTo(8.3, Math.min(3.5, halfBox * 0.6), 9.4, Math.min(2.8, halfBox * 0.45));
      ctx.stroke();

      /* 被口器稳稳叼走的原块彩色像素 */
      ctx.fillStyle = carryingHex;
      ctx.strokeStyle = '#241811';
      ctx.lineWidth = 1.4;
      ctx.fillRect(7.4, -halfBox, boxSz, boxSz);
      ctx.strokeRect(7.4, -halfBox, boxSz, boxSz);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(8.2, -halfBox + 0.9, Math.max(2, boxSz - 1.6), 1.8);
    } else {
      ctx.beginPath();
      ctx.moveTo(6.5, -0.9);
      ctx.quadraticCurveTo(8.2, -1.4, 8.6, -0.3);
      ctx.moveTo(6.5, 0.9);
      ctx.quadraticCurveTo(8.2, 1.4, 8.6, 0.3);
      ctx.stroke();
    }

    /* 7. 爆破工蚁背部小炸弹与引线火星 */
    if (kind === 'bomber') {
      ctx.fillStyle = '#2d221c';
      ctx.strokeStyle = '#ff6b2b';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(-6.8, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-9.6, -2.1 + Math.sin(walkPhase * 1.4) * 0.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  GameRenderer.prototype.drawFlower = function (ctx, x, y, petalColor) {
    ctx.save();
    ctx.translate(x, y);
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

  GameRenderer.prototype.render = function (engine, dt) {
    if (!this.ctx || !engine.config) return;
    this.time += dt;
    var ctx = this.ctx;
    var w = this.width;
    var h = this.height;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    if (engine.shakePower > 0.05) {
      var sxOff = (Math.random() - 0.5) * engine.shakePower * 2;
      var syOff = (Math.random() - 0.5) * engine.shakePower * 2;
      ctx.translate(sxOff, syOff);
    }

    /* 2D 草地 / 星夜背景 + 下方浅沙蚁丘 */
    var isNight = !!(engine.config && engine.config.nightTheme);
    var sandY = Math.floor(h * 0.77);
    ctx.fillStyle = isNight ? '#243258' : '#b9e6a1';
    ctx.fillRect(0, 0, w, sandY);

    /* 背景纹饰 */
    ctx.fillStyle = isNight ? '#2d3d6a' : '#a7db8d';
    ctx.fillRect(0, Math.floor(sandY * 0.35), w, 26);
    ctx.fillRect(0, Math.floor(sandY * 0.72), w, 20);

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
      this.drawFlower(ctx, 22, 26, '#ffffff');
      this.drawFlower(ctx, w - 24, 34, '#fff1b8');
      this.drawFlower(ctx, 26, sandY - 22, '#ffd4e2');
      this.drawFlower(ctx, w - 28, sandY - 18, '#ffffff');
    }

    /* 浅沙坡地 */
    ctx.fillStyle = isNight ? '#826b5c' : '#edd2a3';
    ctx.fillRect(0, sandY, w, h - sandY);
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, sandY);
    ctx.lineTo(w, sandY);
    ctx.stroke();

    /* 2D 木质画板几何参数 */
    var maxBoardH = sandY - 16;
    var maxBoardW = w - 26;
    var cellSize = Math.floor(Math.min((maxBoardW - 22) / engine.cols, (maxBoardH - 24) / engine.rows));
    cellSize = Math.max(11, Math.min(24, cellSize));
    var gridW = cellSize * engine.cols;
    var gridH = cellSize * engine.rows;

    var woodPad = 9;
    var paperPad = 6;
    var totalPad = woodPad + paperPad;
    var boardW = gridW + totalPad * 2;
    var boardH = gridH + totalPad * 2;
    var boardX = Math.floor((w - boardW) / 2);
    var boardY = Math.max(8, Math.floor((sandY - boardH) / 2));

    var paperX = boardX + woodPad;
    var paperY = boardY + woodPad;
    var paperW = gridW + paperPad * 2;
    var paperH = gridH + paperPad * 2;
    var gridX = paperX + paperPad;
    var gridY = paperY + paperPad;

    var burrowX = Math.floor(w / 2);
    var burrowY = Math.min(h - 24, sandY + Math.floor((h - sandY) * 0.44));

    /* 画板投影 + 2D 原木画框 */
    ctx.fillStyle = '#73ab60';
    roundRectPath(ctx, boardX + 3, boardY + 4, boardW, boardH, 14);
    ctx.fill();

    ctx.fillStyle = '#d39a58';
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, boardX, boardY, boardW, boardH, 14);
    ctx.fill();
    ctx.stroke();

    /* 奶油画纸 */
    ctx.fillStyle = '#fbf6ea';
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 1.8;
    roundRectPath(ctx, paperX, paperY, paperW, paperH, 8);
    ctx.fill();
    ctx.stroke();

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

        ctx.fillStyle = pColor.dark;
        ctx.fillRect(tx, ty, ts, ts);
        ctx.fillStyle = pColor.hex;
        ctx.fillRect(tx, ty, ts, Math.max(2, ts - 2.6));

        ctx.strokeStyle = 'rgba(59, 43, 34, 0.22)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(tx, ty, ts, ts);

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
        }
      }
    }

    /* 整块被蚂蚁夹起拿走后的淡白留痕轮廓（不炸碎、不重复残影） */
    if (engine.popEffects && engine.popEffects.length > 0) {
      for (var pe = 0; pe < engine.popEffects.length; pe += 1) {
        var pop = engine.popEffects[pe];
        var pLife = Math.max(0, pop.life);
        var pScale = 1 + (1 - pLife) * 0.16;
        var ps = (cellSize - 1) * pScale;
        var px = gridX + (pop.c + 0.5) * cellSize - ps / 2;
        var py = gridY + (pop.r + 0.5) * cellSize - ps / 2;
        ctx.globalAlpha = pLife * 0.55;
        ctx.strokeStyle = '#c5b190';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px, py, ps, ps);
      }
      ctx.globalAlpha = 1;
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

    /* 2D 浅沙小蚁丘与洞口 */
    ctx.fillStyle = '#d7ac72';
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(burrowX, burrowY + 2, 46, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3b2b22';
    ctx.beginPath();
    ctx.ellipse(burrowX, burrowY + 1, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    /* 搬回洞口时的“咕噜”吸纳波纹 */
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

    /* 绘制沿着空地走廊拐弯爬行的 2D 小蚂蚁（不踩未消方块） */
    for (var a = 0; a < engine.activeAnts.length; a += 1) {
      var ant = engine.activeAnts[a];
      var t = ant.phase === 'to_target' ? ant.progress : (1 - ant.progress);

      /* 构建像素坐标折线：蚁洞 -> 画纸下方拐入点 -> 网格空地路径 -> 目标方块边缘 */
      var pts = [{ x: burrowX, y: burrowY }];
      var gPath = ant.gridPath || [{ r: engine.rows + 0.5, c: ant.c }, { r: ant.r, c: ant.c }];
      for (var gp = 0; gp < gPath.length; gp += 1) {
        pts.push({
          x: gridX + (gPath[gp].c + 0.5) * cellSize + (gp === 0 ? ant.curveOffset : 0),
          y: gridY + (gPath[gp].r + 0.5) * cellSize
        });
      }

      /* 按总弧长均匀采样折线位置与朝向 */
      var segLens = [];
      var totalLen = 0;
      for (var s = 0; s < pts.length - 1; s += 1) {
        var sdx = pts[s + 1].x - pts[s].x;
        var sdy = pts[s + 1].y - pts[s].y;
        var sl = Math.sqrt(sdx * sdx + sdy * sdy);
        segLens.push(sl);
        totalLen += sl;
      }

      var targetDist = Math.max(0, Math.min(totalLen, t * totalLen));
      var acc = 0;
      var ax = pts[0].x;
      var ay = pts[0].y;
      var angle = -Math.PI / 2;
      for (var s2 = 0; s2 < segLens.length; s2 += 1) {
        var len = segLens[s2];
        if (acc + len >= targetDist || s2 === segLens.length - 1) {
          var localT = len > 0.001 ? (targetDist - acc) / len : 0;
          ax = pts[s2].x + (pts[s2 + 1].x - pts[s2].x) * localT;
          ay = pts[s2].y + (pts[s2 + 1].y - pts[s2].y) * localT;
          angle = Math.atan2(pts[s2 + 1].y - pts[s2].y, pts[s2 + 1].x - pts[s2].x);
          break;
        }
        acc += len;
      }
      if (ant.phase === 'returning') angle += Math.PI;

      var antColorHex = ant.kind === 'rainbow'
        ? '#f472b6'
        : ((PALETTE[ant.color] && PALETTE[ant.color].ant) || '#56b2d1');
      var carryHex = ant.phase === 'returning'
        ? ((PALETTE[ant.color] && PALETTE[ant.color].hex) || '#ffffff')
        : null;

      var sway = Math.sin(this.time * 9 + a * 1.7) * 0.85;
      ax += -Math.sin(angle) * sway;
      ay += Math.cos(angle) * sway;

      var carryBlockSz = Math.min(13.2, Math.max(8.8, cellSize * 0.68));
      if (carryHex && ant.progress < 0.09) {
        carryBlockSz *= (1.16 - (ant.progress / 0.09) * 0.16);
      }

      this.drawAnt(ctx, ax, ay, angle, antColorHex, carryHex, 1.05, this.time * 12 + a, ant.kind, carryBlockSz);
    }

    /* 柔和碎屑粒子 */
    for (var p = 0; p < engine.particles.length; p += 1) {
      var pt = engine.particles[p];
      var ppx = gridX + (pt.c + 0.5) * cellSize + pt.vx * (1 - pt.life);
      var ppy = gridY + (pt.r + 0.5) * cellSize + pt.vy * (1 - pt.life);
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.fillRect(ppx - pt.size / 2, ppy - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  GameRenderer.prototype.renderMiniGallery = function (engine) {
    if (!this.miniCtx || !engine.config) return;
    var ctx = this.miniCtx;
    var size = this.miniCanvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(0, 0, size, size);

    var cell = Math.floor(size / Math.max(engine.rows, engine.cols));
    var ox = Math.floor((size - cell * engine.cols) / 2);
    var oy = Math.floor((size - cell * engine.rows) / 2);
    var PALETTE = global.AntLevels.PALETTE;

    for (var r = 0; r < engine.rows; r += 1) {
      for (var c = 0; c < engine.cols; c += 1) {
        var colorKey = engine.galleryGrid[r][c];
        if (colorKey && PALETTE[colorKey]) {
          ctx.fillStyle = PALETTE[colorKey].hex;
          ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
        }
      }
    }
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

    ctx.fillStyle = '#dff2cf';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fbf6ea';
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 6;
    roundRectPath(ctx, 16, 16, w - 32, h - 32, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3b2b22';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('蚂蚁搬画 · 森林画廊', w / 2, 62);

    ctx.fillStyle = '#7b6455';
    ctx.font = 'bold 16px sans-serif';
    var posterSub = levelConfig.isEndless
      ? ('无尽第 ' + (levelConfig.endlessStage || 1) + ' 关 · ' + levelConfig.name)
      : ('第 ' + levelConfig.id + ' 关 · ' + levelConfig.name);
    ctx.fillText(posterSub, w / 2, 92);

    var frameSize = 288;
    var fx = Math.floor((w - frameSize) / 2);
    var fy = 114;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b2b22';
    ctx.lineWidth = 4;
    roundRectPath(ctx, fx, fy, frameSize, frameSize, 14);
    ctx.fill();
    ctx.stroke();

    var pCell = Math.floor((frameSize - 24) / Math.max(levelConfig.rows, levelConfig.cols));
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
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(starStr, w / 2, 434);
    } else {
      ctx.fillStyle = '#7b6455';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText('效果图预览 · 待搬运', w / 2, 432);
    }

    /* 创新功能：拼豆色卡颗数统计图谱（方便手工拼豆/像素画复用） */
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
    var chipW = 58;
    var startX = Math.floor((w - cKeys.length * chipW) / 2);
    for (var ci = 0; ci < cKeys.length; ci += 1) {
      var ck = cKeys[ci];
      var palInfo = PALETTE[ck];
      var cx = startX + ci * chipW + 4;
      ctx.fillStyle = palInfo ? palInfo.hex : '#ccc';
      ctx.strokeStyle = '#3b2b22';
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, cx, 448, 16, 16, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3b2b22';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('×' + counts[ck], cx + 20, 460);
    }

    ctx.fillStyle = '#6b5649';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('拼豆色卡清单 · 森林藏画廊珍藏', w / 2, 488);
  };

  /* 为暂存槽与小队按钮绘制写实工蚁俯视小图标（带浅奶油圆形贴纸托底，深色按钮也清晰可见） */
  GameRenderer.drawAntIcon = function (canvas, bodyHex) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255, 248, 234, 0.9)';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(59, 43, 34, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    GameRenderer.prototype.drawAnt(ctx, w * 0.5, h * 0.54, -Math.PI / 2, bodyHex || '#fff8ea', null, 1.0, 0.4);
  };

  global.AntRenderer = GameRenderer;
})(window);
