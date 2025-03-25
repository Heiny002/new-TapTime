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

// Serve Three.js from node_modules with proper MIME type
app.get('/libs/three.module.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(path.join(__dirname, '../node_modules/three/build/three.module.js'));
});

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
    activeCastles: new Set([0, 1, 2, 3]),
    readyPlayers: new Set() // Track which players are ready
};

// Team configuration
const teams = {
    colors: {
        0: 0xE9D229, // Yellow
        1: 0xCC1F11, // Red
        2: 0x0A48A2, // Blue
        3: 0x3BA226  // Green
    },
    names: {
        0: 'Yellow',
        1: 'Red',
        2: 'Blue',
        3: 'Green'
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
    
    // Ensure we have enough unique usernames
    if (count > fakeUsers.length) {
        console.warn(`Requested ${count} fake users, but only ${fakeUsers.length} available. Using maximum available.`);
        count = fakeUsers.length;
    }
    
    // Shuffle and select random users
    const shuffled = [...fakeUsers].sort(() => 0.5 - Math.random());
    const selectedUsers = shuffled.slice(0, count);
    
    // Add selected users to player list
    selectedUsers.forEach((username, index) => {
        gameState.players.push({
            id: `fake-${Date.now()}-${index}`,
            username,
            team: null,
            teamNumber: null,
            joinTime: Date.now() - Math.floor(Math.random() * 60000), // Random join time in the last minute
            isFake: true
        });
    });
    
    // Emit updated player list
    io.emit('playerList', gameState.players);
}

// Assign players to teams
function assignTeams() {
    // Shuffle the player list to randomize team assignments
    const shuffledPlayers = [...gameState.players].sort(() => 0.5 - Math.random());
    
    // Calculate how many players per team (trying to distribute evenly)
    const totalPlayers = shuffledPlayers.length;
    const numTeams = 4;
    const basePlayersPerTeam = Math.floor(totalPlayers / numTeams);
    const remainingPlayers = totalPlayers % numTeams;
    
    // Keep track of how many players are in each team
    const teamSizes = Array(numTeams).fill(basePlayersPerTeam);
    
    // Distribute remaining players (one extra for some teams)
    for (let i = 0; i < remainingPlayers; i++) {
        teamSizes[i]++;
    }
    
    // Assign players to teams
    let playerIndex = 0;
    for (let teamId = 0; teamId < numTeams; teamId++) {
        // For each team, assign the calculated number of players
        const teamMembers = [];
        for (let i = 0; i < teamSizes[teamId]; i++) {
            if (playerIndex < shuffledPlayers.length) {
                const player = shuffledPlayers[playerIndex];
                const originalIndex = gameState.players.findIndex(p => p.id === player.id);
                if (originalIndex !== -1) {
                    gameState.players[originalIndex].team = teamId;
                    teamMembers.push(gameState.players[originalIndex]);
                }
                playerIndex++;
            }
        }
        
        // Assign random numbers to team members
        assignTeamNumbers(teamMembers);
    }
    
    // Notify all players of their team assignments
    notifyTeamAssignments();
}

// Assign random numbers to team members
function assignTeamNumbers(teamMembers) {
    // Shuffle array of indices from 1 to team size
    const teamNumbers = Array.from({length: teamMembers.length}, (_, i) => i + 1);
    teamNumbers.sort(() => 0.5 - Math.random());
    
    // Assign shuffled numbers to team members
    teamMembers.forEach((player, index) => {
        const originalIndex = gameState.players.findIndex(p => p.id === player.id);
        if (originalIndex !== -1) {
            gameState.players[originalIndex].teamNumber = teamNumbers[index];
        }
    });
}

// Notify players of their team assignments
function notifyTeamAssignments() {
    // Group players by team
    const teamPlayers = {};
    for (let teamId = 0; teamId < 4; teamId++) {
        teamPlayers[teamId] = gameState.players.filter(p => p.team === teamId);
    }
    
    // For each player, send their team assignment
    gameState.players.forEach(player => {
        if (!player.isFake) {
            io.to(player.id).emit('teamAssigned', {
                team: player.team,
                teamName: teams.names[player.team],
                teamColor: teams.colors[player.team],
                teamNumber: player.teamNumber,
                teamMembers: teamPlayers[player.team]
            });
        }
    });
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
            teamNumber: null,
            joinTime: Date.now(),
            isFake: false
        };
        // Add real player at the top of the list
        gameState.players.unshift(player);
        io.emit('playerList', gameState.players);
    });
    
    // Handle player ready
    socket.on('playerReady', () => {
        // Mark this player as ready
        gameState.readyPlayers.add(socket.id);
        
        // Assign teams if this is the first real player who's ready
        // In a real implementation, we might wait for all players or use a timer
        if (!gameState.players.some(p => p.team !== null)) {
            assignTeams();
        }
        else {
            // If teams are already assigned, just notify this player of their team
            const player = gameState.players.find(p => p.id === socket.id);
            if (player && player.team !== null) {
                const teamMembers = gameState.players.filter(p => p.team === player.team);
                socket.emit('teamAssigned', {
                    team: player.team,
                    teamName: teams.names[player.team],
                    teamColor: teams.colors[player.team],
                    teamNumber: player.teamNumber,
                    teamMembers: teamMembers
                });
            }
        }
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
        gameState.readyPlayers.delete(socket.id);
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
    
    // Make sure all players have teams assigned
    if (!gameState.players.every(p => p.team !== null)) {
        assignTeams();
    }
    
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
    
    // Add fake players - minimum of 40, with some randomness
    const MIN_FAKE_PLAYERS = 40;
    const ADDITIONAL_RANDOM_PLAYERS = Math.floor(Math.random() * 10); // 0 to 9 additional players
    const fakePlayers = MIN_FAKE_PLAYERS + ADDITIONAL_RANDOM_PLAYERS;
    
    console.log(`Adding ${fakePlayers} fake players...`);
    addFakePlayers(fakePlayers);
}); 