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

export function createGalleries() {
  return COLORS.map((color) => ({
    color,
    isVertical: ['green', 'blue'].includes(color),
    paths: Array.from({ length: 3 }, (_, pathIdx) => {
      const pathN = pathIdx + 1;
      return Array.from({ length: 6 }, (_, cellIdx) => {
        const cellN = cellIdx + 1;
        return {
          id: `${color}-${pathN}-${cellN}`,
          colored: isCellColored(color, pathN, cellN),
          hasStar: isCellStar(color, pathN, cellN),
          hasArrow: isCellArrow(color, pathN, cellN),
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
