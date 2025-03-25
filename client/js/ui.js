import { gameState } from './game.js';

// Utility functions
const getTeamColor = (teamNumber) => {
    // Main team colors (0-3)
    const teamColors = {
        0: '#FF4444', // Red team
        1: '#44FF44', // Green team
        2: '#4444FF', // Blue team
        3: '#FFFF44'  // Yellow team
    };
    return teamColors[teamNumber] || '#CCCCCC'; // Default to gray if team not found
};

// UI state management
let uiState = null;

// Initialize UI state
function initializeUIState() {
    console.log('Initializing UI state');
    
    // Wait for DOM to be ready
    if (!document.getElementById('login-screen')) {
        console.error('DOM elements not ready yet');
        return null;
    }
    
    const state = {
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

    // Verify all UI elements were found
    let missingElements = false;
    Object.entries(state.screens).forEach(([name, element]) => {
        if (!element) {
            console.error(`Screen element not found: ${name}`);
            missingElements = true;
        }
    });
    
    Object.entries(state.elements).forEach(([name, element]) => {
        if (!element) {
            console.error(`UI element not found: ${name}`);
            missingElements = true;
        }
    });

    if (missingElements) {
        console.error('Some UI elements are missing');
        return null;
    }

    return state;
}

// Socket.IO connection - ensure it's available
const socket = window.io ? io() : null;
if (!socket) {
    console.error('Socket.IO not available');
}

// Add socket connection error handling
socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

socket.on('connect_timeout', () => {
    console.error('Socket connection timeout');
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
});

// Reset all game state
function resetGameState() {
    // Reset UI state
    uiState.currentUsername = '';
    uiState.currentTeam = null;
    uiState.teamData = null;
    
    // Reset UI elements
    uiState.elements.username.value = '';
    uiState.elements.readyBtn.disabled = false;
    uiState.elements.readyBtn.textContent = 'Ready';
    uiState.elements.playerList.innerHTML = '';
    uiState.elements.teamInfo.innerHTML = '';
    uiState.elements.teamMembers.innerHTML = '';
    
    // Reset game state
    if (typeof gameState !== 'undefined') {
        gameState.currentPlayer = null;
        gameState.isGameStarted = false;
        if (typeof cleanupThreeJS === 'function') {
            cleanupThreeJS();
        }
    }
    
    // Show login screen
    showScreen('login');
}

// Handle player join function
function handleJoin() {
    console.log('handleJoin called');
    const username = uiState.elements.username.value.trim();
    if (username) {
        console.log('Username is valid:', username);
        uiState.currentUsername = username;
        socket.emit('join', username);
        showScreen('waiting');
    }
}

// UI Event Handlers
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Join button click
    const joinBtn = uiState.elements.joinBtn;
    console.log('Join button element:', joinBtn);
    
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            console.log('Join button clicked');
            handleJoin();
        });
    } else {
        console.error('Join button not found in DOM');
    }
    
    // Enter key in username input
    const usernameInput = uiState.elements.username;
    console.log('Username input element:', usernameInput);
    
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                console.log('Enter key pressed in username input');
                event.preventDefault(); // Prevent default form submission
                handleJoin();
            }
        });
    } else {
        console.error('Username input not found in DOM');
    }
    
    // Ready button click - Notify server player is ready for team assignment
    uiState.elements.readyBtn.addEventListener('click', () => {
        console.log('Ready button clicked');
        if (!uiState.elements.readyBtn.disabled) {
            socket.emit('playerReady');
            uiState.elements.readyBtn.disabled = true;
            uiState.elements.readyBtn.textContent = 'Ready!';
        }
    });
    
    // Start battle button click
    uiState.elements.startBattleBtn.addEventListener('click', () => {
        console.log('Start battle button clicked');
        socket.emit('startGame');
        gameState.isGameStarted = true;
        hideAllScreens();
    });
}

