const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Load fake users from file
let fakeUsers = [];
try {
  const fakeUsersFile = fs.readFileSync(path.join(__dirname, '../fakeUsers.txt'), 'utf8');
  fakeUsers = fakeUsersFile.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.trim());
  console.log(`Loaded ${fakeUsers.length} fake users`);
} catch (error) {
  console.error('Error loading fake users:', error.message);
}

// Game state management
const gameState = {
    players: [],
    gameStarted: false,
    castleHealth: new Map(), // 0-3 for each team
    activeCastles: new Set([0, 1, 2, 3])
};

// Team configuration
const teams = {
    colors: {
        0: 0xE9D229, // Yellow
        1: 0xCC1F11, // Red
        2: 0x0A48A2, // Blue
        3: 0x3BA226  // Green
    },
    positions: [
        { x: -8, z: 0 },  // Yellow (West)
        { x: 0, z: -8 },  // Red (North)
        { x: 8, z: 0 },   // Blue (East)
        { x: 0, z: 8 }    // Green (South)
    ]
};

// Add fake players to the game
function addFakePlayers(count) {
    if (!fakeUsers.length) return;
    
    // Shuffle and select random users
    const shuffled = [...fakeUsers].sort(() => 0.5 - Math.random());
    const selectedUsers = shuffled.slice(0, count);
    
    // Add selected users to player list
    selectedUsers.forEach((username, index) => {
        gameState.players.push({
            id: `fake-${Date.now()}-${index}`,
            username,
            team: null,
            joinTime: Date.now() - Math.floor(Math.random() * 60000), // Random join time in the last minute
            isFake: true
        });
    });
    
    // Emit updated player list
    io.emit('playerList', gameState.players);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Handle player joining
    socket.on('join', (username) => {
        const player = {
            id: socket.id,
            username,
            team: null,
            joinTime: Date.now(),
            isFake: false
        };
        // Add real player at the top of the list
        gameState.players.unshift(player);
        io.emit('playerList', gameState.players);
    });

    // Handle game actions
    socket.on('attack', (castleId) => {
        if (!gameState.gameStarted) return;
        
        const currentHealth = gameState.castleHealth.get(castleId) || 0;
        if (currentHealth > 0) {
            gameState.castleHealth.set(castleId, currentHealth - 1);
            io.emit('healthUpdate', { castle: castleId, health: currentHealth - 1 });
            
            if (currentHealth - 1 <= 0) {
                gameState.activeCastles.delete(castleId);
                checkGameEnd();
            }
        }
    });

    socket.on('repair', (castleId) => {
        if (!gameState.gameStarted) return;
        
        const currentHealth = gameState.castleHealth.get(castleId) || 0;
        if (currentHealth < 10) {
            gameState.castleHealth.set(castleId, currentHealth + 1);
            io.emit('healthUpdate', { castle: castleId, health: currentHealth + 1 });
        }
    });

    // Handle game start
    socket.on('startGame', () => {
        if (!gameState.gameStarted) {
            startGame();
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        io.emit('playerList', gameState.players);
    });
});

// Game logic functions
function startGame() {
    gameState.gameStarted = true;
    gameState.castleHealth.clear();
    gameState.activeCastles = new Set([0, 1, 2, 3]);
    
    // Initialize castle health
    for (let i = 0; i < 4; i++) {
        gameState.castleHealth.set(i, 10);
    }
    
    // Assign teams
    gameState.players.forEach((player, index) => {
        player.team = index % 4;
    });
    
    io.emit('gameStart', {
        players: gameState.players,
        castleHealth: Array.from(gameState.castleHealth.entries())
    });
}

function checkGameEnd() {
    if (gameState.activeCastles.size === 1) {
        const winner = Array.from(gameState.activeCastles)[0];
        io.emit('gameOver', { winner });
        gameState.gameStarted = false;
    }
}

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (interface.internal || interface.family !== 'IPv4') continue;
            return interface.address;
        }
    }
    return 'localhost';
}

// Start the server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces
const localIP = getLocalIP();

httpServer.listen(PORT, HOST, () => {
    console.log(`Server running on:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://${localIP}:${PORT}`);
    
    // Add random number of fake players (between 5 and 15)
    const fakePlayers = Math.floor(Math.random() * 11) + 5;
    console.log(`Adding ${fakePlayers} fake players...`);
    addFakePlayers(fakePlayers);
}); 