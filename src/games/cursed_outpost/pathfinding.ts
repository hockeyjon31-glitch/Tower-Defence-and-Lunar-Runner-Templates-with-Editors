import { TDTileType } from './types';
import { TILE_SIZE } from './constants';

interface Point {
  x: number;
  y: number;
}

// Find path on grid using Breadth-First Search (BFS)
export function findGridPath(
  tiles: TDTileType[][],
  start: Point,
  end: Point,
  allowVaultAndExit = true
): Point[] {
  const height = tiles.length;
  const width = tiles[0]?.length || 0;

  if (start.x === end.x && start.y === end.y) {
    return [start];
  }

  const queue: Point[] = [start];
  const cameFrom: Record<string, Point | null> = {};
  const key = (p: Point) => `${p.x},${p.y}`;
  cameFrom[key(start)] = null;

  const neighbors = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  let found = false;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.x === end.x && current.y === end.y) {
      found = true;
      break;
    }

    for (const offset of neighbors) {
      const nx = current.x + offset.x;
      const ny = current.y + offset.y;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nextKey = `${nx},${ny}`;
        if (cameFrom[nextKey] === undefined) {
          const tile = tiles[ny][nx];
          const isWalkable =
            tile === 'PATH' ||
            tile === 'SPAWN' ||
            (allowVaultAndExit && (tile === 'VAULT' || tile === 'EXIT')) ||
            (nx === end.x && ny === end.y);

          if (isWalkable) {
            cameFrom[nextKey] = current;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  }

  if (!found) {
    return [];
  }

  // Reconstruct path
  const path: Point[] = [];
  let curr: Point | null = end;
  while (curr !== null) {
    path.unshift(curr);
    const k = key(curr);
    curr = cameFrom[k] || null;
  }

  return path;
}

// Convert grid cells path to pixel world coordinates (center of tiles)
export function gridPathToPixelPath(path: Point[]): Point[] {
  return path.map((pt) => ({
    x: pt.x * TILE_SIZE + TILE_SIZE / 2,
    y: pt.y * TILE_SIZE + TILE_SIZE / 2,
  }));
}
