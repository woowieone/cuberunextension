const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const scoreBoard = document.getElementById('scoreBoard');
const highScoreBoard = document.getElementById('highScoreBoard');
const pauseButton = document.getElementById('pauseButton');
const buttonImage = document.getElementById('buttonImage');
const startingScreen = document.getElementById('startingScreen');

let score = 0;
let highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0;
let enemies = [];
let powerUps = [];
let enemySpawnInterval;
let powerUpSpawnInterval;
let gameInterval;
let playerSpeed = 2.25;
let frozenEnemies = [];
let speedBoostEndTime = 0;
let isPaused = true;
let isSpawningActive = false;
let enemySpeed = 0.7; // Initial enemy speed
const maxEnemySpeed = enemySpeed * 2.5;

let keys = {
    w: false,
    a: false,
    s: false,
    d: false,
};

let despawnActive = false;

highScoreBoard.innerText = `High Score: ${highScore}`;

function resetGame() {
    score = 0;
    enemySpeed = 0.7; // Reset enemy speed multiplier
    despawnActive = false;
    enemies.forEach(enemy => enemy.remove());
    enemies = [];
    powerUps.forEach(powerUp => powerUp.remove());
    powerUps = [];
    updateScore();
    startSpawning();
}

function updateScore() {
    scoreBoard.innerText = `Score: ${score}`;
}

function startSpawning() {
    if (isSpawningActive) return;
    isSpawningActive = true;

    enemySpawnInterval = setInterval(() => {
        if (!isPaused) {
            spawnEnemy();
        }
    }, 5000);

    powerUpSpawnInterval = setInterval(() => {
        if (!isPaused) {
            spawnPowerUp();
        }
    }, 20000);
}

function spawnEnemy() {
    const enemy = document.createElement('div');
    enemy.classList.add('enemy');

    const playerRect = player.getBoundingClientRect();
    let x, y, distance;

    do {
        x = Math.random() * (gameArea.clientWidth - 30);
        y = Math.random() * (gameArea.clientHeight - 30);
        const enemyRect = {
            left: x,
            top: y,
            width: 30,
            height: 30
        };
        distance = Math.sqrt(
            Math.pow(playerRect.left + playerRect.width / 2 - (enemyRect.left + enemyRect.width / 2), 2) +
            Math.pow(playerRect.top + playerRect.height / 2 - (enemyRect.top + enemyRect.height / 2), 2)
        );
    } while (distance < 120);

    enemy.style.left = `${x}px`;
    enemy.style.top = `${y}px`;
    gameArea.appendChild(enemy);
    enemies.push(enemy);
}

function spawnPowerUp() {
    const powerUp = document.createElement('div');
    powerUp.classList.add('power-up');

    const x = Math.random() * (gameArea.clientWidth - 30);
    const y = Math.random() * (gameArea.clientHeight - 30);

    powerUp.style.left = `${x}px`;
    powerUp.style.top = `${y}px`;

    const type = ['speed', 'freeze', 'despawn'][Math.floor(Math.random() * 3)];
    powerUp.setAttribute('data-type', type);

    if (type === 'speed') {
        powerUp.style.backgroundImage = "url('https://imagizer.imageshack.com/v2/361x361q70/r/923/PoWJh7.png')";
    } else if (type === 'freeze') {
        powerUp.style.backgroundImage = "url('https://cdn4.iconfinder.com/data/icons/snow-glyph/512/Flake_snow_snowflake-512.png')";
    } else if (type === 'despawn') {
        powerUp.style.backgroundImage = "url('https://static.thenounproject.com/png/1181336-200.png')";
    }

    gameArea.appendChild(powerUp);
    powerUps.push(powerUp);

    setTimeout(() => {
        if (gameArea.contains(powerUp)) {
            powerUp.remove();
            powerUps = powerUps.filter(p => p !== powerUp);
        }
    }, 80000);
}

function moveEnemies() {
    enemies.forEach((enemy) => {
        if (!frozenEnemies.includes(enemy)) {
            const enemyRect = enemy.getBoundingClientRect();
            const playerRect = player.getBoundingClientRect();
            const dx = playerRect.x - enemyRect.x;
            const dy = playerRect.y - enemyRect.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 1) {
                // Check if despawn power-up is active
                if (despawnActive) {
                    enemy.style.left = `${enemyRect.x - (dx / distance) * enemySpeed}px`;
                    enemy.style.top = `${enemyRect.y - (dy / distance) * enemySpeed}px`;
                } else {
                    enemy.style.left = `${enemyRect.x + (dx / distance) * enemySpeed}px`;
                    enemy.style.top = `${enemyRect.y + (dy / distance) * enemySpeed}px`;
                }
            }
        }
    });
}

function increaseEnemySpeed() {
    if (!isPaused && frozenEnemies.length === 0) {
        if (enemySpeed < maxEnemySpeed) {
            enemySpeed *= 1.01;
            if (enemySpeed > maxEnemySpeed) {
                enemySpeed = maxEnemySpeed;
            }
        }
    }
}

function checkCollisions() {
    const playerRect = player.getBoundingClientRect();
    enemies.forEach(enemy => {
        const enemyRect = enemy.getBoundingClientRect();

        if (despawnActive && enemy.style.backgroundColor === 'blue') {
            if (
                playerRect.x < enemyRect.x + enemyRect.width &&
                playerRect.x + playerRect.width > enemyRect.x &&
                playerRect.y < enemyRect.y + enemyRect.height &&
                playerRect.height + playerRect.y > enemyRect.y
            ) {
                enemy.remove();
                enemies = enemies.filter(e => e !== enemy);
                score += 5;
                updateScore();
                return;
            }
        }

        if (frozenEnemies.includes(enemy)) {
            return; // Skip collision check for frozen enemies
        }

        if (
            playerRect.x < enemyRect.x + enemyRect.width &&
            playerRect.x + playerRect.width > enemyRect.x &&
            playerRect.y < enemyRect.y + enemyRect.height &&
            playerRect.height + playerRect.y > enemyRect.y
        ) {
            endGame(); // End game for collision with active enemies
        }
    });
}

