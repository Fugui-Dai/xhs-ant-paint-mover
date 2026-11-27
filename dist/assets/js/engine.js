/* 蚂蚁搬画核心状态机：全可点小队池、5槽位、舒缓解压节奏、特殊工蚁（ES2017） */
(function (global) {
  'use strict';

  function cloneGrid(grid, resetPending) {
    var out = [];
    for (var r = 0; r < grid.length; r += 1) {
      var row = [];
      for (var c = 0; c < grid[r].length; c += 1) {
        var cell = grid[r][c];
        row.push(cell ? {
          color: cell.color,
          layers: cell.layers,
          mud: !!cell.mud,
          wrapped: !!cell.wrapped,
          key: !!cell.key,
          locked: !!cell.locked,
          special: cell.special || null,
          origColor: cell.origColor,
          pending: resetPending ? 0 : (cell.pending || 0)
        } : null);
      }
      out.push(row);
    }
    return out;
  }

  function cloneSquadList(list) {
    var out = [];
    for (var i = 0; i < list.length; i += 1) {
      var q = list[i];
      out.push(q ? {
        color: q.color,
        count: q.count,
        kind: q.kind,
        mystery: q.mystery
      } : null);
    }
    return out;
  }

  function cloneDock(dock) {
    var out = [];
    for (var i = 0; i < dock.length; i += 1) {
      var d = dock[i];
      out.push({
        id: d.id,
        color: d.color,
        count: d.count,
        kind: d.kind,
        leadPending: !!d.leadPending,
        cooldown: d.cooldown
      });
    }
    return out;
  }

  function cloneGallery(gallery) {
    var out = [];
    for (var r = 0; r < gallery.length; r += 1) {
      out.push(gallery[r].slice());
    }
    return out;
  }

  function GameEngine(callbacks) {
    this.cb = callbacks || {};
    this.config = null;
    this.rows = 12;
    this.cols = 12;
    this.grid = [];
    this.galleryGrid = [];
    this.visiblePool = [];
    this.reserveDeck = [];
    this.dock = [];
    this.maxSlots = 5;
    this.baseSlots = 5;
    this.activeAnts = [];
    this.particles = [];
    this.popEffects = [];
    this.ripples = [];
    this.shockwaves = [];
    this.lightningArcs = [];
    this.honeySplashes = [];
    this.shakePower = 0;
    this.burrowPulse = 0;
    this.studioPulse = 0;
    this.floatTexts = [];
    this.fever = 0;
    this.feverActive = false;
    this.feverTimer = 0;
    this.idleTime = 0;
    this.winDelayTimer = 0;
    this.isCelebrating = false;
    this.undoStack = [];
    this.totalCarries = 0;
    this.doneCarries = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.toolsUsed = 0;
    this.speedMultiplier = 1;
    this.status = 'idle';
    this.stuckTimer = 0;
    this.nextSquadId = 1;
    this.exposedMap = {};
    this.exposedList = [];
    this.exposedColors = {};
    this.lastTargetByColor = {};
  }

  GameEngine.prototype.initLevel = function (config) {
    this.config = config;
    this.rows = config.rows;
    this.cols = config.cols;
    this.grid = cloneGrid(config.grid);
    this.visiblePool = cloneSquadList(config.visiblePool);
    this.reserveDeck = cloneSquadList(config.reserveDeck);
    this.dock = [];
    this.baseSlots = config.baseSlots || 5;
    this.maxSlots = this.baseSlots;
    this.activeAnts = [];
    this.particles = [];
    this.popEffects = [];
    this.ripples = [];
    this.shockwaves = [];
    this.lightningArcs = [];
    this.honeySplashes = [];
    this.shakePower = 0;
    this.burrowPulse = 0;
    this.studioPulse = 0;
    this.floatTexts = [];
    this.fever = 0;
    this.feverActive = false;
    this.feverTimer = 0;
    this.idleTime = 0;
    this.winDelayTimer = 0;
    this.isCelebrating = false;
    this.undoStack = [];
    this.combo = 0;
    this.comboTimer = 0;
    this.toolsUsed = 0;
    this.status = 'playing';
    this.stuckTimer = 0;
    this.nextSquadId = 1;
    this.lastTargetByColor = {};

    this.galleryGrid = [];
    this.totalCarries = 0;
    this.doneCarries = 0;
    for (var r = 0; r < this.rows; r += 1) {
      var gRow = new Array(this.cols);
      for (var c = 0; c < this.cols; c += 1) {
        gRow[c] = null;
        if (this.grid[r][c]) {
          this.totalCarries += this.grid[r][c].layers;
        }
      }
      this.galleryGrid.push(gRow);
    }

    this.refreshExposed();
    this.emitUpdate();
  };

  GameEngine.prototype.setSpeedMultiplier = function (val) {
    var num = Number(val);
    if (isFinite(num) && num >= 0.5 && num <= 2.5) this.speedMultiplier = num;
    else this.speedMultiplier = 1;
  };

  GameEngine.prototype.refreshExposed = function () {
    var list = global.AntLevels.findExposedCells(this.grid);
    this.exposedList = list;
    this.exposedMap = {};
    this.exposedColors = {};
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      this.exposedMap[item.r + ',' + item.c] = true;
      if (item.cell.layers - (item.cell.pending || 0) > 0) {
        this.exposedColors[item.cell.color] = (this.exposedColors[item.cell.color] || 0) + 1;
      }
    }
  };

  GameEngine.prototype.saveSnapshot = function () {
    if (this.undoStack.length >= 15) this.undoStack.shift();
    var snapGrid = cloneGrid(this.grid, true);
    var snapDock = cloneDock(this.dock);
    var snapVisible = cloneSquadList(this.visiblePool);
    var snapReserve = cloneSquadList(this.reserveDeck);
    var snapDone = this.doneCarries;

    /* 还原尚未抓取的在途蚂蚁（to_target）对应的配额，避免撤回后丢块或卡住 pending */
    for (var i = 0; i < this.activeAnts.length; i += 1) {
      var ant = this.activeAnts[i];
      if (ant.phase === 'to_target' && ant.squadId > 0) {
        var restored = false;
        for (var d = 0; d < snapDock.length; d += 1) {
          if (snapDock[d].id === ant.squadId) {
            snapDock[d].count += 1;
            restored = true;
            break;
          }
        }
        if (!restored) {
          if (snapDock.length < this.maxSlots) {
            snapDock.push({
              id: ant.squadId,
              color: ant.color,
              count: 1,
              kind: ant.kind || 'normal',
              cooldown: 0.05
            });
          } else {
            snapReserve.unshift({
              color: ant.color,
              count: 1,
              kind: ant.kind || 'normal',
              mystery: false
            });
          }
        }
      }
    }

    this.undoStack.push({
      grid: snapGrid,
      galleryGrid: cloneGallery(this.galleryGrid),
      visiblePool: snapVisible,
      reserveDeck: snapReserve,
      dock: snapDock,
      doneCarries: snapDone
    });
  };

  GameEngine.prototype.canUndo = function () {
    return this.status === 'playing' && !this.isCelebrating && this.undoStack.length > 0;
  };

  GameEngine.prototype.undo = function () {
    if (!this.canUndo()) return false;
    var snap = this.undoStack.pop();
    this.grid = snap.grid;
    this.galleryGrid = snap.galleryGrid;
    this.visiblePool = snap.visiblePool;
    this.reserveDeck = snap.reserveDeck;
    for (var vp = 0; vp < this.visiblePool.length && this.reserveDeck.length > 0; vp += 1) {
      if (!this.visiblePool[vp]) {
        this.visiblePool[vp] = this.reserveDeck.shift();
      }
    }
    this.dock = snap.dock;
    this.doneCarries = snap.doneCarries;
    /* 保留已解锁的 maxSlots（如已使用扩槽道具，不因撤回而吞掉第6槽） */
    this.activeAnts = [];
    this.popEffects = [];
    this.ripples = [];
    this.shockwaves = [];
    this.lightningArcs = [];
    this.honeySplashes = [];
    this.shakePower = 0;
    this.burrowPulse = 0;
    this.studioPulse = 0;
    this.floatTexts = [];
    this.fever = 0;
    this.feverActive = false;
    this.feverTimer = 0;
    this.idleTime = 0;
    this.winDelayTimer = 0;
    this.isCelebrating = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.stuckTimer = 0;
    this.lastTargetByColor = {};
    this.toolsUsed += 1;
    this.refreshExposed();
    this.emitUpdate();
    return true;
  };

  GameEngine.prototype.expandSlot = function () {
    if (this.status !== 'playing' || this.isCelebrating || this.maxSlots >= (this.baseSlots || 5) + 1) return false;
    this.maxSlots = (this.baseSlots || 5) + 1;
    this.stuckTimer = 0;
    this.idleTime = 0;
    this.toolsUsed += 1;
    this.emitUpdate();
    return true;
  };

  GameEngine.prototype.summonRainbowAnts = function () {
    if (this.status !== 'playing' || this.isCelebrating) return false;
    this.refreshExposed();
    var dispatched = 0;
    for (var n = 0; n < 4; n += 1) {
      var target = this.pickTargetForColor('RAINBOW');
      if (!target) break;
      this.spawnAnt(target.r, target.c, target.cell.color, 'rainbow', -1);
      dispatched += 1;
    }
    if (dispatched === 0) return false;
    this.toolsUsed += 1;
    this.stuckTimer = 0;
    this.idleTime = 0;
    this.spawnFloatText(Math.floor(this.rows * 0.45), Math.floor(this.cols * 0.5), '🌈 彩虹清道!', '#f472b6');
    this.emitUpdate();
    return true;
  };

  /* 底部全部按钮均可自由点击，每支小队独立占用 1 个暂存槽位并可多槽并发出兵 */
  GameEngine.prototype.dispatchFromPool = function (slotIdx) {
    if (this.status !== 'playing' || this.isCelebrating) return { ok: false, reason: 'not_playing' };
    var squad = this.visiblePool[slotIdx];
    if (!squad) return { ok: false, reason: 'empty' };
    if (this.dock.length >= this.maxSlots) {
      return { ok: false, reason: 'dock_full' };
    }

    this.saveSnapshot();
    if (this.reserveDeck.length > 0) {
      this.visiblePool[slotIdx] = this.reserveDeck.shift();
    } else {
      this.visiblePool[slotIdx] = null;
    }

    var picked = {
      id: this.nextSquadId++,
      color: squad.color,
      count: squad.count,
      kind: squad.kind || 'normal',
      leadPending: true,
      cooldown: 0.01
    };
    this.dock.push(picked);

    this.stuckTimer = 0;
    this.idleTime = 0;
    this.emitUpdate();
    return { ok: true, squad: picked };
  };

  GameEngine.prototype.hasAdjacentDockColor = function (r, c) {
    if (this.dock.length === 0) return false;
    var dockSet = {};
    for (var i = 0; i < this.dock.length; i += 1) {
      if (this.dock[i].count > 0) dockSet[this.dock[i].color] = true;
    }
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var d = 0; d < 4; d += 1) {
      var nr = r + dirs[d][0];
      var nc = c + dirs[d][1];
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        var nb = this.grid[nr][nc];
        if (nb && dockSet[nb.color]) return true;
      }
    }
    return false;
  };

  GameEngine.prototype.pickTargetForColor = function (color) {
    var best = null;
    var bestScore = -1;
    var prev = this.lastTargetByColor ? this.lastTargetByColor[color] : null;
    for (var i = 0; i < this.exposedList.length; i += 1) {
      var ex = this.exposedList[i];
      var cell = this.grid[ex.r][ex.c];
      if (!cell || cell.layers - (cell.pending || 0) <= 0) continue;
      if (color !== 'RAINBOW' && cell.color !== color) continue;
      var score = ex.r * 2.5 + (ex.cell.key ? 60 : 0) + (this.hasAdjacentObstacle(ex.r, ex.c) ? 18 : 0);
      if (prev) {
        var manDist = Math.abs(ex.r - prev.r) + Math.abs(ex.c - prev.c);
        score += 120 / (1 + manDist);
      }
      if (color === 'RAINBOW' && this.hasAdjacentDockColor(ex.r, ex.c)) {
        score += 40;
      }
      if (score > bestScore) {
        bestScore = score;
        best = { r: ex.r, c: ex.c, cell: cell };
      }
    }
    return best;
  };

  GameEngine.prototype.hasAdjacentObstacle = function (r, c) {
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var d = 0; d < 4; d += 1) {
      var nr = r + dirs[d][0];
      var nc = c + dirs[d][1];
      if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
        var nb = this.grid[nr][nc];
        if (nb && (nb.mud || nb.wrapped)) return true;
      }
    }
    return false;
  };

  /* 沿画框外沿 + 已清空走廊做 BFS 拐弯寻路（在扩展坐标系 -1..rows, -1..cols 上绝不踩到未消方块） */
  GameEngine.prototype.computeGridPath = function (tr, tc) {
    var rows = this.rows;
    var cols = this.cols;
    var extRows = rows + 2; /* r_ext = r + 1，范围 0..rows+1 */
    var extCols = cols + 2; /* c_ext = c + 1，范围 0..cols+1 */
    var targetEr = tr + 1;
    var targetEc = tc + 1;

    /* 三路分流入口：按目标列位置走左/中/右三条包抄走廊，避免全部挤在底边中点 */
    var startEr = rows + 1;
    var startEc;
    if (tc < cols * 0.36) {
      startEc = Math.max(1, Math.floor(cols * 0.2) + 1);
    } else if (tc > cols * 0.64) {
      startEc = Math.min(cols, Math.floor(cols * 0.8) + 1);
    } else {
      startEc = Math.floor(cols / 2) + 1;
    }

    var visited = [];
    var parent = [];
    for (var i = 0; i < extRows; i += 1) {
      visited.push(new Array(extCols));
      parent.push(new Array(extCols));
    }

    var queue = [[startEr, startEc]];
    visited[startEr][startEc] = true;
    parent[startEr][startEc] = null;

    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var head = 0;
    var foundEnd = null;
    while (head < queue.length) {
      var cur = queue[head];
      head += 1;
      var cr = cur[0];
      var cc = cur[1];
      if (Math.abs(cr - targetEr) + Math.abs(cc - targetEc) === 1) {
        foundEnd = [cr, cc];
        break;
      }
      for (var d = 0; d < 4; d += 1) {
        var nr = cr + dirs[d][0];
        var nc = cc + dirs[d][1];
        if (nr < 0 || nr >= extRows || nc < 0 || nc >= extCols) continue;
        if (visited[nr][nc]) continue;
        var gr = nr - 1;
        var gc = nc - 1;
        var isRing = (gr < 0 || gr >= rows || gc < 0 || gc >= cols);
        if (isRing || this.grid[gr][gc] === null) {
          visited[nr][nc] = true;
          parent[nr][nc] = [cr, cc];
          queue.push([nr, nc]);
        }
      }
    }

    if (!foundEnd) {
      return [
        { r: rows - 0.35, c: tc },
        { r: tr + 0.45, c: tc }
      ];
    }

    var rev = [];
    var node = foundEnd;
    while (node) {
      rev.push({ r: node[0] - 1, c: node[1] - 1 });
      node = parent[node[0]][node[1]];
    }
    rev.reverse();

    /* 先压缩共线中间点，再把90度直角拐弯平滑成圆角贝塞尔轨迹 */
    var rawPts = [];
    for (var p = 0; p < rev.length; p += 1) {
      var pt = rev[p];
      var adjR = pt.r < 0 ? -0.9 : (pt.r >= rows ? rows - 0.1 : pt.r);
      var adjC = pt.c < 0 ? -0.9 : (pt.c >= cols ? cols - 0.1 : pt.c);
      if (rawPts.length >= 2) {
        var p0 = rawPts[rawPts.length - 2];
        var p1 = rawPts[rawPts.length - 1];
        var sameR = Math.abs(p0.r - p1.r) < 0.01 && Math.abs(p1.r - adjR) < 0.01;
        var sameC = Math.abs(p0.c - p1.c) < 0.01 && Math.abs(p1.c - adjC) < 0.01;
        if (sameR || sameC) {
          rawPts[rawPts.length - 1] = { r: adjR, c: adjC };
          continue;
        }
      }
      rawPts.push({ r: adjR, c: adjC });
    }
    var lastPt = rawPts[rawPts.length - 1];
    rawPts.push({
      r: lastPt.r * 0.42 + tr * 0.58,
      c: lastPt.c * 0.42 + tc * 0.58
    });

    if (rawPts.length <= 2) return rawPts;

    var smooth = [rawPts[0]];
    for (var s = 1; s < rawPts.length - 1; s += 1) {
      var prev = rawPts[s - 1];
      var curPt = rawPts[s];
      var next = rawPts[s + 1];
      var d1r = curPt.r - prev.r;
      var d1c = curPt.c - prev.c;
      var l1 = Math.sqrt(d1r * d1r + d1c * d1c);
      var d2r = next.r - curPt.r;
      var d2c = next.c - curPt.c;
      var l2 = Math.sqrt(d2r * d2r + d2c * d2c);
      if (l1 < 0.05 || l2 < 0.05) {
        smooth.push(curPt);
        continue;
      }
      var rad = Math.min(0.38, l1 * 0.42, l2 * 0.42);
      var enter = { r: curPt.r - (d1r / l1) * rad, c: curPt.c - (d1c / l1) * rad };
      var exit = { r: curPt.r + (d2r / l2) * rad, c: curPt.c + (d2c / l2) * rad };
      smooth.push(enter);
      smooth.push({
        r: 0.25 * enter.r + 0.5 * curPt.r + 0.25 * exit.r,
        c: 0.25 * enter.c + 0.5 * curPt.c + 0.25 * exit.c
      });
      smooth.push(exit);
    }
    smooth.push(rawPts[rawPts.length - 1]);
    return smooth;
  };

  GameEngine.prototype.spawnAnt = function (r, c, carryColor, kind, squadId, isLeader) {
    var cell = this.grid[r][c];
    if (!cell) return;
    if (this.lastTargetByColor) {
      this.lastTargetByColor[carryColor] = { r: r, c: c };
    }
    var gridPath = this.computeGridPath(r, c);
    cell.pending = (cell.pending || 0) + 1;
    var pathUnits = 1.6;
    for (var p = 0; p < gridPath.length - 1; p += 1) {
      var dr = gridPath[p + 1].r - gridPath[p].r;
      var dc = gridPath[p + 1].c - gridPath[p].c;
      pathUnits += Math.sqrt(dr * dr + dc * dc);
    }
    var outDuration = Math.max(0.58, 0.36 + pathUnits * 0.048);
    var backDuration = Math.max(0.76, outDuration * 1.40);
    this.activeAnts.push({
      r: r,
      c: c,
      color: carryColor,
      kind: kind || 'normal',
      squadId: squadId,
      isLeader: !!isLeader,
      phase: 'to_target',
      progress: 0,
      speedOut: 1 / outDuration,
      speedBack: 1 / backDuration,
      gridPath: gridPath,
      burrowOffsetX: (Math.random() - 0.5) * 26,
      curveOffset: (Math.random() - 0.5) * 18,
      renderAngle: null,
      cachedKey: '',
      cachedPts: null,
      cachedSegLens: null,
      cachedTotalLen: 0
    });
  };

  GameEngine.prototype.spawnFloatText = function (r, c, text, color) {
    this.floatTexts.push({
      r: r,
      c: c,
      text: text,
      color: color || '#ffffff',
      life: 1
    });
    if (this.floatTexts.length > 8) {
      this.floatTexts.shift();
    }
  };

  GameEngine.prototype.unlockAllLocks = function () {
    var unlocked = 0;
    var keyPos = null;
    for (var r = 0; r < this.rows; r += 1) {
      for (var c = 0; c < this.cols; c += 1) {
        var cell = this.grid[r][c];
        if (cell && cell.locked) {
          cell.locked = false;
          unlocked += 1;
          this.spawnParticles(r, c, '#f8cb46', 8);
          if (!keyPos) keyPos = { r: r, c: c };
        }
      }
    }
    if (unlocked > 0) {
      var kr = keyPos ? keyPos.r : Math.floor(this.rows / 2);
      var kc = keyPos ? keyPos.c : Math.floor(this.cols / 2);
      this.shockwaves.push({
        r: kr,
        c: kc,
        maxRadius: 4.5,
        color: '#f8cb46',
        life: 1
      });
      this.spawnFloatText(kr, kc, '🔑 全图解锁!', '#fde047');
      this.shakePower = Math.max(this.shakePower, 2.2);
      if (this.cb.onUnlock) this.cb.onUnlock();
    }
  };

  GameEngine.prototype.crackAdjacentMud = function (r, c, radiusOne) {
    var mudCracked = 0;
    var wrapOpened = 0;
    if (radiusOne) {
      var rMin = Math.max(0, r - 1);
      var rMax = Math.min(this.rows - 1, r + 1);
      var cMin = Math.max(0, c - 1);
      var cMax = Math.min(this.cols - 1, c + 1);
      for (var rr = rMin; rr <= rMax; rr += 1) {
        for (var cc = cMin; cc <= cMax; cc += 1) {
          var tCell = this.grid[rr][cc];
          if (tCell && (tCell.mud || tCell.wrapped)) {
            if (tCell.mud) { tCell.mud = false; mudCracked += 1; this.spawnParticles(rr, cc, '#8f6440', 6); }
            if (tCell.wrapped) { tCell.wrapped = false; wrapOpened += 1; this.spawnParticles(rr, cc, '#f490b3', 6); }
          }
        }
      }
    } else {
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var d = 0; d < 4; d += 1) {
        var nr = r + dirs[d][0];
        var nc = c + dirs[d][1];
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          var nb = this.grid[nr][nc];
          if (nb && (nb.mud || nb.wrapped)) {
            if (nb.mud) { nb.mud = false; mudCracked += 1; this.spawnParticles(nr, nc, '#8f6440', 6); }
            if (nb.wrapped) { nb.wrapped = false; wrapOpened += 1; this.spawnParticles(nr, nc, '#f490b3', 6); }
          }
        }
      }
    }
    if (mudCracked > 0 && this.cb.onMudCrack) this.cb.onMudCrack();
    if (wrapOpened > 0 && this.cb.onWrapOpen) this.cb.onWrapOpen();
  };

  GameEngine.prototype.triggerSpecialSquare = function (r, c, specialKind) {
    if (!specialKind) return;
    if (specialKind === 'bolt') {
      this.lightningArcs.push({ r: r, c: c, life: 1 });
      var rr, cc, target;
      for (cc = 0; cc < this.cols; cc += 1) {
        target = this.grid[r][cc];
        if (target && (target.mud || target.wrapped || target.locked)) {
          if (target.mud) { target.mud = false; this.spawnParticles(r, cc, '#60a5fa', 4); }
          if (target.wrapped) { target.wrapped = false; this.spawnParticles(r, cc, '#f490b3', 4); }
          if (target.locked) { target.locked = false; this.spawnParticles(r, cc, '#fde047', 4); }
        }
      }
      for (rr = 0; rr < this.rows; rr += 1) {
        target = this.grid[rr][c];
        if (target && (target.mud || target.wrapped || target.locked)) {
          if (target.mud) { target.mud = false; this.spawnParticles(rr, c, '#60a5fa', 4); }
          if (target.wrapped) { target.wrapped = false; this.spawnParticles(rr, c, '#f490b3', 4); }
          if (target.locked) { target.locked = false; this.spawnParticles(rr, c, '#fde047', 4); }
        }
      }
      this.spawnParticles(r, c, '#38bdf8', 10, 1.15);
      this.spawnFloatText(r, c, '⚡ 十字电弧!', '#38bdf8');
      this.shakePower = Math.max(this.shakePower, 2.8);
      if (this.cb.onZap) this.cb.onZap();
    } else if (specialKind === 'honey') {
      this.honeySplashes.push({ r: r, c: c, maxRadius: 3.1, life: 1 });
      var rMin = Math.max(0, r - 2);
      var rMax = Math.min(this.rows - 1, r + 2);
      var cMin = Math.max(0, c - 2);
      var cMax = Math.min(this.cols - 1, c + 2);
      for (var hr = rMin; hr <= rMax; hr += 1) {
        for (var hc = cMin; hc <= cMax; hc += 1) {
          var hcCell = this.grid[hr][hc];
          if (hcCell && (hcCell.mud || hcCell.wrapped || hcCell.locked)) {
            if (hcCell.mud) { hcCell.mud = false; this.spawnParticles(hr, hc, '#f59e0b', 4); }
            if (hcCell.wrapped) { hcCell.wrapped = false; this.spawnParticles(hr, hc, '#f490b3', 4); }
            if (hcCell.locked) { hcCell.locked = false; this.spawnParticles(hr, hc, '#fde047', 4); }
          }
        }
      }
      if (!this.feverActive && !this.isCelebrating) {
        this.fever = Math.min(100, this.fever + 20);
        if (this.fever >= 100) {
          this.feverActive = true;
          this.feverTimer = 5.0;
          this.shockwaves.push({ r: r, c: c, maxRadius: 4.2, color: '#f48c2e', life: 1 });
          if (this.cb.onFever) this.cb.onFever();
        }
      }
      this.spawnParticles(r, c, '#fbbf24', 10, 1.05);
      this.spawnFloatText(r, c, '🍯 甜蜜破障!', '#fbbf24');
      this.shakePower = Math.max(this.shakePower, 2.2);
      if (this.cb.onHoney) this.cb.onHoney();
    }
  };

  GameEngine.prototype.spawnParticles = function (r, c, colorHex, count, speedScale) {
    var scale = speedScale || 1;
    for (var i = 0; i < count; i += 1) {
      var ang = (Math.PI * 2 * i) / count + Math.random() * 0.8;
      var spd = (18 + Math.random() * 28) * scale;
      this.particles.push({
        r: r,
        c: c,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 10 * scale,
        life: 1,
        color: colorHex,
        size: (2.5 + Math.random() * 2) * (scale < 0.9 ? 0.85 : 1)
      });
    }
    if (this.particles.length > 180) {
      this.particles.splice(0, this.particles.length - 180);
    }
  };

  GameEngine.prototype.update = function (rawDt) {
    if (this.status !== 'playing') return;

    var dirtyUi = false;
    if (this.feverActive) {
      this.feverTimer -= rawDt;
      if (this.feverTimer <= 0) {
        this.feverActive = false;
        this.feverTimer = 0;
        this.fever = 0;
        dirtyUi = true;
      }
    }

    var dt = rawDt * this.speedMultiplier;

    /* 多槽并发舒缓解压节奏出兵：x1 从容清晰，x2/x3 可主动提速 */
    var anyWorkFound = false;
    var dispatchInterval = 0.098;
    for (var i = 0; i < this.dock.length; i += 1) {
      var sq = this.dock[i];
      if (sq.cooldown > 0) sq.cooldown -= dt;
      if (sq.count <= 0) continue;
      if (sq.cooldown <= 0) {
        var target = this.pickTargetForColor(sq.color);
        if (target) {
          anyWorkFound = true;
          sq.count -= 1;
          sq.cooldown += dispatchInterval;
          if (sq.cooldown < 0) sq.cooldown = dispatchInterval;
          var antKind = (sq.kind === 'bomber' && sq.count === 0) ? 'bomber' : 'normal';
          var isLead = !!sq.leadPending;
          sq.leadPending = false;
          this.spawnAnt(target.r, target.c, target.cell.color, antKind, sq.id, isLead);
          dirtyUi = true;
        }
      } else {
        if (this.exposedColors[sq.color] > 0) anyWorkFound = true;
      }
    }

    /* 一旦小队最后一只蚂蚁出发（count 归零），立刻释放暂存槽位并触发清槽微闪反馈 */
    for (var dIdx = this.dock.length - 1; dIdx >= 0; dIdx -= 1) {
      if (this.dock[dIdx].count <= 0) {
        this.dock.splice(dIdx, 1);
        if (this.cb.onSlotClear) this.cb.onSlotClear(dIdx, this.dock.length);
        dirtyUi = true;
      }
    }

    for (var a = this.activeAnts.length - 1; a >= 0; a -= 1) {
      var ant = this.activeAnts[a];
      var rate = ant.phase === 'to_target' ? ant.speedOut : ant.speedBack;
      ant.progress += dt * rate;
      if (ant.phase === 'to_target' && ant.progress >= 1) {
        ant.phase = 'returning';
        ant.progress = 0;
        var cell = this.grid[ant.r][ant.c];
        if (cell) {
          cell.pending = Math.max(0, (cell.pending || 1) - 1);
          cell.layers -= 1;
          this.doneCarries += 1;
          this.combo += 1;
          this.comboTimer = 4.0;
          var pInfo = global.AntLevels.PALETTE[cell.color];
          var popHex = pInfo ? pInfo.hex : '#ffffff';
          /* 蚂蚁啃咬整块时喷出同色微粒碎屑与白色闪光缩影，强化解压打击感 */
          this.popEffects.push({ r: ant.r, c: ant.c, colorHex: popHex, life: 1 });
          this.spawnParticles(ant.r, ant.c, this.feverActive ? '#f8cb46' : popHex, this.feverActive ? 3 : 2, 0.72);
          if (!this.feverActive && !this.isCelebrating) {
            this.fever = Math.min(100, this.fever + 4.2);
            if (this.fever >= 100) {
              this.feverActive = true;
              this.feverTimer = 5.0;
              this.shockwaves.push({ r: ant.r, c: ant.c, maxRadius: 4.2, color: '#f48c2e', life: 1 });
              this.spawnFloatText(Math.floor(this.rows * 0.45), Math.floor(this.cols * 0.5), '🔥 金色连击!', '#f48c2e');
              this.shakePower = Math.max(this.shakePower, 2.2);
              if (this.cb.onFever) this.cb.onFever();
            }
          }
          if (this.combo === 10 || this.combo === 25 || this.combo === 50 || (this.combo >= 80 && this.combo % 40 === 0)) {
            this.shockwaves.push({ r: ant.r, c: ant.c, maxRadius: 3.0, color: '#f8cb46', life: 1 });
            this.spawnFloatText(ant.r, ant.c, 'x' + this.combo + '!', '#fde047');
            this.shakePower = Math.max(this.shakePower, 1.8);
            if (this.cb.onComboMilestone) this.cb.onComboMilestone(this.combo);
          }
          var isBombStrike = (ant.kind === 'bomber');
          var hitSpecial = cell.special || null;
          cell.special = null;
          if (cell.layers <= 0) {
            var wasKey = cell.key;
            this.galleryGrid[ant.r][ant.c] = cell.origColor;
            this.grid[ant.r][ant.c] = null;
            if (wasKey) this.unlockAllLocks();
            this.crackAdjacentMud(ant.r, ant.c, isBombStrike);
          } else if (isBombStrike) {
            /* 爆破工蚁击中 2 层冰霜块时同样触发 3x3 爆破冲击震碎周围障碍 */
            this.crackAdjacentMud(ant.r, ant.c, true);
          }
          if (hitSpecial) {
            this.triggerSpecialSquare(ant.r, ant.c, hitSpecial);
          }
          if (isBombStrike) {
            this.spawnParticles(ant.r, ant.c, '#ff6b2b', 8);
            this.shockwaves.push({ r: ant.r, c: ant.c, maxRadius: 2.4, color: '#ff6b2b', life: 1 });
            this.spawnFloatText(ant.r, ant.c, '💣 爆破!', '#ff6b2b');
            this.shakePower = Math.max(this.shakePower, 3.6);
            if (this.cb.onBomber) this.cb.onBomber();
          }
          this.refreshExposed();
          if (this.cb.onPick) this.cb.onPick(this.combo);
          dirtyUi = true;
        }
      } else if (ant.phase === 'returning' && ant.progress >= 1) {
        var retPal = global.AntLevels.PALETTE[ant.color];
        var gemHex = retPal ? retPal.hex : '#f48c2e';
        this.ripples.push({ colorHex: gemHex, life: 1 });
        this.burrowPulse = 1;
        this.studioPulse = 1;
        this.activeAnts.splice(a, 1);
        if (this.cb.onReturn) this.cb.onReturn();
        dirtyUi = true;
      }
    }

    if (this.burrowPulse > 0) {
      this.burrowPulse = Math.max(0, this.burrowPulse - rawDt * 4.8);
    }
    if (this.studioPulse > 0) {
      this.studioPulse = Math.max(0, this.studioPulse - rawDt * 4.5);
    }

    for (var ft = this.floatTexts.length - 1; ft >= 0; ft -= 1) {
      this.floatTexts[ft].life -= rawDt * 1.15;
      if (this.floatTexts[ft].life <= 0) this.floatTexts.splice(ft, 1);
    }

    for (var p = this.particles.length - 1; p >= 0; p -= 1) {
      var pt = this.particles[p];
      pt.life -= dt * 1.9;
      pt.vy += dt * 90;
      if (pt.life <= 0) this.particles.splice(p, 1);
    }

    for (var pe = this.popEffects.length - 1; pe >= 0; pe -= 1) {
      this.popEffects[pe].life -= rawDt * 5.8;
      if (this.popEffects[pe].life <= 0) this.popEffects.splice(pe, 1);
    }
    for (var rp = this.ripples.length - 1; rp >= 0; rp -= 1) {
      this.ripples[rp].life -= rawDt * 2.8;
      if (this.ripples[rp].life <= 0) this.ripples.splice(rp, 1);
    }
    for (var sw = this.shockwaves.length - 1; sw >= 0; sw -= 1) {
      this.shockwaves[sw].life -= rawDt * 2.5;
      if (this.shockwaves[sw].life <= 0) this.shockwaves.splice(sw, 1);
    }
    for (var la = this.lightningArcs.length - 1; la >= 0; la -= 1) {
      this.lightningArcs[la].life -= rawDt * 2.4;
      if (this.lightningArcs[la].life <= 0) this.lightningArcs.splice(la, 1);
    }
    for (var hs = this.honeySplashes.length - 1; hs >= 0; hs -= 1) {
      this.honeySplashes[hs].life -= rawDt * 2.0;
      if (this.honeySplashes[hs].life <= 0) this.honeySplashes.splice(hs, 1);
    }
    if (this.shakePower > 0) {
      this.shakePower = Math.max(0, this.shakePower - rawDt * 18);
    }

    /* 只有完全闲置（无在途蚂蚁、无待命干活、未通关）且超过 4 秒才清空连击；同时累计闲置提示计时 */
    if (!this.isCelebrating && this.doneCarries < this.totalCarries && this.activeAnts.length === 0 && !anyWorkFound) {
      var prevIdle = this.idleTime;
      this.idleTime += rawDt;
      if (prevIdle < 4.0 && this.idleTime >= 4.0) {
        dirtyUi = true;
      }
      if (!this.feverActive && this.fever > 0 && this.idleTime > 1.5) {
        this.fever = Math.max(0, this.fever - rawDt * 18);
      }
      if (this.comboTimer > 0) {
        this.comboTimer -= rawDt;
        if (this.comboTimer <= 0) {
          this.combo = 0;
          dirtyUi = true;
        }
      }
    } else {
      if (this.idleTime >= 4.0) dirtyUi = true;
      this.idleTime = 0;
      if (this.combo > 0 && this.comboTimer < 4.0) {
        this.comboTimer = 4.0;
      }
    }

    if (this.doneCarries >= this.totalCarries && this.activeAnts.length === 0) {
      if (!this.isCelebrating) {
        this.isCelebrating = true;
        this.winDelayTimer = 0;
        this.spawnParticles(Math.floor(this.rows * 0.35), Math.floor(this.cols * 0.3), '#f8cb46', 12, 1.15);
        this.spawnParticles(Math.floor(this.rows * 0.35), Math.floor(this.cols * 0.7), '#f472b6', 12, 1.15);
        this.spawnParticles(Math.floor(this.rows * 0.6), Math.floor(this.cols * 0.5), '#6fc3df', 12, 1.15);
        this.spawnFloatText(Math.floor(this.rows * 0.45), Math.floor(this.cols * 0.5), '✨ 搬画完成!', '#f8cb46');
      }
      this.winDelayTimer += rawDt;
      if (this.winDelayTimer >= 0.72) {
        this.isCelebrating = false;
        this.status = 'won';
        if (this.cb.onWin) this.cb.onWin();
        this.emitUpdate();
      }
      return;
    }

    var isDockFull = this.dock.length >= this.maxSlots;
    var hasActiveWork = anyWorkFound || this.activeAnts.length > 0;
    if (isDockFull && !hasActiveWork) {
      var anyMatched = false;
      for (var di = 0; di < this.dock.length; di += 1) {
        if (this.dock[di].count > 0 && this.exposedColors[this.dock[di].color] > 0) {
          anyMatched = true;
          break;
        }
      }
      if (!anyMatched) {
        this.stuckTimer += rawDt;
        if (this.stuckTimer >= 0.5) {
          this.status = 'lost';
          if (this.cb.onLoss) this.cb.onLoss();
          this.emitUpdate();
          return;
        }
      } else {
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }

    if (dirtyUi) this.emitUpdate();
  };

  GameEngine.prototype.emitUpdate = function () {
    if (this.cb.onUpdate) this.cb.onUpdate(this);
  };

  global.AntEngine = GameEngine;
})(window);
