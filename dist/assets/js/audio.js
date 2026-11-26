/* 舒缓解压 ASMR 木鱼/水滴合成音效（零外部资源，ES2017） */
(function (global) {
  'use strict';

  var ctx = null;
  var enabled = true;
  var lastPickTime = 0;
  var lastReturnTime = 0;

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
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(function () {});
    }
    return ctx;
  }

  function playSoftTone(freq, endFreq, duration, type, gainVal, delay) {
    var ac = ensureContext();
    if (!ac) return;
    var now = ac.currentTime + (delay || 0);
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal || 0.06, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /* 轻柔木块点击音 */
  function playTap() {
    playSoftTone(360, 440, 0.075, 'sine', 0.065, 0);
  }

  /* 解压马林巴/水滴逐格搬运音（双层木鱼泛音 + 五声音阶，连击顺滑不吞音） */
  var PENTATONIC = [329.63, 369.99, 440.0, 493.88, 554.37, 659.25, 739.99, 880.0];
  function playPick(combo) {
    var ac = ensureContext();
    if (!ac) return;
    var nowMs = Date.now();
    if (nowMs - lastPickTime < 42) return;
    lastPickTime = nowMs;
    var idx = (combo || 0) % PENTATONIC.length;
    var note = PENTATONIC[idx];
    playSoftTone(note, note * 1.045, 0.11, 'sine', 0.048, 0);
    playSoftTone(note * 2.02, note * 1.6, 0.034, 'triangle', 0.022, 0);
  }

  /* 搬回蚁洞的轻柔“咕噜”落粒音 */
  function playReturn() {
    var ac = ensureContext();
    if (!ac) return;
    var nowMs = Date.now();
    if (nowMs - lastReturnTime < 85) return;
    lastReturnTime = nowMs;
    playSoftTone(230, 345, 0.055, 'sine', 0.028, 0);
  }

  /* 整支小队清空槽位时的清脆双音叮咚 */
  function playSquadDone() {
    playSoftTone(587.33, 587.33, 0.12, 'sine', 0.045, 0);
    playSoftTone(880.0, 880.0, 0.16, 'sine', 0.045, 0.065);
  }

  /* 泥块碎裂软脆音 */
  function playCrack() {
    playSoftTone(195, 110, 0.11, 'triangle', 0.06, 0);
  }

  /* 爆破/彩虹蚁召唤音 */
  function playBoom() {
    playSoftTone(260, 520, 0.14, 'triangle', 0.065, 0);
    playSoftTone(390, 660, 0.16, 'sine', 0.05, 0.06);
  }

  /* 通关温暖和弦 */
  function playWin() {
    var notes = [392.0, 493.88, 587.33, 783.99];
    for (var i = 0; i < notes.length; i += 1) {
      playSoftTone(notes[i], notes[i], 0.28, 'sine', 0.065, i * 0.11);
    }
  }

  function playFail() {
    playSoftTone(290, 220, 0.18, 'sine', 0.06, 0);
    playSoftTone(220, 175, 0.24, 'sine', 0.055, 0.15);
  }

  global.AntAudio = {
    isEnabled: function () { return enabled; },
    setEnabled: function (val) { enabled = !!val; },
    playTap: playTap,
    playPick: playPick,
    playReturn: playReturn,
    playSquadDone: playSquadDone,
    playCrack: playCrack,
    playBoom: playBoom,
    playWin: playWin,
    playFail: playFail
  };
})(window);
