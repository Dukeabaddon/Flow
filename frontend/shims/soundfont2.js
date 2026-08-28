// soundfont2 ships a UMD webpack bundle with no ESM named exports.
// sfumato does: import { SoundFont2, DEFAULT_GENERATOR_VALUES } from 'soundfont2'

import cjs from '../../node_modules/soundfont2/lib/SoundFont2.node.js';

const packed = cjs?.SoundFont2 ? cjs : { SoundFont2: cjs, ...cjs };

export const SoundFont2 = packed.SoundFont2 ?? packed.default ?? packed;
export const DEFAULT_GENERATOR_VALUES = packed.DEFAULT_GENERATOR_VALUES;
export default SoundFont2;
