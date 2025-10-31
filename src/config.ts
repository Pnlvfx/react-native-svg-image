import type { PngOptions } from 'sharp';
import type { MetroConfig } from '@react-native/metro-config';
import path from 'node:path';
import { getLastModifiedTime } from './fs.js';

export interface Config {
  cacheDir: string;
  scales: number[];
  output: PngOptions;
  ignoreRegex?: RegExp;
  lastModifiedTime: number;
}

const defaultConfig: Config = {
  cacheDir: '.png-cache',
  scales: [1, 2, 3],
  output: {},
  lastModifiedTime: 0,
};

export const loadConfig = async () => {
  const metroConfigPath = path.join(process.cwd(), 'metro.config.js');
  const lastModifiedTime = Math.max(...(await Promise.all([getLastModifiedTime(metroConfigPath), getLastModifiedTime(__filename)])));
  let metroConfig: MetroConfig | undefined;
  try {
    metroConfig = (await import(metroConfigPath)) as MetroConfig;
  } catch {
    metroConfig = {};
  }

  const transformerOptions = metroConfig.transformer ?? {};
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const svgAssetPluginOptions = ((transformerOptions as any).svgAssetPlugin ?? {}) as MetroConfig;

  return {
    ...defaultConfig,
    ...svgAssetPluginOptions,
    lastModifiedTime,
  };
};
