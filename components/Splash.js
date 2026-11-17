'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Splash() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [sixVisible, setSixVisible] = useState(false);
  const [fade, setFade] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const hideTimer = useRef(null);
  const fadeTimer = useRef(null);
  const audioRef = useRef(null);
  const audioStopTimer = useRef(null);
  const sixTimer = useRef(null);
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
      master.gain.setValueAtTime(0.24, now + 10.6);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 11.8);
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
          const start = now + section * 2.7 + index * 0.09;
          const osc = ctx.createOscillator();
          const voice = ctx.createGain();
          const tone = ctx.createBiquadFilter();
          osc.type = index < 2 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          tone.type = 'lowpass';
          tone.frequency.setValueAtTime(index < 2 ? 520 : 1450, start);
          tone.frequency.linearRampToValueAtTime(index < 2 ? 900 : 2200, start + 2.45);
          voice.gain.setValueAtTime(0.0001, start);
          voice.gain.exponentialRampToValueAtTime(index < 2 ? 0.075 : 0.045, start + 0.55);
          voice.gain.setValueAtTime(index < 2 ? 0.075 : 0.045, start + 2.25);
          voice.gain.exponentialRampToValueAtTime(0.0001, start + 2.65);
          osc.connect(tone); tone.connect(voice); voice.connect(master);
          osc.start(start); osc.stop(start + 2.7);
        });
      });

      // Deep, spaced cinematic impacts.
      [0.15, 3.0, 5.8, 8.6].forEach((offset, index) => {
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
      [1.55, 4.35, 7.15, 9.95].forEach((offset) => {
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
      const ambienceBuffer = ctx.createBuffer(1, ctx.sampleRate * 12, ctx.sampleRate);
      const ambienceData = ambienceBuffer.getChannelData(0);
      for (let i = 0; i < ambienceData.length; i++) ambienceData[i] = (Math.random() * 2 - 1) * 0.18;
      const ambience = ctx.createBufferSource();
      const ambienceFilter = ctx.createBiquadFilter();
      const ambienceGain = ctx.createGain();
      ambience.buffer = ambienceBuffer;
      ambienceFilter.type = 'bandpass'; ambienceFilter.frequency.value = 1050; ambienceFilter.Q.value = 0.45;
      ambienceGain.gain.setValueAtTime(0.0001, now);
      ambienceGain.gain.linearRampToValueAtTime(0.035, now + 2.2);
      ambienceGain.gain.setValueAtTime(0.035, now + 9.8);
      ambienceGain.gain.exponentialRampToValueAtTime(0.0001, now + 11.8);
      ambience.connect(ambienceFilter); ambienceFilter.connect(ambienceGain); ambienceGain.connect(master);
      ambience.start(now); ambience.stop(now + 12);

      // Bright final lift before the welcome screen fades away.
      [659.25, 783.99, 987.77].forEach((freq, index) => {
        const start = now + 9.4 + index * 0.12;
        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bell.type = 'sine'; bell.frequency.value = freq;
        bellGain.gain.setValueAtTime(0.0001, start);
        bellGain.gain.exponentialRampToValueAtTime(0.035, start + 0.18);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, start + 2.1);
        bell.connect(bellGain); bellGain.connect(master);
        bell.start(start); bell.stop(start + 2.15);
      });

      ctx.resume().catch(() => {});
      audioStopTimer.current = window.setTimeout(() => {
        if (audioRef.current === ctx) {
          ctx.close().catch(() => {});
          audioRef.current = null;
        }
      }, 12400);
    } catch (e) {
      // Audio is optional; the welcome animation still works if the browser blocks it.
    }
  }, []);

  const showWelcome = useCallback((playSound = true) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    if (sixTimer.current) window.clearTimeout(sixTimer.current);
    setSixVisible(false);
    setFade(false);
    setVisible(true);
    if (playSound && soundOnRef.current) playIntro();
    fadeTimer.current = window.setTimeout(() => setFade(true), 11200);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setSixVisible(false);
      sixTimer.current = window.setTimeout(() => setSixVisible(false), 2000);
    }, 5000);
  }, [playIntro]);

  useEffect(() => {
    if (pathname !== '/') {
      setVisible(false);
      setSixVisible(false);
      if (sixTimer.current) window.clearTimeout(sixTimer.current);
      return;
    }
    // Attempt sound automatically on each welcome screen. Browsers may require a tap.
    soundOnRef.current = false;
    setSoundOn(false);
    showWelcome(false);

    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAt && Date.now() - hiddenAt > 800) {
        showWelcome(false);
        hiddenAt = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
      if (sixTimer.current) window.clearTimeout(sixTimer.current);
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

  if (!visible && !sixVisible) return null;
  if (sixVisible) return (
    <div className="six-intro" role="status" aria-label="BJL six hitting animation">
      <div className="six-stage">
        <div className="six-kicker">BATTAGRAM JUNIOR LEAGUE</div>
        <svg className="six-svg" viewBox="0 0 520 300" role="img" aria-label="Illustrated helmeted batter hitting a six">
          <defs><linearGradient id="sixBat" x1="0" x2="1"><stop stopColor="#f7e6a2"/><stop offset="1" stopColor="#b88936"/></linearGradient><radialGradient id="sixGlow"><stop stopColor="#e0242b" stopOpacity=".55"/><stop offset="1" stopColor="#e0242b" stopOpacity="0"/></radialGradient></defs>
          <ellipse cx="250" cy="265" rx="210" ry="24" fill="#000" opacity=".42"/><ellipse cx="270" cy="220" rx="230" ry="100" fill="url(#sixGlow)"/>
          <path d="M85 265H440" stroke="#d4af37" strokeOpacity=".55" strokeWidth="2"/><path d="M115 265v-34m12 34v-34m-12 12h12" stroke="#eee" strokeWidth="3" fill="none"/>
          <g stroke="#f4f0e8" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M245 142L225 205L190 254"/><path d="M225 205L278 250"/><path d="M242 151L286 184L330 157"/><path d="M286 184L246 211"/>
          </g>
          <path d="M215 126Q240 96 270 122L281 166Q249 183 218 157Z" fill="#b01212" stroke="#d4af37" strokeWidth="3"/><path d="M215 126Q210 88 247 78Q286 79 288 121L270 132L259 110L228 116Z" fill="#17171b" stroke="#d4af37" strokeWidth="4"/><path d="M266 126L295 138L286 151L264 145" fill="none" stroke="#d4af37" strokeWidth="5"/>
          <g className="six-bat"><path d="M245 168L356 47" stroke="url(#sixBat)" strokeWidth="15" strokeLinecap="round"/><path d="M245 168L356 47" stroke="#fff2c8" strokeWidth="3" strokeLinecap="round"/></g>
          <circle className="six-ball" cx="310" cy="145" r="9" fill="#e0242b" stroke="#fff" strokeWidth="2"/><path className="six-flash" d="M300 132l-28-20m42 12l12-31m-1 50l37-4" stroke="#fff" strokeWidth="5" strokeLinecap="round"/>
        </svg>
        <div className="six-title">THAT'S A SIX!</div>
        <div className="six-skip">BJL SEASON 1 · LET'S PLAY</div>
      </div>
    </div>
  );
  return (
    <div className={'splash' + (fade ? ' fade' : '')} role="dialog" aria-label="Welcome to BJL Season 1">
      <div className="sp-in">
        <div className="sp-kicker">BATTAGRAM JUNIOR LEAGUE</div>
        <div className="sp-t">WELCOME TO<br /><span>BJL SEASON 1</span></div>
        <div className="sp-line" />
        <div className="sp-s">THE GAME BEGINS HERE</div>
      </div>
      <button className="sp-sound" onClick={toggleSound} type="button" aria-label={soundOn ? 'Turn welcome sound off' : 'Turn welcome sound on'}>
        {soundOn ? '🔊 SOUND ON · TAP TO MUTE' : '🔇 SOUND OFF · TAP TO ENABLE'}
      </button>
      <div className="sp-organizer"><small>ORGANIZED BY</small><strong>FALAK QURESHI</strong></div>
    </div>
  );
}
