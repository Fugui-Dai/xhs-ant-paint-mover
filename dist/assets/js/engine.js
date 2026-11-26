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
          maxLayers: cell.maxLayers,
          mud: !!cell.mud,
          wrapped: !!cell.wrapped,
          key: !!cell.key,
          locked: !!cell.locked,
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
    this.shakePower = 0;
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
    this.shakePower = 0;
    this.winDelayTimer = 0;
    this.isCelebrating = false;
    this.undoStack = [];
    this.combo = 0;
    this.comboTimer = 0;
    this.toolsUsed = 0;
    this.status = 'playing';
    this.stuckTimer = 0;
    this.nextSquadId = 1;

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
    if (val === 2 || val === 3) this.speedMultiplier = val;
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
    this.dock = snap.dock;
    this.doneCarries = snap.doneCarries;
    /* 保留已解锁的 maxSlots（如已使用扩槽道具，不因撤回而吞掉第6槽） */
    this.activeAnts = [];
    this.popEffects = [];
    this.ripples = [];
    this.shockwaves = [];
    this.shakePower = 0;
    this.winDelayTimer = 0;
    this.isCelebrating = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.stuckTimer = 0;
    this.toolsUsed += 1;
    this.refreshExposed();
    this.emitUpdate();
    return true;
  };

  GameEngine.prototype.expandSlot = function () {
    if (this.status !== 'playing' || this.isCelebrating || this.maxSlots >= (this.baseSlots || 5) + 1) return false;
    this.maxSlots = (this.baseSlots || 5) + 1;
    this.stuckTimer = 0;
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
    this.emitUpdate();
    return true;
  };

  /* 底部全部按钮均可自由点击，无禁用锁死 */
  GameEngine.prototype.dispatchFromPool = function (slotIdx) {
    if (this.status !== 'playing' || this.isCelebrating) return { ok: false, reason: 'not_playing' };
    var squad = this.visiblePool[slotIdx];
    if (!squad) return { ok: false, reason: 'empty' };
    if (this.dock.length >= this.maxSlots) return { ok: false, reason: 'dock_full' };

    this.saveSnapshot();
    var picked = {
      id: this.nextSquadId++,
      color: squad.color,
      count: squad.count,
      kind: squad.kind || 'normal',
      cooldown: 0.05
    };

    if (this.reserveDeck.length > 0) {
      this.visiblePool[slotIdx] = this.reserveDeck.shift();
    } else {
      this.visiblePool[slotIdx] = null;
    }

    this.dock.push(picked);
    this.stuckTimer = 0;
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
    for (var i = 0; i < this.exposedList.length; i += 1) {
      var ex = this.exposedList[i];
      var cell = this.grid[ex.r][ex.c];
      if (!cell || cell.layers - (cell.pending || 0) <= 0) continue;
      if (color !== 'RAINBOW' && cell.color !== color) continue;
      var score = ex.r * 10 + (ex.cell.key ? 35 : 0) + (this.hasAdjacentObstacle(ex.r, ex.c) ? 15 : 0);
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

    /* 起点：底部画框中央（对应蚁洞上方入口） */
    var startEr = rows + 1;
    var startEc = Math.floor(cols / 2) + 1;

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

    /* 压缩共线中间点，让拐弯干净利落 */
    var path = [];
    for (var p = 0; p < rev.length; p += 1) {
      var pt = rev[p];
      /* 外框走道稍微贴近画纸边沿 (0.65 而不是整格中心) */
      var adjR = pt.r < 0 ? -0.9 : (pt.r >= rows ? rows - 0.1 : pt.r);
      var adjC = pt.c < 0 ? -0.9 : (pt.c >= cols ? cols - 0.1 : pt.c);
      path.push({ r: adjR, c: adjC });
    }
    var lastPt = path[path.length - 1];
    path.push({
      r: lastPt.r * 0.42 + tr * 0.58,
      c: lastPt.c * 0.42 + tc * 0.58
    });
    return path;
  };

  GameEngine.prototype.spawnAnt = function (r, c, carryColor, kind, squadId) {
    var cell = this.grid[r][c];
    if (!cell) return;
    var gridPath = this.computeGridPath(r, c);
    cell.pending = (cell.pending || 0) + 1;
    var pathUnits = 2.4;
    for (var p = 0; p < gridPath.length - 1; p += 1) {
      var dr = gridPath[p + 1].r - gridPath[p].r;
      var dc = gridPath[p + 1].c - gridPath[p].c;
      pathUnits += Math.sqrt(dr * dr + dc * dc);
    }
    var outDuration = Math.max(0.85, 0.55 + pathUnits * 0.085);
    var backDuration = outDuration * 1.18;
    this.activeAnts.push({
      r: r,
      c: c,
      color: carryColor,
      kind: kind || 'normal',
      squadId: squadId,
      phase: 'to_target',
      progress: 0,
      speedOut: 1 / outDuration,
      speedBack: 1 / backDuration,
      gridPath: gridPath,
      curveOffset: (Math.random() - 0.5) * 18
    });
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
      this.shockwaves.push({
        r: keyPos ? keyPos.r : Math.floor(this.rows / 2),
        c: keyPos ? keyPos.c : Math.floor(this.cols / 2),
        maxRadius: 4.5,
        color: '#f8cb46',
        life: 1
      });
      this.shakePower = Math.max(this.shakePower, 2.2);
      if (this.cb.onUnlock) this.cb.onUnlock();
    }
  };

  GameEngine.prototype.crackAdjacentMud = function (r, c, radiusOne) {
    var cracked = 0;
    if (radiusOne) {
      var rMin = Math.max(0, r - 1);
      var rMax = Math.min(this.rows - 1, r + 1);
      var cMin = Math.max(0, c - 1);
      var cMax = Math.min(this.cols - 1, c + 1);
      for (var rr = rMin; rr <= rMax; rr += 1) {
        for (var cc = cMin; cc <= cMax; cc += 1) {
          var tCell = this.grid[rr][cc];
          if (tCell && (tCell.mud || tCell.wrapped)) {
            if (tCell.mud) tCell.mud = false;
            if (tCell.wrapped) tCell.wrapped = false;
            cracked += 1;
            this.spawnParticles(rr, cc, '#f490b3', 6);
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
            var pCol = nb.wrapped ? '#f490b3' : '#8f6440';
            if (nb.mud) nb.mud = false;
            if (nb.wrapped) nb.wrapped = false;
            cracked += 1;
            this.spawnParticles(nr, nc, pCol, 6);
          }
        }
      }
    }
    if (cracked > 0 && this.cb.onMudCrack) this.cb.onMudCrack();
  };

  GameEngine.prototype.spawnParticles = function (r, c, colorHex, count) {
    for (var i = 0; i < count; i += 1) {
      var ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      var spd = 18 + Math.random() * 28;
      this.particles.push({
        r: r,
        c: c,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 10,
        life: 1,
        color: colorHex,
        size: 3 + Math.random() * 2
      });
    }
  };

  GameEngine.prototype.update = function (rawDt) {
    if (this.status !== 'playing') return;

    var dt = rawDt * this.speedMultiplier;
    var dirtyUi = false;

    /* 多槽独立错峰并发出兵：各匹配槽位按各自节奏派出蚂蚁，既舒缓又热闹 */
    var anyWorkFound = false;
    var dispatchInterval = 0.36;
    var tickStagger = 0;
    for (var i = 0; i < this.dock.length; i += 1) {
      var sq = this.dock[i];
      if (sq.cooldown > 0) sq.cooldown -= dt;
      if (sq.count <= 0) continue;
      if (sq.cooldown <= 0) {
        if (tickStagger > 0) {
          sq.cooldown = 0.07 * tickStagger;
          tickStagger += 1;
          if (this.exposedColors[sq.color] > 0) anyWorkFound = true;
          continue;
        }
        var target = this.pickTargetForColor(sq.color);
        if (target) {
          anyWorkFound = true;
          sq.count -= 1;
          sq.cooldown = dispatchInterval;
          tickStagger += 1;
          var antKind = (sq.kind === 'bomber' && sq.count === 0) ? 'bomber' : 'normal';
          this.spawnAnt(target.r, target.c, target.cell.color, antKind, sq.id);
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
        if (this.cb.onSlotClear) this.cb.onSlotClear(dIdx);
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
          /* 蚂蚁直接整块夹走：原位仅留极轻柔的取块虚影轮廓，不炸碎 */
          this.popEffects.push({ r: ant.r, c: ant.c, colorHex: popHex, life: 1 });
          if (cell.layers <= 0) {
            var wasKey = cell.key;
            this.galleryGrid[ant.r][ant.c] = cell.origColor;
            this.grid[ant.r][ant.c] = null;
            if (wasKey) this.unlockAllLocks();
            this.crackAdjacentMud(ant.r, ant.c, ant.kind === 'bomber');
            if (ant.kind === 'bomber') {
              this.spawnParticles(ant.r, ant.c, '#ff6b2b', 8);
              this.shockwaves.push({ r: ant.r, c: ant.c, maxRadius: 2.4, color: '#ff6b2b', life: 1 });
              this.shakePower = Math.max(this.shakePower, 3.6);
              if (this.cb.onBomber) this.cb.onBomber();
            }
          }
          this.refreshExposed();
          if (this.cb.onPick) this.cb.onPick(this.combo);
          dirtyUi = true;
        }
      } else if (ant.phase === 'returning' && ant.progress >= 1) {
        var retPal = global.AntLevels.PALETTE[ant.color];
        this.ripples.push({ colorHex: retPal ? retPal.hex : '#f48c2e', life: 1 });
        this.activeAnts.splice(a, 1);
        if (this.cb.onReturn) this.cb.onReturn();
        dirtyUi = true;
      }
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
    if (this.shakePower > 0) {
      this.shakePower = Math.max(0, this.shakePower - rawDt * 18);
    }

    /* 只有完全闲置（无在途蚂蚁、无待命干活、未通关）且超过 4 秒才清空连击，避免 x10/x20 爬行途中自己消失 */
    if (!this.isCelebrating && this.doneCarries < this.totalCarries && this.activeAnts.length === 0 && !anyWorkFound) {
      if (this.comboTimer > 0) {
        this.comboTimer -= rawDt;
        if (this.comboTimer <= 0) {
          this.combo = 0;
          dirtyUi = true;
        }
      }
    } else if (this.combo > 0 && this.comboTimer < 4.0) {
      this.comboTimer = 4.0;
    }

    if (this.doneCarries >= this.totalCarries && this.activeAnts.length === 0) {
      if (!this.isCelebrating) {
        this.isCelebrating = true;
        this.winDelayTimer = 0;
        this.spawnParticles(Math.floor(this.rows * 0.4), Math.floor(this.cols * 0.35), '#f8cb46', 10);
        this.spawnParticles(Math.floor(this.rows * 0.4), Math.floor(this.cols * 0.65), '#f472b6', 10);
      }
      this.winDelayTimer += rawDt;
      if (this.winDelayTimer >= 0.42) {
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
