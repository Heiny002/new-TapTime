// UI state management
const uiState = {
    screens: {
        login: document.getElementById('login-screen'),
        waiting: document.getElementById('waiting-room'),
        strategy: document.getElementById('strategy-room')
    },
    elements: {
        username: document.getElementById('username'),
        joinBtn: document.getElementById('join-btn'),
        readyBtn: document.getElementById('ready-btn'),
        startBattleBtn: document.getElementById('start-battle-btn'),
        playerList: document.getElementById('player-list'),
        teamInfo: document.getElementById('team-info'),
        teamMembers: document.getElementById('team-members'),
        healthBars: document.getElementById('health-bars')
    },
    currentUsername: ''
};

// Socket.IO connection
const socket = io();

// Handle player join function
function handleJoin() {
    const username = uiState.elements.username.value.trim();
    if (username) {
        uiState.currentUsername = username;
        socket.emit('join', username);
        showScreen('waiting');
    }
}

// UI Event Handlers
function setupEventListeners() {
    // Join button click
    uiState.elements.joinBtn.addEventListener('click', handleJoin);
    
    // Enter key in username input
    uiState.elements.username.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission
            handleJoin();
        }
    });
    
    // Ready button click
    uiState.elements.readyBtn.addEventListener('click', () => {
        showScreen('strategy');
    });
    
    // Start battle button click
    uiState.elements.startBattleBtn.addEventListener('click', () => {
        socket.emit('startGame');
        gameState.isGameStarted = true;
        hideAllScreens();
    });
}

// Screen Management
function showScreen(screenName) {
    hideAllScreens();
    uiState.screens[screenName].classList.remove('hidden');
}

function hideAllScreens() {
    Object.values(uiState.screens).forEach(screen => {
        screen.classList.add('hidden');
    });
}

// Player List Management
function updatePlayerList(players) {
    uiState.elements.playerList.innerHTML = '';
    
    players.forEach(player => {
        const playerElement = document.createElement('div');
        
        // Add special styling for the current user
        if (player.username === uiState.currentUsername) {
            playerElement.classList.add('current-player');
            playerElement.innerHTML = `<strong>${player.username} (You)</strong>`;
        } else {
            playerElement.textContent = player.username;
        }
        
        uiState.elements.playerList.appendChild(playerElement);
    });
}

// Team Management
function updateTeamInfo(team) {
    const teamColors = {
        0: '#E9D229', // Yellow
        1: '#CC1F11', // Red
        2: '#0A48A2', // Blue
        3: '#3BA226'  // Green
    };
    
    uiState.elements.teamInfo.innerHTML = `
        <div style="color: ${teamColors[team]}">
            <h3>Team ${team + 1}</h3>
        </div>
    `;
}

function updateTeamMembers(players, currentTeam) {
    const teamPlayers = players.filter(p => p.team === currentTeam);
    uiState.elements.teamMembers.innerHTML = teamPlayers
        .map(player => `<div>${player.username}</div>`)
        .join('');
}

// Health Bar Management
function updateHealthBars(castleHealth) {
    uiState.elements.healthBars.innerHTML = '';
    
    castleHealth.forEach(([castleId, health]) => {
        const healthBar = document.createElement('div');
        healthBar.className = 'health-bar';
        
        const healthFill = document.createElement('div');
        healthFill.className = 'health-fill';
        healthFill.style.width = `${(health / 10) * 100}%`;
        healthFill.style.backgroundColor = getTeamColor(castleId);
        
        healthBar.appendChild(healthFill);
        uiState.elements.healthBars.appendChild(healthBar);
    });
}

// Socket.IO Event Handlers
socket.on('playerList', (players) => {
    updatePlayerList(players);
});

socket.on('teamAssigned', (data) => {
    gameState.currentPlayer = {
        team: data.team,
        teamColor: data.teamColor
    };
    updateTeamInfo(data.team);
    updateTeamMembers(data.teamMembers, data.team);
});

socket.on('gameStart', (data) => {
    updateHealthBars(data.castleHealth);
});

socket.on('healthUpdate', (data) => {
    const healthBars = uiState.elements.healthBars.children;
    if (healthBars[data.castle]) {
        const healthFill = healthBars[data.castle].querySelector('.health-fill');
        healthFill.style.width = `${(data.health / 10) * 100}%`;
    }
});

socket.on('gameOver', (data) => {
    const winner = data.winner;
    alert(`Game Over! Team ${winner + 1} wins!`);
    showScreen('login');
    gameState.isGameStarted = false;
});

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Focus on username input when page loads
    uiState.elements.username.focus();
}); 