window.onload = function () {
    // Initial game setup
    const gameBoard = [
      [0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 1, 0, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [2, 0, 2, 0, 2, 0, 2, 0],
      [0, 2, 0, 2, 0, 2, 0, 2],
      [2, 0, 2, 0, 2, 0, 2, 0]
    ];
    
    const pieces = []; // Array to store pieces
    const tiles = []; // Array to store tiles
  
    // Distance formula
    const dist = (x1, y1, x2, y2) => Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
  
    // Piece object definition
    function Piece(element, position) {
      this.allowedToMove = true; // Track if piece can move
      this.element = element; // DOM element
      this.position = position; // Position on the game board
      this.player = this.element.attr("id") < 12 ? 1 : 2; // Determine player
      this.king = false; // Track if piece is a king
  
      // Method to crown the piece
      this.makeKing = function () {
        this.element.css("backgroundImage", `url('img/king${this.player}.png')`);
        this.king = true;
      };
  
      // Move the piece
      this.move = function (tile) {
        this.element.removeClass('selected');
        if (!Board.isValidPlaceToMove(tile.position[0], tile.position[1])) return false;
  
        // Prevent non-king pieces from moving backwards
        if ((this.player === 1 && !this.king && tile.position[0] < this.position[0]) ||
            (this.player === 2 && !this.king && tile.position[0] > this.position[0])) return false;
  
        // Update board state
        Board.board[this.position[0]][this.position[1]] = 0;
        Board.board[tile.position[0]][tile.position[1]] = this.player;
        this.position = [tile.position[0], tile.position[1]];
        this.element.css('top', Board.dictionary[this.position[0]]);
        this.element.css('left', Board.dictionary[this.position[1]]);
        
        // Crown the piece if it reaches the end
        if (!this.king && (this.position[0] === 0 || this.position[0] === 7)) this.makeKing();
        return true;
      };
  
      // Check if the piece can jump
      this.canJumpAny = function () {
        return (this.canOpponentJump([this.position[0] + 2, this.position[1] + 2]) ||
                this.canOpponentJump([this.position[0] + 2, this.position[1] - 2]) ||
                this.canOpponentJump([this.position[0] - 2, this.position[1] + 2]) ||
                this.canOpponentJump([this.position[0] - 2, this.position[1] - 2]));
      };
  
      // Check for a valid opponent jump
      this.canOpponentJump = function (newPosition) {
        const dx = newPosition[1] - this.position[1];
        const dy = newPosition[0] - this.position[0];
  
        // Check movement direction for non-kings
        if ((this.player === 1 && !this.king && newPosition[0] < this.position[0]) ||
            (this.player === 2 && !this.king && newPosition[0] > this.position[0])) return false;
  
        // Check bounds
        if (newPosition[0] > 7 || newPosition[1] > 7 || newPosition[0] < 0 || newPosition[1] < 0) return false;
  
        const tileToCheckX = this.position[1] + dx / 2;
        const tileToCheckY = this.position[0] + dy / 2;
  
        if (tileToCheckX > 7 || tileToCheckY > 7 || tileToCheckX < 0 || tileToCheckY < 0) return false;
  
        if (!Board.isValidPlaceToMove(tileToCheckY, tileToCheckX) && 
            Board.isValidPlaceToMove(newPosition[0], newPosition[1])) {
          return pieces.find(piece => piece.position[0] === tileToCheckY && piece.position[1] === tileToCheckX && this.player !== piece.player) || false;
        }
        return false;
      };
  
      // Execute opponent jump
      this.opponentJump = function (tile) {
        const pieceToRemove = this.canOpponentJump(tile.position);
        if (pieceToRemove) {
          pieceToRemove.remove();
          return true;
        }
        return false;
      };
  
      // Remove the piece from the game
      this.remove = function () {
        this.element.css("display", "none");
        const capturedContainer = this.player === 1 ? $('#player2') : $('#player1');
        capturedContainer.append("<div class='capturedPiece'></div>");
        Board.score[`player${this.player}`] += 1;
        Board.board[this.position[0]][this.position[1]] = 0;
        this.position = []; // Reset position
  
        const playerWon = Board.checkIfPlayerWon();
        if (playerWon) {
          $('#winner').html(`Player ${playerWon} has won!`);
        }
      };
    }
  
    // Tile object definition
    function Tile(element, position) {
      this.element = element; // Linked DOM element
      this.position = position; // Position in the game board
  
      // Check if a piece is in range
      this.inRange = function (piece) {
        if (pieces.some(k => k.position[0] === this.position[0] && k.position[1] === this.position[1])) return 'wrong';
        if (!piece.king && piece.player === 1 && this.position[0] < piece.position[0]) return 'wrong';
        if (!piece.king && piece.player === 2 && this.position[0] > piece.position[0]) return 'wrong';
        if (dist(this.position[0], this.position[1], piece.position[0], piece.position[1]) === Math.sqrt(2)) {
          return 'regular'; // Regular move
        } else if (dist(this.position[0], this.position[1], piece.position[0], piece.position[1]) === 2 * Math.sqrt(2)) {
          return 'jump'; // Jump move
        }
      };
    }
  
    // Board object to control game logistics
    var Board = {
      board: gameBoard,
      score: { player1: 0, player2: 0 },
      playerTurn: 1,
      jumpExists: false,
      continuousJump: false,
      tilesElement: $('div.tiles'),
      dictionary: ["0vmin", "10vmin", "20vmin", "30vmin", "40vmin", "50vmin", "60vmin", "70vmin", "80vmin", "90vmin"],
  
      // Initialize the board
      initialize: function () {
        let countPieces = 0;
        let countTiles = 0;
        for (let row in this.board) {
          for (let column in this.board[row]) {
            if (row % 2 === 1 && column % 2 === 0 || row % 2 === 0 && column % 2 === 1) {
              countTiles = this.tileRender(row, column, countTiles);
            }
            if (this.board[row][column] === 1) {
              countPieces = this.playerPiecesRender(1, row, column, countPieces);
            } else if (this.board[row][column] === 2) {
              countPieces = this.playerPiecesRender(2, row, column, countPieces);
            }
          }
        }
      },
  
      // Render a tile
      tileRender: function (row, column, countTiles) {
        this.tilesElement.append(`<div class='tile' id='tile${countTiles}' style='top:${this.dictionary[row]};left:${this.dictionary[column]};'></div>`);
        tiles[countTiles] = new Tile($("#tile" + countTiles), [parseInt(row), parseInt(column)]);
        return countTiles + 1;
      },
  
      // Render player pieces
      playerPiecesRender: function (playerNumber, row, column, countPieces) {
        $(`.player${playerNumber}pieces`).append(`<div class='piece' id='${countPieces}' style='top:${this.dictionary[row]};left:${this.dictionary[column]};'></div>`);
        pieces[countPieces] = new Piece($("#" + countPieces), [parseInt(row), parseInt(column)]);
        return countPieces + 1;
      },
  
      // Check if a place is valid to move
      isValidPlaceToMove: function (row, column) {
        return row >= 0 && row <= 7 && column >= 0 && column <= 7 && this.board[row][column] === 0;
      },
  
      // Change player turn
      changePlayerTurn: function () {
        this.playerTurn = this.playerTurn === 1 ? 2 : 1;
        $('.turn').css("background", this.playerTurn === 1 ? "linear-gradient(to right, #BEEE62 50%, transparent 50%)" : "linear-gradient(to right, transparent 50%, #BEEE62 50%)");
        this.checkIfJumpExists();
      },
  
      // Check if someone won
      checkIfPlayerWon: function () {
        if (this.score.player1 === 12) return 1;
        if (this.score.player2 === 12) return 2;
        return false;
      },
  
      // Reset the game
      clear: function () {
        location.reload();
      },
  
      // Check if jump exists
      checkIfJumpExists: function () {
        this.jumpExists = false;
        this.continuousJump = false;
  
        for (let k of pieces) {
          k.allowedToMove = false;
          if (k.position.length !== 0 && k.player === this.playerTurn && k.canJumpAny()) {
            this.jumpExists = true;
            k.allowedToMove = true;
          }
        }
  
        if (!this.jumpExists) {
          for (let k of pieces) k.allowedToMove = true;
        }
      },
  
      // String representation of the board (useful for backend communication)
      str_board: function () {
        let ret = "";
        for (let i in this.board) {
          for (let j in this.board[i]) {
            let found = false;
            for (let k of pieces) {
              if (k.position[0] === i && k.position[1] === j) {
                ret += k.king ? (this.board[i][j] + 2) : this.board[i][j];
                found = true;
                break;
              }
            }
            if (!found) ret += '0';
          }
        }
        return ret;
      }
    };
  
    // Initialize the board
    Board.initialize();
  
    /***
    Event Handlers
    ***/
  
    // Select the piece on click if it is the player's turn
    $('.piece').on("click", function () {
      const isPlayersTurn = ($(this).parent().attr("class").includes(`player${Board.playerTurn}pieces`));
      if (isPlayersTurn) {
        if (!Board.continuousJump && pieces[$(this).attr("id")].allowedToMove) {
          const selected = $(this).hasClass('selected');
          $('.piece').removeClass('selected');
          if (!selected) $(this).addClass('selected');
        } else {
          console.log(Board.continuousJump ? "You must jump the same piece!" : "Jump exists for other pieces, that piece is not allowed to move");
        }
      }
    });
  
    // Reset game when clear button is pressed
    $('#cleargame').on("click", function () {
      Board.clear();
    });
  
    // Move piece when tile is clicked
    $('.tile').on("click", function () {
      if ($('.selected').length !== 0) {
        const tileID = $(this).attr("id").replace(/tile/, '');
        const tile = tiles[tileID];
        const piece = pieces[$('.selected').attr("id")];
        const inRange = tile.inRange(piece);
  
        if (inRange !== 'wrong') {
          if (inRange === 'jump') {
            if (piece.opponentJump(tile)) {
              piece.move(tile);
              if (piece.canJumpAny()) {
                piece.element.addClass('selected');
                Board.continuousJump = true; // Allow continuous jump
              } else {
                Board.changePlayerTurn();
              }
            }
          } else if (inRange === 'regular' && !Board.jumpExists) {
            if (!piece.canJumpAny()) {
              piece.move(tile);
              Board.changePlayerTurn();
            } else {
              alert("You must jump when possible!");
            }
          }
        }
      }
    });
  }