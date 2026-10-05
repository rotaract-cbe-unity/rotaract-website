// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Games Zone Module
// File: js/games.js | Version: 5.0.0
// Portal Mini-Games + External Multiplayer Hub
// ============================================

(function () {
    'use strict';

    const GamesModule = {
        // State
        activeGame: null,
        currentPlayer: null,
        gameCanvas: null,
        scores: {},
        isInitialized: false,

        // Game Registry
        GAMES: {
            tic_tac_toe: { name: 'Tic Tac Toe', icon: 'fa-table-cells', color: '#1a73e8', players: '1-2', type: 'board', difficulty: 'Easy' },
            memory_match: { name: 'Memory Match', icon: 'fa-brain', color: '#06b6d4', players: '1', type: 'card', difficulty: 'Medium' },
            word_scramble: { name: 'Word Scramble', icon: 'fa-font', color: '#f97316', players: '1', type: 'word', difficulty: 'Medium' },
            reaction_test: { name: 'Reaction Test', icon: 'fa-bolt', color: '#eab308', players: '1', type: 'speed', difficulty: 'Easy' },
            math_sprint: { name: 'Math Sprint', icon: 'fa-calculator', color: '#22c55e', players: '1', type: 'math', difficulty: 'Hard' },
            color_guess: { name: 'Color Guess', icon: 'fa-palette', color: '#ec4899', players: '1', type: 'visual', difficulty: 'Easy' },
            typing_race: { name: 'Typing Race', icon: 'fa-keyboard', color: '#7c3aed', players: '1', type: 'speed', difficulty: 'Medium' },
            snake: { name: 'Snake', icon: 'fa-worm', color: '#16a34a', players: '1', type: 'arcade', difficulty: 'Medium' },
            number_guess: { name: 'Number Guess', icon: 'fa-hashtag', color: '#6366f1', players: '1', type: 'logic', difficulty: 'Easy' },
            puzzle_slide: { name: 'Puzzle Slide', icon: 'fa-puzzle-piece', color: '#14b8a6', players: '1', type: 'puzzle', difficulty: 'Hard' },
            whack_a_mole: { name: 'Whack-a-Mole', icon: 'fa-hand-pointer', color: '#ef4444', players: '1', type: 'arcade', difficulty: 'Easy' },
            quiz_rush: { name: 'Quiz Rush', icon: 'fa-question', color: '#f59e0b', players: '1', type: 'trivia', difficulty: 'Medium' }
        },

        // Rotary themed trivia questions
        TRIVIA_QUESTIONS: [
            { q: 'Who founded Rotary International?', options: ['Paul P. Harris', 'Herbert J. Taylor', 'Bhichai Rattakul', 'Arch Klumph'], answer: 0 },
            { q: 'In which year was Rotary International founded?', options: ['1900', '1905', '1910', '1920'], answer: 1 },
            { q: 'What is the motto of Rotary International?', options: ['We Serve', 'Service Above Self', 'One Profits Most', 'Together in Action'], answer: 1 },
            { q: 'Where is the headquarters of Rotary International?', options: ['Chicago', 'New York', 'Evanston', 'Geneva'], answer: 2 },
            { q: 'What is the Four-Way Test related to?', options: ['Ethics', 'Finance', 'Membership', 'Elections'], answer: 0 },
            { q: 'How many focus areas does Rotary International have?', options: ['5', '6', '7', '8'], answer: 2 },
            { q: 'Which campaign has Rotary been leading to eradicate worldwide?', options: ['Malaria', 'Polio', 'Tuberculosis', 'Dengue'], answer: 1 },
            { q: 'What is the charitable arm of Rotary International called?', options: ['Rotary Aid', 'Rotary Foundation', 'Rotary Trust', 'Rotary Charity'], answer: 1 },
            { q: 'Which district does Rotaract Club of Coimbatore Unity belong to?', options: ['District 3201', '3203', 'District 3206', 'District 3210'], answer: 2 },
            { q: 'What is the Club ID of Rotaract Club of Coimbatore Unity?', options: ['91594', '91495', '91549', '95914'], answer: 0 },
            { q: 'What year was Rotaract Club of Coimbatore Unity chartered?', options: ['2012', '2013', '2014', '2015'], answer: 2 },
            { q: 'Which Rotary Club sponsors Rotaract Club of Coimbatore Unity?', options: ['RC Coimbatore West', 'RC Coimbatore East', 'RC Coimbatore Central', 'RC Coimbatore South'], answer: 1 },
            { q: 'What age group is eligible for Rotaract membership?', options: ['15-25', '18-30', '18+', '21+'], answer: 2 },
            { q: 'How many avenues of service are there in Rotaract?', options: ['3', '4', '5', '6'], answer: 1 },
            { q: 'Who created the Four-Way Test?', options: ['Paul Harris', 'Herbert J. Taylor', 'Arch Klumph', 'William Russ'], answer: 1 }
        ],

        // Word bank for word scramble
        WORD_BANK: [
            'ROTARACT', 'SERVICE', 'FELLOWSHIP', 'LEADERSHIP', 'COMMUNITY',
            'PROFESSIONAL', 'INTERNATIONAL', 'CHARTER', 'DISTRICT', 'PRESIDENT',
            'SECRETARY', 'TREASURER', 'VOLUNTEER', 'HUMANITARIAN', 'MEMBERSHIP',
            'FOUNDATION', 'LITERACY', 'SANITATION', 'ENVIRONMENT', 'POLIO',
            'INTEGRITY', 'DIVERSITY', 'TOLERANCE', 'EMPOWERMENT', 'INNOVATION'
        ],

        // Typing race sentences
        TYPING_SENTENCES: [
            'Service Above Self is the motto that guides every Rotarian.',
            'Rotary International was founded in Chicago in 1905.',
            'The Four-Way Test asks if it is the truth and if it is fair.',
            'Together we can end polio and create a better world.',
            'Rotaract brings young leaders together for community service.',
            'District 3206 covers Coimbatore and Palakkad regions.',
            'Fellowship is the foundation of every strong Rotaract club.',
            'Leadership development empowers youth to create lasting change.',
            'Professional service enhances career growth opportunities.',
            'International service builds bridges across cultures.'
        ],

        // ==========================================
        // 1. INITIALIZATION
        // ==========================================
        init() {
            if (this.isInitialized) return;
            this.isInitialized = true;
            this.loadScores();
            this.injectStyles();
            this.bindGameCards();
        },

        injectStyles() {
            if (document.getElementById('games-portal-styles')) return;
            const style = document.createElement('style');
            style.id = 'games-portal-styles';
            style.textContent = `
                .game-canvas-area {
                    min-height: 400px;
                    padding: 24px;
                    border-radius: var(--radius-2xl);
                    background: var(--bg-card);
                    backdrop-filter: blur(12px);
                    border: 1px solid var(--border);
                    position: relative;
                    overflow: hidden;
                }
                .game-header-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    background: var(--bg-elevated);
                    border-radius: var(--radius-xl);
                    margin-bottom: 20px;
                }
                .game-cell {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 180ms;
                    font-weight: 900;
                    user-select: none;
                }
                .game-cell:hover:not(.filled) {
                    transform: scale(1.05);
                }
                .game-cell.filled { cursor: default; }
                .memory-card {
                    aspect-ratio: 1;
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all 400ms;
                    transform-style: preserve-3d;
                    perspective: 600px;
                    position: relative;
                    user-select: none;
                }
                .memory-card.flipped {
                    transform: rotateY(180deg);
                }
                .memory-card.matched {
                    opacity: 0.5;
                    pointer-events: none;
                }
                .memory-card .card-front,
                .memory-card .card-back {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backface-visibility: hidden;
                    border-radius: var(--radius-lg);
                    font-size: 1.5rem;
                    font-weight: 900;
                }
                .memory-card .card-front {
                    background: linear-gradient(135deg, var(--blue), var(--purple));
                    color: white;
                }
                .memory-card .card-back {
                    background: var(--bg-elevated);
                    border: 2px solid var(--border);
                    transform: rotateY(180deg);
                }
                .snake-canvas {
                    display: grid;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    border: 2px solid var(--border);
                    background: var(--bg-card-solid);
                }
                .snake-cell {
                    aspect-ratio: 1;
                    transition: all 100ms;
                }
                .snake-body {
                    background: linear-gradient(135deg, var(--green), var(--green-dark));
                    border-radius: 4px;
                }
                .snake-head {
                    background: linear-gradient(135deg, var(--blue), var(--purple));
                    border-radius: 6px;
                }
                .snake-food {
                    background: var(--red);
                    border-radius: 50%;
                }
                .mole-hole {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: radial-gradient(ellipse at bottom, #8b6914, #654d10);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 100ms;
                    position: relative;
                    overflow: hidden;
                }
                .mole-hole::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 10%;
                    width: 80%;
                    height: 30%;
                    background: #654d10;
                    border-radius: 50% 50% 0 0;
                }
                .mole-active {
                    transform: scale(1.1);
                }
                .mole-active::before {
                    content: '';
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: radial-gradient(circle, #d4a574, #a87d50);
                    position: relative;
                    z-index: 1;
                    animation: molePopUp 300ms ease-out;
                }
                @keyframes molePopUp {
                    from { transform: translateY(40px); }
                    to { transform: translateY(0); }
                }
                .mole-hit {
                    background: rgba(239,68,68,0.3) !important;
                }
                .slide-tile {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    font-weight: 900;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 150ms;
                    user-select: none;
                }
                .slide-tile:hover:not(.empty) {
                    transform: scale(1.02);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .slide-tile.empty {
                    background: transparent !important;
                    border: none !important;
                    cursor: default;
                }
                .reaction-zone {
                    width: 280px;
                    height: 280px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 800;
                    cursor: pointer;
                    user-select: none;
                    transition: all 200ms;
                    margin: 0 auto;
                }
                .reaction-zone.waiting {
                    background: linear-gradient(135deg, var(--red), #dc2626);
                    color: white;
                }
                .reaction-zone.ready {
                    background: linear-gradient(135deg, var(--green), var(--green-dark));
                    color: white;
                    transform: scale(1.05);
                }
                .reaction-zone.result {
                    background: var(--bg-elevated);
                    border: 3px solid var(--border);
                    color: var(--text-primary);
                }
                .color-option {
                    width: 80px;
                    height: 80px;
                    border-radius: var(--radius-xl);
                    cursor: pointer;
                    transition: all 180ms;
                    border: 3px solid transparent;
                }
                .color-option:hover {
                    transform: scale(1.1);
                    border-color: white;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                }
                .typing-target {
                    padding: 20px;
                    background: var(--bg-elevated);
                    border: 2px solid var(--border);
                    border-radius: var(--radius-xl);
                    font-size: 16px;
                    line-height: 1.8;
                    letter-spacing: 0.5px;
                    font-family: 'Courier New', monospace;
                    position: relative;
                    margin-bottom: 16px;
                }
                .typing-correct { color: var(--green); }
                .typing-incorrect { color: var(--red); text-decoration: underline; }
                .typing-current { background: rgba(26,115,232,0.2); border-radius: 2px; }
                .typing-remaining { color: var(--text-tertiary); }
                .score-badge {
                    padding: 6px 14px;
                    border-radius: var(--radius-full);
                    font-size: 11px;
                    font-weight: 800;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
            `;
            document.head.appendChild(style);
        },

        bindGameCards() {
            // Bind click events to game cards in the games section
            document.querySelectorAll('#games .game-card').forEach(card => {
                card.addEventListener('click', () => {
                    const icon = card.querySelector('.game-icon');
                    if (!icon) return;
                    const classes = icon.className;
                    // Map icon to game
                    if (classes.includes('fa-table-cells')) this.launchGame('tic_tac_toe');
                    else if (classes.includes('fa-hand-rock')) window.location.href = 'games.html';
                    else if (classes.includes('fa-circle-nodes')) window.location.href = 'games.html';
                    else if (classes.includes('fa-brain')) this.launchGame('memory_match');
                    else if (classes.includes('fa-dice')) window.location.href = 'games.html';
                    else window.location.href = 'games.html';
                });
            });
        },

        // ==========================================
        // 2. GAME LAUNCHER
        // ==========================================
        launchGame(gameType) {
            if (!this.GAMES[gameType]) {
                window.location.href = 'games.html';
                return;
            }

            this.activeGame = gameType;
            const game = this.GAMES[gameType];
            const userName = window.AuthManager?.currentUser?.name || localStorage.getItem('unity_player_name') || 'Player';

            window.AdminPanel?.createModal?.({
                title: game.name,
                size: 'wide',
                body: `
                    <div class="game-header-bar">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${game.color}18;">
                                <i class="fa-solid ${game.icon}" style="color:${game.color};font-size:18px;"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black">${game.name}</h3>
                                <p class="text-[10px] text-slate-400">${game.difficulty} | ${game.type}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div id="game-score-display" class="score-badge" style="background:${game.color}18;color:${game.color};">
                                <i class="fa-solid fa-trophy"></i><span id="game-score-value">0</span>
                            </div>
                            <div id="game-timer-display" class="score-badge" style="background:rgba(100,116,139,0.1);color:var(--text-secondary);">
                                <i class="fa-solid fa-clock"></i><span id="game-timer-value">0:00</span>
                            </div>
                        </div>
                    </div>
                    <div class="game-canvas-area" id="game-canvas-area"></div>
                `,
                footer: `
                    <button class="btn-secondary" onclick="GamesModule.exitGame()">
                        <i class="fa-solid fa-door-open"></i> Exit Game
                    </button>
                    <button class="btn-primary" onclick="GamesModule.restartGame()">
                        <i class="fa-solid fa-rotate-right"></i> Restart
                    </button>
                `
            }) || this.createInlineGameArea(game);

            setTimeout(() => this.startGame(gameType), 200);
        },

        createInlineGameArea(game) {
            // Fallback if admin panel modal not available
            const section = document.getElementById('games');
            if (!section) return;
            const overlay = document.createElement('div');
            overlay.id = 'inline-game-overlay';
            overlay.className = 'fixed inset-0 z-[8000] bg-brand-dark/80 backdrop-blur-xl flex items-center justify-center p-4';
            overlay.innerHTML = `
                <div class="w-full max-w-2xl bg-white/90 dark:bg-brand-dark/90 backdrop-blur-2xl border border-slate-200/50 dark:border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-lg font-black flex items-center gap-2"><i class="fa-solid ${game.icon}" style="color:${game.color};"></i>${game.name}</h3>
                            <button onclick="GamesModule.exitGame()" class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="game-header-bar">
                            <div class="flex items-center gap-3">
                                <div id="game-score-display" class="score-badge" style="background:${game.color}18;color:${game.color};"><i class="fa-solid fa-trophy"></i><span id="game-score-value">0</span></div>
                                <div id="game-timer-display" class="score-badge" style="background:rgba(100,116,139,0.1);color:var(--text-secondary);"><i class="fa-solid fa-clock"></i><span id="game-timer-value">0:00</span></div>
                            </div>
                            <button onclick="GamesModule.restartGame()" class="btn-secondary btn-sm"><i class="fa-solid fa-rotate-right"></i> Restart</button>
                        </div>
                        <div class="game-canvas-area" id="game-canvas-area"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        },

        exitGame() {
            this.activeGame = null;
            this.stopTimer();
            // Close modal or overlay
            if (window.AdminPanel?.closeModal) window.AdminPanel.closeModal();
            const overlay = document.getElementById('inline-game-overlay');
            if (overlay) overlay.remove();
        },

        restartGame() {
            if (this.activeGame) {
                this.stopTimer();
                this.startGame(this.activeGame);
            }
        },

        // ==========================================
        // 3. GAME STARTER
        // ==========================================
        startGame(type) {
            const canvas = document.getElementById('game-canvas-area');
            if (!canvas) return;

            this.gameScore = 0;
            this.gameTime = 0;
            this.updateScore(0);
            this.updateTimer(0);

            switch (type) {
                case 'tic_tac_toe': this.initTicTacToe(canvas); break;
                case 'memory_match': this.initMemoryMatch(canvas); break;
                case 'word_scramble': this.initWordScramble(canvas); break;
                case 'reaction_test': this.initReactionTest(canvas); break;
                case 'math_sprint': this.initMathSprint(canvas); break;
                case 'color_guess': this.initColorGuess(canvas); break;
                case 'typing_race': this.initTypingRace(canvas); break;
                case 'snake': this.initSnake(canvas); break;
                case 'number_guess': this.initNumberGuess(canvas); break;
                case 'puzzle_slide': this.initPuzzleSlide(canvas); break;
                case 'whack_a_mole': this.initWhackAMole(canvas); break;
                case 'quiz_rush': this.initQuizRush(canvas); break;
                default: canvas.innerHTML = '<p class="text-center text-slate-400 py-12">Game not available.</p>';
            }
        },

        // ==========================================
        // 4. TIC TAC TOE (vs AI)
        // ==========================================
        initTicTacToe(canvas) {
            this._tttBoard = Array(9).fill(null);
            this._tttTurn = 'X';
            this._tttGameOver = false;

            const render = () => {
                canvas.innerHTML = `
                    <div class="max-w-sm mx-auto">
                        <p class="text-center text-xs font-bold mb-4 ${this._tttGameOver ? 'text-green-500' : 'text-slate-500'}">
                            ${this._tttGameOver ? (this._tttWinner ? (this._tttWinner === 'X' ? 'You Win!' : 'AI Wins!') : 'Draw!') : (this._tttTurn === 'X' ? 'Your Turn (X)' : 'AI Thinking...')}
                        </p>
                        <div class="grid grid-cols-3 gap-3">
                            ${this._tttBoard.map((cell, i) => `
                                <button onclick="GamesModule.tttMove(${i})" ${cell || this._tttGameOver || this._tttTurn !== 'X' ? 'disabled' : ''}
                                    class="game-cell aspect-square rounded-xl text-3xl border-2 ${cell ? 'filled border-slate-200 dark:border-white/[0.08]' : 'border-dashed border-brand-blue/30 hover:bg-brand-blue/5'} ${cell === 'X' ? 'text-brand-blue' : 'text-red-500'} bg-white/50 dark:bg-white/[0.03]">
                                    ${cell || ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            };
            render();
            this._tttRender = render;
        },

        tttMove(index) {
            if (this._tttBoard[index] || this._tttGameOver || this._tttTurn !== 'X') return;
            this._tttBoard[index] = 'X';
            this._tttTurn = 'O';
            this._tttRender();

            const winner = this.checkTTTWinner(this._tttBoard);
            if (winner || this._tttBoard.every(c => c)) {
                this._tttGameOver = true;
                this._tttWinner = winner;
                if (winner === 'X') this.updateScore(this.gameScore + 10);
                this._tttRender();
                return;
            }

            // AI move
            setTimeout(() => {
                const aiMove = this.tttAI(this._tttBoard);
                if (aiMove !== -1) {
                    this._tttBoard[aiMove] = 'O';
                    this._tttTurn = 'X';
                    const w = this.checkTTTWinner(this._tttBoard);
                    if (w || this._tttBoard.every(c => c)) {
                        this._tttGameOver = true;
                        this._tttWinner = w;
                    }
                }
                this._tttRender();
            }, 500);
        },

        tttAI(board) {
            // Minimax-based AI
            const empty = board.map((c, i) => c ? -1 : i).filter(i => i !== -1);
            if (empty.length === 0) return -1;

            // Check if AI can win
            for (const i of empty) {
                board[i] = 'O';
                if (this.checkTTTWinner(board) === 'O') { board[i] = null; return i; }
                board[i] = null;
            }
            // Block player
            for (const i of empty) {
                board[i] = 'X';
                if (this.checkTTTWinner(board) === 'X') { board[i] = null; return i; }
                board[i] = null;
            }
            // Center
            if (!board[4]) return 4;
            // Corner
            const corners = [0, 2, 6, 8].filter(i => !board[i]);
            if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
            // Random
            return empty[Math.floor(Math.random() * empty.length)];
        },

        checkTTTWinner(b) {
            const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
            for (const [a, b2, c] of lines) {
                if (b[a] && b[a] === b[b2] && b[a] === b[c]) return b[a];
            }
            return null;
        },

        // ==========================================
        // 5. MEMORY MATCH
        // ==========================================
        initMemoryMatch(canvas) {
            const icons = [
                'fa-hand-holding-heart', 'fa-globe', 'fa-award', 'fa-handshake',
                'fa-star', 'fa-users', 'fa-shield-halved', 'fa-feather'
            ];
            const pairs = [...icons, ...icons].sort(() => Math.random() - 0.5);
            this._memCards = pairs.map((icon, i) => ({ id: i, icon, flipped: false, matched: false }));
            this._memFlipped = [];
            this._memMoves = 0;
            this._memMatched = 0;
            this.startTimer();
            this._memRender(canvas);
        },

        _memRender(canvas) {
            canvas.innerHTML = `
                <div class="max-w-md mx-auto">
                    <p class="text-center text-xs text-slate-500 mb-4">Moves: <strong>${this._memMoves}</strong> | Matched: <strong>${this._memMatched}/${this._memCards.length / 2}</strong></p>
                    <div class="grid grid-cols-4 gap-3">
                        ${this._memCards.map(card => `
                            <div class="memory-card ${card.flipped || card.matched ? 'flipped' : ''} ${card.matched ? 'matched' : ''}"
                                onclick="GamesModule.memFlip(${card.id})">
                                <div class="card-front"><i class="fa-solid fa-question"></i></div>
                                <div class="card-back"><i class="fa-solid ${card.icon}" style="color:${this.GAMES.memory_match.color};"></i></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        memFlip(id) {
            const card = this._memCards.find(c => c.id === id);
            if (!card || card.flipped || card.matched || this._memFlipped.length >= 2) return;

            card.flipped = true;
            this._memFlipped.push(card);
            this._memRender(document.getElementById('game-canvas-area'));

            if (this._memFlipped.length === 2) {
                this._memMoves++;
                const [a, b] = this._memFlipped;
                if (a.icon === b.icon) {
                    a.matched = b.matched = true;
                    this._memMatched++;
                    this._memFlipped = [];
                    this.updateScore(this.gameScore + 5);
                    if (this._memMatched === this._memCards.length / 2) {
                        this.stopTimer();
                        this.showGameResult('Memory Match', `You matched all pairs in ${this._memMoves} moves and ${this.gameTime}s!`);
                    }
                } else {
                    setTimeout(() => {
                        a.flipped = b.flipped = false;
                        this._memFlipped = [];
                        this._memRender(document.getElementById('game-canvas-area'));
                    }, 800);
                }
            }
        },

        // ==========================================
        // 6. WORD SCRAMBLE
        // ==========================================
        initWordScramble(canvas) {
            this._wsWord = this.WORD_BANK[Math.floor(Math.random() * this.WORD_BANK.length)];
            this._wsScrambled = this._wsWord.split('').sort(() => Math.random() - 0.5).join('');
            this._wsAttempts = 0;
            this.startTimer();
            this._wsRender(canvas);
        },

        _wsRender(canvas) {
            canvas.innerHTML = `
                <div class="max-w-md mx-auto text-center">
                    <p class="text-xs text-slate-400 mb-2">Unscramble this Rotary-themed word:</p>
                    <div class="flex justify-center gap-2 mb-6">
                        ${this._wsScrambled.split('').map(c => `
                            <span class="w-10 h-12 rounded-lg bg-gradient-to-br from-brand-blue to-brand-purple text-white font-black text-lg flex items-center justify-center shadow-lg">${c}</span>
                        `).join('')}
                    </div>
                    <div class="flex gap-2 justify-center">
                        <input type="text" id="ws-input" placeholder="Type your answer..." maxlength="${this._wsWord.length}"
                            class="flex-1 max-w-xs px-4 py-3 text-sm rounded-xl border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-blue/50 text-center uppercase font-bold tracking-widest"
                            onkeydown="if(event.key==='Enter')GamesModule.wsGuess()">
                        <button onclick="GamesModule.wsGuess()" class="px-6 py-3 bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-xl font-bold text-xs">Check</button>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-3">Attempts: ${this._wsAttempts} | Hint: ${this._wsWord.length} letters</p>
                </div>
            `;
            setTimeout(() => document.getElementById('ws-input')?.focus(), 100);
        },

        wsGuess() {
            const input = document.getElementById('ws-input');
            if (!input) return;
            const guess = input.value.toUpperCase().trim();
            this._wsAttempts++;
            if (guess === this._wsWord) {
                this.stopTimer();
                this.updateScore(this.gameScore + Math.max(20 - this._wsAttempts * 2, 5));
                this.showGameResult('Word Scramble', `Correct! The word was "${this._wsWord}" (${this._wsAttempts} attempts, ${this.gameTime}s)`);
            } else {
                input.value = '';
                input.classList.add('animate-shake');
                setTimeout(() => input.classList.remove('animate-shake'), 500);
                this._wsRender(document.getElementById('game-canvas-area'));
            }
        },

        // ==========================================
        // 7. REACTION TEST
        // ==========================================
        initReactionTest(canvas) {
            this._rtState = 'waiting';
            this._rtStart = 0;
            this._rtResults = [];

            const render = () => {
                canvas.innerHTML = `
                    <div class="text-center">
                        <p class="text-xs text-slate-400 mb-4">Round ${this._rtResults.length + 1}/5 | ${this._rtResults.length > 0 ? 'Average: ' + Math.round(this._rtResults.reduce((a,b) => a+b, 0) / this._rtResults.length) + 'ms' : 'Click when green!'}</p>
                        <div class="reaction-zone ${this._rtState}" onclick="GamesModule.rtClick()">
                            ${this._rtState === 'waiting' ? '<p>Wait for green...</p>' : this._rtState === 'ready' ? '<p>CLICK NOW!</p>' : '<p>' + this._rtLastTime + ' ms</p>'}
                        </div>
                    </div>
                `;
            };

            render();
            this._rtRender = render;

            // Random delay to turn green
            setTimeout(() => {
                this._rtState = 'ready';
                this._rtStart = performance.now();
                this._rtRender();
            }, 2000 + Math.random() * 3000);
        },

        rtClick() {
            if (this._rtState === 'waiting') {
                this._rtState = 'result';
                this._rtLastTime = 'Too early!';
                this._rtRender();
                setTimeout(() => this.initReactionTest(document.getElementById('game-canvas-area')), 1500);
                return;
            }
            if (this._rtState === 'ready') {
                const time = Math.round(performance.now() - this._rtStart);
                this._rtState = 'result';
                this._rtLastTime = time;
                this._rtResults.push(time);
                this.updateScore(Math.max(0, 500 - time));
                this._rtRender();

                if (this._rtResults.length >= 5) {
                    const avg = Math.round(this._rtResults.reduce((a, b) => a + b, 0) / 5);
                    this.showGameResult('Reaction Test', `Average reaction time: ${avg}ms over 5 rounds!`);
                } else {
                    setTimeout(() => this.initReactionTest(document.getElementById('game-canvas-area')), 1500);
                }
            }
        },

        // ==========================================
        // 8. MATH SPRINT
        // ==========================================
        initMathSprint(canvas) {
            this._msScore = 0;
            this._msRound = 0;
            this._msTotal = 10;
            this.startTimer();
            this.nextMathQuestion(canvas);
        },

        nextMathQuestion(canvas) {
            if (this._msRound >= this._msTotal) {
                this.stopTimer();
                this.showGameResult('Math Sprint', `Score: ${this._msScore}/${this._msTotal} in ${this.gameTime}s!`);
                return;
            }
            this._msRound++;
            const ops = ['+', '-', '*'];
            const op = ops[Math.floor(Math.random() * ops.length)];
            const a = Math.floor(Math.random() * (op === '*' ? 12 : 50)) + 1;
            const b = Math.floor(Math.random() * (op === '*' ? 12 : 50)) + 1;
            const correct = op === '+' ? a + b : op === '-' ? a - b : a * b;

            const options = [correct];
            while (options.length < 4) {
                const wrong = correct + (Math.floor(Math.random() * 20) - 10);
                if (!options.includes(wrong) && wrong !== correct) options.push(wrong);
            }
            options.sort(() => Math.random() - 0.5);

            canvas.innerHTML = `
                <div class="max-w-sm mx-auto text-center">
                    <p class="text-[10px] text-slate-400 mb-2">Question ${this._msRound} of ${this._msTotal} | Score: ${this._msScore}</p>
                    <h2 class="text-4xl font-black mb-6">${a} ${op} ${b} = ?</h2>
                    <div class="grid grid-cols-2 gap-3">
                        ${options.map(opt => `
                            <button onclick="GamesModule.msAnswer(${opt}, ${correct})"
                                class="p-4 rounded-xl text-xl font-black bg-white/60 dark:bg-white/[0.04] border-2 border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue hover:scale-105 transition-all">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        msAnswer(selected, correct) {
            if (selected === correct) {
                this._msScore++;
                this.updateScore(this.gameScore + 10);
            }
            this.nextMathQuestion(document.getElementById('game-canvas-area'));
        },

        // ==========================================
        // 9. COLOR GUESS
        // ==========================================
        initColorGuess(canvas) {
            this._cgScore = 0;
            this._cgRound = 0;
            this._cgTotal = 8;
            this.nextColorRound(canvas);
        },

        nextColorRound(canvas) {
            if (this._cgRound >= this._cgTotal) {
                this.showGameResult('Color Guess', `Score: ${this._cgScore}/${this._cgTotal}!`);
                return;
            }
            this._cgRound++;

            const colors = [
                { name: 'Red', hex: '#ef4444' }, { name: 'Blue', hex: '#3b82f6' },
                { name: 'Green', hex: '#22c55e' }, { name: 'Yellow', hex: '#eab308' },
                { name: 'Purple', hex: '#a855f7' }, { name: 'Orange', hex: '#f97316' },
                { name: 'Pink', hex: '#ec4899' }, { name: 'Cyan', hex: '#06b6d4' },
                { name: 'Indigo', hex: '#6366f1' }, { name: 'Teal', hex: '#14b8a6' }
            ];

            const target = colors[Math.floor(Math.random() * colors.length)];
            const decoyNames = colors.filter(c => c.name !== target.name).sort(() => Math.random() - 0.5).slice(0, 2);
            const showName = Math.random() > 0.5 ? decoyNames[0].name : target.name;

            const options = [target, ...colors.filter(c => c.name !== target.name).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);

            canvas.innerHTML = `
                <div class="max-w-md mx-auto text-center">
                    <p class="text-[10px] text-slate-400 mb-2">Round ${this._cgRound}/${this._cgTotal} | Score: ${this._cgScore}</p>
                    <p class="text-xs text-slate-500 mb-4">Click the color that matches: <strong style="color:${target.hex};">${showName}</strong></p>
                    <div class="w-28 h-28 rounded-full mx-auto mb-6 shadow-xl" style="background:${target.hex};"></div>
                    <p class="text-sm font-bold mb-4">What color is this?</p>
                    <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                        ${options.map(c => `
                            <button onclick="GamesModule.cgAnswer('${c.name}', '${target.name}')"
                                class="p-3 rounded-xl text-xs font-bold bg-white/60 dark:bg-white/[0.04] border-2 border-slate-200/60 dark:border-white/[0.08] hover:scale-105 transition-all">
                                ${c.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        cgAnswer(selected, correct) {
            if (selected === correct) {
                this._cgScore++;
                this.updateScore(this.gameScore + 5);
            }
            this.nextColorRound(document.getElementById('game-canvas-area'));
        },

        // ==========================================
        // 10. TYPING RACE
        // ==========================================
        initTypingRace(canvas) {
            this._trSentence = this.TYPING_SENTENCES[Math.floor(Math.random() * this.TYPING_SENTENCES.length)];
            this._trTyped = '';
            this._trErrors = 0;
            this._trStarted = false;
            this.trRender(canvas);
        },

        trRender(canvas) {
            const chars = this._trSentence.split('');
            const typed = this._trTyped.length;

            const display = chars.map((ch, i) => {
                if (i < typed) {
                    return this._trTyped[i] === ch
                        ? `<span class="typing-correct">${this.escapeChar(ch)}</span>`
                        : `<span class="typing-incorrect">${this.escapeChar(ch)}</span>`;
                }
                if (i === typed) return `<span class="typing-current">${this.escapeChar(ch)}</span>`;
                return `<span class="typing-remaining">${this.escapeChar(ch)}</span>`;
            }).join('');

            const wpm = this._trStarted && this.gameTime > 0
                ? Math.round((this._trTyped.split(' ').length / this.gameTime) * 60)
                : 0;

            canvas.innerHTML = `
                <div class="max-w-lg mx-auto">
                    <p class="text-[10px] text-slate-400 mb-2 text-center">Type the sentence below as fast as you can</p>
                    <div class="typing-target">${display}</div>
                    <input type="text" id="typing-input" autofocus
                        class="w-full px-4 py-3 text-sm rounded-xl border-2 border-brand-blue/30 bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-blue font-mono"
                        placeholder="Start typing here..."
                        oninput="GamesModule.trType(this.value)"
                        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                    <div class="flex items-center justify-between mt-3 text-xs text-slate-400">
                        <span>Errors: <strong class="text-red-500">${this._trErrors}</strong></span>
                        <span>WPM: <strong class="text-brand-blue">${wpm}</strong></span>
                        <span>Progress: <strong>${Math.round(typed / chars.length * 100)}%</strong></span>
                    </div>
                </div>
            `;

            setTimeout(() => document.getElementById('typing-input')?.focus(), 50);
        },

        trType(value) {
            if (!this._trStarted) {
                this._trStarted = true;
                this.startTimer();
            }
            this._trTyped = value;
            this._trErrors = 0;
            for (let i = 0; i < value.length; i++) {
                if (value[i] !== this._trSentence[i]) this._trErrors++;
            }

            if (value.length >= this._trSentence.length) {
                this.stopTimer();
                const accuracy = Math.round(((this._trSentence.length - this._trErrors) / this._trSentence.length) * 100);
                const wpm = Math.round((this._trTyped.split(' ').length / this.gameTime) * 60);
                this.updateScore(wpm * 2);
                this.showGameResult('Typing Race', `WPM: ${wpm} | Accuracy: ${accuracy}% | Time: ${this.gameTime}s`);
                return;
            }

            this.trRender(document.getElementById('game-canvas-area'));
        },

        // ==========================================
        // 11. NUMBER GUESS
        // ==========================================
        initNumberGuess(canvas) {
            this._ngSecret = Math.floor(Math.random() * 100) + 1;
            this._ngAttempts = 0;
            this._ngHistory = [];
            this._ngMax = 7;
            this.startTimer();
            this.ngRender(canvas);
        },

        ngRender(canvas) {
            canvas.innerHTML = `
                <div class="max-w-sm mx-auto text-center">
                    <p class="text-xs text-slate-400 mb-4">Guess a number between 1 and 100 (${this._ngMax - this._ngAttempts} attempts left)</p>
                    <div class="space-y-2 mb-6 max-h-48 overflow-y-auto scrollbar-none">
                        ${this._ngHistory.map(h => `
                            <div class="p-2 rounded-lg text-xs ${h.correct ? 'bg-green-500/10 text-green-600 font-bold' : 'bg-slate-50 dark:bg-white/[0.03]'}">
                                ${h.guess} - ${h.hint}
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex gap-2 justify-center">
                        <input type="number" id="ng-input" min="1" max="100" placeholder="1-100"
                            class="w-28 px-4 py-3 text-sm rounded-xl border border-slate-200/60 dark:border-white/[0.10] bg-white/50 dark:bg-white/[0.05] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-blue/50 text-center font-bold"
                            onkeydown="if(event.key==='Enter')GamesModule.ngGuess()">
                        <button onclick="GamesModule.ngGuess()" class="px-6 py-3 bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-xl font-bold text-xs">Guess</button>
                    </div>
                </div>
            `;
            setTimeout(() => document.getElementById('ng-input')?.focus(), 50);
        },

        ngGuess() {
            const input = document.getElementById('ng-input');
            const guess = parseInt(input?.value);
            if (!guess || guess < 1 || guess > 100) return;

            this._ngAttempts++;
            const diff = Math.abs(guess - this._ngSecret);
            let hint;
            if (guess === this._ngSecret) hint = 'CORRECT!';
            else if (diff <= 3) hint = (guess < this._ngSecret ? 'Very close! Higher' : 'Very close! Lower');
            else if (diff <= 10) hint = (guess < this._ngSecret ? 'Close! Go higher' : 'Close! Go lower');
            else hint = (guess < this._ngSecret ? 'Too low' : 'Too high');

            this._ngHistory.push({ guess, hint, correct: guess === this._ngSecret });

            if (guess === this._ngSecret) {
                this.stopTimer();
                this.updateScore(Math.max(50 - this._ngAttempts * 5, 10));
                this.showGameResult('Number Guess', `Found ${this._ngSecret} in ${this._ngAttempts} attempts and ${this.gameTime}s!`);
            } else if (this._ngAttempts >= this._ngMax) {
                this.stopTimer();
                this.showGameResult('Number Guess', `Out of attempts! The number was ${this._ngSecret}.`);
            } else {
                this.ngRender(document.getElementById('game-canvas-area'));
            }
        },

        // ==========================================
        // 12. WHACK-A-MOLE
        // ==========================================
        initWhackAMole(canvas) {
            this._wamScore = 0;
            this._wamTotal = 30;
            this._wamTime = 30;
            this._wamMoles = Array(9).fill(false);
            this._wamActive = -1;
            this._wamCount = 0;

            const render = () => {
                canvas.innerHTML = `
                    <div class="max-w-sm mx-auto text-center">
                        <p class="text-xs text-slate-500 mb-4">Score: <strong class="text-brand-blue">${this._wamScore}</strong> | Time: <strong>${this._wamTime}s</strong></p>
                        <div class="grid grid-cols-3 gap-4 justify-items-center">
                            ${this._wamMoles.map((active, i) => `
                                <div class="mole-hole ${active ? 'mole-active' : ''}" onclick="GamesModule.wamHit(${i})"></div>
                            `).join('')}
                        </div>
                    </div>
                `;
            };

            render();
            this._wamRender = render;

            // Game loop
            this._wamInterval = setInterval(() => {
                this._wamMoles.fill(false);
                const active = Math.floor(Math.random() * 9);
                this._wamMoles[active] = true;
                this._wamActive = active;
                this._wamCount++;
                render();
            }, 1000);

            this._wamTimer = setInterval(() => {
                this._wamTime--;
                render();
                if (this._wamTime <= 0) {
                    clearInterval(this._wamInterval);
                    clearInterval(this._wamTimer);
                    this.updateScore(this._wamScore * 3);
                    this.showGameResult('Whack-a-Mole', `Score: ${this._wamScore} hits in 30 seconds!`);
                }
            }, 1000);
        },

        wamHit(index) {
            if (this._wamMoles[index]) {
                this._wamScore++;
                this._wamMoles[index] = false;
                this.updateScore(this._wamScore * 3);
                this._wamRender();
            }
        },

        // ==========================================
        // 13. PUZZLE SLIDE
        // ==========================================
        initPuzzleSlide(canvas) {
            this._psSize = 3;
            this._psTiles = [];
            this._psMoves = 0;
            this.startTimer();

            // Generate solved board
            for (let i = 1; i < this._psSize * this._psSize; i++) this._psTiles.push(i);
            this._psTiles.push(0);

            // Shuffle by making legal moves
            for (let i = 0; i < 100; i++) {
                const emptyIdx = this._psTiles.indexOf(0);
                const neighbors = this.psGetNeighbors(emptyIdx);
                const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                [this._psTiles[emptyIdx], this._psTiles[randomNeighbor]] = [this._psTiles[randomNeighbor], this._psTiles[emptyIdx]];
            }

            this.psRender(canvas);
        },

        psGetNeighbors(index) {
            const s = this._psSize;
            const n = [];
            const row = Math.floor(index / s);
            const col = index % s;
            if (row > 0) n.push(index - s);
            if (row < s - 1) n.push(index + s);
            if (col > 0) n.push(index - 1);
            if (col < s - 1) n.push(index + 1);
            return n;
        },

        psRender(canvas) {
            const s = this._psSize;
            const colors = ['#1a73e8', '#7c3aed', '#06b6d4', '#22c55e', '#eab308', '#ef4444', '#ec4899', '#f97316'];

            canvas.innerHTML = `
                <div class="max-w-xs mx-auto text-center">
                    <p class="text-xs text-slate-400 mb-4">Moves: <strong>${this._psMoves}</strong> | Arrange 1-${s*s-1} in order</p>
                    <div class="grid gap-2" style="grid-template-columns:repeat(${s},1fr);">
                        ${this._psTiles.map((tile, i) => `
                            <div class="slide-tile aspect-square ${tile === 0 ? 'empty' : ''}" onclick="GamesModule.psMove(${i})"
                                style="${tile ? `background:${colors[tile % colors.length]}25;border:2px solid ${colors[tile % colors.length]}40;color:${colors[tile % colors.length]};` : ''}">
                                ${tile || ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        psMove(index) {
            const emptyIdx = this._psTiles.indexOf(0);
            const neighbors = this.psGetNeighbors(emptyIdx);
            if (!neighbors.includes(index)) return;

            [this._psTiles[emptyIdx], this._psTiles[index]] = [this._psTiles[index], this._psTiles[emptyIdx]];
            this._psMoves++;
            this.psRender(document.getElementById('game-canvas-area'));

            // Check if solved
            const isSolved = this._psTiles.every((t, i) => {
                if (i === this._psTiles.length - 1) return t === 0;
                return t === i + 1;
            });

            if (isSolved) {
                this.stopTimer();
                this.updateScore(Math.max(100 - this._psMoves, 10));
                this.showGameResult('Puzzle Slide', `Solved in ${this._psMoves} moves and ${this.gameTime}s!`);
            }
        },

        // ==========================================
        // 14. QUIZ RUSH (Rotary Trivia)
        // ==========================================
        initQuizRush(canvas) {
            this._qrQuestions = [...this.TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
            this._qrIndex = 0;
            this._qrScore = 0;
            this._qrStreak = 0;
            this.startTimer();
            this.qrRender(canvas);
        },

        qrRender(canvas) {
            if (this._qrIndex >= this._qrQuestions.length) {
                this.stopTimer();
                this.updateScore(this._qrScore * 5);
                this.showGameResult('Quiz Rush', `Score: ${this._qrScore}/${this._qrQuestions.length} | Streak: ${this._qrStreak} | Time: ${this.gameTime}s`);
                return;
            }

            const q = this._qrQuestions[this._qrIndex];
            const colors = ['#1a73e8', '#7c3aed', '#22c55e', '#f97316'];

            canvas.innerHTML = `
                <div class="max-w-md mx-auto">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-[10px] text-slate-400">Question ${this._qrIndex + 1}/${this._qrQuestions.length}</span>
                        <span class="text-[10px] font-bold text-brand-blue">Score: ${this._qrScore} | Streak: ${this._qrStreak}</span>
                    </div>
                    <div class="progress-bar mb-6"><div class="progress-bar-fill" style="width:${((this._qrIndex) / this._qrQuestions.length) * 100}%;"></div></div>
                    <div class="p-5 rounded-2xl bg-gradient-to-br from-brand-blue/5 to-brand-purple/5 border border-brand-blue/15 mb-6">
                        <h3 class="text-sm font-bold leading-relaxed">${this.escapeHtml(q.q)}</h3>
                    </div>
                    <div class="grid grid-cols-1 gap-3">
                        ${q.options.map((opt, i) => `
                            <button onclick="GamesModule.qrAnswer(${i})"
                                class="p-4 rounded-xl text-left text-xs font-bold bg-white/60 dark:bg-white/[0.04] border-2 border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue hover:scale-[1.02] transition-all flex items-center gap-3">
                                <span class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black flex-shrink-0" style="background:${colors[i]};">${String.fromCharCode(65 + i)}</span>
                                ${this.escapeHtml(opt)}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        },

        qrAnswer(index) {
            const q = this._qrQuestions[this._qrIndex];
            if (index === q.answer) {
                this._qrScore++;
                this._qrStreak++;
                this.updateScore(this.gameScore + 5 + this._qrStreak);
            } else {
                this._qrStreak = 0;
            }
            this._qrIndex++;
            this.qrRender(document.getElementById('game-canvas-area'));
        },

        // ==========================================
        // 15. SNAKE GAME
        // ==========================================
        initSnake(canvas) {
            const size = 15;
            this._snSize = size;
            this._snSnake = [{ x: 7, y: 7 }];
            this._snDir = { x: 1, y: 0 };
            this._snNextDir = { x: 1, y: 0 };
            this._snFood = this.snPlaceFood(size);
            this._snScore = 0;
            this._snGameOver = false;
            this._snSpeed = 180;

            this.snRender(canvas);

            // Key controls
            this._snKeyHandler = (e) => {
                const dirs = { ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0} };
                if (dirs[e.key]) {
                    e.preventDefault();
                    const d = dirs[e.key];
                    if (d.x !== -this._snDir.x || d.y !== -this._snDir.y) this._snNextDir = d;
                }
            };
            document.addEventListener('keydown', this._snKeyHandler);

            // Game loop
            this._snInterval = setInterval(() => this.snStep(canvas), this._snSpeed);
        },

        snPlaceFood(size) {
            return { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
        },

        snStep(canvas) {
            if (this._snGameOver) return;

            this._snDir = { ...this._snNextDir };
            const head = {
                x: this._snSnake[0].x + this._snDir.x,
                y: this._snSnake[0].y + this._snDir.y
            };

            // Collision
            if (head.x < 0 || head.x >= this._snSize || head.y < 0 || head.y >= this._snSize ||
                this._snSnake.some(s => s.x === head.x && s.y === head.y)) {
                this._snGameOver = true;
                clearInterval(this._snInterval);
                document.removeEventListener('keydown', this._snKeyHandler);
                this.updateScore(this._snScore * 5);
                this.showGameResult('Snake', `Score: ${this._snScore} | Length: ${this._snSnake.length}`);
                return;
            }

            this._snSnake.unshift(head);

            if (head.x === this._snFood.x && head.y === this._snFood.y) {
                this._snScore++;
                this._snFood = this.snPlaceFood(this._snSize);
                this.updateScore(this._snScore * 5);
            } else {
                this._snSnake.pop();
            }

            this.snRender(canvas);
        },

        snRender(canvas) {
            const s = this._snSize;
            const cellSize = Math.min(Math.floor(350 / s), 24);

            let grid = '';
            for (let y = 0; y < s; y++) {
                for (let x = 0; x < s; x++) {
                    const isHead = this._snSnake[0].x === x && this._snSnake[0].y === y;
                    const isBody = this._snSnake.some(seg => seg.x === x && seg.y === y);
                    const isFood = this._snFood.x === x && this._snFood.y === y;
                    let cls = 'snake-cell';
                    if (isHead) cls += ' snake-head';
                    else if (isBody) cls += ' snake-body';
                    else if (isFood) cls += ' snake-food';
                    grid += `<div class="${cls}"></div>`;
                }
            }

            canvas.innerHTML = `
                <div class="max-w-md mx-auto text-center">
                    <p class="text-xs text-slate-400 mb-3">Score: <strong class="text-brand-blue">${this._snScore}</strong> | Use arrow keys to move</p>
                    <div class="snake-canvas mx-auto" style="grid-template-columns:repeat(${s},${cellSize}px);grid-template-rows:repeat(${s},${cellSize}px);">${grid}</div>
                    <div class="grid grid-cols-3 gap-2 max-w-[160px] mx-auto mt-4">
                        <div></div>
                        <button onclick="GamesModule.snMobileDir(0,-1)" class="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-xs font-bold"><i class="fa-solid fa-arrow-up"></i></button>
                        <div></div>
                        <button onclick="GamesModule.snMobileDir(-1,0)" class="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-xs font-bold"><i class="fa-solid fa-arrow-left"></i></button>
                        <button onclick="GamesModule.snMobileDir(0,1)" class="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-xs font-bold"><i class="fa-solid fa-arrow-down"></i></button>
                        <button onclick="GamesModule.snMobileDir(1,0)" class="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-xs font-bold"><i class="fa-solid fa-arrow-right"></i></button>
                    </div>
                </div>
            `;
        },

        snMobileDir(x, y) {
            if (x !== -this._snDir.x || y !== -this._snDir.y) {
                this._snNextDir = { x, y };
            }
        },

        // ==========================================
        // 16. GAME UTILITIES
        // ==========================================
        gameTimerInterval: null,
        gameScore: 0,
        gameTime: 0,

        startTimer() {
            this.gameTime = 0;
            this.stopTimer();
            this.gameTimerInterval = setInterval(() => {
                this.gameTime++;
                this.updateTimer(this.gameTime);
            }, 1000);
        },

        stopTimer() {
            if (this.gameTimerInterval) {
                clearInterval(this.gameTimerInterval);
                this.gameTimerInterval = null;
            }
            // Also stop any game-specific intervals
            if (this._wamInterval) clearInterval(this._wamInterval);
            if (this._wamTimer) clearInterval(this._wamTimer);
            if (this._snInterval) clearInterval(this._snInterval);
            if (this._snKeyHandler) document.removeEventListener('keydown', this._snKeyHandler);
        },

        updateScore(score) {
            this.gameScore = score;
            const el = document.getElementById('game-score-value');
            if (el) el.textContent = score;
        },

        updateTimer(seconds) {
            const el = document.getElementById('game-timer-value');
            if (el) {
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                el.textContent = m + ':' + String(s).padStart(2, '0');
            }
        },

        showGameResult(gameName, message) {
            const canvas = document.getElementById('game-canvas-area');
            if (!canvas) return;

            canvas.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl">
                        <i class="fa-solid fa-trophy text-4xl text-white"></i>
                    </div>
                    <h2 class="text-2xl font-black mb-2">Game Complete!</h2>
                    <p class="text-sm text-slate-500 mb-6">${message}</p>
                    <div class="flex items-center justify-center gap-3 mb-6">
                        <div class="score-badge" style="background:linear-gradient(135deg,rgba(26,115,232,0.1),rgba(124,58,237,0.1));color:var(--blue);">
                            <i class="fa-solid fa-trophy"></i>${this.gameScore} Points
                        </div>
                    </div>
                    <div class="flex gap-3 justify-center">
                        <button onclick="GamesModule.restartGame()" class="px-6 py-3 bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-xl font-bold text-xs hover:scale-105 transition-all">
                            <i class="fa-solid fa-rotate-right mr-2"></i>Play Again
                        </button>
                        <button onclick="GamesModule.exitGame()" class="px-6 py-3 border border-slate-200/60 dark:border-white/[0.08] rounded-xl font-bold text-xs hover:scale-105 transition-all">
                            Exit
                        </button>
                        <a href="games.html" class="px-6 py-3 border border-brand-purple/30 text-brand-purple rounded-xl font-bold text-xs hover:scale-105 transition-all inline-flex items-center">
                            <i class="fa-solid fa-gamepad mr-2"></i>Multiplayer
                        </a>
                    </div>
                </div>
            `;

            // Save score
            this.saveScore(gameName, this.gameScore);
        },

        saveScore(gameName, score) {
            try {
                const key = 'unity_game_scores';
                const existing = JSON.parse(localStorage.getItem(key) || '{}');
                const gameKey = gameName.toLowerCase().replace(/\s+/g, '_');
                if (!existing[gameKey] || score > existing[gameKey]) {
                    existing[gameKey] = score;
                    localStorage.setItem(key, JSON.stringify(existing));
                }
            } catch (e) { /* silent */ }
        },

        loadScores() {
            try {
                this.scores = JSON.parse(localStorage.getItem('unity_game_scores') || '{}');
            } catch (e) {
                this.scores = {};
            }
        },

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        escapeChar(ch) {
            if (ch === ' ') return '&nbsp;';
            if (ch === '<') return '&lt;';
            if (ch === '>') return '&gt;';
            if (ch === '&') return '&amp;';
            return ch;
        }
    };

    window.GamesModule = GamesModule;

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => GamesModule.init());
    } else {
        GamesModule.init();
    }

})();