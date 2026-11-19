'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Splash() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fade, setFade] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [phase, setPhase] = useState(0);
  const phaseTimer = useRef(null);
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
      master.gain.exponentialRampToValueAtTime(0.24, now + 0.8);
      master.gain.setValueAtTime(0.24, now + 4.8);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);
      master.connect(ctx.destination);

      // Original 12-second cinematic sports intro: layered brass-like synth,
      // rising pads, low impact drums and a soft crowd-style noise swell.
      const chordProgression = [
        [110, 164.81, 220, 329.63],
        [98, 146.83, 196, 293.66],
        [130.81, 196, 261.63, 392],
        [110, 164.81, 220, 329.63]
      ];
      chordProgression.forEach((chord, section) => {
        chord.forEach((freq, index) => {
          const start = now + section * 1.25 + index * 0.07;
          const osc = ctx.createOscillator();
          const voice = ctx.createGain();
          const tone = ctx.createBiquadFilter();
          osc.type = index < 2 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          tone.type = 'lowpass';
          tone.frequency.setValueAtTime(index < 2 ? 520 : 1450, start);
          tone.frequency.linearRampToValueAtTime(index < 2 ? 900 : 2200, start + 1.45);
          voice.gain.setValueAtTime(0.0001, start);
          voice.gain.exponentialRampToValueAtTime(index < 2 ? 0.075 : 0.045, start + 0.4);
          voice.gain.setValueAtTime(index < 2 ? 0.075 : 0.045, start + 1.0);
          voice.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
          osc.connect(tone); tone.connect(voice); voice.connect(master);
          osc.start(start); osc.stop(start + 1.25);
        });
      });

      // Deep, spaced cinematic impacts.
      [0.12, 1.55, 3.0, 4.25].forEach((offset, index) => {
        const start = now + offset;
        const drum = ctx.createOscillator();
        const drumGain = ctx.createGain();
        drum.type = 'sine';
        drum.frequency.setValueAtTime(105 - index * 8, start);
        drum.frequency.exponentialRampToValueAtTime(38, start + 0.48);
        drumGain.gain.setValueAtTime(0.0001, start);
        drumGain.gain.exponentialRampToValueAtTime(0.36, start + 0.025);
        drumGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.72);
        drum.connect(drumGain); drumGain.connect(master);
        drum.start(start); drum.stop(start + 0.75);
      });

      // Short snare-like accents add a stadium entrance rhythm.
      [0.9, 2.1, 3.3, 4.5].forEach((offset) => {
        const start = now + offset;
        const length = Math.floor(ctx.sampleRate * 0.24);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const hit = ctx.createGain();
        source.buffer = buffer;
        filter.type = 'highpass'; filter.frequency.value = 950;
        hit.gain.setValueAtTime(0.0001, start);
        hit.gain.exponentialRampToValueAtTime(0.10, start + 0.015);
        hit.gain.exponentialRampToValueAtTime(0.0001, start + 0.23);
        source.connect(filter); filter.connect(hit); hit.connect(master);
        source.start(start);
      });

      // Gentle crowd-like ambience, kept subtle under the main music.
      const ambienceBuffer = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
      const ambienceData = ambienceBuffer.getChannelData(0);
      for (let i = 0; i < ambienceData.length; i++) ambienceData[i] = (Math.random() * 2 - 1) * 0.18;
      const ambience = ctx.createBufferSource();
      const ambienceFilter = ctx.createBiquadFilter();
      const ambienceGain = ctx.createGain();
      ambience.buffer = ambienceBuffer;
      ambienceFilter.type = 'bandpass'; ambienceFilter.frequency.value = 1050; ambienceFilter.Q.value = 0.45;
      ambienceGain.gain.setValueAtTime(0.0001, now);
      ambienceGain.gain.linearRampToValueAtTime(0.035, now + 2.2);
      ambienceGain.gain.setValueAtTime(0.035, now + 4.8);
      ambienceGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);
      ambience.connect(ambienceFilter); ambienceFilter.connect(ambienceGain); ambienceGain.connect(master);
      ambience.start(now); ambience.stop(now + 6);

      // Bright final lift before the welcome screen fades away.
      [659.25, 783.99, 987.77].forEach((freq, index) => {
        const start = now + 3.7 + index * 0.1;
        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bell.type = 'sine'; bell.frequency.value = freq;
        bellGain.gain.setValueAtTime(0.0001, start);
        bellGain.gain.exponentialRampToValueAtTime(0.035, start + 0.18);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, start + 2.1);
        bell.connect(bellGain); bellGain.connect(master);
        bell.start(start); bell.stop(start + 1.65);
      });

      ctx.resume().catch(() => {});
      audioStopTimer.current = window.setTimeout(() => {
        if (audioRef.current === ctx) {
          ctx.close().catch(() => {});
          audioRef.current = null;
        }
      }, 6400);
    } catch (e) {
      // Audio is optional; the welcome animation still works if the browser blocks it.
    }
  }, []);

  const showWelcome = useCallback((playSound = true) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    if (phaseTimer.current) window.clearTimeout(phaseTimer.current);
    setPhase(0);
    setFade(false);
    setVisible(true);
    if (playSound && soundOnRef.current) playIntro();
    phaseTimer.current = window.setTimeout(() => setPhase(2), 4000);
    fadeTimer.current = window.setTimeout(() => setFade(true), 5800);
    hideTimer.current = window.setTimeout(() => setVisible(false), 6000);
  }, [playIntro]);

  useEffect(() => {
    if (pathname !== '/') {
      setVisible(false);
      return;
    }
    // Attempt sound automatically on each welcome screen. Browsers may require a tap.
    soundOnRef.current = true;
    setSoundOn(true);
    showWelcome(true);

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
      if (phaseTimer.current) window.clearTimeout(phaseTimer.current);
      if (audioStopTimer.current) window.clearTimeout(audioStopTimer.current);
      if (audioRef.current) audioRef.current.close().catch(() => {});
    };
  }, [pathname, showWelcome]);

  const toggleSound = () => {
    // If autoplay was blocked, the first tap unlocks audio rather than turning it off.
    if (soundOnRef.current && (!audioRef.current || audioRef.current.state === 'suspended')) {
      playIntro();
      return;
    }
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
        <div className="sp-s">{phase === 0 ? 'BATTAGRAM JUNIOR LEAGUE' : phase === 1 ? 'THE GAME BEGINS HERE' : 'SIXER! · BATTAGRAM JUNIOR LEAGUE'}</div>
      </div>
      {phase === 2 && <div className="sp-shot-scene" aria-label="A batsman hits a six">
        <div className="sp-shot-stumps"><i/><i/><i/></div>
        <svg className="sp-batsman" viewBox="0 0 180 190" aria-hidden="true">
          <circle cx="89" cy="28" r="15" fill="#f4c9a5"/><path d="M76 19 Q88 1 103 18 L105 28 Q89 20 74 29Z" fill="#171717"/>
          <path d="M75 48 Q90 40 105 49 L116 99 L65 99Z" fill="#c91525" stroke="#f5d27c" strokeWidth="2"/>
          <path d="M72 56 L46 91 L61 101 L83 75 M106 55 L130 75 L120 87 L98 77" fill="none" stroke="#f4c9a5" strokeWidth="12" strokeLinecap="round"/>
          <path d="M78 98 L72 145 L53 178 M103 98 L110 145 L132 177" fill="none" stroke="#f4c9a5" strokeWidth="15" strokeLinecap="round"/>
          <path d="M45 179 L63 179 M126 179 L141 179" stroke="#f4c9a5" strokeWidth="9" strokeLinecap="round"/>
          <path d="M123 76 L158 18" stroke="#d8b36a" strokeWidth="8" strokeLinecap="round"/>
        </svg>
        <span className="sp-shot-ball"/>
        <div className="sp-six">SIX!</div>
      </div>}
      <button className="sp-sound" onClick={toggleSound} type="button" aria-label={soundOn ? 'Turn welcome sound off' : 'Turn welcome sound on'}>
        {soundOn ? '🔊 SOUND ON · TAP TO MUTE' : '🔇 SOUND OFF · TAP TO ENABLE'}
      </button>
      <div className="sp-organizer"><small>ORGANIZED BY</small><strong>FALAK QURESHI</strong></div>
    </div>
  );
}
