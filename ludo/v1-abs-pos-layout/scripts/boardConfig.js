export const COLORS = ['red', 'green', 'yellow', 'blue'];

function isCellStar(color, pathN, cellN) {
  if (color === 'red' && pathN === 3 && cellN === 3) return true;
  if (color === 'green' && pathN === 1 && cellN === 3) return true;
  if (color === 'yellow' && pathN === 1 && cellN === 4) return true;
  if (color === 'blue' && pathN === 3 && cellN === 4) return true;
  return false;
}

function isCellArrow(color, pathN, cellN) {
  if (pathN === 2) {
    if (color === 'red' && cellN === 1) return true;
    if (color === 'green' && cellN === 1) return true;
    if (color === 'yellow' && cellN === 6) return true;
    if (color === 'blue' && cellN === 6) return true;
  }
  return false;
}

function isCellColored(color, pathN, cellN) {
  if (color === 'red') {
    if (pathN === 2 && cellN !== 1) return true;
    if (pathN === 1 && cellN === 2) return true;
  }
  if (color === 'green') {
    if (pathN === 2 && cellN !== 1) return true;
    if (pathN === 3 && cellN === 2) return true;
  }
  if (color === 'yellow') {
    if (pathN === 2 && cellN !== 6) return true;
    if (pathN === 3 && cellN === 5) return true;
  }
  if (color === 'blue') {
    if (pathN === 2 && cellN !== 6) return true;
    if (pathN === 1 && cellN === 5) return true;
  }
  return false;
}

const TRACK_MAP = {
  red: {
    1: [1, 2, 3, 4, 5, 6],
    2: { 1: 52 },
    3: [51, 50, 49, 48, 47, 46],
  },
  green: {
    1: [12, 11, 10, 9, 8, 7],
    2: { 1: 13 },
    3: [14, 15, 16, 17, 18, 19],
  },
  yellow: {
    1: [20, 21, 22, 23, 24, 25],
    2: { 6: 26 },
    3: [32, 31, 30, 29, 28, 27],
  },
  blue: {
    1: [45, 44, 43, 42, 41, 40],
    2: { 6: 39 },
    3: [33, 34, 35, 36, 37, 38],
  },
};

function getTrackNumber(color, pathN, cellN) {
  const pathConfig = TRACK_MAP[color]?.[pathN];
  if (Array.isArray(pathConfig)) {
    return pathConfig[cellN - 1] ?? null;
  }
  if (pathConfig && typeof pathConfig === 'object') {
    return pathConfig[cellN] ?? null;
  }
  return null;
}

function getHomeNumber(color, pathN, cellN) {
  if (pathN !== 2) return null;
  if (color === 'red' || color === 'green') {
    return cellN >= 2 && cellN <= 6 ? cellN - 1 : null;
  }
  if (color === 'yellow' || color === 'blue') {
    return cellN >= 1 && cellN <= 5 ? 6 - cellN : null;
  }
  return null;
}

export function createGalleries() {
  return COLORS.map((color) => ({
    color,
    isVertical: ['green', 'blue'].includes(color),
    paths: Array.from({ length: 3 }, (_, pathIdx) => {
      const pathN = pathIdx + 1;
      return Array.from({ length: 6 }, (_, cellIdx) => {
        const cellN = cellIdx + 1;
        const trackNumber = getTrackNumber(color, pathN, cellN);
        const homeNumber = getHomeNumber(color, pathN, cellN);

        return {
          id: `${color}-${pathN}-${cellN}`,
          colored: isCellColored(color, pathN, cellN),
          hasStar: isCellStar(color, pathN, cellN),
          hasArrow: isCellArrow(color, pathN, cellN),
          trackNumber,
          homeNumber,
          number: trackNumber ?? homeNumber,
        };
      });
    }),
  }));
}

export function createTokens() {
  return COLORS.flatMap((color, colorIdx) =>
    Array.from({ length: 4 }, (_, i) => ({
      id: colorIdx * 4 + i + 1,
      color,
    }))
  );
}
