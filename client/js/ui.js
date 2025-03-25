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
    currentUsername: '',
    currentTeam: null,
    teamData: null
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
    
    // Ready button click - Notify server player is ready for team assignment
    uiState.elements.readyBtn.addEventListener('click', () => {
        socket.emit('playerReady');
        uiState.elements.readyBtn.disabled = true;
        uiState.elements.readyBtn.textContent = 'Waiting for team assignment...';
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
function updateTeamInfo(teamData) {
    uiState.teamData = teamData;
    uiState.currentTeam = teamData.team;
    
    // Set team color
    const teamColor = teamData.teamColor.toString(16).padStart(6, '0');
    
    uiState.elements.teamInfo.innerHTML = `
        <div class="team-header" style="color: #${teamColor}">
            <h3>Team ${teamData.teamName}</h3>
            <p>You are assigned as Player #${teamData.teamNumber}</p>
        </div>
    `;
    
    // Update team members list
    updateTeamMembersList(teamData.teamMembers);
}

function updateTeamMembersList(teamMembers) {
    uiState.elements.teamMembers.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'team-members-header';
    header.innerHTML = '<h4>Team Members:</h4>';
    uiState.elements.teamMembers.appendChild(header);
    
    // Create team members list
    const membersList = document.createElement('div');
    membersList.className = 'team-members-list';
    
    // Sort members by their team number
    const sortedMembers = [...teamMembers].sort((a, b) => a.teamNumber - b.teamNumber);
    
    sortedMembers.forEach(member => {
        const memberElement = document.createElement('div');
        memberElement.className = 'team-member';
        
        if (member.username === uiState.currentUsername) {
            memberElement.classList.add('current-player');
            memberElement.innerHTML = `<strong>#${member.teamNumber}: ${member.username} (You)</strong>`;
        } else {
            memberElement.textContent = `#${member.teamNumber}: ${member.username}`;
        }
        
        membersList.appendChild(memberElement);
    });
    
    uiState.elements.teamMembers.appendChild(membersList);
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

socket.on('teamAssigned', (teamData) => {
    // Save team data to game state for battle
    gameState.currentPlayer = {
        team: teamData.team,
        teamColor: teamData.teamColor,
        teamNumber: teamData.teamNumber
    };
    
    // Update UI with team information
    updateTeamInfo(teamData);
    
    // Show strategy room
    showScreen('strategy');
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