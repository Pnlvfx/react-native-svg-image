import type sharp from 'sharp';
import { memo } from './memo.js';

/**
 * Load sharp conditionally.
 *
 * Since the sharp library is quite larg, this is useful
 * when you might not want to load the whole library
 * at startup.
 */
export const loadSharp = memo(async () => {
  const sharp = await import('sharp');
  await warmup(sharp.default);
  return sharp;
});

/**
 * Warms up the sharp library, handling any warmup errors.
 */
const warmup = async (instance: typeof sharp) => {
  // First run might cause a xmllib error, run safe warmup
  // See https://github.com/lovell/sharp/issues/1593
  try {
    await instance(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1" /></svg>', 'utf8')).metadata();
  } catch {}
};