// Screen Management
function showScreen(screenName) {
    console.log('Showing screen:', screenName);
    hideAllScreens();
    if (uiState.screens[screenName]) {
        uiState.screens[screenName].classList.remove('hidden');
        console.log(`Screen ${screenName} should now be visible`);
    } else {
        console.error(`Screen ${screenName} not found in uiState.screens`);
    }
}

function hideAllScreens() {
    console.log('Hiding all screens');
    Object.entries(uiState.screens).forEach(([name, screen]) => {
        if (screen) {
            screen.classList.add('hidden');
            console.log(`Screen ${name} hidden`);
        } else {
            console.error(`Screen ${name} not found in DOM`);
        }
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
function updateHealthBars(players) {
    console.log('Updating health bars for players:', players);
    if (!uiState || !uiState.elements.healthBars) {
        console.error('Health bars container not initialized');
        return;
    }

    try {
        // Clear existing health bars
        uiState.elements.healthBars.innerHTML = '';

        // Create health bars for each player
        players.forEach(player => {
            if (!player) return; // Skip if player is undefined
            
            const healthBar = document.createElement('div');
            healthBar.className = 'health-bar';
            healthBar.id = `health-${player.id}`;
            
            const color = getTeamColor(player.team);
            healthBar.style.backgroundColor = color;
            
            const label = document.createElement('span');
            label.textContent = `${player.username} (${player.health || 100}%)`;
            healthBar.appendChild(label);
            
            uiState.elements.healthBars.appendChild(healthBar);
        });
    } catch (error) {
        console.error('Error updating health bars:', error);
    }
}

// Socket.IO Event Handlers
socket.on('playerList', (players) => {
    console.log('Received player list:', players);
    
    if (!Array.isArray(players)) {
        console.error('Invalid player list received:', players);
        return;
    }

    // Update player list UI
    if (uiState && uiState.elements.playerList) {
        uiState.elements.playerList.innerHTML = '';
        players.forEach(player => {
            if (!player) return;
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.textContent = `${player.username} ${player.ready ? '(Ready)' : ''}`;
            if (player.team !== null) {
                playerItem.style.color = getTeamColor(player.team);
            }
            uiState.elements.playerList.appendChild(playerItem);
        });
    }

    // Update ready button state based on team assignment
    const currentPlayer = players.find(p => p.id === socket.id);
    if (currentPlayer && uiState.elements.readyBtn) {
        // Reset ready button state
        uiState.elements.readyBtn.disabled = false;
        
        if (currentPlayer.team === null) {
            // Player needs to be assigned to a team
            uiState.elements.readyBtn.textContent = 'Ready';
            uiState.elements.readyBtn.disabled = false;
        } else {
            // Player has a team
            if (currentPlayer.ready) {
                uiState.elements.readyBtn.textContent = 'Ready!';
                uiState.elements.readyBtn.disabled = true;
            } else {
                uiState.elements.readyBtn.textContent = 'Ready';
                uiState.elements.readyBtn.disabled = false;
            }
        }
    }
});

socket.on('teamAssigned', (teamData) => {
    console.log('Team assigned:', teamData);
    
    // Save team data to game state for battle
    gameState.currentPlayer = {
        team: teamData.team,
        teamColor: teamData.teamColor,
        teamNumber: teamData.teamNumber
    };
    
    // Update UI with team information
    updateTeamInfo(teamData);
    
    // Update ready button state
    if (uiState.elements.readyBtn) {
        uiState.elements.readyBtn.textContent = 'Ready';
        uiState.elements.readyBtn.disabled = false;
    }
    
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

socket.on('connect', () => {
    console.log('Connected to server with socket ID:', socket.id);
    resetGameState();
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    resetGameState();
});

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    
    // Initialize UI state first
    uiState = initializeUIState();
    
    // Then set up event listeners
    setupEventListeners();
    
    // Focus on username input when page loads
    if (uiState.elements.username) {
        uiState.elements.username.focus();
    } else {
        console.error('Username input not found for focus');
    }
}); 