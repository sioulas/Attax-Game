function createGameBoard(rows, columns, playerSide) {
  const boardContainer = document.getElementById("game-board");
  if (!boardContainer) return;

  boardContainer.innerHTML = "";
  boardContainer.style.display = "grid";
  boardContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  boardContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

  for (let i = 0; i < rows * columns; i++) {
    const cell = document.createElement("div");
    cell.classList.add("game-cell");
    cell.dataset.index = i;
    cell.addEventListener("click", () => handleCellClick(cell));
    boardContainer.appendChild(cell);
  }

  loadGameStateFromAPI();
}

function createPawn(color) {
  const pawn = document.createElement("div");
  pawn.classList.add("pawn", color);
  return pawn;
}

let selectedCell = null;

function saveGameState(gameState) {
  localStorage.setItem("gameState", JSON.stringify(gameState));
}

function loadGameState() {
  const defaultState = {
    redPawns: [0, 48],
    bluePawns: [6, 42],
    currentTurn: "red",
    redScore: 0,
    blueScore: 0,
  };

  const savedState = localStorage.getItem("gameState");
  if (!savedState) {
    console.log("No saved game state. Using defaults.");
    return defaultState;
  }

  try {
    return JSON.parse(savedState);
  } catch (error) {
    console.error("Error parsing game state. Using defaults.", error);
    return defaultState;
  }
}

function mapApiToGameState(apiState) {
  return {
    redPawns: apiState.red_pawns || [],
    bluePawns: apiState.blue_pawns || [],
    currentTurn: apiState.current_turn === "0" ? "red" : "blue",
    redScore: apiState.red_score || 0,
    blueScore: apiState.blue_score || 0,
  };
}

function updateBoardFromState(gameState) {
  const cells = document.querySelectorAll(".game-cell");

  cells.forEach((cell) => (cell.innerHTML = ""));

  gameState.redPawns.forEach((index) => {
    const redPawn = createPawn("red");
    cells[index].appendChild(redPawn);
  });

  gameState.bluePawns.forEach((index) => {
    const bluePawn = createPawn("blue");
    cells[index].appendChild(bluePawn);
  });

  console.log(
    `Board updated: Turn is now ${gameState.currentTurn}.`,
    gameState
  );
}

function hasLegalMoves(playerColor, gameState) {
  const pawns =
    playerColor === "red" ? gameState.redPawns : gameState.bluePawns;
  const columns = 7;

  return pawns.some((index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    return directions.some(([dr, dc]) => {
      const newRow = row + dr;
      const newCol = col + dc;
      const newIndex = newRow * columns + newCol;

      return (
        newRow >= 0 &&
        newRow < 7 &&
        newCol >= 0 &&
        newCol < 7 &&
        !gameState.redPawns.includes(newIndex) &&
        !gameState.bluePawns.includes(newIndex)
      );
    });
  });
}

function convertAdjacentPawns(destIndex, currentPlayer, gameState) {
  const columns = 7;
  const opponentPlayer = currentPlayer === "red" ? "blue" : "red";

  function getAdjacentIndices(index) {
    const adjacents = [];
    const row = Math.floor(index / columns);
    const col = index % columns;

    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    directions.forEach(([dr, dc]) => {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < 7 && newCol >= 0 && newCol < 7) {
        adjacents.push(newRow * columns + newCol);
      }
    });

    return adjacents;
  }

  const adjacentIndices = getAdjacentIndices(destIndex);
  adjacentIndices.forEach((adjIndex) => {
    const cell = document.querySelector(`[data-index='${adjIndex}']`);
    if (cell.firstChild && cell.firstChild.classList.contains(opponentPlayer)) {
      cell.innerHTML = "";
      const newPawn = createPawn(currentPlayer);
      cell.appendChild(newPawn);
    }
  });

  gameState.redPawns = updatePawnList("red");
  gameState.bluePawns = updatePawnList("blue");

  saveGameState(gameState);
}

let gameOver = false;

function checkWinningConditions(gameState) {
  const totalCells = 7 * 7;
  const redPawnsCount = gameState.redPawns.length;
  const bluePawnsCount = gameState.bluePawns.length;

  if (redPawnsCount + bluePawnsCount === totalCells) {
    const winner = redPawnsCount > bluePawnsCount ? "red" : "blue";
    updateScoresAndDisplayWinner(winner);
    gameOver = true;
    localStorage.setItem("gameOver", "true");
    saveGameState(gameState);
    saveGameStateToAPI(gameState);
    disableMoves();

    return true;
  }

  if (redPawnsCount === 0) {
    updateScoresAndDisplayWinner("blue");
    gameOver = true;
    localStorage.setItem("gameOver", "true");
    saveGameState(gameState);
    saveGameStateToAPI(gameState);
    disableMoves();
    return true;
  }

  if (bluePawnsCount === 0) {
    updateScoresAndDisplayWinner("red");
    gameOver = true;
    localStorage.setItem("gameOver", "true");
    saveGameState(gameState);
    saveGameStateToAPI(gameState);
    disableMoves();
    return true;
  }

  return false;
}