function checkPowerUpCollisions() {
    const playerRect = player.getBoundingClientRect();
    powerUps.forEach(powerUp => {
        const powerUpRect = powerUp.getBoundingClientRect();
        if (
            playerRect.x < powerUpRect.x + powerUpRect.width &&
            playerRect.x + playerRect.width > powerUpRect.x &&
            playerRect.y < powerUpRect.y + powerUpRect.height &&
            playerRect.height + playerRect.y > powerUpRect.y
        ) {
            handlePowerUp(powerUp);
        }
    });
}

function createTrail(x, y) {
    const trail = document.createElement('div');
    trail.classList.add('trail');
    trail.style.left = `${x - 10}px`;
    trail.style.top = `${y - 10}px`;
    gameArea.appendChild(trail);

    setTimeout(() => {
        trail.style.opacity = '0';
        setTimeout(() => {
            trail.remove();
            if (Date.now() >= speedBoostEndTime) {
                playerSpeed = 2.25; // Reset player speed if speed boost has ended
            }
        }, 300);
    }, 100);
}

function movePlayer() {
    if (isPaused) return;

    const rect = player.getBoundingClientRect();
    let dx = 0;
    let dy = 0;

    if (keys.w && rect.top > 0) dy -= playerSpeed;
    if (keys.s && rect.bottom < window.innerHeight) dy += playerSpeed;
    if (keys.a && rect.left > 0) dx -= playerSpeed;
    if (keys.d && rect.right < window.innerWidth) dx += playerSpeed;

    player.style.left = `${rect.left + dx}px`;
    player.style.top = `${rect.top + dy}px`;

    if (Date.now() < speedBoostEndTime) {
        createTrail(rect.left + 15, rect.top + 15);
    }

    moveEnemies();
    checkCollisions();
    checkPowerUpCollisions();
}

function handlePowerUp(powerUp) {
    const type = powerUp.getAttribute('data-type');

    switch (type) {
        case 'speed':
            const now = Date.now();
            if (now < speedBoostEndTime) {
                speedBoostEndTime += 10000; // Extend time
            } else {
                playerSpeed = 5; // Speed boost
                speedBoostEndTime = now + 10000; // Set new end time
            }
            break;

        case 'freeze':
            frozenEnemies = [...enemies];
            frozenEnemies.forEach(enemy => {
                enemy.style.backgroundColor = 'cyan';
            });

            setTimeout(() => {
                frozenEnemies.forEach(enemy => {
                    enemy.style.backgroundColor = 'red';
                });
                frozenEnemies = [];
            }, 5000);
            break;

        case 'despawn':
            despawnActive = true;
            player.style.backgroundColor = 'red';

            enemies.forEach(enemy => {
                enemy.style.backgroundColor = 'blue';
            });

            setTimeout(() => {
                despawnActive = false;
                player.style.backgroundColor = 'blue'; // Reset player color
                enemies.forEach(enemy => {
                    enemy.style.backgroundColor = 'red';
                });
            }, 3000);
            break;
    }

    powerUp.remove();
    powerUps = powerUps.filter(p => p !== powerUp);
}

function endGame() {
    clearInterval(enemySpawnInterval);
    clearInterval(powerUpSpawnInterval);
    isSpawningActive = false;

    enemies.forEach(enemy => enemy.remove());
    enemies = [];
    powerUps.forEach(powerUp => powerUp.remove());
    powerUps = [];

    // Reset enemy speed to 0.7 upon ending the game
    enemySpeed = 0.7;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreBoard.innerText = `High Score: ${highScore}`;
    }

    startingScreen.style.display = 'flex';
    document.getElementById('startingText').innerText = `You scored ${score}. Use WASD to play again`;

    score = 0;
    updateScore();
    isPaused = true;

    createExplosion();
}

function createExplosion() {
    const playerRect = player.getBoundingClientRect();
    const explosionCount = 30;

    for (let i = 0; i < explosionCount; i++) {
        const pixel = document.createElement('div');
        pixel.classList.add('pixel');
        pixel.style.left = `${playerRect.left + 10}px`;
        pixel.style.top = `${playerRect.top + 10}px`;
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 30 + 20;
        const translateX = Math.cos(angle) * distance;
        const translateY = Math.sin(angle) * distance;
        pixel.style.transform = `translate(${translateX}px, ${translateY}px)`;
        pixel.style.opacity = '0';
        gameArea.appendChild(pixel);
        setTimeout(() => {
            pixel.remove();
        }, 500);
    }
}

function startGame() {
    resetGame();
    highScoreBoard.innerText = `High Score: ${highScore}`;
    gameInterval = setInterval(() => {
        if (!isPaused) {
            score++;
            updateScore();
            movePlayer();
        }
    }, 1000 / 60);
    setInterval(increaseEnemySpeed, 5000);
    startSpawning();
}

pauseButton.addEventListener('click', function() {
    isPaused = !isPaused;
    buttonImage.src = isPaused ?
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdRyxOH6cg2DlA-GPCASXmYlVia1Kt5U8fTw&s' :
        'https://imagizer.imageshack.com/v2/361x361q70/r/924/sAFgKF.png';

    if (isPaused) {
        startingScreen.style.display = 'flex';
