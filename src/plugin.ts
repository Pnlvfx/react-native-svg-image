import type { Metadata, PngOptions } from 'sharp';
import type { AssetData } from 'metro';
import { loadConfig } from './config.js';
import { memo } from './memo.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import { loadSharp } from './sharp.js';
import { updateLastModifiedTime } from './fs.js';
import { isFileOutdated } from './cache.js';

const asyncConfig = loadConfig();

export const reactNativeSvgAssetPlugin = async (assetData: AssetData) => {
  const filePath = assetData.files.length > 0 ? (assetData.files[0] ?? '') : '';
  return (await shouldConvertFile(assetData, filePath)) ? convertSvg(assetData) : assetData;
};

const shouldConvertFile = async (assetData: AssetData, filePath: string) => {
  if (assetData.type !== 'svg') {
    return false;
  }

  const config = await asyncConfig;
  const ignoreRegex = config.ignoreRegex;
  return !ignoreRegex?.test(filePath);
};

const convertSvg = async (assetData: AssetData) => {
  const inputFilePath = assetData.files[0];
  const inputFileScale = assetData.scales[0];

  if (assetData.scales.length !== assetData.files.length) {
    throw new Error("Passed scales doesn't match passed files.");
  } else if (!inputFilePath) {
    throw new Error('No files passed.');
  } else if (assetData.files.length > 1) {
    throw new Error('Multiple SVG scales not supported.');
  } else if (inputFileScale !== 1) {
    throw new Error('Scaled SVGs not supported.');
  }

  const config = await asyncConfig;
  const outputDirectory = path.join(assetData.fileSystemLocation, config.cacheDir);
  const outputName = `${assetData.name}-${assetData.hash}`;

  try {
    await fs.mkdir(outputDirectory);
  } catch {}

  const imageLoader = createimageLoader(inputFilePath);
  const outputImages = await Promise.all(
    config.scales.map((imageScale) =>
      ensurePngUpToDate(
        imageLoader,
        imageScale / inputFileScale,
        path.join(outputDirectory, `${outputName}${getScaleSuffix(imageScale)}.png`),
        config.output,
      ),
    ),
  );

  return {
    ...assetData,
    fileSystemLocation: outputDirectory,
    httpServerLocation: `${assetData.httpServerLocation}/${config.cacheDir}`,
    files: outputImages.map((outputImage) => outputImage.filePath),
    scales: outputImages.map((outputImage) => outputImage.scale),
    name: outputName,
    type: 'png',
  };
};

type InputImageLoader = () => Promise<InputImage>;

interface InputImage {
  buffer: Buffer;
  metadata: Metadata;
}

/**
 * Creates an image loader for input file.
 * This provides lazy cached loading of image data.
 */
const createimageLoader = (inputFilePath: string) => {
  return memo(async () => {
    const [fileBuffer, loadedSharp] = await Promise.all([fs.readFile(inputFilePath), loadSharp()]);

    const metadata = await loadedSharp.default(fileBuffer).metadata();

    return {
      buffer: fileBuffer,
      metadata: metadata,
    };
  });
};

/**
 * Ensures that the resultign PNG file exists on the fileystem.
 *
 * In case the file does not exist yet, or it is older than the
 * current configuration, it will be generated.
 *
 * Otherwise the existing file will be left in place, and its
 * last modified time will be updated.
 */
const ensurePngUpToDate = async (imageLoader: InputImageLoader, scale: number, outputFilePath: string, outputOptions: PngOptions) => {
  if (await isFileOutdated(outputFilePath, await asyncConfig)) {
    const inputFile = await imageLoader();
    await generatePng(inputFile, scale, outputFilePath, outputOptions);
  } else {
    await updateLastModifiedTime(outputFilePath);
  }

  return {
    filePath: outputFilePath,
    scale: scale,
  };
};

/**
 * Generates a PNG file from a loaded SVG file.
 */
const generatePng = async (inputFile: InputImage, scale: number, outputFilePath: string, outputOptions: PngOptions) => {
  if (inputFile.metadata.density === undefined) {
    throw new Error('Input image missing density information');
  }
  const density = inputFile.metadata.density;

  const loadedSharp = await loadSharp();
  await loadedSharp
    .default(inputFile.buffer, {
      density: density * scale,
    })
    .png(outputOptions)
    .toFile(outputFilePath);
};

const getScaleSuffix = (scale: number) => {
  // eslint-disable-next-line sonarjs/no-small-switch
  switch (scale) {
    case 1: {
      return '';
    }
    default: {
      return `@${scale.toString()}x`;
    }
  }
};
