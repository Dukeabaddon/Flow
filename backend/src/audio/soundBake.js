// Sound bake — match strudel.cc (GM fonts + drum machines + Dirt samples)
// registerSound MUST hit same superdough map as evaluate (Vite dedupe)

const SOUNDFONT_CDN = 'https://felixroos.github.io/webaudiofontdata/sound';
const CACHE_NAME = 'flow-soundfonts-v1';

const PREFETCH_FONTS = [
  '0040_JCLive_sf2_file',
  '0040_FluidR3_GM_sf2_file',
  '0040_Aspirin_sf2_file',
  '0040_Chaos_sf2_file',
  '0040_GeneralUserGS_sf2_file',
  '0041_FluidR3_GM_sf2_file',
  '0041_GeneralUserGS_sf2_file',
  '0042_GeneralUserGS_sf2_file',
  '0043_GeneralUserGS_sf2_file',
  '0044_GeneralUserGS_sf2_file',
  '0046_GeneralUserGS_sf2_file',
  '0000_JCLive_sf2_file',
  '0000_FluidR3_GM_sf2_file',
  '0000_Aspirin_sf2_file',
];

let bakePromise = null;
let fetchPatched = false;

function installSoundfontCacheFetch() {
  if (fetchPatched || typeof window === 'undefined') return;
  fetchPatched = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (url && url.startsWith(SOUNDFONT_CDN) && typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        const hit = await cache.match(url);
        if (hit) return hit;
        const res = await origFetch(input, init);
        if (res.ok) {
          try {
            await cache.put(url, res.clone());
          } catch {
            /* ignore */
          }
        }
        return res;
      } catch {
        return origFetch(input, init);
      }
    }
    return origFetch(input, init);
  };
}

async function prefetchSoundfontsToCache(fontNames) {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    fontNames.map(async (name) => {
      const url = `${SOUNDFONT_CDN}/${name}.js`;
      try {
        if (await cache.match(url)) return;
        const res = await fetch(url, { mode: 'cors' });
        if (res.ok) await cache.put(url, res.clone());
      } catch (err) {
        console.warn('Soundfont prefetch skip:', name, err?.message);
      }
    }),
  );
}

/**
 * Register GM into the SAME sound map @strudel/web evaluate uses.
 * Do NOT rely only on @strudel/soundfonts' registerSoundfonts() —
 * that package imports @strudel/webaudio separately (duplicate map risk).
 */
async function registerGmIntoWebMap() {
  // Pin the playback module first
  const web = await import('@strudel/web');
  const {
    registerSound,
    soundAlias,
    getSound,
    getADSRValues,
    getParamADSR,
    getPitchEnvelope,
    getVibratoOscillator,
    onceEnded,
    releaseAudioNode,
    getSoundIndex,
    getAudioContext,
  } = web;

  const { getFontBufferSource, setSoundfontUrl } = await import(
    '@strudel/soundfonts/fontloader.mjs'
  );
  const gmMod = await import('@strudel/soundfonts/gm.mjs');
  const gm = gmMod.default || gmMod;

  setSoundfontUrl(SOUNDFONT_CDN);

  const registerOne = (name, fonts) => {
    if (!fonts?.length) return;
    registerSound(
      name,
      async (time, value, onended) => {
        const [attack, decay, sustain, release] = getADSRValues([
          value.attack,
          value.decay,
          value.sustain,
          value.release,
        ]);
        const { duration } = value;
        const n = getSoundIndex(value.n, fonts.length);
        const font = fonts[n];
        const ctx = getAudioContext();
        const bufferSource = await getFontBufferSource(font, value, ctx);
        bufferSource.start(time);
        const envGain = ctx.createGain();
        const node = bufferSource.connect(envGain);
        const holdEnd = time + duration;
        getParamADSR(
          node.gain,
          attack,
          decay,
          sustain,
          release,
          0,
          0.3,
          time,
          holdEnd,
          'linear',
        );
        const envEnd = holdEnd + release + 0.01;
        const vibratoHandle = getVibratoOscillator(
          bufferSource.detune,
          value,
          time,
        );
        getPitchEnvelope(bufferSource.detune, value, time, holdEnd);
        bufferSource.stop(envEnd);
        onceEnded(bufferSource, () => {
          releaseAudioNode(bufferSource);
          vibratoHandle?.stop();
          onended();
        });
        return {
          node,
          stop: () => {},
          nodes: { source: [bufferSource], ...vibratoHandle?.nodes },
        };
      },
      { type: 'soundfont', prebake: true, fonts },
    );
  };

  let count = 0;
  for (const [name, fonts] of Object.entries(gm)) {
    registerOne(name, fonts);
    count += 1;
  }

  // Docs alias: note(...).sound("piano")
  if (gm.gm_piano && typeof soundAlias === 'function') {
    soundAlias('gm_piano', 'piano');
  } else if (gm.gm_piano) {
    registerOne('piano', gm.gm_piano);
  }

  const check = typeof getSound === 'function' ? getSound('gm_epiano1') : null;
  if (!check?.onTrigger) {
    throw new Error(
      'gm_epiano1 missing after register — sound map mismatch (check Vite dedupe)',
    );
  }

  console.info(
    `[flow] GM ok: ${count} sounds, gm_epiano1=${!!check}, piano=${!!getSound?.('piano')}`,
  );
  return count;
}

/**
 * @param {(msg: string) => void} [onStatus]
 */
export function bakeStrudelSounds(onStatus = () => {}) {
  if (bakePromise) return bakePromise;

  bakePromise = (async () => {
    installSoundfontCacheFetch();

    const { samples, aliasBank, getSound } = await import('@strudel/web');

    // Drums first — waveform + 808/909 songs must play even if GM fonts fail
    await Promise.all([
      samples(
        'https://strudel.cc/tidal-drum-machines.json',
        'https://raw.githubusercontent.com/ritchse/tidal-drum-machines/main/machines/',
        { prebake: true, tag: 'drum-machines' },
      ),
      samples('github:tidalcycles/dirt-samples'),
    ]);

    if (typeof aliasBank === 'function') {
      await aliasBank('https://strudel.cc/tidal-drum-machines-alias.json');
    }

    try {
      const n = await registerGmIntoWebMap();
      if (!n) console.warn('[flow] No GM sounds registered');
    } catch (err) {
      console.warn('GM bake skipped (SoundFont2/sfumato):', err?.message || err);
    }

    if (!getSound?.('RolandTR909_bd')?.onTrigger && !getSound?.('RolandTR808_bd')?.onTrigger) {
      throw new Error(
        'No 909/808 kick after drum-machine load — drums will be silent',
      );
    }

    console.info(
      `[flow] drums ok: RolandTR909_bd=${!!getSound('RolandTR909_bd')}, RolandTR808_hh=${!!getSound('RolandTR808_hh')}, gm_epiano1=${!!getSound('gm_epiano1')}`,
    );

    prefetchSoundfontsToCache(PREFETCH_FONTS).catch((err) => {
      console.warn('Soundfont prefetch skip:', err?.message);
    });

    onStatus('');
    return true;
  })().catch((err) => {
    console.error('Sound bake failed:', err);
    bakePromise = null;
    throw err;
  });

  return bakePromise;
}

export { SOUNDFONT_CDN, CACHE_NAME };
