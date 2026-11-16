'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function Splash() {
  const [visible, setVisible] = useState(false);
  const [fade, setFade] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const hideTimer = useRef(null);
  const fadeTimer = useRef(null);
  const audioRef = useRef(null);
  const audioStopTimer = useRef(null);
  const soundOnRef = useRef(false);

  const playIntro = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (audioStopTimer.current) window.clearTimeout(audioStopTimer.current);
      if (audioRef.current) {
        try { audioRef.current.close(); } catch (e) {}
      }
      const ctx = new AudioCtx();
      audioRef.current = ctx;
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.32, now + 0.35);
      master.gain.setValueAtTime(0.32, now + 3.8);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 4.9);
      master.connect(ctx.destination);

      // Original synthesized cinematic fanfare with a soft stadium-like crowd swell.
      const notes = [110, 164.81, 220, 329.63, 440];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i < 2 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.42);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.setValueAtTime(0.0001, now + i * 0.42);
        gain.gain.exponentialRampToValueAtTime(i < 2 ? 0.16 : 0.09, now + i * 0.42 + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.9);
        osc.connect(gain); gain.connect(master);
        osc.start(now + i * 0.42); osc.stop(now + 5);
      });

      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(55, now);
      bass.frequency.exponentialRampToValueAtTime(38, now + 0.8);
      bassGain.gain.setValueAtTime(0.0001, now);
      bassGain.gain.exponentialRampToValueAtTime(0.42, now + 0.12);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
      bass.connect(bassGain); bassGain.connect(master);
      bass.start(now); bass.stop(now + 1.3);

      const buffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.22;
      const noise = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const crowdGain = ctx.createGain();
      noise.buffer = buffer;
      filter.type = 'bandpass'; filter.frequency.value = 850; filter.Q.value = 0.6;
      crowdGain.gain.setValueAtTime(0.0001, now);
      crowdGain.gain.linearRampToValueAtTime(0.07, now + 1.2);
      crowdGain.gain.setValueAtTime(0.07, now + 3.6);
      crowdGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.9);
      noise.connect(filter); filter.connect(crowdGain); crowdGain.connect(master);
      noise.start(now); noise.stop(now + 5);
      ctx.resume().catch(() => {});
      audioStopTimer.current = window.setTimeout(() => {
        if (audioRef.current === ctx) {
          ctx.close().catch(() => {});
          audioRef.current = null;
        }
      }, 5400);
    } catch (e) {
      // Audio is optional; the welcome animation still works if the browser blocks it.
    }
  }, []);

  const showWelcome = useCallback((playSound = true) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    setFade(false);
    setVisible(true);
    if (playSound && soundOnRef.current) playIntro();
    fadeTimer.current = window.setTimeout(() => setFade(true), 4500);
    hideTimer.current = window.setTimeout(() => setVisible(false), 5200);
  }, [playIntro]);

  useEffect(() => {
    // Sound starts muted on each fresh page visit until the visitor taps the sound button.
    soundOnRef.current = false;
    setSoundOn(false);
    showWelcome(false);

    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAt && Date.now() - hiddenAt > 800) {
        showWelcome(true);
        hiddenAt = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
      if (audioStopTimer.current) window.clearTimeout(audioStopTimer.current);
      if (audioRef.current) audioRef.current.close().catch(() => {});
    };
  }, [showWelcome]);

  const toggleSound = () => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    if (next) playIntro();
    else if (audioRef.current) {
      audioRef.current.close().catch(() => {});
      audioRef.current = null;
    }
  };

  if (!visible) return null;
  return (
    <div className={'splash' + (fade ? ' fade' : '')} role="dialog" aria-label="Welcome to BGL Season 1">
      <div className="sp-in">
        <div className="sp-kicker">BATTAGRAM JUNIOR LEAGUE</div>
        <div className="sp-t">WELCOME TO<br /><span>BGL SEASON 1</span></div>
        <div className="sp-line" />
        <div className="sp-s">THE GAME BEGINS HERE</div>
      </div>
      <button className="sp-sound" onClick={toggleSound} type="button" aria-label={soundOn ? 'Turn welcome sound off' : 'Turn welcome sound on'}>
        {soundOn ? '🔊 SOUND ON' : '🔇 SOUND OFF · TAP TO ENABLE'}
      </button>
      <div className="sp-organizer"><small>ORGANIZED BY</small><strong>FALAK QURESHI</strong></div>
    </div>
  );
}