function updateScoresAndDisplayWinner(winner) {
  const redScoreElement = document.getElementById("red-score");
  const blueScoreElement = document.getElementById("blue-score");

  if (winner === "red") {
    alert("Red wins the game! Congratulations!");
    redScoreElement.textContent = parseInt(redScoreElement.textContent) + 1;
    alert("Blue loses the game.");
    blueScoreElement.textContent = parseInt(blueScoreElement.textContent);
  } else if (winner === "blue") {
    alert("Blue wins the game! Congratulations!");
    blueScoreElement.textContent = parseInt(blueScoreElement.textContent) + 1;
    alert("Red loses the game.");
    redScoreElement.textContent = parseInt(redScoreElement.textContent);
  }

  const redScore = parseInt(redScoreElement.textContent);
  const blueScore = parseInt(blueScoreElement.textContent);

  localStorage.setItem("redScore", redScore);
  localStorage.setItem("blueScore", blueScore);

  disableMoves();
}

function disableMoves() {
  const cells = document.querySelectorAll(".cell");
  cells.forEach((cell) => {
    cell.classList.add("disabled");
    cell.removeEventListener("click", handleCellClick);
  });
}

function resetScores() {
  localStorage.setItem("redScore", 0);
  localStorage.setItem("blueScore", 0);

  const redScoreElement = document.getElementById("red-score");
  const blueScoreElement = document.getElementById("blue-score");

  redScoreElement.textContent = 0;
  blueScoreElement.textContent = 0;

  alert("Scores have been reset to 0.");
}

function handleCellClick(cell) {
  if (gameOver) {
    alert("Game over! Please reset to start a new game.");
    return;
  }

  const gameState = loadGameState();
  const index = parseInt(cell.dataset.index, 10);

  if (checkWinningConditions(gameState)) {
    return;
  }

  if (selectedCell === null) {
    if (
      cell.firstChild &&
      cell.firstChild.classList.contains(gameState.currentTurn) &&
      cell.firstChild.classList.contains(playerSide)
    ) {
      selectedCell = cell;
      cell.classList.add("selected");
    } else {
      alert(
        `It's ${gameState.currentTurn.toUpperCase()}'s turn! Select your valid piece.`
      );
    }
  } else {
    const sourceIndex = parseInt(selectedCell.dataset.index, 10);
    const distance = calculateDistance(sourceIndex, index);

    if (
      selectedCell.firstChild &&
      selectedCell.firstChild.classList.contains(playerSide) &&
      !cell.firstChild // Ensure the destination is empty
    ) {
      if (distance === 1) {
        const newPawn = createPawn(gameState.currentTurn);
        cell.appendChild(newPawn);
      } else if (distance === 2) {
        cell.appendChild(selectedCell.firstChild);
      } else {
        alert("Invalid move! You can only move one or two spaces.");
        clearSelection();
        return;
      }

      convertAdjacentPawns(index, gameState.currentTurn, gameState);

      if (checkWinningConditions(gameState)) {
        return;
      }

      gameState.currentTurn = gameState.currentTurn === "red" ? "blue" : "red";

      if (!hasLegalMoves(gameState.currentTurn, gameState)) {
        alert(
          `${gameState.currentTurn.toUpperCase()} has no legal moves and passes the turn.`
        );
        gameState.currentTurn =
          gameState.currentTurn === "red" ? "blue" : "red";
      }

      saveGameState(gameState);
      saveGameStateToAPI(gameState);
      updateBoardFromState(gameState);
      clearSelection();
    } else {
      alert("Invalid move or destination occupied!");
      clearSelection();
    }
  }
}

function calculateDistance(sourceIndex, destIndex) {
  const columns = 7;
  const rowDiff = Math.abs(
    Math.floor(sourceIndex / columns) - Math.floor(destIndex / columns)
  );
  const colDiff = Math.abs((sourceIndex % columns) - (destIndex % columns));
  return Math.max(rowDiff, colDiff);
}

function updatePawnList(color) {
  const cells = document.querySelectorAll(".game-cell");
  const positions = [];
  cells.forEach((cell, index) => {
    if (cell.firstChild && cell.firstChild.classList.contains(color)) {
      positions.push(index);
    }
  });
  return positions;
}

function clearSelection() {
  if (selectedCell) {
    selectedCell.classList.remove("selected");
    selectedCell = null;
  }
}

