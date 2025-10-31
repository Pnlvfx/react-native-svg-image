import fs from 'node:fs/promises';

export const getLastModifiedTime = async (filePath: string) => {
  try {
    const fileStats = await fs.stat(filePath);
    return fileStats.mtimeMs;
  } catch {
    return 0;
  }
};

export async function updateLastModifiedTime(filePath: string) {
  const currentTime = Date.now() / 1000;

  try {
    await fs.utimes(filePath, currentTime, currentTime);
  } catch {}
}
