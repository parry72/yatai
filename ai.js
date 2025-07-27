// ai.js - Expectimax AI for 2048 with 1024 merge cap

function AI() {
  this.searchDepth = 3;
}

AI.prototype.getMove = function(gridArray) {
  const grid = new Grid(4);
  grid.setCells(gridArray);
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let direction = 0; direction < 4; direction++) {
    const newGrid = grid.clone();
    const moved = newGrid.move(direction);

    if (moved) {
      const score = this.expectimax(newGrid, this.searchDepth - 1, false);
      if (score > bestScore) {
        bestScore = score;
        bestMove = direction;
      }
    }
  }

  // 最終的に有効な手がなかったら -1 を返す
  return bestMove;
};

AI.prototype.expectimax = function(grid, depth, isPlayerTurn) {
  if (depth === 0 || grid.isGameOver()) {
    return this.evaluate(grid);
  }

  if (isPlayerTurn) {
    let maxScore = -Infinity;
    for (let direction = 0; direction < 4; direction++) {
      const newGrid = grid.clone();
      if (newGrid.move(direction)) {
        const score = this.expectimax(newGrid, depth - 1, false);
        maxScore = Math.max(maxScore, score);
      }
    }
    return maxScore;
  } else {
    const cells = grid.getEmptyCells();
    if (cells.length === 0) return this.evaluate(grid);
    let totalScore = 0;
    for (const cell of cells) {
      for (const value of [2, 4]) {
        const newGrid = grid.clone();
        newGrid.insertTile(cell, value);
        const prob = value === 2 ? 0.9 : 0.1;
        totalScore += prob * this.expectimax(newGrid, depth - 1, true);
      }
    }
    return totalScore / cells.length;
  }
};

AI.prototype.evaluate = function(grid) {
  const cells = grid.cells.flat();
  let score = 0;
  for (const val of cells) {
    if (val) score += val + Math.log2(val) * 10;
  }
  return score;
};

// Grid class
function Grid(size) {
  this.size = size;
  this.cells = this.empty();
}

Grid.prototype.empty = function() {
  const cells = [];
  for (let i = 0; i < this.size; i++) {
    cells[i] = [];
    for (let j = 0; j < this.size; j++) {
      cells[i][j] = 0;
    }
  }
  return cells;
};

Grid.prototype.setCells = function(array) {
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(i / 4);
    const y = i % 4;
    this.cells[x][y] = array[i];
  }
};

Grid.prototype.clone = function() {
  const newGrid = new Grid(this.size);
  for (let i = 0; i < this.size; i++) {
    for (let j = 0; j < this.size; j++) {
      newGrid.cells[i][j] = this.cells[i][j];
    }
  }
  return newGrid;
};

Grid.prototype.getEmptyCells = function() {
  const cells = [];
  for (let i = 0; i < this.size; i++) {
    for (let j = 0; j < this.size; j++) {
      if (this.cells[i][j] === 0) cells.push({ x: i, y: j });
    }
  }
  return cells;
};

Grid.prototype.insertTile = function(cell, value) {
  this.cells[cell.x][cell.y] = value;
};

Grid.prototype.isGameOver = function() {
  for (let direction = 0; direction < 4; direction++) {
    const testGrid = this.clone();
    if (testGrid.move(direction)) return false;
  }
  return true;
};

Grid.prototype.move = function(direction) {
  const self = this;
  let moved = false;

  function buildTraversals(vector) {
    const traversals = { x: [], y: [] };
    for (let pos = 0; pos < self.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();
    return traversals;
  }

  function findFarthestPosition(cell, vector) {
    let previous;
    do {
      previous = cell;
      cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (
      self.withinBounds(cell) &&
      self.cellAvailable(cell)
    );
    return { farthest: previous, next: cell };
  }

  const vectors = [
    { x: 0, y: -1 }, // up
    { x: 1, y: 0 },  // right
    { x: 0, y: 1 },  // down
    { x: -1, y: 0 }  // left
  ];

  const vector = vectors[direction];
  const traversals = buildTraversals(vector);

  const merged = this.empty();

  traversals.x.forEach(x => {
    traversals.y.forEach(y => {
      const value = this.cells[x][y];
      if (value !== 0) {
        let cell = { x, y };
        const positions = findFarthestPosition(cell, vector);
        const next = positions.next;

        if (
          this.withinBounds(next) &&
          this.cells[next.x][next.y] === value &&
          merged[next.x][next.y] === 0 &&
          value < 1024 // ← 合成は1024未満のときだけ！
        ) {
          this.cells[next.x][next.y] *= 2;
          this.cells[x][y] = 0;
          merged[next.x][next.y] = 1;
          moved = true;
        } else if (positions.farthest.x !== x || positions.farthest.y !== y) {
          this.cells[positions.farthest.x][positions.farthest.y] = value;
          this.cells[x][y] = 0;
          moved = true;
        }
      }
    });
  });

  return moved;
};

Grid.prototype.cellAvailable = function(cell) {
  return this.withinBounds(cell) && this.cells[cell.x][cell.y] === 0;
};

Grid.prototype.withinBounds = function(cell) {
  return (
    cell.x >= 0 && cell.x < this.size &&
    cell.y >= 0 && cell.y < this.size
  );
};
