import * as THREE from '/libs/three.module.js';

// Game state management
export const gameState = {
    currentPlayer: null,
    isGameStarted: false,
    lastInteraction: 0,
    CLICK_COOLDOWN: 500,
    scene: null,
    camera: null,
    renderer: null,
    ground: null,
    castles: [],
    healthBars: [],
    threeJsInitialized: false,
    initializationAttempted: false
};

// Cleanup Three.js resources
function cleanupThreeJS() {
    if (!gameState.threeJsInitialized) return;

    // Remove event listeners
    const container = document.getElementById('game-container');
    container.removeEventListener('click', handleInteraction);
    container.removeEventListener('touchstart', handleInteractionTouch);
    
    // Dispose of geometries and materials
    if (gameState.ground) {
        gameState.ground.geometry.dispose();
        gameState.ground.material.dispose();
    }
    
    gameState.castles.forEach(castle => {
        if (castle) {
            castle.geometry.dispose();
            castle.material.dispose();
        }
    });
    
    // Clear arrays
    gameState.castles = [];
    gameState.healthBars = [];
    
    // Remove renderer DOM element
    if (gameState.renderer) {
        const container = document.getElementById('game-container');
        if (container && gameState.renderer.domElement) {
            container.removeChild(gameState.renderer.domElement);
        }
        gameState.renderer.dispose();
    }
    
    // Clear references
    gameState.scene = null;
    gameState.camera = null;
    gameState.renderer = null;
    gameState.ground = null;
    gameState.threeJsInitialized = false;
    gameState.initializationAttempted = false;
}

// Initialize Three.js scene
export function initThreeJS() {
    if (gameState.initializationAttempted) {
        console.warn('Three.js initialization already attempted');
        return gameState.threeJsInitialized;
    }
    
    gameState.initializationAttempted = true;
    
    try {
        console.log('Initializing THREE.js...');
        
        // Create scene
        gameState.scene = new THREE.Scene();
        console.log('Scene created');
        
        // Create camera
        gameState.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        gameState.camera.position.set(0, 15, 15);
        gameState.camera.lookAt(0, 0, 0);
        console.log('Camera setup complete');
        
        // Create renderer
        gameState.renderer = new THREE.WebGLRenderer({ antialias: true });
        gameState.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(gameState.renderer.domElement);
        console.log('Renderer created and added to DOM');
        
        // Setup scene
        setupScene();
        setupLighting();
        setupControls();
        console.log('Scene setup complete');
        
        // Start animation loop
        animate();
        
        gameState.threeJsInitialized = true;
        console.log('THREE.js initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Three.js:', error);
        if (error instanceof TypeError) {
            console.error('TypeError encountered. This might be because THREE.js is not fully loaded or a method is undefined.');
        }
        return false;
    }
}

// Scene setup
function setupScene() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x404040,
        roughness: 0.8,
        metalness: 0.2
    });
    gameState.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    gameState.ground.rotation.x = -Math.PI / 2;
    gameState.scene.add(gameState.ground);
    
    // Create castles
    createCastles();
}

// Create castles for each team
function createCastles() {
    const castleGeometry = new THREE.BoxGeometry(2, 4, 2);
    const positions = [
        { x: -8, z: 0 },  // Yellow (West)
        { x: 0, z: -8 },  // Red (North)
        { x: 8, z: 0 },   // Blue (East)
        { x: 0, z: 8 }    // Green (South)
    ];
    
    positions.forEach((pos, index) => {
        const castleMaterial = new THREE.MeshStandardMaterial({
            color: getTeamColor(index)
        });
        const castle = new THREE.Mesh(castleGeometry, castleMaterial);
        castle.position.set(pos.x, 2, pos.z);
        castle.userData.team = index;
        gameState.castles.push(castle);
        gameState.scene.add(castle);
    });
}

// Setup lighting
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    gameState.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    gameState.scene.add(directionalLight);
}

// Setup camera controls
function setupControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    const container = document.getElementById('game-container');
    
    container.addEventListener('mousedown', (event) => {
        isDragging = true;
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    });
    
    container.addEventListener('mousemove', (event) => {
        if (!isDragging) return;
        
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };
        
        // Rotate camera around the center
        const radius = 15;
        const currentAngle = Math.atan2(
            gameState.camera.position.x,
            gameState.camera.position.z
        );
        const newAngle = currentAngle + deltaMove.x * 0.01;
        
        gameState.camera.position.x = radius * Math.sin(newAngle);
        gameState.camera.position.z = radius * Math.cos(newAngle);
        gameState.camera.lookAt(0, 0, 0);
        
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    });
    
    container.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        gameState.camera.aspect = window.innerWidth / window.innerHeight;
        gameState.camera.updateProjectionMatrix();
        gameState.renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Animation loop
function animate() {
    if (!gameState.threeJsInitialized) return;
    requestAnimationFrame(animate);
    if (gameState.renderer && gameState.scene && gameState.camera) {
        gameState.renderer.render(gameState.scene, gameState.camera);
    }
}

// Handle click/tap events
function handleInteraction(event) {
    if (!gameState.isGameStarted || !gameState.threeJsInitialized) return;
    
    const now = Date.now();
    if (now - gameState.lastInteraction < gameState.CLICK_COOLDOWN) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, gameState.camera);
    const intersects = raycaster.intersectObjects(gameState.castles);
    
    if (intersects.length > 0) {
        const castle = intersects[0].object;
        const castleTeam = castle.userData.team;
        
        // Determine if attack or repair based on team
        if (castleTeam === gameState.currentPlayer.team) {
            socket.emit('repair', castleTeam);
        } else {
            socket.emit('attack', castleTeam);
        }
        
        gameState.lastInteraction = now;
    }
}

// Handle touch events separately to prevent double handling
function handleInteractionTouch(event) {
    event.preventDefault();
    handleInteraction(event.touches[0]);
}

// Helper function to get team color
function getTeamColor(team) {
    const colors = {
        0: 0xE9D229, // Yellow
        1: 0xCC1F11, // Red
        2: 0x0A48A2, // Blue
        3: 0x3BA226  // Green
    };
    return colors[team] || 0xffffff;
}

// Use this to safely try to initialize Three.js
function tryInitThreeJS() {
    // We'll try to initialize Three.js, but our app will still work if it fails
    try {
        // Try to initialize Three.js only when game starts
        return initThreeJS();
    } catch (error) {
        console.warn('Three.js initialization failed, continuing without 3D rendering:', error);
        return false;
    }
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    // Add click/tap event listener
    const container = document.getElementById('game-container');
    container.addEventListener('click', handleInteraction);
    container.addEventListener('touchstart', handleInteractionTouch);
    
    // Clean up Three.js when navigating away or refreshing
    window.addEventListener('beforeunload', cleanupThreeJS);
}); 