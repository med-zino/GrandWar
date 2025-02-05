const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Audio setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let isAudioInitialized = false;

// Sound effect buffers
const sounds = {
    jump: null,
    doubleJump: null,
    collision: null,
    score: null,
};

// Audio elements
const bgMusic = new Audio('bg.mp3');
const jumpSound = new Audio('jump.mp3');
bgMusic.loop = true;

// Volume controls
const soundVolume = 0.5;
const musicVolume = 0.2;

// Game sta
let gameOver = false;
let score = 0;
let jumpCount = 0;
let lives = 3;
const groundLevel = canvas.height - 120;

// Player shape
let shape = { x: 250, y: 250, radius: 20, color: 'red' };
const playerImage = new Image();
playerImage.src = 'hero.png'; // Replace with a real image URL
let player = {
    x: 100,
    y: groundLevel - 40, // Start the player on the ground
    width: 60, // Adjust based on your image size
    height: 60, // Adjust based on your image size
    color: 'red', // Optional, if you want to keep the color for debugging
};
const speed = 5;
const gravity = 0.5;
const jumpStrength = -10;
let velocityY = 0;
let isOnGround = false;

// Fish/Shark images
const fishImage = new Image();
fishImage.src = 'shark.png'; // Replace with a real image URL

// Planes and projectiles
const planeImage = new Image();
planeImage.src = 'airbb.png'; // Replace with a real image URL
const planes = [];
const planeSpeed = 3;
const planeSpawnRate = 120;
const projectiles = [];
const projectileSpeed = 5;

// Ground obstacles (fish/sharks)
let groundObstacles = [];
const groundObstacleSpeed = 4;
const groundObstacleSpawnRate = 120;
let frameCount = 0;

// Keyboard state tracking
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
};

// Load sound effects
async function loadSounds() {
    try {
        const soundFiles = {
            jump: 'jump.mp3',
            doubleJump: 'jump.mp3',
        };

        for (const [name, file] of Object.entries(soundFiles)) {
            const response = await fetch(file);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            sounds[name] = audioBuffer;
        }

        isAudioInitialized = true;
    } catch (error) {
        console.error('Error loading sounds:', error);
    }
}

// Play sound effect function
function playSound(soundName, volume = soundVolume) {
    if (!isAudioInitialized || !sounds[soundName]) return;

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = sounds[soundName];
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();
}

// Initialize audio
function initAudio() {
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed');
        });
    }
    if (!isAudioInitialized) {
        loadSounds();
        bgMusic.volume = musicVolume;
        bgMusic.play();
    }
}

// Keyboard event listeners
window.addEventListener('keydown', (e) => {
    if (!isAudioInitialized) {
        initAudio();
    }

    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;

        if (e.key === 'ArrowUp' && jumpCount < 2) {
            velocityY = jumpStrength;
            jumpCount++;
            jumpSound.currentTime = 0; // Reset the audio to the start
            jumpSound.play();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Create fish/shark obstacles
function createFish() {
    const width = 60;
    const height = 40;
    return {
        x: canvas.width + width,
        y: canvas.height - height,
        width: width,
        height: height,
    };
}

// Create planes
function createPlane() {
    const width = 80;
    const height = 40;
    return {
        x: Math.random() * (canvas.width - width),
        y: -height,
        width: width,
        height: height,
    };
}

// Create projectiles
function createProjectile(plane) {
    return {
        x: plane.x + plane.width / 2,
        y: plane.y + plane.height,
        width: 5,
        height: 10,
    };
}

// Check collision
function checkCollision(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + (rect.width || rect.size)));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + (rect.height || rect.size)));

    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;

    const collision = (distanceX * distanceX) + (distanceY * distanceY) < (circle.radius * circle.radius);
    
    if (collision && !gameOver) {
        if (lives > 0) {
            shape.x = 100;
            shape.y = 100;
            velocityY = 0;
            jumpCount = 0;
        }
        lives--; 
        playSound('collision');

        if (lives <= 0) {
            gameOver = true;
            bgMusic.pause();
            bgMusic.currentTime = 0;
        }
    }
    
    return collision;
}

