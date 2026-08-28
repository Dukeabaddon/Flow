// Template matcher — finds best fallback template for a prompt
// ponytail: simple tag overlap scoring, no ML needed

import { templates } from './templates.js';

/**
 * Find the best matching template for a given prompt.
 * Extracts keywords from prompt and scores against template tags.
 * @param {string} prompt - User's text prompt
 * @returns {object} Best matching template
 */
export function matchTemplate(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { template: templates[0], score: 0, locked: false };
  }

  const lower = prompt.toLowerCase();
  const words = lower.split(/[\s\-_,.]+/).filter(Boolean);
  let bestScore = 0;
  let bestMatch = templates[0];

  for (const template of templates) {
    let score = 0;

    // Exact id / name boost (e.g. "lupang hinirang")
    const id = template.id.toLowerCase();
    const name = template.name.toLowerCase();
    if (lower.includes(id.replace(/-/g, ' ')) || id.replace(/-/g, ' ').split(' ').every((w) => lower.includes(w))) {
      score += 10;
    }
    if (name.split(/\s+/).filter((w) => w.length > 2).every((w) => lower.includes(w))) {
      score += 8;
    }

    for (const word of words) {
      if (word.length < 2) continue;
      for (const tag of template.tags) {
        if (tag.includes(word) || word.includes(tag)) {
          score += 1;
        }
        if (word.length > 3 && tag.startsWith(word.slice(0, 3))) {
          score += 0.5;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return { template: bestMatch, score: bestScore, locked: false };
}

/**
 * Find the best matching template for a given prompt.
 * Extracts keywords from prompt and scores against template tags.
 * @param {string} prompt - User's text prompt
 * @returns {object} Best matching template
 */
export function findTemplate(prompt) {
  return matchTemplate(prompt).template;
}

/**
 * Get a random template (for "surprise me" type prompts).
 */
export function getRandomTemplate() {
  return templates[Math.floor(Math.random() * templates.length)];
}
