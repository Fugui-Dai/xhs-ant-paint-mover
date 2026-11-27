/* 多风味纯离线拟真物理共鸣 ASMR 音效引擎（含默认搞笑打击音，6套全场景定制，ES2017） */
(function (global) {
  'use strict';

  var SOUND_PACKS = [
    { id: 'pudding', name: '🤡 搞笑打击音', desc: '极速啵啵连发 · 充气锤/橡皮鸭' },
    { id: 'marimba', name: '🎵 马林巴木琴', desc: '温暖共鸣木琴音 · 柔和不刺耳' },
    { id: 'mechanical', name: '⌨️ 机械青轴', desc: '双段脆爽敲击 · 麻将碰牌感' },
    { id: 'soda', name: '🍹 啵啵汽水', desc: 'Q弹气泡弯音 + 碳酸微泡声' },
    { id: 'musicbox', name: '🎹 水晶八音盒', desc: '清透钟琴泛音 · 梦幻余韵' },
    { id: 'retro', name: '🕹️ 复古 8-Bit', desc: '掌机经典方波跳音与琶音' }
  ];

  var ctx = null;
  var noiseBuffer = null;
  var enabled = true;
  var selectedPack = 'pudding';
  var lastPickTime = 0;
  var lastReturnTime = 0;

  var PENTATONIC = [329.63, 369.99, 440.0, 493.88, 554.37, 659.25, 739.99, 880.0, 987.77, 1108.73, 1318.51, 1479.98];

  function isValidPack(packId) {
    for (var i = 0; i < SOUND_PACKS.length; i += 1) {
      if (SOUND_PACKS[i].id === packId) return true;
    }
    return false;
  }

  function humanize(val, ratio) {
    return val * (1 + (Math.random() * 2 - 1) * (ratio || 0.008));
  }

  function ensureContext() {
    if (!enabled) return null;
    if (!ctx) {
      var AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        ctx = new AudioCtx();
      } catch (e) {
        return null;
      }
    }
    if (ctx && (ctx.state === 'suspended' || ctx.state === 'interrupted') && typeof ctx.resume === 'function') {
      ctx.resume().catch(function () {});
    }
    if (ctx && !noiseBuffer && typeof ctx.createBuffer === 'function') {
      try {
        var len = Math.floor(ctx.sampleRate * 0.16);
        noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = noiseBuffer.getChannelData(0);
        for (var i = 0; i < len; i += 1) {
          data[i] = Math.random() * 2 - 1;
        }
      } catch (e2) {
        noiseBuffer = null;
      }
    }
    return ctx;
  }

  function unlock() {
    var ac = ensureContext();
    if (!ac) return;
    if ((ac.state === 'suspended' || ac.state === 'interrupted') && typeof ac.resume === 'function') {
      ac.resume().catch(function () {});
    }
  }

  /* 带可选低通共鸣腔滤波的拟真发声管线（Chrome 61 Web Audio v1 全兼容） */
  function playResonantTone(freq, endFreq, duration, type, gainVal, delay, lpFreq, qVal) {
    var ac = ensureContext();
    if (!ac) return;
    var now = ac.currentTime + (delay || 0);
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(Math.max(40, freq), now);
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal || 0.06, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    if (lpFreq && typeof ac.createBiquadFilter === 'function') {
      var flt = ac.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(lpFreq, now);
      flt.Q.setValueAtTime(qVal || 1.2, now);
      osc.connect(flt);
      flt.connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration + 0.025);
  }

  function playFilteredNoise(centerFreq, qVal, duration, gainVal, delay) {
    var ac = ensureContext();
    if (!ac || !noiseBuffer) return;
    var now = ac.currentTime + (delay || 0);
    var src = ac.createBufferSource();
    src.buffer = noiseBuffer;
    var filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq || 2200, now);
    filter.Q.setValueAtTime(qVal || 2.8, now);
    var gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal || 0.08, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start(now);
    src.stop(now + duration + 0.015);
  }

  /* 搞笑橡皮鸭“啾咪”双段弯音 */
  function playRubberSqueak(baseFreq, gainVal, delay) {
    var d = delay || 0;
    var f0 = baseFreq || 1120;
    var g = gainVal || 0.048;
    playResonantTone(f0, f0 * 1.44, 0.045, 'sawtooth', g, d, f0 * 2.2, 4.2);
    playResonantTone(f0 * 1.44, f0 * 0.9, 0.062, 'triangle', g * 0.95, d + 0.042, f0 * 2.0, 3.6);
  }

  /* 搞笑充气锤“啪咚”弹性重击 */
  function playMalletBonk(gainVal, delay) {
    var d = delay || 0;
    var g = gainVal || 0.08;
    playResonantTone(440, 108, 0.095, 'sine', g * 1.1, d, 1600, 2.2);
    playResonantTone(680, 310, 0.055, 'triangle', g * 0.55, d + 0.006, 2200, 1.8);
    playFilteredNoise(2150, 2.4, 0.02, g * 0.72, d);
  }

  /* 滑稽卡通弹簧“duang~” */
  function playComicBoing(baseFreq, gainVal, delay) {
    var d = delay || 0;
    var f0 = baseFreq || 340;
    var g = gainVal || 0.056;
    playResonantTone(f0, f0 * 1.62, 0.055, 'sine', g, d, 2400, 2.6);
    playResonantTone(f0 * 1.52, f0 * 0.88, 0.06, 'triangle', g * 0.78, d + 0.048, 2200, 2.4);
    playResonantTone(f0 * 0.94, f0 * 1.38, 0.075, 'sine', g * 0.62, d + 0.1, 2400, 2.2);
  }

  function playNoteForPack(noteFreq, comboGain, packOverride, delay, jitter) {
    var pack = packOverride || selectedPack;
    var f = jitter ? humanize(noteFreq, 0.008) : noteFreq;
    var g = jitter ? humanize(comboGain || 0.06, 0.05) : (comboGain || 0.06);
    var d = delay || 0;
    if (pack === 'pudding') {
      /* 搞笑魔性连射：马可同款卡通嘴啵/吐豆极速上扬“啵！”+ 脆口弹唇瞬态 */
      playResonantTone(Math.max(130, f * 0.44), Math.min(2200, f * 1.56), 0.056, 'sine', g * 1.2, d, Math.min(2800, f * 2.4), 3.1);
      playFilteredNoise(1850 + (f % 700), 3.0, 0.013, g * 0.68, d);
    } else if (pack === 'mechanical') {
      /* 机械青轴 / 麻将碰牌：前段高频 click 音头 + 后段 PBT 腔体触底闷响 */
      playFilteredNoise(3500 + (f % 900), 3.6, 0.014, g * 1.5, d);
      playResonantTone(Math.min(1900, f * 1.52), Math.min(820, f * 0.64), 0.044, 'triangle', g * 0.96, d + 0.004, 1550, 2.1);
      playFilteredNoise(1450 + (f % 400), 2.2, 0.026, g * 0.65, d + 0.008);
    } else if (pack === 'soda') {
      /* 啵啵汽水：高弹性上升气泡啵声 + 碳酸细密高频微泡尾音 */
      playResonantTone(f * 0.58, Math.min(2400, f * 1.48), 0.088, 'sine', g * 1.08, d, 2800, 1.5);
      playFilteredNoise(4500, 4.8, 0.036, g * 0.48, d + 0.018);
    } else if (pack === 'musicbox') {
      /* 水晶八音盒：纯净高音主频 + 2.76x 钟琴金属泛音 + 极轻拨片瞬态 */
      var hi = Math.min(3200, f * 1.5);
      playResonantTone(hi, hi, 0.25, 'sine', g * 0.86, d, 5200, 1.0);
      playResonantTone(Math.min(5800, hi * 2.76), Math.min(5800, hi * 2.76), 0.13, 'triangle', g * 0.24, d, 6200, 1.2);
      playFilteredNoise(4200, 3.8, 0.012, g * 0.24, d);
    } else if (pack === 'retro') {
      /* 复古 8-Bit：经典掌机方波滑音 + 柔化低通防手机刺耳 */
      playResonantTone(f, f * 1.12, 0.072, 'square', g * 0.42, d, 3200, 1.1);
    } else {
      /* 红木马林巴：温润基频木腔 + 3.98x 木槌四倍泛音短冲击 + 轻木敲音头 */
      playResonantTone(f, f * 1.02, 0.115, 'sine', g * 1.05, d, 2400, 1.4);
      playResonantTone(Math.min(4600, f * 3.98), Math.min(3200, f * 3.4), 0.022, 'triangle', g * 0.34, d, 3800, 1.0);
      playFilteredNoise(1800, 2.6, 0.015, g * 0.32, d);
    }
  }

  function playTap() {
    if (selectedPack === 'pudding') {
      /* 清脆橡皮塞拔出“啵！”+ 轻弹尾音 */
      playResonantTone(240, 880, 0.056, 'sine', 0.075, 0, 2400, 2.8);
      playResonantTone(680, 410, 0.04, 'triangle', 0.032, 0.024, 2000, 1.8);
      playFilteredNoise(2100, 2.6, 0.014, 0.036, 0);
    } else if (selectedPack === 'mechanical') {
      playFilteredNoise(3400, 3.4, 0.014, 0.088, 0);
      playResonantTone(880, 410, 0.036, 'triangle', 0.048, 0.004, 1500, 2.0);
    } else if (selectedPack === 'soda') {
      playResonantTone(320, 660, 0.072, 'sine', 0.062, 0, 2600, 1.4);
      playFilteredNoise(4400, 4.5, 0.024, 0.028, 0.016);
    } else if (selectedPack === 'musicbox') {
      playResonantTone(1046.5, 1046.5, 0.15, 'sine', 0.052, 0, 4800, 1.0);
      playResonantTone(2888, 2888, 0.07, 'triangle', 0.016, 0, 5600, 1.0);
    } else if (selectedPack === 'retro') {
      playResonantTone(440, 660, 0.062, 'square', 0.03, 0, 3000, 1.0);
    } else {
      playResonantTone(392, 440, 0.08, 'sine', 0.065, 0, 2200, 1.3);
      playFilteredNoise(1800, 2.4, 0.014, 0.022, 0);
    }
  }

  function playPick(combo) {
    var ac = ensureContext();
    if (!ac) return;
    var nowMs = Date.now();
    if (nowMs - lastPickTime < 36) return;
    lastPickTime = nowMs;
    var idx = Math.min(PENTATONIC.length - 1, Math.floor((combo || 0) / 2)) % PENTATONIC.length;
    if ((combo || 0) > 24) idx = ((combo || 0) % PENTATONIC.length);
    playNoteForPack(PENTATONIC[idx], 0.062, selectedPack, 0, true);
  }

  function playReturn() {
    var ac = ensureContext();
    if (!ac) return;
    var nowMs = Date.now();
    if (nowMs - lastReturnTime < 95) return;
    lastReturnTime = nowMs;
    if (selectedPack === 'pudding') {
      playResonantTone(210, 520, 0.048, 'sine', 0.042, 0, 1800, 2.4);
    } else if (selectedPack === 'mechanical') {
      playFilteredNoise(1650, 2.6, 0.022, 0.046, 0);
      playResonantTone(360, 220, 0.032, 'triangle', 0.026, 0.003, 1200, 1.5);
    } else if (selectedPack === 'soda') {
      playResonantTone(420, 760, 0.05, 'sine', 0.028, 0, 2600, 1.2);
    } else if (selectedPack === 'musicbox') {
      playResonantTone(1174.66, 1174.66, 0.085, 'sine', 0.025, 0, 4600, 1.0);
    } else if (selectedPack === 'retro') {
      playResonantTone(330, 495, 0.04, 'square', 0.016, 0, 2800, 1.0);
    } else {
      playResonantTone(260, 360, 0.058, 'sine', 0.026, 0, 1800, 1.2);
    }
  }

  function playComboMilestone() {
    if (selectedPack === 'pudding') {
      playRubberSqueak(1120, 0.052, 0);
      playRubberSqueak(1380, 0.048, 0.075);
      return;
    }
    playNoteForPack(783.99, 0.058, selectedPack, 0, false);
    playNoteForPack(1174.66, 0.062, selectedPack, 0.055, false);
  }

  function playSquadDone() {
    if (selectedPack === 'pudding') {
      playNoteForPack(587.33, 0.052, 'pudding', 0, false);
      playNoteForPack(880.0, 0.054, 'pudding', 0.048, false);
      playRubberSqueak(1240, 0.042, 0.095);
      return;
    }
    if (selectedPack === 'musicbox') {
      playNoteForPack(587.33, 0.048, 'musicbox', 0, false);
      playNoteForPack(880.0, 0.05, 'musicbox', 0.055, false);
      playNoteForPack(1174.66, 0.046, 'musicbox', 0.11, false);
      return;
    }
    playNoteForPack(587.33, 0.05, selectedPack, 0, false);
    playNoteForPack(880.0, 0.052, selectedPack, 0.065, false);
  }

  function playCrack() {
    if (selectedPack === 'pudding') {
      playMalletBonk(0.076, 0);
    } else if (selectedPack === 'mechanical') {
      playFilteredNoise(2900, 2.8, 0.022, 0.075, 0);
      playFilteredNoise(1900, 2.2, 0.032, 0.06, 0.03);
      playResonantTone(320, 160, 0.06, 'triangle', 0.05, 0, 1400, 1.8);
    } else if (selectedPack === 'soda') {
      playResonantTone(280, 580, 0.07, 'sine', 0.056, 0, 2600, 1.4);
      playFilteredNoise(4200, 3.6, 0.055, 0.05, 0.015);
    } else if (selectedPack === 'musicbox') {
      playNoteForPack(659.25, 0.046, 'musicbox', 0, false);
      playNoteForPack(493.88, 0.042, 'musicbox', 0.04, false);
    } else if (selectedPack === 'retro') {
      playResonantTone(240, 110, 0.09, 'square', 0.036, 0, 2200, 1.0);
      playFilteredNoise(1400, 1.8, 0.05, 0.045, 0);
    } else {
      playFilteredNoise(1400, 2.0, 0.065, 0.055, 0);
      playResonantTone(220, 125, 0.10, 'triangle', 0.055, 0, 1400, 1.4);
    }
  }

  function playWrapOpen() {
    if (selectedPack === 'pudding') {
      playComicBoing(340, 0.058, 0);
    } else if (selectedPack === 'mechanical') {
      playFilteredNoise(3600, 3.0, 0.025, 0.068, 0);
      playNoteForPack(659.25, 0.05, 'mechanical', 0.025, false);
    } else if (selectedPack === 'soda') {
      playResonantTone(360, 920, 0.085, 'sine', 0.058, 0, 3200, 1.4);
      playFilteredNoise(4800, 4.4, 0.045, 0.042, 0.02);
    } else if (selectedPack === 'musicbox') {
      playNoteForPack(880.0, 0.05, 'musicbox', 0, false);
      playNoteForPack(1318.51, 0.052, 'musicbox', 0.045, false);
    } else if (selectedPack === 'retro') {
      playResonantTone(440, 880, 0.075, 'square', 0.032, 0, 3000, 1.0);
    } else {
      playFilteredNoise(3000, 2.4, 0.045, 0.042, 0);
      playResonantTone(440, 760, 0.085, 'sine', 0.052, 0, 2600, 1.2);
    }
  }

  function playFever() {
    if (selectedPack === 'pudding') {
      var pf = [523.25, 659.25, 783.99, 1046.5];
      for (var pfi = 0; pfi < pf.length; pfi += 1) {
        playNoteForPack(pf[pfi], 0.058, 'pudding', pfi * 0.045, false);
      }
      playRubberSqueak(1280, 0.052, 0.19);
      return;
    }
    var fNotes = selectedPack === 'musicbox'
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
      : [523.25, 659.25, 783.99, 1046.5];
    for (var fi = 0; fi < fNotes.length; fi += 1) {
      playNoteForPack(fNotes[fi], 0.054, selectedPack, fi * 0.048, false);
    }
  }

  function playBoom() {
    if (selectedPack === 'pudding') {
      playMalletBonk(0.09, 0);
      playRubberSqueak(1260, 0.05, 0.065);
    } else if (selectedPack === 'mechanical') {
      playFilteredNoise(1200, 1.5, 0.11, 0.088, 0);
      playResonantTone(280, 110, 0.12, 'triangle', 0.07, 0, 1100, 1.8);
      playFilteredNoise(3200, 3.0, 0.03, 0.06, 0.02);
    } else if (selectedPack === 'soda') {
      playResonantTone(220, 620, 0.13, 'sine', 0.072, 0, 2600, 1.5);
      playFilteredNoise(4200, 3.2, 0.12, 0.062, 0.02);
    } else if (selectedPack === 'musicbox') {
      playNoteForPack(523.25, 0.06, 'musicbox', 0, false);
      playNoteForPack(659.25, 0.056, 'musicbox', 0.03, false);
      playNoteForPack(1046.5, 0.062, 'musicbox', 0.06, false);
    } else if (selectedPack === 'retro') {
      playResonantTone(220, 65, 0.15, 'square', 0.044, 0, 1800, 1.0);
      playFilteredNoise(720, 1.2, 0.13, 0.065, 0);
    } else {
      playFilteredNoise(680, 1.3, 0.13, 0.075, 0);
      playResonantTone(260, 520, 0.14, 'triangle', 0.06, 0, 1800, 1.4);
      playResonantTone(390, 660, 0.15, 'sine', 0.048, 0.055, 2200, 1.2);
    }
  }

  function playZap() {
    if (selectedPack === 'pudding') {
      playComicBoing(520, 0.056, 0);
      playRubberSqueak(1460, 0.046, 0.085);
    } else if (selectedPack === 'retro') {
      playResonantTone(980, 320, 0.09, 'square', 0.036, 0, 3200, 1.0);
      playResonantTone(640, 1480, 0.09, 'square', 0.032, 0.045, 3400, 1.0);
    } else if (selectedPack === 'musicbox') {
      playNoteForPack(1046.5, 0.052, 'musicbox', 0, false);
      playNoteForPack(1318.51, 0.052, 'musicbox', 0.035, false);
      playNoteForPack(1567.98, 0.054, 'musicbox', 0.07, false);
    } else {
      playFilteredNoise(3600, 3.5, 0.09, 0.062, 0);
      playResonantTone(680, 1280, 0.09, 'triangle', 0.052, 0, 3400, 1.4);
      playResonantTone(960, 1480, 0.11, 'sine', 0.045, 0.04, 3800, 1.2);
    }
  }

  function playHoney() {
    if (selectedPack === 'pudding') {
      playNoteForPack(523.25, 0.058, 'pudding', 0, false);
      playNoteForPack(783.99, 0.06, 'pudding', 0.055, false);
      playComicBoing(420, 0.052, 0.11);
    } else if (selectedPack === 'soda') {
      playResonantTone(350, 660, 0.10, 'sine', 0.06, 0, 2600, 1.4);
      playResonantTone(520, 940, 0.12, 'sine', 0.054, 0.048, 2800, 1.3);
      playResonantTone(780, 560, 0.07, 'triangle', 0.032, 0.095, 2400, 1.2);
    } else if (selectedPack === 'retro') {
      playResonantTone(523.25, 783.99, 0.08, 'square', 0.032, 0, 2800, 1.0);
      playResonantTone(659.25, 1046.5, 0.10, 'square', 0.032, 0.06, 3000, 1.0);
    } else {
      playNoteForPack(440, 0.055, selectedPack, 0, false);
      playNoteForPack(659.25, 0.056, selectedPack, 0.055, false);
      playNoteForPack(880, 0.052, selectedPack, 0.11, false);
    }
  }

  function playWin() {
    if (selectedPack === 'pudding') {
      var wn = [440, 554.37, 659.25, 880, 1108.73];
      for (var wi = 0; wi < wn.length; wi += 1) {
        playNoteForPack(wn[wi], 0.062, 'pudding', wi * 0.058, false);
      }
      playRubberSqueak(1180, 0.05, 0.31);
      playRubberSqueak(1420, 0.052, 0.39);
      return;
    }
    var notes = selectedPack === 'musicbox'
      ? [392.0, 493.88, 587.33, 783.99, 987.77, 1174.66]
      : [392.0, 493.88, 587.33, 783.99, 987.77];
    for (var i = 0; i < notes.length; i += 1) {
      playNoteForPack(notes[i], 0.065, selectedPack, i * 0.088, false);
    }
  }

  function playFail() {
    if (selectedPack === 'pudding') {
      playResonantTone(520, 145, 0.22, 'sine', 0.065, 0, 1800, 2.2);
      playMalletBonk(0.056, 0.18);
    } else if (selectedPack === 'retro') {
      playResonantTone(310, 220, 0.14, 'square', 0.032, 0, 2200, 1.0);
      playResonantTone(220, 140, 0.20, 'square', 0.03, 0.13, 1800, 1.0);
    } else {
      playResonantTone(290, 215, 0.18, 'sine', 0.06, 0, 1600, 1.2);
      playResonantTone(215, 165, 0.24, 'sine', 0.055, 0.15, 1400, 1.2);
    }
  }

  function playPackPreview(packId) {
    var p = isValidPack(packId) ? packId : selectedPack;
    if (p === 'pudding') {
      var rapid = [440, 554.37, 659.25, 880, 1108.73];
      for (var ri = 0; ri < rapid.length; ri += 1) {
        playNoteForPack(rapid[ri], 0.062, 'pudding', ri * 0.052, false);
      }
      playRubberSqueak(1260, 0.05, 0.28);
      return;
    }
    var demo = p === 'musicbox'
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
      : [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < demo.length; i += 1) {
      playNoteForPack(demo[i], 0.06, p, i * 0.07, false);
    }
  }

  global.AntAudio = {
    SOUND_PACKS: SOUND_PACKS,
    isEnabled: function () { return enabled; },
    setEnabled: function (val) { enabled = !!val; },
    getSoundPack: function () { return selectedPack; },
    setSoundPack: function (packId) {
      selectedPack = isValidPack(packId) ? packId : 'pudding';
    },
    playPackPreview: playPackPreview,
    unlock: unlock,
    playTap: playTap,
    playPick: playPick,
    playReturn: playReturn,
    playComboMilestone: playComboMilestone,
    playSquadDone: playSquadDone,
    playCrack: playCrack,
    playWrapOpen: playWrapOpen,
    playFever: playFever,
    playBoom: playBoom,
    playZap: playZap,
    playHoney: playHoney,
    playWin: playWin,
    playFail: playFail
  };
})(window);
