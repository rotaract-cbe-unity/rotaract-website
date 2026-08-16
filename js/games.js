/* ============================================================
   GAMES - js/games.js
   Rotaract Club of Coimbatore Unity
   14 Complete Games with Leaderboard
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // SUPABASE INIT
    // ============================================================
    const SUPABASE_URL = 'https://dledwtepuvzzztfypbgn.supabase.co';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZWR3dGVwdXZ6enp0ZnlwYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDk2NDMsImV4cCI6MjA5ODcyNTY0M30.9ZcngwUsfl5AkFaCDR9-ljoLLOYeGwwK0AKaHfeyGhY';
    let supabase;
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    } catch (e) {
        console.warn('Supabase not available for games');
    }

    // ============================================================
    // GLOBALS
    // ============================================================
    let playerName = localStorage.getItem('unity_player_name') || '';
    let currentGame = null;
    let gameInterval = null;
    let gameTimer = null;
    let gameScore = 0;
    let gameTime = 0;
    let gameMoves = 0;
    let gamePaused = false;

    // ============================================================
    // INIT
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initLoading();
        initPlayer();
        initGameCards();
        initLeaderboard();
        initGameControls();
        document.getElementById('games-footer-year').textContent = new Date().getFullYear();
    });

    // ============================================================
    // LOADING
    // ============================================================
    function initLoading() {
        setTimeout(() => {
            const el = document.getElementById('games-loading');
            if (el) {
                el.classList.add('loaded');
                setTimeout(() => el.remove(), 600);
            }
        }, 1200);
    }

    // ============================================================
    // THEME
    // ============================================================
    function initTheme() {
        const saved = localStorage.getItem('unity_theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        updateThemeIcon(saved);

        document.getElementById('games-theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('unity_theme', next);
            updateThemeIcon(next);
        });
    }

    function updateThemeIcon(theme) {
        const icon = document.getElementById('games-theme-icon');
        if (icon) icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // ============================================================
    // TOAST
    // ============================================================
    function showToast(msg, type = 'info') {
        const container = document.getElementById('games-toast-container');
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
    }

    // ============================================================
    // PLAYER
    // ============================================================
    function initPlayer() {
        const input = document.getElementById('player-name-input');
        const setBtn = document.getElementById('set-player-btn');
        const info = document.getElementById('games-player-info');
        const nameDisplay = document.getElementById('current-player-name');
        const changeBtn = document.getElementById('change-player-btn');

        if (playerName) {
            input.parentElement.parentElement.style.display = 'none';
            info.style.display = 'flex';
            nameDisplay.textContent = playerName;
        }

        setBtn.addEventListener('click', () => {
            const name = input.value.trim();
            if (!name) { showToast('Please enter your name', 'warning'); return; }
            playerName = name;
            localStorage.setItem('unity_player_name', name);
            input.parentElement.parentElement.style.display = 'none';
            info.style.display = 'flex';
            nameDisplay.textContent = name;
            showToast(`Welcome, ${name}!`, 'success');
        });

        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') setBtn.click(); });

        changeBtn.addEventListener('click', () => {
            input.parentElement.parentElement.style.display = '';
            info.style.display = 'none';
            input.value = playerName;
            input.focus();
        });
    }

    function ensurePlayer() {
        if (!playerName) {
            showToast('Please enter your name first!', 'warning');
            document.getElementById('player-name-input').focus();
            return false;
        }
        return true;
    }

    // ============================================================
    // GAME CARDS & LAUNCH
    // ============================================================
    function initGameCards() {
        document.querySelectorAll('.game-play-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!ensurePlayer()) return;
                const game = btn.dataset.game;
                launchGame(game);
            });
        });
    }

    function launchGame(gameName) {
        currentGame = gameName;
        gameScore = 0;
        gameTime = 0;
        gameMoves = 0;
        gamePaused = false;

        const overlay = document.getElementById('game-play-overlay');
        const area = document.getElementById('game-play-area');
        const titleText = document.getElementById('game-play-title-text');
        const scoreDisplay = document.getElementById('game-score-display');
        const timeDisplay = document.getElementById('game-time-display');
        const movesDisplay = document.getElementById('game-moves-display');
        const movesStat = document.getElementById('game-moves-stat');
        const mobileCtrl = document.getElementById('game-mobile-controls');

        scoreDisplay.textContent = '0';
        timeDisplay.textContent = '0';
        movesDisplay.textContent = '0';
        movesStat.style.display = 'none';
        mobileCtrl.style.display = 'none';
        area.innerHTML = '';

        const names = {
            memory: 'Memory Match', snake: 'Classic Snake', tictactoe: 'Tic Tac Toe',
            whack: 'Whack-a-Mole', typing: 'Typing Speed Test', quiz: 'Rotary Quiz',
            puzzle: 'Puzzle Slider', color: 'Color Match', reaction: 'Reaction Time',
            scramble: 'Word Scramble', game2048: '2048', minesweeper: 'Minesweeper',
            breakout: 'Brick Breaker', flappy: 'Flappy Unity'
        };

        titleText.textContent = names[gameName] || gameName;
        overlay.style.display = '';

        // Show mobile controls for applicable games
        if (['snake', 'game2048', 'breakout'].includes(gameName) && window.innerWidth < 769) {
            mobileCtrl.style.display = '';
        }

        if (['memory', 'puzzle', 'tictactoe', 'minesweeper'].includes(gameName)) {
            movesStat.style.display = '';
        }

        clearInterval(gameInterval);
        clearTimeout(gameTimer);

        // Start game timer
        const timerStart = Date.now();
        gameInterval = setInterval(() => {
            if (!gamePaused) {
                gameTime = Math.floor((Date.now() - timerStart) / 1000);
                timeDisplay.textContent = gameTime;
            }
        }, 200);

        // Launch specific game
        switch (gameName) {
            case 'memory': startMemory(area); break;
            case 'snake': startSnake(area); break;
            case 'tictactoe': startTicTacToe(area); break;
            case 'whack': startWhack(area); break;
            case 'typing': startTyping(area); break;
            case 'quiz': startQuiz(area); break;
            case 'puzzle': startPuzzle(area); break;
            case 'color': startColor(area); break;
            case 'reaction': startReaction(area); break;
            case 'scramble': startScramble(area); break;
            case 'game2048': start2048(area); break;
            case 'minesweeper': startMinesweeper(area); break;
            case 'breakout': startBreakout(area); break;
            case 'flappy': startFlappy(area); break;
        }
    }

    // ============================================================
    // GAME CONTROLS
    // ============================================================
    function initGameControls() {
        document.getElementById('game-close-btn').addEventListener('click', closeGame);
        document.getElementById('game-restart-btn').addEventListener('click', () => {
            if (currentGame) launchGame(currentGame);
        });
        document.getElementById('game-pause-btn').addEventListener('click', () => {
            gamePaused = !gamePaused;
            const icon = document.querySelector('#game-pause-btn i');
            icon.className = gamePaused ? 'fas fa-play' : 'fas fa-pause';
        });

        document.getElementById('game-again-btn').addEventListener('click', () => {
            document.getElementById('game-over-overlay').style.display = 'none';
            if (currentGame) launchGame(currentGame);
        });

        document.getElementById('game-menu-btn').addEventListener('click', () => {
            document.getElementById('game-over-overlay').style.display = 'none';
            closeGame();
        });

        // Mobile controls
        document.querySelectorAll('.mobile-ctrl').forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.dir;
                const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
                document.dispatchEvent(new KeyboardEvent('keydown', { key: keyMap[dir] }));
            });
        });
    }

    function closeGame() {
        clearInterval(gameInterval);
        clearTimeout(gameTimer);
        document.getElementById('game-play-overlay').style.display = 'none';
        document.getElementById('game-over-overlay').style.display = 'none';
        currentGame = null;
    }

    function updateScore(score) {
        gameScore = score;
        document.getElementById('game-score-display').textContent = score;
    }

    function updateMoves(moves) {
        gameMoves = moves;
        document.getElementById('game-moves-display').textContent = moves;
    }

    function gameOver(score, message = 'Great job!') {
        clearInterval(gameInterval);
        gameScore = score;

        document.getElementById('game-over-score').textContent = score;
        document.getElementById('game-over-message').textContent = message;
        document.getElementById('game-over-overlay').style.display = '';

        // Check high score
        const key = `unity_best_${currentGame}`;
        const best = parseInt(localStorage.getItem(key) || '0');
        const bestEl = document.getElementById('game-over-best');
        if (score > best) {
            localStorage.setItem(key, score);
            bestEl.style.display = '';
        } else {
            bestEl.style.display = 'none';
        }

        // Save to leaderboard
        saveScore(currentGame, score);
    }

    // ============================================================
    // LEADERBOARD
    // ============================================================
    async function saveScore(game, score) {
        if (!supabase || !playerName || score <= 0) return;
        try {
            await supabase.from('game_scores').insert({
                game_name: game,
                player_name: playerName,
                score: score
            });
        } catch (e) { console.warn('Score save failed:', e); }
    }

    async function initLeaderboard() {
        loadLeaderboard('all');
        document.querySelectorAll('.lb-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadLeaderboard(tab.dataset.game);
            });
        });
    }

    async function loadLeaderboard(game) {
        const body = document.getElementById('leaderboard-body');
        body.innerHTML = '<tr><td colspan="5" class="lb-loading">Loading...</td></tr>';

        try {
            let query = supabase.from('game_scores').select('*').order('score', { ascending: false }).limit(20);
            if (game !== 'all') query = query.eq('game_name', game);
            const { data, error } = await query;

            if (error || !data || data.length === 0) {
                body.innerHTML = '<tr><td colspan="5" class="lb-loading">No scores yet. Be the first to play!</td></tr>';
                return;
            }

            body.innerHTML = data.map((s, i) => `
                <tr>
                    <td class="${i < 3 ? 'rank-' + (i + 1) : ''}">
                        ${i === 0 ? '<i class="fas fa-crown"></i>' : i === 1 ? '<i class="fas fa-medal"></i>' : i === 2 ? '<i class="fas fa-award"></i>' : i + 1}
                    </td>
                    <td><strong>${escHtml(s.player_name)}</strong></td>
                    <td>${s.game_name}</td>
                    <td><strong>${s.score}</strong></td>
                    <td>${new Date(s.played_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        } catch (e) {
            body.innerHTML = '<tr><td colspan="5" class="lb-loading">Could not load scores</td></tr>';
        }
    }

    function escHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================================
    // GAME 1: MEMORY MATCH
    // ============================================================
    function startMemory(area) {
        const icons = [
            'fa-gear', 'fa-globe', 'fa-heart', 'fa-star',
            'fa-handshake', 'fa-users', 'fa-award', 'fa-bolt'
        ];
        const cards = [...icons, ...icons].sort(() => Math.random() - 0.5);
        let flipped = [];
        let matched = 0;
        let moves = 0;

        area.innerHTML = `<div class="memory-grid memory-grid-4x4">
            ${cards.map((icon, i) => `
                <div class="memory-card" data-index="${i}" data-icon="${icon}">
                    <div class="memory-card-inner">
                        <div class="memory-front"><i class="fas fa-question"></i></div>
                        <div class="memory-back"><i class="fas ${icon}"></i></div>
                    </div>
                </div>
            `).join('')}
        </div>`;

        area.querySelectorAll('.memory-card').forEach(card => {
            card.addEventListener('click', () => {
                if (gamePaused || flipped.length >= 2 || card.classList.contains('flipped') || card.classList.contains('matched')) return;

                card.classList.add('flipped');
                flipped.push(card);

                if (flipped.length === 2) {
                    moves++;
                    updateMoves(moves);
                    const [c1, c2] = flipped;
                    if (c1.dataset.icon === c2.dataset.icon) {
                        c1.classList.add('matched');
                        c2.classList.add('matched');
                        matched += 2;
                        flipped = [];
                        updateScore(matched * 10);
                        if (matched === cards.length) {
                            const bonus = Math.max(0, 200 - moves * 2 - gameTime);
                            gameOver(matched * 10 + bonus, `Completed in ${moves} moves and ${gameTime}s!`);
                        }
                    } else {
                        setTimeout(() => {
                            c1.classList.remove('flipped');
                            c2.classList.remove('flipped');
                            flipped = [];
                        }, 800);
                    }
                }
            });
        });
    }

    // ============================================================
    // GAME 2: SNAKE
    // ============================================================
    function startSnake(area) {
        const size = Math.min(400, area.offsetWidth - 20);
        const gridSize = 20;
        const cellSize = size / gridSize;

        area.innerHTML = `<div class="snake-canvas-wrap"><canvas id="snake-canvas" width="${size}" height="${size}"></canvas></div>`;
        const canvas = document.getElementById('snake-canvas');
        const ctx = canvas.getContext('2d');

        let snake = [{ x: 10, y: 10 }];
        let food = spawnFood();
        let dx = 1, dy = 0;
        let score = 0;
        let speed = 150;

        function spawnFood() {
            let pos;
            do {
                pos = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
            } while (snake.some(s => s.x === pos.x && s.y === pos.y));
            return pos;
        }

        function draw() {
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--g-bg2').trim() || '#fff';
            ctx.fillRect(0, 0, size, size);

            // Grid
            ctx.strokeStyle = 'rgba(0,0,0,0.03)';
            for (let i = 0; i < gridSize; i++) {
                ctx.beginPath();
                ctx.moveTo(i * cellSize, 0);
                ctx.lineTo(i * cellSize, size);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, i * cellSize);
                ctx.lineTo(size, i * cellSize);
                ctx.stroke();
            }

            // Food
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2, cellSize / 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Snake
            snake.forEach((seg, i) => {
                ctx.fillStyle = i === 0 ? '#1a56db' : '#3b82f6';
                ctx.fillRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2);
            });
        }

        function update() {
            if (gamePaused) return;
            const head = { x: snake[0].x + dx, y: snake[0].y + dy };

            if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize || snake.some(s => s.x === head.x && s.y === head.y)) {
                clearInterval(gameTimer);
                gameOver(score, `You scored ${score} points!`);
                return;
            }

            snake.unshift(head);

            if (head.x === food.x && head.y === food.y) {
                score += 10;
                updateScore(score);
                food = spawnFood();
                if (speed > 60) speed -= 3;
                clearInterval(gameTimer);
                gameTimer = setInterval(update, speed);
            } else {
                snake.pop();
            }
            draw();
        }

        const keyHandler = (e) => {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            e.preventDefault();
            switch (e.key) {
                case 'ArrowUp': if (dy !== 1) { dx = 0; dy = -1; } break;
                case 'ArrowDown': if (dy !== -1) { dx = 0; dy = 1; } break;
                case 'ArrowLeft': if (dx !== 1) { dx = -1; dy = 0; } break;
                case 'ArrowRight': if (dx !== -1) { dx = 1; dy = 0; } break;
            }
        };

        document.addEventListener('keydown', keyHandler);
        draw();
        gameTimer = setInterval(update, speed);

        // Cleanup on close
        const origClose = closeGame;
        closeGame = function () {
            document.removeEventListener('keydown', keyHandler);
            clearInterval(gameTimer);
            origClose();
            closeGame = origClose;
        };
    }

    // ============================================================
    // GAME 3: TIC TAC TOE
    // ============================================================
    function startTicTacToe(area) {
        let board = Array(9).fill('');
        let playerTurn = true;
        let moves = 0;
        let gameActive = true;

        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        function render() {
            area.innerHTML = `
                <div style="width:100%;max-width:320px;">
                    <div class="ttt-status" id="ttt-status">Your turn (X)</div>
                    <div class="ttt-board">
                        ${board.map((cell, i) => `
                            <div class="ttt-cell ${cell ? 'taken' : ''} ${cell === 'X' ? 'x-cell' : ''} ${cell === 'O' ? 'o-cell' : ''}" data-index="${i}">
                                ${cell}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            area.querySelectorAll('.ttt-cell:not(.taken)').forEach(cell => {
                cell.addEventListener('click', () => {
                    if (!playerTurn || !gameActive || gamePaused) return;
                    const idx = parseInt(cell.dataset.index);
                    makeMove(idx, 'X');
                });
            });
        }

        function makeMove(idx, mark) {
            board[idx] = mark;
            moves++;
            updateMoves(moves);

            const winner = checkWin(mark);
            if (winner) {
                gameActive = false;
                render();
                highlightWin(winner);
                if (mark === 'X') {
                    gameOver(100 - moves * 5, 'You Won!');
                } else {
                    gameOver(0, 'AI Wins! Try again.');
                }
                return;
            }

            if (moves >= 9) {
                gameActive = false;
                render();
                gameOver(25, "It's a Draw!");
                return;
            }

            if (mark === 'X') {
                playerTurn = false;
                render();
                document.getElementById('ttt-status').textContent = 'AI thinking...';
                setTimeout(aiMove, 500);
            } else {
                playerTurn = true;
                render();
                document.getElementById('ttt-status').textContent = 'Your turn (X)';
            }
        }

        function aiMove() {
            if (!gameActive) return;
            // Try to win
            for (let i = 0; i < 9; i++) {
                if (!board[i]) {
                    board[i] = 'O';
                    if (checkWin('O')) { board[i] = ''; makeMove(i, 'O'); return; }
                    board[i] = '';
                }
            }
            // Block player
            for (let i = 0; i < 9; i++) {
                if (!board[i]) {
                    board[i] = 'X';
                    if (checkWin('X')) { board[i] = ''; makeMove(i, 'O'); return; }
                    board[i] = '';
                }
            }
            // Center
            if (!board[4]) { makeMove(4, 'O'); return; }
            // Random
            const empty = board.map((v, i) => v ? null : i).filter(v => v !== null);
            if (empty.length) makeMove(empty[Math.floor(Math.random() * empty.length)], 'O');
        }

        function checkWin(mark) {
            for (const pattern of winPatterns) {
                if (pattern.every(i => board[i] === mark)) return pattern;
            }
            return null;
        }

        function highlightWin(pattern) {
            pattern.forEach(i => {
                const cells = area.querySelectorAll('.ttt-cell');
                if (cells[i]) cells[i].classList.add('win-cell');
            });
        }

        render();
    }

    // ============================================================
    // GAME 4: WHACK A MOLE
    // ============================================================
    function startWhack(area) {
        let score = 0;
        let timeLeft = 30;
        let activeHole = -1;

        area.innerHTML = `
            <div style="text-align:center;width:100%;max-width:360px;">
                <div style="margin-bottom:16px;font-size:1.1rem;font-weight:600;">
                    Time: <span id="whack-time">${timeLeft}</span>s
                </div>
                <div class="whack-grid">
                    ${Array(9).fill(0).map((_, i) => `
                        <div class="whack-hole" data-hole="${i}">
                            <i class="fas fa-circle" style="opacity:0.2;"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const holes = area.querySelectorAll('.whack-hole');

        holes.forEach(hole => {
            hole.addEventListener('click', () => {
                const idx = parseInt(hole.dataset.hole);
                if (idx === activeHole) {
                    score += 10;
                    updateScore(score);
                    hole.classList.add('hit');
                    hole.classList.remove('active');
                    activeHole = -1;
                    setTimeout(() => hole.classList.remove('hit'), 300);
                }
            });
        });

        function showMole() {
            if (timeLeft <= 0 || gamePaused) return;
            holes.forEach(h => h.classList.remove('active'));
            activeHole = Math.floor(Math.random() * 9);
            holes[activeHole].classList.add('active');
            holes[activeHole].innerHTML = '<i class="fas fa-ghost"></i>';
        }

        const moleInterval = setInterval(() => {
            if (!gamePaused) showMole();
        }, 800);

        const countdownInterval = setInterval(() => {
            if (gamePaused) return;
            timeLeft--;
            const timeEl = document.getElementById('whack-time');
            if (timeEl) timeEl.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(moleInterval);
                clearInterval(countdownInterval);
                gameOver(score, `You whacked ${score / 10} moles!`);
            }
        }, 1000);

        showMole();
    }

    // ============================================================
    // GAME 5: TYPING SPEED
    // ============================================================
    function startTyping(area) {
        const words = [
            'Rotary', 'Rotaract', 'Service', 'Fellowship', 'Leadership',
            'Community', 'District', 'International', 'Professional', 'Unity',
            'Coimbatore', 'Charter', 'Volunteer', 'Impact', 'Mentor',
            'Excellence', 'Integrity', 'Diversity', 'Foundation', 'Polio',
            'Humanitarian', 'Scholarship', 'Ambassador', 'Convention', 'Peace',
            'Youth', 'Empowerment', 'Sustainability', 'Collaboration', 'Innovation'
        ];

        let currentWord = '';
        let wordsCompleted = 0;
        let timeLeft = 60;
        let started = false;

        function nextWord() {
            currentWord = words[Math.floor(Math.random() * words.length)];
            document.getElementById('typing-word').textContent = currentWord;
        }

        area.innerHTML = `
            <div class="typing-game-wrap">
                <div class="typing-stats">
                    <div><span>Time Left</span><strong id="typing-time">${timeLeft}s</strong></div>
                    <div><span>Words</span><strong id="typing-words">0</strong></div>
                    <div><span>WPM</span><strong id="typing-wpm">0</strong></div>
                </div>
                <div class="typing-word-display" id="typing-word">Press any key to start...</div>
                <input type="text" class="typing-input" id="typing-input" placeholder="Type the word above..." autocomplete="off" autocapitalize="off" spellcheck="false">
            </div>
        `;

        const input = document.getElementById('typing-input');
        input.focus();

        input.addEventListener('input', () => {
            if (!started) {
                started = true;
                nextWord();
                const timer = setInterval(() => {
                    if (gamePaused) return;
                    timeLeft--;
                    document.getElementById('typing-time').textContent = `${timeLeft}s`;
                    const wpm = Math.round(wordsCompleted / ((60 - timeLeft) / 60)) || 0;
                    document.getElementById('typing-wpm').textContent = wpm;
                    if (timeLeft <= 0) {
                        clearInterval(timer);
                        const finalWpm = Math.round(wordsCompleted / 1) || 0;
                        gameOver(wordsCompleted * 10 + finalWpm, `${wordsCompleted} words at ${finalWpm} WPM!`);
                    }
                }, 1000);
            }

            const val = input.value.trim();
            if (val.toLowerCase() === currentWord.toLowerCase()) {
                wordsCompleted++;
                updateScore(wordsCompleted * 10);
                document.getElementById('typing-words').textContent = wordsCompleted;
                input.value = '';
                input.classList.remove('wrong');
                input.classList.add('correct');
                setTimeout(() => input.classList.remove('correct'), 200);
                nextWord();
            } else if (currentWord.toLowerCase().startsWith(val.toLowerCase())) {
                input.classList.remove('wrong');
            } else {
                input.classList.add('wrong');
            }
        });
    }

    // ============================================================
    // GAME 6: ROTARY QUIZ
    // ============================================================
    function startQuiz(area) {
        const questions = [
            { q: 'What year was Rotary International founded?', o: ['1905', '1910', '1920', '1915'], a: 0 },
            { q: 'Who founded Rotary?', o: ['Paul Harris', 'Herbert Taylor', 'Arch Klumph', 'Chesley Perry'], a: 0 },
            { q: 'What is the Rotary motto?', o: ['Service Above Self', 'Unity in Service', 'We Serve', 'Service First'], a: 0 },
            { q: 'Rotaract is for young people aged?', o: ['15-25', '18-30', '18-35', '16-28'], a: 1 },
            { q: 'What disease has Rotary been fighting to eradicate?', o: ['Malaria', 'Polio', 'TB', 'HIV'], a: 1 },
            { q: 'The Four-Way Test has how many questions?', o: ['3', '4', '5', '6'], a: 1 },
            { q: 'What is the Rotary International symbol?', o: ['A wheel with cogs', 'A globe', 'A handshake', 'A star'], a: 0 },
            { q: 'RI District 3206 covers which regions?', o: ['Coimbatore & Pallakkad', 'Chennai & Madurai', 'Trichy & Salem', 'Bangalore & Mysore'], a: 0 },
            { q: 'When was Rotaract Club of Coimbatore Unity chartered?', o: ['2012', '2013', '2014', '2015'], a: 2 },
            { q: 'What is the Club ID of Rotaract Club of Coimbatore Unity?', o: ['91234', '91594', '92104', '90001'], a: 1 },
            { q: 'The first Rotaract club was established in?', o: ['1960', '1965', '1968', '1970'], a: 2 },
            { q: 'Rotary Foundation was established in which year?', o: ['1917', '1920', '1925', '1930'], a: 0 },
            { q: 'How many areas of focus does Rotary have?', o: ['5', '6', '7', '8'], a: 2 },
            { q: 'RI Convention is held how often?', o: ['Every 2 years', 'Annually', 'Every 5 years', 'Monthly'], a: 1 },
            { q: 'What color is the Rotary wheel?', o: ['Blue and Gold', 'Red and White', 'Green and Gold', 'Royal Blue and Gold'], a: 3 }
        ];

        let currentQ = 0;
        let score = 0;
        const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, 10);

        function renderQuestion() {
            const q = shuffled[currentQ];
            const letters = ['A', 'B', 'C', 'D'];

            area.innerHTML = `
                <div class="quiz-wrap">
                    <div class="quiz-progress">
                        <div class="quiz-progress-bar" style="width:${(currentQ / shuffled.length) * 100}%"></div>
                    </div>
                    <div class="quiz-question-num">Question ${currentQ + 1} of ${shuffled.length}</div>
                    <div class="quiz-question">${q.q}</div>
                    <div class="quiz-options">
                        ${q.o.map((opt, i) => `
                            <button class="quiz-option" data-index="${i}">
                                <span class="opt-letter">${letters[i]}</span>
                                <span>${opt}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            area.querySelectorAll('.quiz-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (gamePaused) return;
                    const idx = parseInt(btn.dataset.index);
                    area.querySelectorAll('.quiz-option').forEach(b => b.style.pointerEvents = 'none');

                    if (idx === q.a) {
                        btn.classList.add('correct');
                        score += 10;
                        updateScore(score);
                    } else {
                        btn.classList.add('wrong');
                        area.querySelectorAll('.quiz-option')[q.a].classList.add('correct');
                    }

                    setTimeout(() => {
                        currentQ++;
                        if (currentQ < shuffled.length) {
                            renderQuestion();
                        } else {
                            gameOver(score, `You got ${score / 10} out of ${shuffled.length} correct!`);
                        }
                    }, 1200);
                });
            });
        }

        renderQuestion();
    }

    // ============================================================
    // GAME 7: PUZZLE SLIDER
    // ============================================================
    function startPuzzle(area) {
        const size = 4;
        let tiles = [];
        let moves = 0;
        let emptyIdx = size * size - 1;

        // Create solvable puzzle
        function init() {
            tiles = Array.from({ length: size * size - 1 }, (_, i) => i + 1);
            tiles.push(0);
            // Shuffle
            for (let i = 0; i < 500; i++) {
                const neighbors = getNeighbors(emptyIdx);
                const randNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                [tiles[emptyIdx], tiles[randNeighbor]] = [tiles[randNeighbor], tiles[emptyIdx]];
                emptyIdx = randNeighbor;
            }
        }

        function getNeighbors(idx) {
            const n = [];
            const row = Math.floor(idx / size), col = idx % size;
            if (row > 0) n.push(idx - size);
            if (row < size - 1) n.push(idx + size);
            if (col > 0) n.push(idx - 1);
            if (col < size - 1) n.push(idx + 1);
            return n;
        }

        function render() {
            area.innerHTML = `
                <div class="puzzle-grid puzzle-grid-4x4">
                    ${tiles.map((tile, i) => `
                        <div class="puzzle-tile ${tile === 0 ? 'empty' : ''}" data-index="${i}">
                            ${tile || ''}
                        </div>
                    `).join('')}
                </div>
            `;

            area.querySelectorAll('.puzzle-tile:not(.empty)').forEach(el => {
                el.addEventListener('click', () => {
                    if (gamePaused) return;
                    const idx = parseInt(el.dataset.index);
                    if (getNeighbors(emptyIdx).includes(idx)) {
                        [tiles[emptyIdx], tiles[idx]] = [tiles[idx], tiles[emptyIdx]];
                        emptyIdx = idx;
                        moves++;
                        updateMoves(moves);
                        render();

                        if (isSolved()) {
                            const bonus = Math.max(0, 500 - moves * 3);
                            gameOver(bonus, `Solved in ${moves} moves!`);
                        }
                    }
                });
            });
        }

        function isSolved() {
            for (let i = 0; i < tiles.length - 1; i++) {
                if (tiles[i] !== i + 1) return false;
            }
            return true;
        }

        init();
        render();
    }

    // ============================================================
    // GAME 8: COLOR MATCH
    // ============================================================
    function startColor(area) {
        const colors = [
            { name: 'RED', hex: '#ef4444' },
            { name: 'BLUE', hex: '#3b82f6' },
            { name: 'GREEN', hex: '#10b981' },
            { name: 'YELLOW', hex: '#f59e0b' },
            { name: 'PURPLE', hex: '#8b5cf6' },
            { name: 'ORANGE', hex: '#f97316' }
        ];

        let score = 0;
        let timeLeft = 30;
        let round = 0;

        function nextRound() {
            round++;
            const wordColor = colors[Math.floor(Math.random() * colors.length)];
            const displayColor = colors[Math.floor(Math.random() * colors.length)];

            // Pick 4 options including the correct answer
            let options = [displayColor];
            while (options.length < 4) {
                const c = colors[Math.floor(Math.random() * colors.length)];
                if (!options.find(o => o.name === c.name)) options.push(c);
            }
            options = options.sort(() => Math.random() - 0.5);

            area.innerHTML = `
                <div class="color-game-wrap">
                    <div style="margin-bottom:10px;font-size:0.9rem;color:var(--g-text2);">
                        Time: <strong id="color-time">${timeLeft}s</strong> | Round: ${round}
                    </div>
                    <div class="color-instruction">What COLOR is the text displayed in?</div>
                    <div class="color-word" style="color:${displayColor.hex};">${wordColor.name}</div>
                    <div class="color-options">
                        ${options.map(o => `
                            <button class="color-btn" data-name="${o.name}" style="color:${o.hex};">${o.name}</button>
                        `).join('')}
                    </div>
                </div>
            `;

            area.querySelectorAll('.color-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (gamePaused) return;
                    if (btn.dataset.name === displayColor.name) {
                        score += 10;
                        updateScore(score);
                    }
                    if (timeLeft > 0) nextRound();
                });
            });
        }

        const timer = setInterval(() => {
            if (gamePaused) return;
            timeLeft--;
            const el = document.getElementById('color-time');
            if (el) el.textContent = `${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(timer);
                gameOver(score, `${score / 10} correct answers!`);
            }
        }, 1000);

        nextRound();
    }

    // ============================================================
    // GAME 9: REACTION TIME
    // ============================================================
    function startReaction(area) {
        let state = 'waiting'; // waiting, ready, result
        let startTime = 0;
        let attempts = [];
        let round = 0;
        const maxRounds = 5;

        function showWaiting() {
            state = 'waiting';
            area.innerHTML = `
                <div class="reaction-area reaction-waiting" id="reaction-zone">
                    <h3>Wait for GREEN...</h3>
                    <p>Round ${round + 1} of ${maxRounds}</p>
                </div>
            `;

            const delay = 1000 + Math.random() * 4000;
            gameTimer = setTimeout(() => {
                if (state === 'waiting') {
                    state = 'ready';
                    startTime = Date.now();
                    const zone = document.getElementById('reaction-zone');
                    if (zone) {
                        zone.className = 'reaction-area reaction-ready';
                        zone.innerHTML = '<h3>CLICK NOW!</h3>';
                    }
                }
            }, delay);

            const zone = document.getElementById('reaction-zone');
            zone.addEventListener('click', handleClick);
        }

        function handleClick() {
            if (state === 'waiting') {
                clearTimeout(gameTimer);
                state = 'result';
                area.innerHTML = `
                    <div class="reaction-area reaction-result" id="reaction-zone">
                        <h3>Too early!</h3>
                        <p>Click to try again</p>
                    </div>
                `;
                document.getElementById('reaction-zone').addEventListener('click', showWaiting);
            } else if (state === 'ready') {
                const reactionTime = Date.now() - startTime;
                attempts.push(reactionTime);
                round++;

                if (round >= maxRounds) {
                    const avg = Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length);
                    const score = Math.max(0, 500 - avg);
                    gameOver(score, `Average: ${avg}ms reaction time!`);
                } else {
                    area.innerHTML = `
                        <div class="reaction-area reaction-result" id="reaction-zone">
                            <div class="reaction-time-display">${reactionTime}ms</div>
                            <p>Click to continue (Round ${round + 1}/${maxRounds})</p>
                        </div>
                    `;
                    updateScore(Math.max(0, 500 - reactionTime));
                    document.getElementById('reaction-zone').addEventListener('click', showWaiting);
                }
            }
        }

        showWaiting();
    }

    // ============================================================
    // GAME 10: WORD SCRAMBLE
    // ============================================================
    function startScramble(area) {
        const words = [
            { word: 'ROTARY', hint: 'International service organization' },
            { word: 'ROTARACT', hint: 'Youth-based community service' },
            { word: 'SERVICE', hint: 'Above self' },
            { word: 'FELLOWSHIP', hint: 'Bonding together' },
            { word: 'DISTRICT', hint: 'Regional division' },
            { word: 'CHARTER', hint: 'Official establishment' },
            { word: 'POLIO', hint: 'Disease Rotary fights' },
            { word: 'UNITY', hint: 'Our club name' },
            { word: 'COIMBATORE', hint: 'Our city' },
            { word: 'LEADERSHIP', hint: 'Guiding others' },
            { word: 'VOLUNTEER', hint: 'Free service' },
            { word: 'FOUNDATION', hint: 'Charitable arm of RI' },
            { word: 'PRESIDENT', hint: 'Club leader' },
            { word: 'SECRETARY', hint: 'Administrative role' },
            { word: 'COMMUNITY', hint: 'Society we serve' }
        ];

        let score = 0;
        let currentIdx = 0;
        let skips = 3;
        const shuffledWords = words.sort(() => Math.random() - 0.5).slice(0, 10);

        function scramble(word) {
            return word.split('').sort(() => Math.random() - 0.5).join('');
        }

        function renderWord() {
            if (currentIdx >= shuffledWords.length) {
                gameOver(score, `Unscrambled ${score / 20} words!`);
                return;
            }

            const w = shuffledWords[currentIdx];
            let scrambled = scramble(w.word);
            while (scrambled === w.word) scrambled = scramble(w.word);

            area.innerHTML = `
                <div class="scramble-wrap">
                    <div style="margin-bottom:8px;font-size:0.85rem;color:var(--g-text3);">
                        Word ${currentIdx + 1} of ${shuffledWords.length} | Skips left: ${skips}
                    </div>
                    <div class="scramble-word">${scrambled}</div>
                    <div class="scramble-hint"><i class="fas fa-lightbulb"></i> Hint: ${w.hint}</div>
                    <input type="text" class="scramble-input" id="scramble-input" placeholder="Your answer..." autocomplete="off" autocapitalize="characters" spellcheck="false">
                    <div style="display:flex;gap:10px;justify-content:center;margin-top:12px;">
                        <button class="scramble-submit-btn" id="scramble-submit">
                            <i class="fas fa-check"></i> Submit
                        </button>
                        <button class="scramble-submit-btn" id="scramble-skip" style="background:var(--g-text3);">
                            <i class="fas fa-forward"></i> Skip
                        </button>
                    </div>
                </div>
            `;

            const input = document.getElementById('scramble-input');
            input.focus();

            const submit = () => {
                const val = input.value.trim().toUpperCase();
                if (val === w.word) {
                    score += 20;
                    updateScore(score);
                    input.classList.add('correct-input');
                    setTimeout(() => { currentIdx++; renderWord(); }, 500);
                } else {
                    input.classList.add('wrong');
                    input.classList.remove('correct-input');
                    setTimeout(() => input.classList.remove('wrong'), 500);
                }
            };

            document.getElementById('scramble-submit').addEventListener('click', submit);
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') submit(); });

            document.getElementById('scramble-skip').addEventListener('click', () => {
                if (skips > 0) {
                    skips--;
                    currentIdx++;
                    renderWord();
                } else {
                    showToast('No skips left!', 'warning');
                }
            });
        }

        renderWord();
    }

    // ============================================================
    // GAME 11: 2048
    // ============================================================
    function start2048(area) {
        const size = 4;
        let grid = Array.from({ length: size }, () => Array(size).fill(0));
        let score = 0;
        let moves = 0;

        function addTile() {
            const empty = [];
            for (let r = 0; r < size; r++)
                for (let c = 0; c < size; c++)
                    if (grid[r][c] === 0) empty.push([r, c]);
            if (empty.length === 0) return;
            const [r, c] = empty[Math.floor(Math.random() * empty.length)];
            grid[r][c] = Math.random() < 0.9 ? 2 : 4;
        }

        function render() {
            area.innerHTML = `
                <div class="game-2048-grid">
                    ${grid.flat().map(v => `
                        <div class="tile-2048 ${v ? 'tile-' + v : 'empty-tile'}">
                            ${v || ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        function slide(row) {
            let arr = row.filter(v => v !== 0);
            for (let i = 0; i < arr.length - 1; i++) {
                if (arr[i] === arr[i + 1]) {
                    arr[i] *= 2;
                    score += arr[i];
                    arr[i + 1] = 0;
                }
            }
            arr = arr.filter(v => v !== 0);
            while (arr.length < size) arr.push(0);
            return arr;
        }

        function move(dir) {
            let moved = false;
            const prev = JSON.stringify(grid);

            if (dir === 'left') {
                for (let r = 0; r < size; r++) grid[r] = slide(grid[r]);
            } else if (dir === 'right') {
                for (let r = 0; r < size; r++) grid[r] = slide(grid[r].reverse()).reverse();
            } else if (dir === 'up') {
                for (let c = 0; c < size; c++) {
                    let col = grid.map(row => row[c]);
                    col = slide(col);
                    for (let r = 0; r < size; r++) grid[r][c] = col[r];
                }
            } else if (dir === 'down') {
                for (let c = 0; c < size; c++) {
                    let col = grid.map(row => row[c]).reverse();
                    col = slide(col).reverse();
                    for (let r = 0; r < size; r++) grid[r][c] = col[r];
                }
            }

            if (JSON.stringify(grid) !== prev) {
                moved = true;
                moves++;
                updateMoves(moves);
                updateScore(score);
                addTile();
                render();

                // Check win
                if (grid.flat().includes(2048)) {
                    gameOver(score, 'You reached 2048!');
                    return;
                }

                // Check game over
                if (isGameOver()) {
                    gameOver(score, `No moves left! Score: ${score}`);
                }
            }
        }

        function isGameOver() {
            for (let r = 0; r < size; r++)
                for (let c = 0; c < size; c++) {
                    if (grid[r][c] === 0) return false;
                    if (c < size - 1 && grid[r][c] === grid[r][c + 1]) return false;
                    if (r < size - 1 && grid[r][c] === grid[r + 1][c]) return false;
                }
            return true;
        }

        const keyHandler = (e) => {
            if (gamePaused) return;
            const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
            if (map[e.key]) {
                e.preventDefault();
                move(map[e.key]);
            }
        };

        document.addEventListener('keydown', keyHandler);

        // Touch support
        let touchStartX = 0, touchStartY = 0;
        area.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        area.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > Math.abs(dy)) {
                move(dx > 0 ? 'right' : 'left');
            } else {
                move(dy > 0 ? 'down' : 'up');
            }
        }, { passive: true });

        addTile();
        addTile();
        render();

        const origClose = closeGame;
        closeGame = function () {
            document.removeEventListener('keydown', keyHandler);
            origClose();
            closeGame = origClose;
        };
    }

    // ============================================================
    // GAME 12: MINESWEEPER
    // ============================================================
    function startMinesweeper(area) {
        const rows = 8, cols = 8, mines = 10;
        let board = [];
        let revealed = [];
        let flagged = [];
        let gameActive = true;
        let moves = 0;

        function init() {
            board = Array.from({ length: rows }, () => Array(cols).fill(0));
            revealed = Array.from({ length: rows }, () => Array(cols).fill(false));
            flagged = Array.from({ length: rows }, () => Array(cols).fill(false));

            let placed = 0;
            while (placed < mines) {
                const r = Math.floor(Math.random() * rows);
                const c = Math.floor(Math.random() * cols);
                if (board[r][c] !== -1) {
                    board[r][c] = -1;
                    placed++;
                }
            }

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (board[r][c] === -1) continue;
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++)
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr, nc = c + dc;
                            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === -1) count++;
                        }
                    board[r][c] = count;
                }
            }
        }

        function render() {
            area.innerHTML = `
                <div style="text-align:center;">
                    <div style="margin-bottom:12px;font-size:0.85rem;color:var(--g-text2);">
                        <i class="fas fa-bomb"></i> Mines: ${mines} |
                        <i class="fas fa-flag"></i> Flags: ${flagged.flat().filter(f => f).length} |
                        Right-click or long-press to flag
                    </div>
                    <div class="minesweeper-grid minesweeper-grid-easy">
                        ${board.map((row, r) => row.map((cell, c) => {
                let cls = 'mine-cell';
                let content = '';
                if (revealed[r][c]) {
                    cls += ' revealed';
                    if (cell === -1) {
                        cls += ' mine-bomb';
                        content = '<i class="fas fa-bomb"></i>';
                    } else if (cell > 0) {
                        content = `<span class="n${cell}">${cell}</span>`;
                    }
                } else if (flagged[r][c]) {
                    cls += ' flagged';
                    content = '<i class="fas fa-flag"></i>';
                }
                return `<div class="${cls}" data-r="${r}" data-c="${c}">${content}</div>`;
            }).join('')).join('')}
                    </div>
                </div>
            `;

            area.querySelectorAll('.mine-cell:not(.revealed)').forEach(cell => {
                const r = parseInt(cell.dataset.r);
                const c = parseInt(cell.dataset.c);

                cell.addEventListener('click', (e) => {
                    if (!gameActive || gamePaused || flagged[r][c]) return;
                    reveal(r, c);
                });

                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (!gameActive || gamePaused || revealed[r][c]) return;
                    flagged[r][c] = !flagged[r][c];
                    render();
                });

                // Long press for mobile
                let longPressTimer;
                cell.addEventListener('touchstart', () => {
                    longPressTimer = setTimeout(() => {
                        if (!gameActive || gamePaused || revealed[r][c]) return;
                        flagged[r][c] = !flagged[r][c];
                        render();
                    }, 500);
                });
                cell.addEventListener('touchend', () => clearTimeout(longPressTimer));
            });
        }

        function reveal(r, c) {
            if (r < 0 || r >= rows || c < 0 || c >= cols || revealed[r][c] || flagged[r][c]) return;
            revealed[r][c] = true;
            moves++;
            updateMoves(moves);

            if (board[r][c] === -1) {
                // Game over - reveal all
                for (let i = 0; i < rows; i++)
                    for (let j = 0; j < cols; j++) revealed[i][j] = true;
                render();
                gameActive = false;
                gameOver(moves * 2, 'Boom! You hit a mine!');
                return;
            }

            if (board[r][c] === 0) {
                for (let dr = -1; dr <= 1; dr++)
                    for (let dc = -1; dc <= 1; dc++)
                        reveal(r + dr, c + dc);
            }

            render();

            // Check win
            let unrevealed = 0;
            for (let i = 0; i < rows; i++)
                for (let j = 0; j < cols; j++)
                    if (!revealed[i][j]) unrevealed++;
            if (unrevealed === mines) {
                gameActive = false;
                const bonus = Math.max(0, 500 - moves * 2 - gameTime * 2);
                gameOver(300 + bonus, 'You cleared the minefield!');
            }
        }

        init();
        render();
    }

    // ============================================================
    // GAME 13: BREAKOUT / BRICK BREAKER
    // ============================================================
    function startBreakout(area) {
        const w = Math.min(480, area.offsetWidth - 20);
        const h = Math.min(600, window.innerHeight - 200);

        area.innerHTML = `<canvas id="breakout-canvas" width="${w}" height="${h}"></canvas>`;
        const canvas = document.getElementById('breakout-canvas');
        const ctx = canvas.getContext('2d');

        const paddleW = 80, paddleH = 12;
        let paddleX = (w - paddleW) / 2;
        const ballR = 6;
        let ballX = w / 2, ballY = h - 40;
        let bdx = 3, bdy = -3;
        let score = 0;

        // Bricks
        const brickRows = 5, brickCols = Math.floor(w / 55);
        const brickW = (w - 20) / brickCols - 4;
        const brickH = 18;
        const brickPad = 4;
        const brickTop = 40;
        const brickLeft = 10;
        const bricks = [];
        const brickColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

        for (let r = 0; r < brickRows; r++) {
            bricks[r] = [];
            for (let c = 0; c < brickCols; c++) {
                bricks[r][c] = { alive: true };
            }
        }

        let animFrame;
        let running = true;

        function draw() {
            if (!running) return;
            ctx.clearRect(0, 0, w, h);

            // Background
            ctx.fillStyle = '#0e1726';
            ctx.fillRect(0, 0, w, h);

            // Bricks
            for (let r = 0; r < brickRows; r++) {
                for (let c = 0; c < brickCols; c++) {
                    if (!bricks[r][c].alive) continue;
                    const bx = brickLeft + c * (brickW + brickPad);
                    const by = brickTop + r * (brickH + brickPad);
                    ctx.fillStyle = brickColors[r % brickColors.length];
                    ctx.beginPath();
                    ctx.roundRect(bx, by, brickW, brickH, 4);
                    ctx.fill();
                }
            }

            // Paddle
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.roundRect(paddleX, h - 25, paddleW, paddleH, 6);
            ctx.fill();

            // Ball
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
            ctx.fill();

            // Move ball
            if (!gamePaused) {
                ballX += bdx;
                ballY += bdy;

                // Wall collision
                if (ballX + ballR > w || ballX - ballR < 0) bdx = -bdx;
                if (ballY - ballR < 0) bdy = -bdy;

                // Paddle collision
                if (ballY + ballR > h - 25 && ballX > paddleX && ballX < paddleX + paddleW) {
                    bdy = -Math.abs(bdy);
                    const hitPos = (ballX - paddleX) / paddleW;
                    bdx = (hitPos - 0.5) * 8;
                }

                // Bottom - game over
                if (ballY + ballR > h) {
                    running = false;
                    cancelAnimationFrame(animFrame);
                    gameOver(score, `You broke ${score / 10} bricks!`);
                    return;
                }

                // Brick collision
                for (let r = 0; r < brickRows; r++) {
                    for (let c = 0; c < brickCols; c++) {
                        if (!bricks[r][c].alive) continue;
                        const bx = brickLeft + c * (brickW + brickPad);
                        const by = brickTop + r * (brickH + brickPad);
                        if (ballX > bx && ballX < bx + brickW && ballY - ballR < by + brickH && ballY + ballR > by) {
                            bdy = -bdy;
                            bricks[r][c].alive = false;
                            score += 10;
                            updateScore(score);
                        }
                    }
                }

                // Win check
                if (bricks.flat().every(b => !b.alive)) {
                    running = false;
                    cancelAnimationFrame(animFrame);
                    gameOver(score + 200, 'You cleared all bricks!');
                    return;
                }
            }

            animFrame = requestAnimationFrame(draw);
        }

        // Controls
        const keyHandler = (e) => {
            if (e.key === 'ArrowLeft') paddleX = Math.max(0, paddleX - 30);
            if (e.key === 'ArrowRight') paddleX = Math.min(w - paddleW, paddleX + 30);
        };
        document.addEventListener('keydown', keyHandler);

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            paddleX = e.touches[0].clientX - rect.left - paddleW / 2;
            paddleX = Math.max(0, Math.min(w - paddleW, paddleX));
        }, { passive: false });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            paddleX = e.clientX - rect.left - paddleW / 2;
            paddleX = Math.max(0, Math.min(w - paddleW, paddleX));
        });

        draw();

        const origClose = closeGame;
        closeGame = function () {
            running = false;
            cancelAnimationFrame(animFrame);
            document.removeEventListener('keydown', keyHandler);
            origClose();
            closeGame = origClose;
        };
    }

    // ============================================================
    // GAME 14: FLAPPY UNITY
    // ============================================================
    function startFlappy(area) {
        const w = Math.min(360, area.offsetWidth - 20);
        const h = Math.min(540, window.innerHeight - 200);

        area.innerHTML = `<canvas id="flappy-canvas" width="${w}" height="${h}"></canvas>`;
        const canvas = document.getElementById('flappy-canvas');
        const ctx = canvas.getContext('2d');

        const birdSize = 18;
        let birdY = h / 2;
        let birdVel = 0;
        const gravity = 0.35;
        const jumpForce = -6;
        const birdX = 60;

        let pipes = [];
        const pipeW = 45;
        const pipeGap = 140;
        let frameCount = 0;
        let score = 0;
        let running = true;
        let started = false;
        let animFrame;

        function addPipe() {
            const minTop = 60;
            const maxTop = h - pipeGap - 60;
            const topH = minTop + Math.random() * (maxTop - minTop);
            pipes.push({ x: w, topH: topH, scored: false });
        }

        function draw() {
            if (!running) return;
            ctx.clearRect(0, 0, w, h);

            // Sky gradient
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#87CEEB');
            grad.addColorStop(1, '#E0F0FF');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            if (!started) {
                // Draw bird
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(birdX, birdY, birdSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#0e1726';
                ctx.font = '600 16px Poppins';
                ctx.textAlign = 'center';
                ctx.fillText('Tap or Press Space to Start', w / 2, h / 2 + 60);
                animFrame = requestAnimationFrame(draw);
                return;
            }

            if (!gamePaused) {
                // Physics
                birdVel += gravity;
                birdY += birdVel;

                // Pipes
                frameCount++;
                if (frameCount % 90 === 0) addPipe();

                pipes.forEach(pipe => {
                    pipe.x -= 2.5;

                    // Score
                    if (!pipe.scored && pipe.x + pipeW < birdX) {
                        pipe.scored = true;
                        score++;
                        updateScore(score);
                    }
                });

                pipes = pipes.filter(p => p.x + pipeW > 0);

                // Collision
                const hitGround = birdY + birdSize > h || birdY - birdSize < 0;
                const hitPipe = pipes.some(p =>
                    birdX + birdSize > p.x && birdX - birdSize < p.x + pipeW &&
                    (birdY - birdSize < p.topH || birdY + birdSize > p.topH + pipeGap)
                );

                if (hitGround || hitPipe) {
                    running = false;
                    cancelAnimationFrame(animFrame);
                    gameOver(score, `You flew past ${score} pipes!`);
                    return;
                }
            }

            // Draw pipes
            pipes.forEach(pipe => {
                // Top pipe
                ctx.fillStyle = '#10b981';
                ctx.fillRect(pipe.x, 0, pipeW, pipe.topH);
                ctx.fillStyle = '#059669';
                ctx.fillRect(pipe.x - 3, pipe.topH - 20, pipeW + 6, 20);

                // Bottom pipe
                ctx.fillStyle = '#10b981';
                ctx.fillRect(pipe.x, pipe.topH + pipeGap, pipeW, h - pipe.topH - pipeGap);
                ctx.fillStyle = '#059669';
                ctx.fillRect(pipe.x - 3, pipe.topH + pipeGap, pipeW + 6, 20);
            });

            // Draw bird
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(birdX, birdY, birdSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(birdX + 6, birdY - 4, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0e1726';
            ctx.beginPath();
            ctx.arc(birdX + 7, birdY - 4, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Wing
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.ellipse(birdX - 8, birdY + 2, 10, 6, -0.3, 0, Math.PI * 2);
            ctx.fill();

            animFrame = requestAnimationFrame(draw);
        }

        function flap() {
            if (!started) started = true;
            if (!gamePaused) birdVel = jumpForce;
        }

        const keyHandler = (e) => {
            if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flap(); }
        };
        document.addEventListener('keydown', keyHandler);
        canvas.addEventListener('click', flap);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });

        draw();

        const origClose = closeGame;
        closeGame = function () {
            running = false;
            cancelAnimationFrame(animFrame);
            document.removeEventListener('keydown', keyHandler);
            origClose();
            closeGame = origClose;
        };
    }

})();