// Draw lives on the screen
function drawLives() {
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Lives: ${lives}`, 20, 70); // Display lives below the score
}

// Draw fish/shark
function drawFish(fish) {
    ctx.drawImage(fishImage, fish.x, fish.y, fish.width, fish.height);
}

// Draw plane
function drawPlane(plane) {
    ctx.drawImage(planeImage, plane.x, plane.y, plane.width, plane.height);
}

// Draw projectile
function drawProjectile(projectile) {
    ctx.fillStyle = 'black';
    ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
}

// Draw game over screen
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over! Fuck u loser', canvas.width / 2, canvas.height / 2 - 50);
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height / 2 + 60;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('Restart', canvas.width / 2, buttonY + 35);

    return { buttonX, buttonY, buttonWidth, buttonHeight };
}

// Reset game function
function resetGame() {
    gameOver = false;
    score = 0;
    lives = 3; // Reset lives
    shape.x = 100;
    shape.y = 100;
    velocityY = 0;
    jumpCount = 0;
    groundObstacles = [];
    planes = [];
    projectiles = [];
    frameCount = 0;
    bgMusic.play();
}

// Handle click on restart button
canvas.addEventListener('click', (e) => {
    if (gameOver) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const button = drawGameOver();
        
        if (clickX >= button.buttonX && 
            clickX <= button.buttonX + button.buttonWidth &&
            clickY >= button.buttonY && 
            clickY <= button.buttonY + button.buttonHeight) {
            resetGame();
        }
    }
});

// Add mute functionality
let isMuted = false;
window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
        isMuted = !isMuted;
        bgMusic.muted = isMuted;
    }
});

function drawBeach() {
    ctx.fillStyle = '#1E90FF'; // Deep blue to represent water
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
}

function drawSun() {
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 100, 50, 0, Math.PI * 2);
    ctx.fillStyle = 'yellow';
    ctx.fill();
}


function drawCloud(x, y) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.arc(x + 40, y - 10, 25, 0, Math.PI * 2);
    ctx.arc(x + 80, y, 30, 0, Math.PI * 2);
    ctx.fill();
}

const heroImage = new Image();
heroImage.src = 'ship.png';

function drawPlayer() {
    ctx.drawImage(heroImage, shape.x - shape.radius, shape.y - shape.radius, shape.radius * 4, shape.radius * 4);
}


function drawBackground() {
    ctx.fillStyle = '#87CEEB'; // Sky color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawSun();
    drawCloud(150, 100);
    drawCloud(400, 150);
    drawBeach();
}

// Update and draw the game
function update() {
    // Change background color based on score
    if (score >= 15) {
        ctx.fillStyle = '#87CEEB'; // Change background to red at score 15
    } else {
        ctx.fillStyle = '#87CEEB'; // Default sky blue background
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Sun, Clouds, and Beach (before drawing game objects)
    drawSun();
    drawCloud(150, 100);
    drawCloud(400, 150);
    drawBeach(); // Beach is drawn first so it doesn't cover other elements

    if (!gameOver) {
        frameCount++;

        // Spawn new fish/sharks
        if (frameCount % groundObstacleSpawnRate === 0) {
            groundObstacles.push(createFish());
        }

        // Spawn new planes
        if (frameCount % planeSpawnRate === 0) {
            planes.push(createPlane());
        }

        // Update and draw fish/sharks
        for (let i = groundObstacles.length - 1; i >= 0; i--) {
            const fish = groundObstacles[i];
            fish.x -= groundObstacleSpeed;
            fish.y = canvas.height - 120;
            
            drawFish(fish);

            if (checkCollision(shape, fish)) {
                continue;
            }

            if (fish.x + fish.width < 0) {
                groundObstacles.splice(i, 1);
                score++;
                playSound('score');
            }
        }

        // Update and draw planes
        for (let i = planes.length - 1; i >= 0; i--) {
            const plane = planes[i];
            plane.y += planeSpeed;
            
            drawPlane(plane);

            // Shoot projectiles
            if (frameCount % 60 === 0) { // Shoot every 60 frames
                projectiles.push(createProjectile(plane));
            }

            if (plane.y > canvas.height - 130) {
                planes.splice(i, 1);
            }
        }

        // Update and draw projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];
            projectile.y += projectileSpeed;
            
            drawProjectile(projectile);

            if (checkCollision(shape, projectile)) {
                continue;
            }

            if (projectile.y > canvas.height) {
                projectiles.splice(i, 1);
            }
        }

        if (heroImage.complete) {
            drawPlayer();
        }

        // Draw score and lives
        ctx.fillStyle = 'black';
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${score}`, 20, 40);
        drawLives(); // Draw lives on the screen

        // Player movement
        if (keys.ArrowLeft) shape.x -= speed;
        if (keys.ArrowRight) shape.x += speed;

        // Apply gravity
        velocityY += gravity;
        shape.y += velocityY;

        // Ground collision
        if (shape.y + shape.radius >= groundLevel  ) {
            shape.y = groundLevel  - shape.radius;
            velocityY = 0;
            isOnGround = true;
            jumpCount = 0;
        } else {
            isOnGround = false;
        }

        // Keep player within boundaries
        shape.x = Math.max(shape.radius, Math.min(shape.x, canvas.width - shape.radius));

    } else {
        drawGameOver();
    }

    requestAnimationFrame(update);
}


// Create the start button
const startButton = document.createElement('button');
startButton.textContent = 'Click to Start';
startButton.style.position = 'absolute';
startButton.style.top = '50%';
startButton.style.left = '50%';
startButton.style.transform = 'translate(-50%, -50%)';
startButton.style.padding = '10px 20px';
startButton.style.fontSize = '18px';
document.body.appendChild(startButton);

// Function to create speech bubbles
function createSpeechBubble(text, position) {
    const bubble = document.createElement('div');
    bubble.textContent = text;
    bubble.style.position = 'absolute';
    bubble.style.width = '150px';
    bubble.style.padding = '15px';
    bubble.style.background = 'white';
    bubble.style.borderRadius = '20px';
    bubble.style.boxShadow = '2px 2px 10px rgba(0, 0, 0, 0.2)';
    bubble.style.fontFamily = 'Arial, sans-serif';
    bubble.style.fontSize = '16px';
    bubble.style.textAlign = 'center';
    
    if (position === 'left') {
        bubble.style.left = '10px';
        bubble.style.top = '40%';
    } else {
        bubble.style.right = '10px';
        bubble.style.top = '40%';
    }

    document.body.appendChild(bubble);
    return bubble;
}

// Create speech bubbles
const leftBubble = createSpeechBubble("Ghadi niklek mok a weld l Qahba", 'left');
const rightBubble = createSpeechBubble("Sale arab , ", 'right');

// Start button event listener
startButton.addEventListener('click', () => {
    startButton.remove();
    leftBubble.remove();
    rightBubble.remove();
    initAudio();
    update();
});