function loadGameStateFromAPI() {
  $.ajax({
    url: "fetch_game_state.php",
    method: "GET",
    dataType: "json",
    success: function (data) {
      if (data.success && data.game_state) {
        const transformedState = mapApiToGameState(data.game_state);
        updateBoardFromState(transformedState);
      } else {
        console.warn("Invalid or missing game state. Using defaults.");
        const defaultState = {
          redPawns: [0, 48],
          bluePawns: [6, 42],
          currentTurn: "red",
          redScore: 0,
          blueScore: 0,
        };
        updateBoardFromState(defaultState);
      }
    },
    error: function (errorThrown) {
      console.error("Error fetching game state:", errorThrown);
      const defaultState = {
        redPawns: [0, 48],
        bluePawns: [6, 42],
        currentTurn: "red",
        redScore: 0,
        blueScore: 0,
      };
      updateBoardFromState(defaultState);
    },
  });
}

function saveGameStateToAPI(gameState) {
  const numericTurn = gameState.currentTurn === "red" ? 0 : 1;

  const stateToSave = {
    redPawns: gameState.redPawns,
    bluePawns: gameState.bluePawns,
    currentTurn: numericTurn,
  };

  console.log("Saving game state:", stateToSave); // Log the state to be saved.

  $.ajax({
    url: "save_game_state.php",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ game_state: stateToSave }),
    dataType: "json",
    success: function (data) {
      if (data.success) {
        console.log("Game state saved successfully.");
      } else {
        console.error("Failed to save the game state:", data.error);
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error saving game state:", errorThrown);
    },
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === "gameState") {
    const currentState = loadGameState();
    if (!event.newValue || event.newValue === JSON.stringify(currentState)) {
      console.log("No significant change detected in game state. Ignoring.");
      return;
    }

    const newState = JSON.parse(event.newValue);
    console.log("Game state change detected:", newState);
    updateBoardFromState(newState);
  }

  if (event.key === "gameOver") {
    console.log(`gameOver event triggered: ${event.newValue}`);

    gameOver = event.newValue === "true";

    if (gameOver) {
      const gameState = JSON.parse(localStorage.getItem("gameState")) || {};
      console.log(gameState);
      loadGameStateFromAPI(gameState);
      saveGameStateToAPI(gameState);
      disableMoves();
      alert("Game over! Reload to start a new game.");
    }
  }

  if (event.key === "redScore" || event.key === "blueScore") {
    const redScore = localStorage.getItem("redScore") || 0;
    const blueScore = localStorage.getItem("blueScore") || 0;

    document.getElementById("red-score").textContent = redScore;
    document.getElementById("blue-score").textContent = blueScore;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const resetButton = document.getElementById("reset-game");
  const resetScoresButton = document.getElementById("score-zero");

  const savedRedScore = localStorage.getItem("redScore");
  const savedBlueScore = localStorage.getItem("blueScore");

  if (savedRedScore !== null) {
    document.getElementById("red-score").textContent = savedRedScore;
  }

  if (savedBlueScore !== null) {
    document.getElementById("blue-score").textContent = savedBlueScore;
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      console.log("Resetting game state...");
      localStorage.removeItem("gameState");
      localStorage.setItem("gameOver", "false");

      const defaultState = {
        redPawns: [0, 48],
        bluePawns: [6, 42],
        currentTurn: "red",
        redScore: 0,
        blueScore: 0,
      };

      saveGameStateToAPI(defaultState);

      alert("Game state cleared. Reloading the game.");
      location.reload();
    });
  }

  if (resetScoresButton) {
    resetScoresButton.addEventListener("click", resetScores);
  } else {
    console.error("Reset Scores button not found in DOM.");
  }

  const urlParams = new URLSearchParams(window.location.search);
  playerSide = urlParams.get("side");

  if (!playerSide) {
    alert("No side selected or invalid session! Redirecting...");
    window.location.href = "player.html";
    return;
  }

  console.log(`Playing as: ${playerSide.toUpperCase()}`);
  const playerSideElement = document.getElementById("player-side");
  if (playerSideElement) {
    playerSideElement.textContent = `Playing as: ${playerSide.toUpperCase()}`;
  }

  const gameOverState = localStorage.getItem("gameOver");
  if (gameOverState === "true") {
    localStorage.removeItem("gameState");
    localStorage.setItem("gameOver", "false");
    alert("Game over state cleared. Reloading the game...");
    location.reload();
  } else {
    createGameBoard(7, 7, playerSide);
    loadGameStateFromAPI();
  }
});

window.addEventListener("beforeunload", function () {
  localStorage.removeItem("gameState");
  localStorage.removeItem("gameOver");
});
