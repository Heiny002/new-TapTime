// Game state management
const gameState = {
    currentPlayer: null,
    isGameStarted: false,
    lastInteraction: 0,
    CLICK_COOLDOWN: 500,
    scene: null,
    camera: null,
    renderer: null,
    ground: null,
    castles: [],
    healthBars: []
};

// Initialize Three.js scene
function initThreeJS() {
    // Create scene
    gameState.scene = new THREE.Scene();
    
    // Create camera
    gameState.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    gameState.camera.position.set(0, 15, 15);
    gameState.camera.lookAt(0, 0, 0);
    
    // Create renderer
    gameState.renderer = new THREE.WebGLRenderer({ antialias: true });
    gameState.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(gameState.renderer.domElement);
    
    // Setup scene
    setupScene();
    setupLighting();
    setupControls();
    
    // Start animation loop
    animate();
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
    requestAnimationFrame(animate);
    gameState.renderer.render(gameState.scene, gameState.camera);
}

// Handle click/tap events
function handleInteraction(event) {
    if (!gameState.isGameStarted) return;
    
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

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    
    // Add click/tap event listener
    document.getElementById('game-container').addEventListener('click', handleInteraction);
    document.getElementById('game-container').addEventListener('touchstart', (event) => {
        event.preventDefault();
        handleInteraction(event.touches[0]);
    });
}); 