// Connect to the server


const socket = io('http://localhost:3000', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('Connected to server!');
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

// DOM Elements
const loginForm = document.getElementById('loginForm');
const gameContainer = document.getElementById('gameContainer');
const roomDisplay = document.getElementById('roomDisplay');
const player1Element = document.getElementById('player1');
const player2Element = document.getElementById('player2');
const gameStatus = document.getElementById('gameStatus');
const gameBoard = document.getElementById('gameBoard');
const restartBtn = document.getElementById('restartBtn');

// Game State
let currentRoom = null;
let playerSymbol = null;
let isSpectator = false;
let gameActive = false;

// Event Listener for Join Button
document.getElementById('joinBtn').addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    const roomId = document.getElementById('roomId').value.trim();
    
    if (username && roomId) {
        // Join the room
        socket.emit('joinRoom', { username, room: roomId });
        currentRoom = roomId;
    } else {
        alert('Please enter both username and room ID');
    }
});

// Event Listener for Game Board Clicks
gameBoard.addEventListener('click', (e) => {
    if (!gameActive || isSpectator) return;
    
    const cell = e.target;
    if (!cell.classList.contains('cell')) return;
    
    const position = cell.getAttribute('data-index');
    socket.emit('makeMove', { room: currentRoom, position: parseInt(position) });
});

// Event Listener for Restart Button
restartBtn.addEventListener('click', () => {
    if (isSpectator) return;
    socket.emit('restartGame', { room: currentRoom });
});

// Socket Event Handlers

// Handle room full notification
socket.on('roomFull', () => {
    isSpectator = true;
    alert('Room is full! You will join as a spectator.');
});

// Handle spectator joined
socket.on('spectatorJoined', (data) => {
    isSpectator = true;
    loginForm.style.display = 'none';
    gameContainer.style.display = 'block';
    roomDisplay.textContent = currentRoom;
    
    // Add spectator label
    const spectatorLabel = document.createElement('span');
    spectatorLabel.textContent = 'Spectator';
    spectatorLabel.classList.add('spectator-label');
    gameStatus.appendChild(spectatorLabel);
    
    // Update players
    updatePlayerDisplay(data.players);
    
    // Update board
    updateBoard(data.board);
    
    gameStatus.textContent = 'You are spectating the game';
});

// Handle player joined
socket.on('playerJoined', (data) => {
    loginForm.style.display = 'none';
    gameContainer.style.display = 'block';
    roomDisplay.textContent = currentRoom;
    playerSymbol = data.symbol;
    
    // Update player display
    updatePlayerDisplay(data.players);
    
    // Update board if game is in progress
    updateBoard(data.board);
});

// Handle room update
socket.on('roomUpdate', (data) => {
    updatePlayerDisplay(data.players);
    updateBoard(data.board);
    
    if (data.players.length < 2) {
        gameStatus.textContent = 'Waiting for opponent...';
        gameActive = false;
    }
});

// Handle game start
socket.on('gameStart', (data) => {
    gameActive = true;
    gameStatus.textContent = `Game started! ${data.currentPlayer.username}'s turn (${data.currentPlayer.symbol})`;
    updatePlayerTurn(data.currentPlayer.id);
});

// Handle game update (after move)
socket.on('gameUpdate', (data) => {
    gameActive = true;
    updateBoard(data.board);
    gameStatus.textContent = `${data.currentPlayer.username}'s turn (${data.currentPlayer.symbol})`;
    updatePlayerTurn(data.currentPlayer.id);
});

// Handle invalid move
socket.on('invalidMove', () => {
    alert('Invalid move! Try again.');
});

// Handle not your turn
socket.on('notYourTurn', () => {
    alert('It\'s not your turn!');
});

// Handle game over
socket.on('gameOver', (data) => {
    gameActive = false;
    
    if (data.isDraw) {
        gameStatus.textContent = 'Game ended in a draw!';
    } else {
        gameStatus.textContent = `${data.winner.username} (${data.winner.symbol}) wins!`;
        
        // Highlight winning cells (future enhancement)
    }
    
    updateBoard(data.board);
    
    // Show restart button for players
    if (!isSpectator) {
        restartBtn.style.display = 'block';
    }
});

// Handle game restart
socket.on('gameRestarted', (data) => {
    gameActive = true;
    updateBoard(data.board);
    gameStatus.textContent = `Game restarted! ${data.currentPlayer.username}'s turn (${data.currentPlayer.symbol})`;
    updatePlayerTurn(data.currentPlayer.id);
    restartBtn.style.display = 'none';
});

// Handle player left
socket.on('playerLeft', (data) => {
    gameActive = false;
    gameStatus.textContent = data.message;
    restartBtn.style.display = 'none';
});

// Utility Functions

// Update the display of player information
function updatePlayerDisplay(players) {
    if (players.length > 0) {
        player1Element.querySelector('.player-name').textContent = players[0].username;
    } else {
        player1Element.querySelector('.player-name').textContent = 'Waiting for player...';
    }
    
    if (players.length > 1) {
        player2Element.querySelector('.player-name').textContent = players[1].username;
    } else {
        player2Element.querySelector('.player-name').textContent = 'Waiting for player...';
    }
}

// Update which player's turn is active
function updatePlayerTurn(playerId) {
    player1Element.classList.remove('active-player');
    player2Element.classList.remove('active-player');
    
    const currentPlayerElement = socket.id === playerId ? 
        (playerSymbol === 'X' ? player1Element : player2Element) :
        (playerSymbol === 'X' ? player2Element : player1Element);
    
    currentPlayerElement.classList.add('active-player');
}

// Update the game board display
function updateBoard(board) {
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach((cell, index) => {
        cell.textContent = board[index] || '';
        
        // Reset classes
        cell.classList.remove('x', 'o');
        
        if (board[index] === 'X') {
            cell.classList.add('x');
        } else if (board[index] === 'O') {
            cell.classList.add('o');
        }
    });
}   