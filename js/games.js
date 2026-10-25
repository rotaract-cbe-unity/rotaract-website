// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Games Zone Module
// File: js/games.js | Version: 6.0.0
// Portal Mini-Games + Unity Arcade (multiplayer rooms, 10 live games)
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
                    else if (classes.includes('fa-hand-rock')) this.openArcade({ game: 'rps_arena' });
                    else if (classes.includes('fa-circle-nodes')) this.openArcade({ game: 'connect_four' });
                    else if (classes.includes('fa-brain')) this.launchGame('memory_match');
                    else if (classes.includes('fa-dice')) this.openArcade({ game: 'dice_duel' });
                    else this.openArcade();
                });
            });
        },

        // ==========================================
        // 2. GAME LAUNCHER
        // ==========================================
        launchGame(gameType) {
            if (!this.GAMES[gameType]) {
                if (this.openArcade) this.openArcade(); else window.location.href = 'games.html';
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
            const existing = document.getElementById('inline-game-overlay');
            if (existing) existing.remove();
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
                        <a href="games.html" onclick="event.preventDefault();GamesModule.exitGame();GamesModule.openArcade();" class="px-6 py-3 border border-brand-purple/30 text-brand-purple rounded-xl font-bold text-xs hover:scale-105 transition-all inline-flex items-center">
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

// =====================================================================
// UNITY ARCADE  -  multiplayer rooms + 10 live games   (games.js v6.0.0)
//   * Rooms run over Supabase Realtime broadcast (no tables needed) and
//     fall back to BroadcastChannel (same device / offline demo).
//   * The host's browser is the referee: players send actions, the host
//     validates them and pushes the new state to everybody.
//   * A room closes when the host closes it, the host leaves / goes
//     offline, or it has been idle for 15 minutes.  Closed codes are dead.
// =====================================================================
(function () {
    'use strict';

    const IDLE_MS = 15 * 60 * 1000;        // room closes after 15 min without activity
    const MAX_LIFE_MS = 2 * 60 * 60 * 1000; // hard limit 2h
    const HOST_TIMEOUT = 10000;             // players: no host heartbeat for 10 s => closed
    const PLAYER_TIMEOUT = 12000;           // host: player silent for 12 s => dropped
    const COLORS = ['#60a5fa', '#c084fc', '#f472b6', '#fb923c', '#4ade80', '#22d3ee', '#facc15', '#f87171'];
    const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    // ---------------- helpers ----------------
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const uid = () => 'p' + Math.random().toString(36).slice(2, 9);
    const genCode = () => Array.from({ length: 5 }, () => CODE_CHARS[rnd(0, CODE_CHARS.length - 1)]).join('');
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    const store = {
        get(k, d) { try { const v = localStorage.getItem('unity_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem('unity_' + k, JSON.stringify(v)); } catch (e) { /* silent */ } }
    };
    const GM = () => window.GamesModule || {};

    // ---------------- extra question pool (Rotary + general) ----------------
    const EXTRA_QUESTIONS = [
        { q: 'Which avenue of service focuses on career growth?', options: ['Club Service', 'Professional Service', 'Community Service', 'International Service'], answer: 1 },
        { q: 'Rotaract is a program of which organisation?', options: ['Lions Club', 'Rotary International', 'UNICEF', 'Red Cross'], answer: 1 },
        { q: 'What colour is the Rotary wheel?', options: ['Silver', 'Gold & Royal Blue', 'Red & White', 'Green'], answer: 1 },
        { q: 'How many teeth does the Rotary wheel have?', options: ['12', '20', '24', '32'], answer: 2 },
        { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], answer: 1 },
        { q: 'What is the capital of Tamil Nadu?', options: ['Coimbatore', 'Madurai', 'Chennai', 'Salem'], answer: 2 },
        { q: 'How many days are in a leap year?', options: ['364', '365', '366', '367'], answer: 2 },
        { q: 'Which gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], answer: 2 },
        { q: 'Which is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
        { q: 'What is 12 x 12?', options: ['124', '132', '144', '154'], answer: 2 },
        { q: 'Who wrote the Indian national anthem?', options: ['Bankim Chandra', 'Rabindranath Tagore', 'Sarojini Naidu', 'Subramania Bharati'], answer: 1 },
        { q: 'Which river flows through Coimbatore?', options: ['Noyyal', 'Ganga', 'Godavari', 'Narmada'], answer: 0 }
    ];

    // =====================================================================
    // GAME DEFINITIONS  (host-side logic + shared render)
    //   init(ctx)            -> state
    //   act(st, pid, a, ctx) -> mutate state (host only)
    //   render(st, me, ctx)  -> html string (every client)
    //   onState(st, me)      -> optional hook on clients
    //   drop(st, pid, ctx)   -> optional, a player left mid-game
    // `ctx.secret` is host-only data (answers, hidden cards, ...).
    // =====================================================================
    const baseState = (ctx, extra) => {
        const order = ctx.players.map(p => p.id);
        const names = {}, score = {};
        ctx.players.forEach(p => { names[p.id] = p.name; score[p.id] = 0; });
        return Object.assign({ order, names, score, gone: {}, over: false, msg: '', deadline: 0 }, extra || {});
    };
    const alive = st => st.order.filter(id => !st.gone[id]);
    const nextAlive = (st, idx) => { const n = st.order.length; for (let k = 1; k <= n; k++) { const j = (idx + k) % n; if (!st.gone[st.order[j]]) return j; } return idx; };
    const colorOf = (st, id) => COLORS[Math.max(0, st.order.indexOf(id)) % COLORS.length];
    const chip = (st, id, extra) => `<span class="uxa-chip" style="--c:${colorOf(st, id)}">${esc(st.names[id] || '?')}${extra ? ' ' + extra : ''}</span>`;
    const cd = ts => ts ? `<span class="uxa-cd" data-cd="${ts}">--</span>` : '';
    const strip = (st, me) => `<div class="uxa-strip">${st.order.map(id => `<div class="uxa-pill ${id === me ? 'me' : ''} ${st.gone[id] ? 'gone' : ''}" style="--c:${colorOf(st, id)}"><b>${esc(st.names[id])}</b><span>${st.score[id] || 0}</span></div>`).join('')}</div>`;

    const GAMES = {};

    // ---------- 1. CONNECT FOUR ----------
    GAMES.connect_four = {
        id: 'connect_four', name: 'Connect Four', icon: 'fa-circle-nodes', color: '#60a5fa', min: 2, max: 2,
        desc: 'Drop discs and line up four before your rival does.',
        init(ctx) {
            return baseState(ctx, { board: Array(42).fill(-1), turn: 0, line: [], msg: '' });
        },
        act(st, pid, a) {
            if (st.over || a.t !== 'drop' || st.order[st.turn] !== pid) return;
            const c = clamp(parseInt(a.c, 10) || 0, 0, 6);
            let r = -1;
            for (let i = 5; i >= 0; i--) if (st.board[i * 7 + c] === -1) { r = i; break; }
            if (r < 0) return;
            st.board[r * 7 + c] = st.turn;
            const line = findFour(st.board, r, c, st.turn);
            if (line) { st.line = line; st.over = true; st.score[pid] = 1; st.msg = st.names[pid] + ' connected four!'; return; }
            if (st.board.every(v => v !== -1)) { st.over = true; st.msg = 'Draw - the board is full.'; return; }
            st.turn = nextAlive(st, st.turn);
        },
        drop(st, pid) {
            const left = alive(st);
            if (left.length === 1) { st.over = true; st.score[left[0]] = 1; st.msg = st.names[pid] + ' left - ' + st.names[left[0]] + ' wins.'; }
        },
        render(st, me) {
            const myTurn = !st.over && st.order[st.turn] === me;
            let cols = '';
            for (let c = 0; c < 7; c++) {
                let cells = '';
                for (let r = 0; r < 6; r++) {
                    const v = st.board[r * 7 + c];
                    const win = st.line.includes(r * 7 + c);
                    cells += `<i class="c4-cell ${v >= 0 ? 'on' : ''} ${win ? 'win' : ''}" style="${v >= 0 ? '--c:' + COLORS[v] : ''}"></i>`;
                }
                cols += `<button class="c4-col" ${myTurn ? '' : 'disabled'} data-a='${JSON.stringify({ t: 'drop', c })}'>${cells}</button>`;
            }
            const who = st.over ? st.msg : (myTurn ? 'Your turn - pick a column' : 'Waiting for ' + esc(st.names[st.order[st.turn]]) + '...');
            return `<div class="uxa-note">${who}</div><div class="c4-board">${cols}</div>
                <div class="uxa-legend">${st.order.map((id, i) => `<span><i class="c4-dot" style="--c:${COLORS[i]}"></i>${esc(st.names[id])}</span>`).join('')}</div>`;
        }
    };
    function findFour(b, r, c, p) {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of dirs) {
            const cells = [r * 7 + c];
            for (const s of [1, -1]) {
                let i = r + dr * s, j = c + dc * s;
                while (i >= 0 && i < 6 && j >= 0 && j < 7 && b[i * 7 + j] === p) { cells.push(i * 7 + j); i += dr * s; j += dc * s; }
            }
            if (cells.length >= 4) return cells;
        }
        return null;
    }

    // ---------- 2. ROCK PAPER SCISSORS ARENA ----------
    const RPS = { r: ['Rock', 'fa-hand-back-fist'], p: ['Paper', 'fa-hand'], s: ['Scissors', 'fa-hand-scissors'] };
    const RPS_BEATS = { r: 's', s: 'p', p: 'r' };
    GAMES.rps_arena = {
        id: 'rps_arena', name: 'RPS Arena', icon: 'fa-hand-scissors', color: '#c084fc', min: 2, max: 8,
        desc: '5 rounds. Beat as many opponents as you can each round.',
        init(ctx) {
            const st = baseState(ctx, { round: 1, total: 5, phase: 'pick', picked: {}, reveal: null, gain: {} });
            ctx.secret.picks = {};
            st.deadline = Date.now() + 10000;
            const r = st.round; ctx.later(10000, () => resolveRps(st, ctx, r));
            return st;
        },
        act(st, pid, a, ctx) {
            if (st.over || st.phase !== 'pick' || a.t !== 'pick' || !RPS[a.v] || st.gone[pid] || ctx.secret.picks[pid]) return;
            ctx.secret.picks[pid] = a.v; st.picked[pid] = true;
            if (alive(st).every(id => ctx.secret.picks[id])) resolveRps(st, ctx, st.round);
        },
        render(st, me) {
            const mine = st.picked[me];
            const btns = Object.keys(RPS).map(k => `<button class="rps-btn" ${st.phase !== 'pick' || mine ? 'disabled' : ''} data-a='${JSON.stringify({ t: 'pick', v: k })}'><i class="fa-solid ${RPS[k][1]}"></i><span>${RPS[k][0]}</span></button>`).join('');
            let body = '';
            if (st.phase === 'reveal' && st.reveal) {
                body = `<div class="rps-reveal">${st.order.filter(id => st.reveal[id]).map(id => `<div class="rps-card" style="--c:${colorOf(st, id)}"><i class="fa-solid ${RPS[st.reveal[id]][1]}"></i><b>${esc(st.names[id])}</b><small>${RPS[st.reveal[id]][0]} ${st.gain[id] ? '<em>+' + st.gain[id] + '</em>' : ''}</small></div>`).join('')}</div>`;
            } else {
                body = `<div class="rps-pick">${btns}</div><div class="uxa-note">${mine ? 'Locked in - waiting for others (' + Object.keys(st.picked).length + '/' + alive(st).length + ')' : 'Choose your weapon'}</div>`;
            }
            return `<div class="uxa-note big">Round ${st.round} / ${st.total} ${cd(st.deadline)}</div>${body}${strip(st, me)}`;
        },
        drop(st, pid, ctx) { if (st.phase === 'pick' && alive(st).length && alive(st).every(id => ctx.secret.picks[id])) resolveRps(st, ctx, st.round); }
    };
    function resolveRps(st, ctx, round) {
        if (st.over || st.phase !== 'pick' || st.round !== round) return;
        const picks = ctx.secret.picks;
        const ids = alive(st);
        ids.forEach(id => { if (!picks[id]) picks[id] = ['r', 'p', 's'][rnd(0, 2)]; });
        const gain = {};
        ids.forEach(a => { gain[a] = 0; ids.forEach(b => { if (a !== b && RPS_BEATS[picks[a]] === picks[b]) gain[a]++; }); st.score[a] += gain[a]; });
        st.reveal = Object.assign({}, picks); st.gain = gain; st.phase = 'reveal'; st.deadline = 0;
        ctx.later(3200, () => {
            if (round >= st.total) { st.over = true; st.msg = 'Arena closed!'; return; }
            st.round = round + 1; st.phase = 'pick'; st.picked = {}; st.reveal = null; st.gain = {};
            ctx.secret.picks = {}; st.deadline = Date.now() + 10000;
            const r2 = st.round; ctx.later(10000, () => resolveRps(st, ctx, r2));
        });
        ctx.push();
    }

    // ---------- 3. DICE DUEL ----------
    GAMES.dice_duel = {
        id: 'dice_duel', name: 'Dice Duel', icon: 'fa-dice', color: '#f472b6', min: 2, max: 6,
        desc: 'Roll two dice for 5 rounds. Doubles earn a +5 bonus!',
        init(ctx) {
            const st = baseState(ctx, { round: 1, total: 5, phase: 'roll', rolls: {}, win: [] });
            st.deadline = Date.now() + 10000; const r = st.round; ctx.later(10000, () => finishDice(st, ctx, r));
            return st;
        },
        act(st, pid, a, ctx) {
            if (st.over || st.phase !== 'roll' || a.t !== 'roll' || st.gone[pid] || st.rolls[pid]) return;
            st.rolls[pid] = [rnd(1, 6), rnd(1, 6)];
            if (alive(st).every(id => st.rolls[id])) finishDice(st, ctx, st.round);
        },
        render(st, me) {
            const die = n => `<i class="die d${n}">${'<b></b>'.repeat(n)}</i>`;
            const rows = st.order.map(id => {
                const r = st.rolls[id];
                return `<div class="dice-row ${st.win.includes(id) ? 'win' : ''}" style="--c:${colorOf(st, id)}"><span>${esc(st.names[id])}${id === me ? ' (you)' : ''}</span><div class="dice-pair">${r ? die(r[0]) + die(r[1]) + `<em>${r[0] + r[1]}${r[0] === r[1] ? ' +5' : ''}</em>` : '<small>' + (st.phase === 'roll' ? 'waiting...' : 'skipped') + '</small>'}</div></div>`;
            }).join('');
            const canRoll = st.phase === 'roll' && !st.rolls[me] && !st.gone[me] && !st.over;
            return `<div class="uxa-note big">Round ${st.round} / ${st.total} ${cd(st.deadline)}</div>${rows}
                <div class="uxa-actions"><button class="uxa-btn primary" ${canRoll ? '' : 'disabled'} data-a='{"t":"roll"}'><i class="fa-solid fa-dice"></i> Roll the dice</button></div>${strip(st, me)}`;
        }
    };
    function finishDice(st, ctx, round) {
        if (st.over || st.phase !== 'roll' || st.round !== round) return;
        alive(st).forEach(id => { if (!st.rolls[id]) st.rolls[id] = [rnd(1, 6), rnd(1, 6)]; });
        let best = -1, win = [];
        alive(st).forEach(id => {
            const [a, b] = st.rolls[id]; const t = a + b + (a === b ? 5 : 0);
            st.score[id] += t;
            if (t > best) { best = t; win = [id]; } else if (t === best) win.push(id);
        });
        st.win = win; st.phase = 'show'; st.deadline = 0;
        ctx.later(2800, () => {
            if (round >= st.total) { st.over = true; st.msg = 'Highest total wins!'; return; }
            st.round = round + 1; st.phase = 'roll'; st.rolls = {}; st.win = [];
            st.deadline = Date.now() + 10000; const r2 = st.round; ctx.later(10000, () => finishDice(st, ctx, r2));
        });
        ctx.push();
    }

    // ---------- 4. QUIZ BATTLE ----------
    GAMES.quiz_battle = {
        id: 'quiz_battle', name: 'Quiz Battle', icon: 'fa-circle-question', color: '#facc15', min: 2, max: 8,
        desc: '8 Rotary & general questions. Faster answers score more.',
        init(ctx) {
            const pool = shuffle((GM().TRIVIA_QUESTIONS || []).concat(EXTRA_QUESTIONS).filter(q => q && q.options && q.options.length === 4)).slice(0, 8);
            ctx.secret.qs = pool;
            const st = baseState(ctx, { idx: 0, total: pool.length, phase: 'ask', q: null, answered: {}, result: null });
            quizAsk(st, ctx, 0);
            return st;
        },
        act(st, pid, a, ctx) {
            if (st.over || st.phase !== 'ask' || a.t !== 'ans' || st.gone[pid] || st.answered[pid] !== undefined) return;
            const i = clamp(parseInt(a.v, 10), 0, 3);
            st.answered[pid] = true; ctx.secret.picks[pid] = { i, at: Date.now() };
            if (alive(st).every(id => st.answered[id])) quizReveal(st, ctx, st.idx);
        },
        render(st, me) {
            if (!st.q) return '';
            const done = st.phase !== 'ask';
            const opts = st.q.options.map((o, i) => {
                let cls = '';
                if (done && st.result) { if (i === st.result.answer) cls = 'ok'; else if (st.result.picks[me] === i) cls = 'bad'; }
                else if (st.answered[me] && st.mine === i) cls = 'sel';
                return `<button class="quiz-opt ${cls}" ${done || st.answered[me] ? 'disabled' : ''} data-a='${JSON.stringify({ t: 'ans', v: i })}'><b>${'ABCD'[i]}</b>${esc(o)}</button>`;
            }).join('');
            const foot = done && st.result
                ? `<div class="uxa-note">${st.order.filter(id => st.result.gain[id]).map(id => chip(st, id, '+' + st.result.gain[id])).join(' ') || 'Nobody got it!'}</div>`
                : `<div class="uxa-note">${st.answered[me] ? 'Answer locked (' + Object.keys(st.answered).length + '/' + alive(st).length + ')' : 'Pick the right answer'}</div>`;
            return `<div class="uxa-note big">Question ${st.idx + 1} / ${st.total} ${cd(st.deadline)}</div><div class="quiz-q">${esc(st.q.q)}</div><div class="quiz-grid">${opts}</div>${foot}${strip(st, me)}`;
        },
        drop(st, pid, ctx) { if (st.phase === 'ask' && alive(st).length && alive(st).every(id => st.answered[id])) quizReveal(st, ctx, st.idx); }
    };
    function quizAsk(st, ctx, idx) {
        const q = ctx.secret.qs[idx];
        st.idx = idx; st.phase = 'ask'; st.q = { q: q.q, options: q.options }; st.answered = {}; st.result = null;
        ctx.secret.answer = q.answer; ctx.secret.picks = {};
        st.deadline = Date.now() + 12000; st.t0 = Date.now();
        ctx.later(12000, () => quizReveal(st, ctx, idx));
    }
    function quizReveal(st, ctx, idx) {
        if (st.over || st.phase !== 'ask' || st.idx !== idx) return;
        const picks = {}, gain = {};
        alive(st).forEach(id => {
            const p = ctx.secret.picks[id];
            if (!p) return;
            picks[id] = p.i;
            if (p.i === ctx.secret.answer) { const left = Math.max(0, 12 - (p.at - st.t0) / 1000); gain[id] = 100 + Math.round(left * 8); st.score[id] += gain[id]; }
        });
        st.phase = 'reveal'; st.result = { answer: ctx.secret.answer, picks, gain }; st.deadline = 0;
        ctx.later(3200, () => { if (idx + 1 >= st.total) { st.over = true; st.msg = 'Quiz complete!'; } else quizAsk(st, ctx, idx + 1); });
        ctx.push();
    }

    // ---------- 5. MEMORY DUEL ----------
    const EMOJI = ['🌟', '🎯', '🚀', '🎈', '🍀', '🔥', '🎵', '🦋', '🌈', '🍕', '⚡', '🎲'];
    GAMES.memory_duel = {
        id: 'memory_duel', name: 'Memory Duel', icon: 'fa-brain', color: '#22d3ee', min: 2, max: 4,
        desc: 'Take turns flipping cards. Every match earns a point and another turn.',
        init(ctx) {
            const vals = shuffle(EMOJI.slice(0, 8).concat(EMOJI.slice(0, 8)));
            ctx.secret.cards = vals;
            return baseState(ctx, { turn: 0, show: Array(16).fill(''), matched: Array(16).fill(0), flipped: [], lock: false });
        },
        act(st, pid, a, ctx) {
            if (st.over || a.t !== 'flip' || st.lock || st.order[st.turn] !== pid) return;
            const i = parseInt(a.i, 10);
            if (!(i >= 0 && i < 16) || st.matched[i] || st.flipped.includes(i)) return;
            st.flipped.push(i); st.show[i] = ctx.secret.cards[i];
            if (st.flipped.length < 2) return;
            const [x, y] = st.flipped;
            if (ctx.secret.cards[x] === ctx.secret.cards[y]) {
                st.matched[x] = st.matched[y] = st.turn + 1; st.score[pid]++; st.flipped = [];
                if (st.matched.every(Boolean)) { st.over = true; st.msg = 'All pairs found!'; }
            } else {
                st.lock = true;
                ctx.later(1300, () => { st.show[x] = ''; st.show[y] = ''; st.flipped = []; st.lock = false; st.turn = nextAlive(st, st.turn); });
            }
        },
        drop(st, pid, ctx) {
            if (alive(st).length < 2) { st.over = true; st.msg = 'Everyone else left.'; return; }
            if (st.order[st.turn] === pid) { st.turn = nextAlive(st, st.turn); }
        },
        render(st, me) {
            const myTurn = !st.over && st.order[st.turn] === me && !st.lock;
            const cards = st.show.map((v, i) => {
                const m = st.matched[i];
                return `<button class="mem-card ${v ? 'up' : ''} ${m ? 'done' : ''}" style="${m ? '--c:' + COLORS[m - 1] : ''}" ${myTurn && !v ? '' : 'disabled'} data-a='${JSON.stringify({ t: 'flip', i })}'><span>${v || '?'}</span></button>`;
            }).join('');
            const note = st.over ? esc(st.msg) : (st.order[st.turn] === me ? 'Your turn - flip two cards' : esc(st.names[st.order[st.turn]]) + ' is picking...');
            return `<div class="uxa-note big">${note}</div><div class="mem-grid">${cards}</div>${strip(st, me)}`;
        }
    };

    // ---------- 6. TYPING RACE LIVE ----------
    GAMES.typing_live = {
        id: 'typing_live', name: 'Typing Race Live', icon: 'fa-keyboard', color: '#a78bfa', min: 2, max: 8,
        desc: 'Everyone types the same text. First to finish wins.',
        init(ctx) {
            const pool = (GM().TYPING_SENTENCES || ['Service Above Self is the motto of Rotary.', 'Together we can make the world a better place.']);
            const target = shuffle(pool).slice(0, 2).join(' ');
            const st = baseState(ctx, { target, prog: {}, finish: {}, startAt: Date.now() + 3500 });
            st.deadline = st.startAt + 75000;
            ctx.later(3600, () => {});   // wakes everybody up when the countdown ends
            ctx.later(75000 + 3500, () => { if (!st.over) { st.over = true; st.msg = 'Time is up!'; typingScore(st); } });
            return st;
        },
        act(st, pid, a) {
            if (st.over || a.t !== 'prog' || st.gone[pid] || st.finish[pid] || Date.now() < st.startAt - 200) return;
            const text = String(a.v || '').slice(0, st.target.length + 5);
            let n = 0; while (n < text.length && text[n] === st.target[n]) n++;
            st.prog[pid] = n;
            if (n >= st.target.length) st.finish[pid] = Date.now() - st.startAt;
            if (alive(st).every(id => st.finish[id])) { st.over = true; st.msg = 'Everyone finished!'; }
            if (st.over) typingScore(st);
        },
        render(st, me) {
            const mine = st.prog[me] || 0, T = st.target;
            const started = hnow() >= st.startAt;
            const bars = st.order.map(id => { const p = Math.round(((st.prog[id] || 0) / T.length) * 100); return `<div class="tr-bar" style="--c:${colorOf(st, id)}"><span>${esc(st.names[id])}${st.finish[id] ? ' 🏁 ' + (st.finish[id] / 1000).toFixed(1) + 's' : ''}</span><i><u style="width:${p}%"></u></i><em>${p}%</em></div>`; }).join('');
            const text = `<span class="tr-ok">${esc(T.slice(0, mine))}</span><span class="tr-cur">${esc(T.slice(mine, mine + 1))}</span><span class="tr-rest">${esc(T.slice(mine + 1))}</span>`;
            const done = st.finish[me] || st.over;
            return `<div class="uxa-note big">${started ? (done ? 'Finished' : 'Type now!') : 'Get ready...'} ${cd(st.startAt > hnow() ? st.startAt : st.deadline)}</div>
                <div class="tr-text">${text}</div>
                <input id="tr-input" class="uxa-input" data-live="prog" autocomplete="off" autocapitalize="off" spellcheck="false" ${started && !done ? '' : 'disabled'} placeholder="${started ? 'Start typing the text above...' : 'Wait for the countdown'}">
                <div class="tr-bars">${bars}</div>`;
        },
        onState(st, me) { if (hnow() >= st.startAt) { const i = document.getElementById('tr-input'); if (i && !i.disabled && document.activeElement !== i) i.focus(); } }
    };
    function typingScore(st) {
        const fin = Object.keys(st.finish).sort((a, b) => st.finish[a] - st.finish[b]);
        st.order.forEach(id => { const k = fin.indexOf(id); st.score[id] = k >= 0 ? 100 + (st.order.length - k) * 10 : Math.round(((st.prog[id] || 0) / st.target.length) * 80); });
    }

    // ---------- 7. REACTION SHOWDOWN ----------
    GAMES.reaction_showdown = {
        id: 'reaction_showdown', name: 'Reaction Showdown', icon: 'fa-bolt', color: '#fb923c', min: 2, max: 8,
        desc: 'Wait for green, then tap first. Tap early and you lose points!',
        init(ctx) {
            const st = baseState(ctx, { round: 1, total: 5, phase: 'wait', ms: {}, early: {}, results: null });
            reactStart(st, ctx, 1);
            return st;
        },
        act(st, pid, a, ctx) {
            if (st.over || st.gone[pid] || st.ms[pid] !== undefined || st.early[pid]) return;
            if (st.phase === 'wait' && a.t === 'tap') { st.early[pid] = true; st.score[pid] -= 1; }
            else if (st.phase === 'go' && a.t === 'tap') st.ms[pid] = clamp(Math.round(Number(a.ms) || 999), 90, 3000);
            else return;
            if (alive(st).every(id => st.ms[id] !== undefined || st.early[id])) reactEnd(st, ctx, st.round);
        },
        render(st, me) {
            const mine = st.ms[me] !== undefined || st.early[me];
            let cls = 'wait', label = 'WAIT...', sub = 'Do not tap until the pad turns green';
            if (st.phase === 'go') { cls = 'go'; label = mine ? (st.ms[me] + ' ms') : 'TAP!'; sub = mine ? 'Locked in' : ''; }
            if (st.phase === 'wait' && st.early[me]) { cls = 'early'; label = 'TOO EARLY'; sub = '-1 point'; }
            if (st.phase === 'show') { cls = 'show'; label = 'Round results'; sub = ''; }
            const res = st.results ? `<div class="rx-res">${st.results.map(r => `<span>${chip(st, r.id, r.early ? 'early (-1)' : r.ms + ' ms' + (r.pts ? ' +' + r.pts : ''))}</span>`).join('')}</div>` : '';
            return `<div class="uxa-note big">Round ${st.round} / ${st.total}</div>
                <button class="rx-pad ${cls}" ${st.phase === 'show' || (st.phase === 'go' && mine) ? 'disabled' : ''} data-react="1"><strong>${label}</strong><small>${sub}</small></button>${res}${strip(st, me)}`;
        },
        onState(st) { if (st.phase === 'go' && S) { const k = st.round; if (S.goRecv !== k) { S.goRecv = k; S.goAt = performance.now(); } } }
    };
    function reactStart(st, ctx, round) {
        st.round = round; st.phase = 'wait'; st.ms = {}; st.early = {}; st.results = null;
        ctx.later(rnd(2000, 5200), () => {
            if (st.over || st.round !== round || st.phase !== 'wait') return;
            st.phase = 'go'; st.goT = Date.now();
            ctx.later(3200, () => reactEnd(st, ctx, round));
        });
    }
    function reactEnd(st, ctx, round) {
        if (st.over || st.round !== round || st.phase === 'show') return;
        const valid = alive(st).filter(id => st.ms[id] !== undefined).sort((a, b) => st.ms[a] - st.ms[b]);
        const pts = [3, 2, 1];
        const results = [];
        valid.forEach((id, i) => { const p = pts[i] || 0; st.score[id] += p; results.push({ id, ms: st.ms[id], pts: p }); });
        alive(st).filter(id => st.early[id]).forEach(id => results.push({ id, early: true }));
        st.results = results; st.phase = 'show';
        ctx.later(3000, () => { if (round >= st.total) { st.over = true; st.msg = 'Fastest fingers win!'; } else reactStart(st, ctx, round + 1); });
        ctx.push();
    }

    // ---------- 8 & 9. RACE GAMES (Math Duel, Word Scramble Race) ----------
    function makeRace(cfg) {
        return {
            id: cfg.id, name: cfg.name, icon: cfg.icon, color: cfg.color, min: 2, max: 8, desc: cfg.desc,
            init(ctx) {
                const st = baseState(ctx, { idx: 0, total: cfg.total, phase: 'ask', prompt: '', hint: '', done: {}, order2: [], result: null });
                raceAsk(st, ctx, 0, cfg);
                return st;
            },
            act(st, pid, a, ctx) {
                if (st.over || st.phase !== 'ask' || a.t !== 'guess' || st.gone[pid] || st.done[pid]) return;
                const g = cfg.norm(a.v);
                if (!g) return;
                if (g === ctx.secret.answer) {
                    const pts = [100, 60, 30, 10][st.order2.length] || 10;
                    st.order2.push(pid); st.done[pid] = 'ok'; st.score[pid] += pts;
                } else { st.done[pid] = 'bad'; st.score[pid] = Math.max(0, st.score[pid] - cfg.penalty); }
                if (alive(st).every(id => st.done[id])) raceEnd(st, ctx, st.idx, cfg);
            },
            render(st, me) {
                const mine = st.done[me];
                const res = st.result ? `<div class="uxa-note">Answer: <b>${esc(st.result.answer)}</b> — ${st.order2.map((id, i) => chip(st, id, ['🥇', '🥈', '🥉', ''][i] || '')).join(' ') || 'nobody got it'}</div>` : '';
                const status = st.phase !== 'ask' ? '' : (mine === 'ok' ? '<div class="uxa-note ok">Correct! Waiting for the others...</div>' : mine === 'bad' ? '<div class="uxa-note bad">Wrong - you are out for this one</div>' : '');
                return `<div class="uxa-note big">${cfg.label} ${st.idx + 1} / ${st.total} ${cd(st.deadline)}</div>
                    <div class="race-prompt">${esc(st.prompt)}</div>${st.hint ? '<div class="uxa-note">Hint: ' + esc(st.hint) + '</div>' : ''}
                    <input id="race-input" class="uxa-input center" data-enter="guess" ${st.phase !== 'ask' || mine ? 'disabled' : ''} autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${cfg.ph}">
                    <div class="uxa-actions"><button class="uxa-btn primary" ${st.phase !== 'ask' || mine ? 'disabled' : ''} data-submit="race-input" data-act="guess">Submit</button></div>${status}${res}${strip(st, me)}`;
            },
            onState(st) { const i = document.getElementById('race-input'); if (i && !i.disabled && document.activeElement !== i) i.focus(); },
            drop(st, pid, ctx) { if (st.phase === 'ask' && alive(st).length && alive(st).every(id => st.done[id])) raceEnd(st, ctx, st.idx, cfg); }
        };
    }
    function raceAsk(st, ctx, idx, cfg) {
        const q = cfg.gen(ctx, idx);
        st.idx = idx; st.phase = 'ask'; st.prompt = q.prompt; st.hint = ''; st.done = {}; st.order2 = []; st.result = null;
        ctx.secret.answer = q.answer;
        st.deadline = Date.now() + cfg.time * 1000;
        if (cfg.hintAt) ctx.later(cfg.hintAt * 1000, () => { if (st.idx === idx && st.phase === 'ask') st.hint = q.answer.charAt(0).toUpperCase() + ' (' + q.answer.length + ' letters)'; });
        ctx.later(cfg.time * 1000, () => raceEnd(st, ctx, idx, cfg));
    }
    function raceEnd(st, ctx, idx, cfg) {
        if (st.over || st.phase !== 'ask' || st.idx !== idx) return;
        st.phase = 'reveal'; st.result = { answer: String(ctx.secret.answer).toUpperCase() }; st.deadline = 0;
        ctx.later(2600, () => { if (idx + 1 >= st.total) { st.over = true; st.msg = 'Race finished!'; } else raceAsk(st, ctx, idx + 1, cfg); });
        ctx.push();
    }
    GAMES.math_duel = makeRace({
        id: 'math_duel', name: 'Math Duel', icon: 'fa-calculator', color: '#4ade80', total: 8, time: 15, penalty: 10, label: 'Question', ph: 'Type the answer',
        desc: 'First correct answer scores the most. A wrong answer costs 10 points.',
        norm: v => { const n = String(v).trim(); return /^-?\d+$/.test(n) ? n : ''; },
        gen(ctx, i) {
            const lvl = i < 3 ? 1 : i < 6 ? 2 : 3; const ops = lvl === 1 ? ['+', '-'] : ['+', '-', '*'];
            const op = ops[rnd(0, ops.length - 1)]; let a = rnd(5, 10 * lvl + 20), b = rnd(2, 9 * lvl + 6);
            if (op === '-' && b > a) [a, b] = [b, a];
            if (op === '*') { a = rnd(3, 9 + lvl * 2); b = rnd(3, 12); }
            return { prompt: a + ' ' + (op === '*' ? '×' : op) + ' ' + b + ' = ?', answer: String(op === '+' ? a + b : op === '-' ? a - b : a * b) };
        }
    });
    GAMES.word_race = makeRace({
        id: 'word_race', name: 'Word Scramble Race', icon: 'fa-font', color: '#f97316', total: 6, time: 22, hintAt: 9, penalty: 15, label: 'Word', ph: 'Unscramble the word',
        desc: 'Unscramble Rotary words faster than everyone else.',
        norm: v => String(v).trim().toUpperCase().replace(/[^A-Z]/g, ''),
        gen(ctx, i) {
            if (!ctx.secret.words) ctx.secret.words = shuffle((GM().WORD_BANK || ['ROTARACT', 'SERVICE', 'LEADERSHIP', 'COMMUNITY', 'FELLOWSHIP', 'VOLUNTEER'])).slice(0, 6);
            const w = ctx.secret.words[i]; let s = w;
            for (let k = 0; k < 8 && s === w; k++) s = shuffle(w.split('')).join('');
            return { prompt: s.split('').join(' '), answer: w };
        }
    });

    // ---------- 10. NUMBER BOMB ----------
    GAMES.number_bomb = {
        id: 'number_bomb', name: 'Number Bomb', icon: 'fa-bomb', color: '#f87171', min: 2, max: 8,
        desc: 'A bomb hides between 1 and 100. Take turns guessing - hit it and you explode!',
        init(ctx) {
            ctx.secret.bomb = rnd(1, 100);
            const st = baseState(ctx, { lo: 0, hi: 101, turn: 0, log: [], boom: null });
            bombTimer(st, ctx);
            return st;
        },
        act(st, pid, a, ctx) {
            if (st.over || a.t !== 'guess' || st.order[st.turn] !== pid) return;
            const n = parseInt(a.v, 10);
            if (!(n > st.lo && n < st.hi)) return;
            bombGuess(st, ctx, pid, n);
        },
        drop(st, pid, ctx) {
            const left = alive(st);
            if (left.length === 1) { st.over = true; st.msg = 'Last player standing!'; st.rank = left.concat(st.order.filter(id => st.gone[id])); left.forEach(id => st.score[id] = 1); return; }
            if (st.order[st.turn] === pid) { st.turn = nextAlive(st, st.turn); bombTimer(st, ctx); }
        },
        render(st, me) {
            const mine = !st.over && st.order[st.turn] === me;
            const log = st.log.slice(-5).map(l => `<span>${chip(st, l.id)} → <b>${l.n}</b></span>`).join('');
            return `<div class="uxa-note big">${st.over ? esc(st.msg) : (mine ? 'Your turn!' : esc(st.names[st.order[st.turn]]) + ' is guessing...')} ${cd(st.deadline)}</div>
                <div class="bomb-range"><span>${st.lo}</span><div class="bomb-core"><i class="fa-solid fa-bomb"></i><small>${st.boom ? 'BOOM at ' + st.boom.n : 'somewhere between'}</small></div><span>${st.hi}</span></div>
                <div class="uxa-note">Pick a number from <b>${st.lo + 1}</b> to <b>${st.hi - 1}</b></div>
                <input id="bomb-input" class="uxa-input center" type="number" inputmode="numeric" data-enter="guess" ${mine ? '' : 'disabled'} min="${st.lo + 1}" max="${st.hi - 1}" placeholder="${mine ? 'Your guess' : 'Waiting...'}">
                <div class="uxa-actions"><button class="uxa-btn primary" ${mine ? '' : 'disabled'} data-submit="bomb-input" data-act="guess">Guess</button></div>
                <div class="bomb-log">${log}</div>${strip(st, me)}`;
        },
        onState(st, me) { const i = document.getElementById('bomb-input'); if (i && !i.disabled && document.activeElement !== i) i.focus(); }
    };
    function bombGuess(st, ctx, pid, n) {
        const bomb = ctx.secret.bomb;
        st.log.push({ id: pid, n });
        if (n === bomb) {
            st.boom = { id: pid, n }; st.over = true; st.msg = '💥 ' + st.names[pid] + ' hit the bomb!';
            st.order.forEach(id => { st.score[id] = id === pid ? 0 : 1; });
            st.rank = st.order.filter(id => id !== pid).concat([pid]);
            return;
        }
        if (n < bomb) st.lo = n; else st.hi = n;
        if (st.hi - st.lo === 2) { /* only the bomb remains: next player is doomed but must still guess */ }
        st.turn = nextAlive(st, st.turn); bombTimer(st, ctx);
    }
    function bombTimer(st, ctx) {
        const turn = st.turn, lo = st.lo, hi = st.hi, pid = st.order[turn];
        st.deadline = Date.now() + 20000;
        ctx.later(20000, () => {
            if (st.over || st.turn !== turn || st.lo !== lo || st.hi !== hi) return;
            bombGuess(st, ctx, pid, rnd(st.lo + 1, st.hi - 1));
        });
    }

    const ORDER = ['connect_four', 'rps_arena', 'dice_duel', 'quiz_battle', 'memory_duel', 'typing_live', 'reaction_showdown', 'math_duel', 'word_race', 'number_bomb'];

    // =====================================================================
    // SESSION / ROOM ENGINE
    // =====================================================================
    let S = null;          // active session (null = hub)
    let UI = null;         // overlay element
    let flash = '';        // banner shown on the hub (e.g. "Room closed")
    let tickTimer = null;
    const hnow = () => Date.now() + (S ? S.off || 0 : 0);

    // ---------- transport ----------
    function openTransport(code, onMsg, onMode) {
        const name = 'unity-arcade-' + code;
        const tx = { mode: 'local', ready: false, queue: [], ch: null, bc: null, client: null };
        const client = window.DB || window.DB_ADMIN;
        const useLocal = () => {
            if (tx.bc || typeof BroadcastChannel === 'undefined') { tx.ready = true; flushQ(); return; }
            tx.mode = 'local';
            tx.bc = new BroadcastChannel(name);
            tx.bc.onmessage = e => onMsg(e.data);
            tx.ready = true; flushQ(); onMode && onMode('local');
        };
        const flushQ = () => { const q = tx.queue.splice(0); q.forEach(m => tx.send(m)); };
        tx.send = (m) => {
            if (!tx.ready) { tx.queue.push(m); return; }
            m.r = code;
            try {
                if (tx.mode === 'cloud' && tx.ch) tx.ch.send({ type: 'broadcast', event: 'm', payload: m });
                else if (tx.bc) tx.bc.postMessage(m);
            } catch (e) { /* silent */ }
        };
        tx.close = () => {
            try { if (tx.ch && client) client.removeChannel(tx.ch); } catch (e) { /* silent */ }
            try { tx.bc && tx.bc.close(); } catch (e) { /* silent */ }
            tx.ready = false; tx.ch = null; tx.bc = null;
        };
        if (client && typeof client.channel === 'function') {
            try {
                tx.client = client;
                tx.ch = client.channel(name, { config: { broadcast: { self: false, ack: false } } });
                tx.ch.on('broadcast', { event: 'm' }, p => onMsg(p && p.payload));
                const fallback = setTimeout(() => { if (!tx.ready) { try { client.removeChannel(tx.ch); } catch (e) { /* silent */ } tx.ch = null; useLocal(); } }, 4500);
                tx.ch.subscribe(status => {
                    if (status === 'SUBSCRIBED') { clearTimeout(fallback); tx.mode = 'cloud'; tx.ready = true; flushQ(); onMode && onMode('cloud'); }
                    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                        if (!tx.ready) { clearTimeout(fallback); try { client.removeChannel(tx.ch); } catch (e) { /* silent */ } tx.ch = null; useLocal(); }
                    }
                });
                return tx;
            } catch (e) { tx.ch = null; }
        }
        useLocal();
        return tx;
    }

    // ---------- session lifecycle ----------
    function playerName() {
        const el = UI && UI.querySelector('#uxa-name');
        let n = (el && el.value || store.get('player_name', '') || (window.AuthManager && window.AuthManager.currentUser && (window.AuthManager.currentUser.full_name || window.AuthManager.currentUser.name)) || '').toString().trim();
        if (!n) n = 'Player' + rnd(10, 99);
        n = n.slice(0, 16);
        store.set('player_name', n);
        return n;
    }
    function newSession(code, isHost) {
        const id = uid();
        S = {
            code, isHost, status: isHost ? 'ready' : 'joining', me: { id, name: playerName() }, hostId: isHost ? id : null,
            players: [], gameId: null, phase: 'lobby', state: null, results: null, off: 0, tx: null,
            lastHost: Date.now(), lastSeen: {}, timers: [], secret: {}, createdAt: Date.now(), closesAt: Date.now() + IDLE_MS,
            chat: [], mode: '', timerSet: [], goRecv: 0, goAt: 0, error: ''
        };
        S.tx = openTransport(code, onMsg, mode => { setTimeout(() => { if (S) { S.mode = mode; render(); } }, 0); });
        S.hb = setInterval(heartbeat, 2000);
        S.ping = setInterval(() => { if (S && !S.isHost) S.tx.send({ t: 'ping', f: S.me.id }); }, 3000);
        return S;
    }
    function createRoom(gameId) {
        if (S) return;
        const code = genCode();
        newSession(code, true);
        S.players = [{ id: S.me.id, name: S.me.name, ready: true }];
        S.gameId = GAMES[gameId] ? gameId : ORDER[0];
        S.hostId = S.me.id;
        render();
    }
    function joinRoom(code) {
        code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (code.length !== 5) { flash = 'Enter the 5-character room code.'; render(); return; }
        if (S) return;
        newSession(code, false);
        let tries = 0;
        const send = () => { if (S && S.status === 'joining') S.tx.send({ t: 'join', f: S.me.id, name: S.me.name }); };
        send();
        S.joinTimer = setInterval(() => {
            if (!S || S.status !== 'joining') return;
            if (++tries >= 4) { const c = S.code; teardown('Room ' + c + ' was not found - it may be closed.'); return; }
            send();
        }, 1300);
        render();
    }
    function teardown(msg) {
        if (!S) return;
        clearInterval(S.hb); clearInterval(S.ping); clearInterval(S.joinTimer);
        S.timers.forEach(clearTimeout);
        try { S.tx.close(); } catch (e) { /* silent */ }
        S = null; flash = msg || '';
        render();
    }
    function closeRoom(reason) {
        if (!S || !S.isHost) return;
        S.tx.send({ t: 'closed', f: S.me.id, reason: (reason && reason !== 'You closed the room.') ? reason : 'The host closed the room.' });
        const msg = reason || 'You closed the room.';
        setTimeout(() => {}, 0);
        teardown(msg);
    }
    function leaveRoom() {
        if (!S) return;
        if (S.isHost) { closeRoom('You closed the room.'); return; }
        S.tx.send({ t: 'leave', f: S.me.id });
        teardown('You left the room.');
    }
    function touch() { if (S && S.isHost) S.closesAt = Date.now() + IDLE_MS; }

    function heartbeat() {
        if (!S) return;
        const now = Date.now();
        if (S.isHost) {
            if (now > S.closesAt) { closeRoom('Room closed after 15 minutes of inactivity.'); return; }
            if (now - S.createdAt > MAX_LIFE_MS) { closeRoom('Room closed - 2 hour limit reached.'); return; }
            S.players.filter(p => p.id !== S.me.id && now - (S.lastSeen[p.id] || now) > PLAYER_TIMEOUT).forEach(p => removePlayer(p.id, 'timed out'));
            broadcastRoom();
        } else if (S.status === 'in' && now - S.lastHost > HOST_TIMEOUT) {
            teardown('Room closed - the host went offline.');
        }
    }

    // ---------- messages ----------
    function roomPayload() {
        return { t: 'room', f: S.me.id, players: S.players, gameId: S.gameId, phase: S.phase, hostId: S.hostId, closesAt: S.closesAt, results: S.results, now: Date.now() };
    }
    function broadcastRoom() { if (S && S.isHost) { S.tx.send(roomPayload()); render(); } }
    function pushState() {
        if (!S || !S.isHost || !S.state) return;
        S.state._now = Date.now();
        S.tx.send({ t: 'state', f: S.me.id, s: S.state, now: Date.now() });
        const G = GAMES[S.gameId]; if (G && G.onState) G.onState(S.state, S.me.id);
        render();
    }
    function onMsg(m) {
        if (!S || !m || m.r !== S.code || m.f === S.me.id) return;
        if (m.to && m.to !== S.me.id) return;
        if (S.isHost) hostHandle(m); else clientHandle(m);
    }

    function hostHandle(m) {
        S.lastSeen[m.f] = Date.now();
        switch (m.t) {
            case 'join': {
                const ex = S.players.find(p => p.id === m.f);
                if (ex) { broadcastRoom(); return; }
                if (S.phase === 'playing') { S.tx.send({ t: 'denied', f: S.me.id, to: m.f, reason: 'A game is already in progress.' }); return; }
                if (S.players.length >= 8) { S.tx.send({ t: 'denied', f: S.me.id, to: m.f, reason: 'This room is full (8 players).' }); return; }
                let name = String(m.name || 'Player').slice(0, 16), n = 2;
                while (S.players.some(p => p.name === name)) name = String(m.name || 'Player').slice(0, 13) + ' ' + (n++);
                S.players.push({ id: m.f, name, ready: false });
                touch(); sysChat(name + ' joined'); broadcastRoom();
                if (S.phase === 'results' && S.state) pushState();
                break;
            }
            case 'ping': break;
            case 'leave': removePlayer(m.f, 'left'); break;
            case 'ready': { const p = S.players.find(x => x.id === m.f); if (p) { p.ready = !!m.v; touch(); broadcastRoom(); } break; }
            case 'act': hostAct(m.f, m.a); break;
            case 'chat': addChat(m.f, String(m.text || '').slice(0, 200)); break;
        }
    }
    function clientHandle(m) {
        switch (m.t) {
            case 'room': {
                S.lastHost = Date.now(); S.hostId = m.hostId;
                S.players = m.players; S.gameId = m.gameId; S.phase = m.phase; S.closesAt = m.closesAt; S.results = m.results;
                S.off = (m.now || Date.now()) - Date.now();
                const inRoom = S.players.some(p => p.id === S.me.id);
                if (S.status === 'joining' && inRoom) { S.status = 'in'; clearInterval(S.joinTimer); flash = ''; }
                else if (S.status === 'in' && !inRoom) { teardown('You were removed from the room.'); return; }
                if (S.phase === 'lobby') S.state = null;
                render();
                break;
            }
            case 'state': {
                S.lastHost = Date.now(); S.state = m.s; S.off = (m.now || Date.now()) - Date.now();
                const G = GAMES[S.gameId]; if (G && G.onState) G.onState(S.state, S.me.id);
                render();
                break;
            }
            case 'chat': pushChat(m); render(); break;
            case 'denied': teardown(m.reason || 'Could not join the room.'); break;
            case 'closed': teardown(m.reason || 'The host closed the room.'); break;
        }
    }
    function removePlayer(id, why) {
        const p = S.players.find(x => x.id === id); if (!p) return;
        S.players = S.players.filter(x => x.id !== id);
        sysChat(p.name + ' ' + why);
        if (S.phase === 'playing' && S.state) {
            S.state.gone[id] = true;
            const G = GAMES[S.gameId];
            if (alive(S.state).length < G.min) { S.state.over = true; S.state.msg = S.state.msg || 'Not enough players left.'; }
            else if (G.drop) G.drop(S.state, id, makeCtx());
            afterChange();
        }
        S.tx.send({ t: 'kick', f: S.me.id, to: id });
        broadcastRoom();
    }
    function kick(id) { if (S && S.isHost && id !== S.me.id) { const p = S.players.find(x => x.id === id); S.tx.send({ t: 'denied', f: S.me.id, to: id, reason: 'The host removed you from the room.' }); removePlayer(id, 'was removed'); } }

    // ---------- chat ----------
    function pushChat(m) { S.chat.push({ n: m.n, text: m.text, c: m.c, sys: !!m.sys }); if (S.chat.length > 60) S.chat.shift(); }
    function sysChat(text) { const m = { t: 'chat', f: S.me.id, n: '', text, sys: true }; pushChat(m); S.tx.send(m); }
    function addChat(fromId, text) {
        if (!text.trim()) return;
        const p = S.players.find(x => x.id === fromId); if (!p) return;
        const m = { t: 'chat', f: S.me.id, n: p.name, text, c: COLORS[S.players.indexOf(p) % COLORS.length] };
        pushChat(m); S.tx.send(m); touch(); render();
    }
    function sendChat(text) {
        text = String(text || '').trim().slice(0, 200); if (!text || !S) return;
        if (S.isHost) addChat(S.me.id, text); else S.tx.send({ t: 'chat', f: S.me.id, text });
    }

    // ---------- game flow (host) ----------
    function makeCtx() {
        const players = S.state ? S.state.order.map(id => ({ id, name: S.state.names[id] })) : S.players.map(p => ({ id: p.id, name: p.name }));
        return {
            players, secret: S.secret,
            later(ms, fn) { const t = setTimeout(() => { if (!S || S.phase !== 'playing') return; try { fn(); } catch (e) { console.error('[Arcade]', e); } afterChange(); }, ms); S.timers.push(t); return t; },
            push() { /* state is pushed after the current step */ }
        };
    }
    function startGame() {
        if (!S || !S.isHost) return;
        const G = GAMES[S.gameId];
        const n = S.players.length;
        if (n < G.min) { flashRoom('Need at least ' + G.min + ' players for ' + G.name + '.'); return; }
        if (n > G.max) { flashRoom(G.name + ' supports up to ' + G.max + ' players - remove some or pick another game.'); return; }
        if (S.players.some(p => !p.ready)) { flashRoom('Waiting for everyone to press Ready.'); return; }
        S.timers.forEach(clearTimeout); S.timers = []; S.secret = {}; S.results = null;
        S.phase = 'playing';
        const ctx = { players: S.players.map(p => ({ id: p.id, name: p.name })), secret: S.secret };
        const real = makeCtxFor(ctx.players);
        S.state = G.init(real);
        touch(); sysChat('Game started: ' + G.name);
        S.tx.send(roomPayload());
        afterChange();
    }
    function makeCtxFor(players) {
        const c = makeCtx(); c.players = players; return c;
    }
    function hostAct(pid, a) {
        if (!S || S.phase !== 'playing' || !S.state || !a) return;
        const G = GAMES[S.gameId];
        try { G.act(S.state, pid, a, makeCtx()); } catch (e) { console.error('[Arcade] act failed', e); }
        touch(); afterChange();
    }
    function afterChange() {
        if (!S || !S.isHost || !S.state) return;
        if (S.state.over && S.phase === 'playing') finishGame(); else pushState();
    }
    function finishGame() {
        S.timers.forEach(clearTimeout); S.timers = [];
        const st = S.state;
        const rankIds = st.rank ? st.rank.slice() : st.order.slice().sort((a, b) => (st.score[b] || 0) - (st.score[a] || 0));
        const rank = rankIds.map(id => ({ id, name: st.names[id], score: st.score[id] || 0, gone: !!st.gone[id] }));
        const top = rank.length ? rank[0].score : 0;
        const noWinner = !st.rank && top <= 0;
        const winners = noWinner ? [] : (st.rank ? [rank[0].id] : rank.filter(r => r.score === top && !r.gone).map(r => r.id));
        S.results = { rank, winners, msg: st.msg || '' };
        S.phase = 'results';
        winners.forEach(id => { if (id === S.me.id) { const w = store.get('arcade_wins', {}); w[S.gameId] = (w[S.gameId] || 0) + 1; store.set('arcade_wins', w); } });
        S.tx.send(roomPayload());
        pushState();
        touch();
    }
    function again() { if (S && S.isHost && S.phase === 'results') { S.players.forEach(p => { if (p.id !== S.me.id) p.ready = true; }); startGame(); } }
    function toLobby() {
        if (!S || !S.isHost) return;
        S.timers.forEach(clearTimeout); S.timers = [];
        S.phase = 'lobby'; S.state = null; S.results = null; S.players.forEach(p => { p.ready = p.id === S.me.id; });
        broadcastRoom();
    }
    function selectGame(id) { if (S && S.isHost && S.phase === 'lobby' && GAMES[id]) { S.gameId = id; S.players.forEach(p => { p.ready = p.id === S.me.id; }); touch(); broadcastRoom(); } }
    function flashRoom(msg) { if (!S) return; S.error = msg; render(); clearTimeout(S.errT); S.errT = setTimeout(() => { if (S) { S.error = ''; render(); } }, 3500); }
    function toggleReady() { if (!S || S.isHost) return; const me = S.players.find(p => p.id === S.me.id); const v = !(me && me.ready); S.tx.send({ t: 'ready', f: S.me.id, v }); if (me) me.ready = v; render(); }
    function sendAct(a) {
        if (!S || S.phase !== 'playing') return;
        if (S.isHost) hostAct(S.me.id, a); else S.tx.send({ t: 'act', f: S.me.id, a });
    }

    // =====================================================================
    // UI
    // =====================================================================
    const SOLO = () => GM().GAMES || {};

    // ---------- themes ----------
    const THEMES = {
        aurora:   { n: 'Aurora',   a: '#1a73e8', b: '#7c3aed', c: '#06b6d4' },
        sunset:   { n: 'Sunset',   a: '#f97316', b: '#e11d48', c: '#facc15' },
        forest:   { n: 'Forest',   a: '#16a34a', b: '#0d9488', c: '#84cc16' },
        ocean:    { n: 'Ocean',    a: '#0ea5e9', b: '#2563eb', c: '#22d3ee' },
        neon:     { n: 'Neon',     a: '#d946ef', b: '#22d3ee', c: '#a3e635' },
        rose:     { n: 'Rose',     a: '#ec4899', b: '#8b5cf6', c: '#fb7185' },
        graphite: { n: 'Graphite', a: '#94a3b8', b: '#475569', c: '#e2e8f0' },
        light:    { n: 'Frost',    a: '#2563eb', b: '#7c3aed', c: '#06b6d4', light: true }
    };
    let themeId = store.get('arcade_theme', 'auto');
    let themeOpen = false;
    function resolveTheme() {
        if (themeId === 'auto') return document.documentElement.classList.contains('dark') ? 'aurora' : 'light';
        return THEMES[themeId] ? themeId : 'aurora';
    }
    function applyTheme() { if (UI) UI.setAttribute('data-theme', resolveTheme()); }
    function setTheme(id) { return;
        themeId = (id === 'auto' || THEMES[id]) ? id : 'auto';
        store.set('arcade_theme', themeId);
        themeOpen = false;
        applyTheme(); render();
    }

    function ensureUI() {
        if (UI && document.body.contains(UI)) return UI;
        injectCSS();
        UI = document.createElement('div');
        UI.id = 'ux-arcade';
        UI.setAttribute('role', 'dialog');
        UI.setAttribute('aria-label', 'Unity Arcade');
        UI.innerHTML = '<div class="uxa-shell"><div class="uxa-head"></div><div class="uxa-main"></div><div class="uxa-chat"></div></div>';
        document.body.appendChild(UI);
        applyTheme();
        try { new MutationObserver(() => { applyTheme(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); } catch (e) { /* optional */ }
        UI.addEventListener('click', onClick);
        UI.addEventListener('keydown', onKey);
        UI.addEventListener('input', onInput);
        tickTimer = setInterval(tick, 250);
        return UI;
    }
    function tick() {
        if (!UI) return;
        UI.querySelectorAll('[data-cd]').forEach(el => {
            const left = Math.max(0, Math.ceil((Number(el.getAttribute('data-cd')) - hnow()) / 1000));
            el.textContent = left + 's';
            el.classList.toggle('hot', left <= 3);
        });
        const idle = UI.querySelector('[data-idle]');
        if (idle && S) { const l = Math.max(0, Math.round((S.closesAt - Date.now()) / 1000)); idle.textContent = Math.floor(l / 60) + ':' + String(l % 60).padStart(2, '0'); }
    }
    function openArcade(opts) {
        opts = opts || {};
        ensureUI(); UI.classList.add('open'); document.body.classList.add('uxa-lock');
        render();
        if (opts.code) setTimeout(() => joinRoom(opts.code), 50);
        else if (opts.game && GAMES[opts.game]) setTimeout(() => createRoom(opts.game), 50);
    }
    function closeArcade(force) {
        if (S && !force && !confirm(S.isHost ? 'Leaving will close the room for everyone. Continue?' : 'Leave this room?')) return;
        if (S) leaveRoom();
        if (UI) UI.classList.remove('open');
        document.body.classList.remove('uxa-lock');
        flash = '';
        if (/games\.html$/i.test(location.pathname)) { location.href = 'index.html#games'; }
    }

    // ---------- events ----------
    function onClick(e) {
        const t = e.target.closest('[data-a],[data-react],[data-submit],[data-ux]');
        if (!t || t.disabled) return;
        if (t.hasAttribute('data-a')) { try { sendAct(JSON.parse(t.getAttribute('data-a'))); } catch (er) { /* silent */ } return; }
        if (t.hasAttribute('data-react')) {
            const st = S && S.state; if (!st) return;
            if (st.phase === 'go') sendAct({ t: 'tap', ms: Math.round(performance.now() - (S.goAt || performance.now())) });
            else if (st.phase === 'wait') sendAct({ t: 'tap' });
            return;
        }
        if (t.hasAttribute('data-submit')) {
            const i = UI.querySelector('#' + t.getAttribute('data-submit'));
            if (i && i.value !== '') { sendAct({ t: t.getAttribute('data-act'), v: i.value }); i.value = ''; }
            return;
        }
        const [cmd, arg] = t.getAttribute('data-ux').split(':');
        switch (cmd) {
            case 'create': createRoom(arg); break;
            case 'join': joinRoom((UI.querySelector('#uxa-code') || {}).value); break;
            case 'solo': closeArcade(true); if (GM().launchGame) GM().launchGame(arg); break;
            case 'close': closeArcade(); break;
            case 'leave': closeArcade(); break;
            case 'closeroom': if (confirm('Close this room for everyone?')) closeRoom('You closed the room.'); break;
            case 'select': selectGame(arg); break;
            case 'ready': toggleReady(); break;
            case 'start': startGame(); break;
            case 'again': again(); break;
            case 'lobby': toLobby(); break;
            case 'kick': kick(arg); break;
            case 'copy': copyCode(); break;
            case 'link': copyLink(); break;
            case 'chat': { const i = UI.querySelector('#uxa-chat-in'); if (i) { sendChat(i.value); i.value = ''; i.focus(); } break; }
            case 'togglechat': UI.classList.toggle('chat-open'); break;
        }
    }
    function copyCode() { if (!S) return; try { navigator.clipboard.writeText(S.code); flashRoom('Room code copied'); } catch (e) { flashRoom('Code: ' + S.code); } }
    function copyLink() {
        if (!S) return;
        const base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'games.html?room=' + S.code;
        try { navigator.clipboard.writeText(base); flashRoom('Invite link copied'); } catch (e) { flashRoom(base); }
    }
    function onKey(e) {
        const t = e.target;
        if (e.key === 'Enter' && t.id === 'uxa-chat-in') { sendChat(t.value); t.value = ''; return; }
        if (e.key === 'Enter' && t.id === 'uxa-code') { joinRoom(t.value); return; }
        if (e.key === 'Enter' && t.hasAttribute && t.hasAttribute('data-enter')) {
            if (t.value !== '') { sendAct({ t: t.getAttribute('data-enter'), v: t.value }); t.value = ''; }
        }
    }
    let liveT = 0;
    function onInput(e) {
        const t = e.target;
        if (t.id === 'uxa-code') { t.value = t.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); return; }
        if (t.hasAttribute && t.hasAttribute('data-live')) {
            const now = Date.now(), v = t.value, act = t.getAttribute('data-live');
            clearTimeout(t._lt);
            if (now - liveT > 110) { liveT = now; sendAct({ t: act, v }); }
            else t._lt = setTimeout(() => { liveT = Date.now(); sendAct({ t: act, v: t.value }); }, 120);
        }
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI && UI.classList.contains('open') && !/games\.html$/i.test(location.pathname)) closeArcade(); });
    window.addEventListener('pagehide', () => { if (S) { try { if (S.isHost) S.tx.send({ t: 'closed', f: S.me.id, reason: 'The host left the page.' }); else S.tx.send({ t: 'leave', f: S.me.id }); } catch (e) { /* silent */ } } });

    // ---------- views ----------
    function render() {
        if (!UI) return;
        const head = UI.querySelector('.uxa-head'), main = UI.querySelector('.uxa-main'), chat = UI.querySelector('.uxa-chat');
        // keep typing state across re-renders
        const ae = document.activeElement;
        const keep = ae && UI.contains(ae) && ae.id ? { id: ae.id, v: ae.value, s: ae.selectionStart, e: ae.selectionEnd } : null;
        const keepScroll = main.scrollTop;

        head.innerHTML = viewHead();
        if (!S) main.innerHTML = viewHub();
        else if (S.status === 'joining') main.innerHTML = `<div class="uxa-center"><div class="uxa-spin"></div><h3>Joining room ${esc(S.code)}...</h3><p>Looking for the host</p><button class="uxa-btn" data-ux="leave">Cancel</button></div>`;
        else if (S.phase === 'lobby') main.innerHTML = viewLobby();
        else if (S.phase === 'playing') main.innerHTML = viewGame();
        else main.innerHTML = viewResults();
        chat.innerHTML = viewChat();
        const cl = chat.querySelector('#uxa-chat-log'); if (cl) cl.scrollTop = cl.scrollHeight;
        main.scrollTop = keepScroll;

        if (keep) {
            const el = UI.querySelector('#' + keep.id);
            if (el && !el.disabled) { if (el.type !== 'number' || keep.v !== '') el.value = keep.v; el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (er) { /* number inputs */ } }
        }
        tick();
    }
    function viewHead() {
        if (!S) return `<div class="uxa-logo"><i class="fa-solid fa-gamepad"></i><div><b>Unity Arcade</b><small>Multiplayer rooms &bull; 10 live games</small></div></div><button class="uxa-x" data-ux="close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>`;
        const G = GAMES[S.gameId] || {};
        return `<div class="uxa-logo"><i class="fa-solid ${G.icon || 'fa-gamepad'}" style="color:${G.color || '#60a5fa'}"></i><div><b>${esc(G.name || 'Room')}</b><small>${S.status === 'joining' ? 'Joining...' : S.players.length + ' player' + (S.players.length === 1 ? '' : 's') + (S.mode === 'local' ? ' &bull; local mode' : '')}</small></div></div>
            <div class="uxa-roominfo"><button class="uxa-code" data-ux="copy" title="Copy room code">${esc(S.code)} <i class="fa-regular fa-copy"></i></button>
            <span class="uxa-idle" title="Room auto-closes when idle"><i class="fa-regular fa-clock"></i> <span data-idle>--</span></span></div>
            <div class="uxa-headbtns"><button class="uxa-btn ghost" data-ux="togglechat"><i class="fa-regular fa-comments"></i></button>
            ${S.isHost ? '<button class="uxa-btn danger" data-ux="closeroom"><i class="fa-solid fa-lock"></i> Close room</button>' : '<button class="uxa-btn ghost" data-ux="leave"><i class="fa-solid fa-right-from-bracket"></i> Leave</button>'}</div>`;
    }
    function viewHub() {
        const wins = store.get('arcade_wins', {});
        const mp = ORDER.map(id => { const g = GAMES[id]; return `<button class="uxa-game" style="--c:${g.color}" data-ux="create:${id}"><i class="fa-solid ${g.icon}"></i><b>${esc(g.name)}</b><small>${g.min}-${g.max} players</small><p>${esc(g.desc)}</p>${wins[id] ? '<em>🏆 ' + wins[id] + '</em>' : ''}</button>`; }).join('');
        const solo = Object.keys(SOLO()).map(k => { const g = SOLO()[k]; return `<button class="uxa-solo" style="--c:${g.color}" data-ux="solo:${k}"><i class="fa-solid ${g.icon}"></i><span>${esc(g.name)}</span></button>`; }).join('');
        return `${flash ? `<div class="uxa-banner">${esc(flash)}</div>` : ''}
            <div class="uxa-panel row">
                <label class="uxa-field"><span>Your name</span><input id="uxa-name" class="uxa-input" maxlength="16" value="${esc(store.get('player_name', ''))}" placeholder="Enter a nickname"></label>
                <label class="uxa-field"><span>Have a room code?</span><div class="uxa-join"><input id="uxa-code" class="uxa-input code" maxlength="5" placeholder="ABCDE" autocomplete="off"><button class="uxa-btn primary" data-ux="join">Join</button></div></label>
            </div>
            <h4 class="uxa-h">Start a multiplayer room <small>pick a game - you become the host</small></h4>
            <div class="uxa-games">${mp}</div>
            <h4 class="uxa-h">Solo games <small>play alone, no room needed</small></h4>
            <div class="uxa-solos">${solo}</div>`;
    }
    function viewLobby() {
        const G = GAMES[S.gameId] || GAMES[ORDER[0]];
        const rows = S.players.map((p, i) => `<div class="uxa-prow" style="--c:${COLORS[i % COLORS.length]}"><i class="uxa-av">${esc(p.name.charAt(0).toUpperCase())}</i><b>${esc(p.name)}${p.id === S.me.id ? ' <em>(you)</em>' : ''}</b>
            ${p.id === S.hostId ? '<span class="uxa-tag host"><i class="fa-solid fa-crown"></i> Host</span>' : `<span class="uxa-tag ${p.ready ? 'ok' : ''}">${p.ready ? 'Ready' : 'Not ready'}</span>`}
            ${S.isHost && p.id !== S.me.id ? `<button class="uxa-mini" data-ux="kick:${p.id}" title="Remove"><i class="fa-solid fa-user-xmark"></i></button>` : ''}</div>`).join('');
        const picker = S.isHost ? `<h4 class="uxa-h">Choose the game</h4><div class="uxa-pick">${ORDER.map(id => { const g = GAMES[id]; return `<button class="uxa-chipbtn ${id === S.gameId ? 'on' : ''}" style="--c:${g.color}" data-ux="select:${id}"><i class="fa-solid ${g.icon}"></i>${esc(g.name)}</button>`; }).join('')}</div>` : '';
        const me = S.players.find(p => p.id === S.me.id) || {};
        const action = S.isHost
            ? `<button class="uxa-btn primary big" data-ux="start"><i class="fa-solid fa-play"></i> Start game</button><button class="uxa-btn ghost" data-ux="link"><i class="fa-solid fa-link"></i> Copy invite link</button>`
            : `<button class="uxa-btn ${me.ready ? '' : 'primary'} big" data-ux="ready">${me.ready ? '<i class="fa-solid fa-check"></i> Ready - tap to undo' : 'I am ready'}</button>`;
        return `${S.error ? `<div class="uxa-banner">${esc(S.error)}</div>` : ''}
            <div class="uxa-lobby"><div class="uxa-panel"><h3 style="color:${G.color}"><i class="fa-solid ${G.icon}"></i> ${esc(G.name)}</h3><p>${esc(G.desc)}</p><p class="uxa-sub">${G.min}-${G.max} players &bull; share code <b>${esc(S.code)}</b> with friends</p>${picker}</div>
            <div class="uxa-panel"><h4 class="uxa-h">Players (${S.players.length})</h4><div class="uxa-plist">${rows}</div><div class="uxa-actions">${action}</div></div></div>`;
    }
    function viewGame() {
        const G = GAMES[S.gameId] || GAMES[ORDER[0]];
        if (!S.state) return '<div class="uxa-center"><div class="uxa-spin"></div><h3>Loading game...</h3></div>';
        const spectator = !S.state.order.includes(S.me.id);
        return `<div class="uxa-arena" style="--gc:${G.color}">${spectator ? '<div class="uxa-note">You are watching this round</div>' : ''}${G.render(S.state, S.me.id)}</div>`;
    }
    function viewResults() {
        const R = S.results || { rank: [], winners: [], msg: '' };
        const G = GAMES[S.gameId] || GAMES[ORDER[0]];
        const medals = ['🥇', '🥈', '🥉'];
        const rows = R.rank.map((r, i) => `<div class="uxa-res ${R.winners.includes(r.id) ? 'win' : ''}" style="--c:${COLORS[Math.max(0, (S.state && S.state.order.indexOf(r.id)) || 0) % COLORS.length]}"><span class="pos">${medals[i] || i + 1}</span><b>${esc(r.name)}${r.id === S.me.id ? ' <em>(you)</em>' : ''}</b><span class="sc">${r.score} pts</span></div>`).join('');
        const title = R.winners.length ? (R.winners.length > 1 ? 'It is a tie!' : esc((R.rank.find(r => r.id === R.winners[0]) || {}).name) + ' wins!') : 'Draw';
        const act = S.isHost
            ? `<button class="uxa-btn primary big" data-ux="again"><i class="fa-solid fa-rotate-right"></i> Play again</button><button class="uxa-btn" data-ux="lobby"><i class="fa-solid fa-gamepad"></i> Change game</button><button class="uxa-btn danger" data-ux="closeroom"><i class="fa-solid fa-lock"></i> Close room</button>`
            : `<div class="uxa-note">Waiting for the host to choose what is next...</div><button class="uxa-btn ghost" data-ux="leave">Leave room</button>`;
        return `<div class="uxa-results"><div class="uxa-trophy"><i class="fa-solid fa-trophy"></i></div><h2>${title}</h2><p class="uxa-sub">${esc(G.name)}${R.msg ? ' - ' + esc(R.msg) : ''}</p><div class="uxa-reslist">${rows}</div><div class="uxa-actions">${act}</div></div>`;
    }
    function viewChat() {
        if (!S || S.status === 'joining') return '';
        const log = S.chat.slice(-30).map(c => c.sys ? `<div class="sys">${esc(c.text)}</div>` : `<div><b style="color:${c.c || '#93c5fd'}">${esc(c.n)}:</b> ${esc(c.text)}</div>`).join('');
        return `<div class="uxa-chatlog" id="uxa-chat-log">${log || '<div class="sys">Say hi to your room 👋</div>'}</div><div class="uxa-chatrow"><input id="uxa-chat-in" class="uxa-input" maxlength="200" placeholder="Message the room..." autocomplete="off"><button class="uxa-btn primary" data-ux="chat"><i class="fa-solid fa-paper-plane"></i></button></div>`;
    }

    // ---------- theme CSS (generated per theme) ----------
    function themeCSS() {
        const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(',');
        let css = `
.uxa-head{z-index:3}
`;
        Object.keys(THEMES).forEach(id => {
            const t = THEMES[id], T = '#ux-arcade[data-theme="' + id + '"]';
            css += `${T}{background:radial-gradient(60rem 40rem at 15% 0%,rgba(${rgb(t.a)},${t.light ? .35 : .45}),transparent 60%),radial-gradient(50rem 40rem at 100% 100%,rgba(${rgb(t.b)},${t.light ? .3 : .45}),transparent 60%),${t.light ? 'rgba(226,236,252,.8)' : 'rgba(4,9,24,.82)'}}
${T} .uxa-orb.a{background:${t.a}}${T} .uxa-orb.b{background:${t.b}}${T} .uxa-orb.c{background:${t.c}}
${T} .uxa-btn.primary{background:linear-gradient(180deg,rgba(255,255,255,.3),transparent 55%),linear-gradient(135deg,${t.a},${t.b})}
${T} .uxa-logo>i,${T} .uxa-spin{color:${t.a}}${T} .uxa-spin{border-top-color:${t.a}}
${T} .uxa-input:focus{border-color:${t.a};box-shadow:0 0 0 4px rgba(${rgb(t.a)},.25)}
`;
        });
        const L = '#ux-arcade[data-theme="light"]';
        css += `
${L}{color:#0f172a}
${L} .uxa-shell{background:linear-gradient(145deg,rgba(255,255,255,.78),rgba(255,255,255,.46) 55%,rgba(255,255,255,.62));border-color:rgba(255,255,255,.95);box-shadow:0 1px 0 #fff inset,0 40px 90px -30px rgba(30,41,90,.35),0 0 0 1px rgba(37,99,235,.12)}
${L} .uxa-shell::before{background:linear-gradient(180deg,rgba(255,255,255,.6),transparent 24%)}
${L} .uxa-head,${L} .uxa-chat{border-color:rgba(15,23,42,.1)}${L} .uxa-chat{background:rgba(255,255,255,.4)}
${L} .uxa-panel,${L} .uxa-prow,${L} .uxa-res,${L} .dice-row,${L} .quiz-q,${L} .quiz-opt,${L} .tr-text,${L} .race-prompt,${L} .uxa-pill,${L} .uxa-solo,${L} .uxa-chipbtn,${L} .uxa-x,${L} .uxa-code,${L} .uxa-input,${L} .mem-card,${L} .rps-btn,${L} .uxa-banner{background:rgba(255,255,255,.62);border-color:rgba(15,23,42,.14);color:#0f172a;box-shadow:0 1px 0 #fff inset,0 8px 20px -14px rgba(30,41,90,.4)}
${L} .uxa-btn:not(.primary):not(.danger){background:rgba(255,255,255,.7);border-color:rgba(15,23,42,.16);color:#0f172a}
${L} .uxa-panel p,${L} .uxa-sub,${L} .uxa-logo small,${L} .uxa-idle,${L} .uxa-field>span,${L} .uxa-h small,${L} .uxa-game small,${L} .uxa-game p,${L} .uxa-center p,${L} .uxa-note,${L} .dice-pair small,${L} .uxa-tag{color:#475569}
${L} .uxa-game{color:#0f172a;background:linear-gradient(150deg,rgba(255,255,255,.8),rgba(255,255,255,.45));border-color:rgba(15,23,42,.12)}
${L} .uxa-note.big,${L} .uxa-logo b,${L} .uxa-h,${L} .uxa-panel h3{color:#0f172a}
${L} .uxa-note.ok{color:#15803d}${L} .uxa-note.bad{color:#b91c1c}
${L} .uxa-input::placeholder{color:#64748b}${L} .uxa-input{background:rgba(255,255,255,.85)}
${L} .uxa-chip,${L} .uxa-pill b,${L} .uxa-res b,${L} .uxa-prow b{color:#0f172a}
`;
        return css;
    }

    const FLATCSS = `
/* ===== Site-matched flat style: same cards, borders, buttons and colours as the rest of the website ===== */
#ux-arcade#ux-arcade{--ab:#050a18;--ac:rgba(255,255,255,.04);--ad:rgba(255,255,255,.08);--at:#f1f5f9;--am:#94a3b8;--ai:rgba(255,255,255,.06);background:var(--ab);-webkit-backdrop-filter:none;backdrop-filter:none;color:var(--at)}
#ux-arcade#ux-arcade[data-theme="light"]{--ab:#f1f5fb;--ac:#ffffff;--ad:#e2e8f0;--at:#0f172a;--am:#64748b;--ai:#f8fafc}
#ux-arcade#ux-arcade .uxa-orb{display:none}
#ux-arcade#ux-arcade .uxa-shell{background:var(--ab);border:1px solid var(--ad);border-radius:24px;box-shadow:0 20px 50px -24px rgba(0,0,0,.35);-webkit-backdrop-filter:none;backdrop-filter:none}
#ux-arcade#ux-arcade .uxa-shell::before{display:none}
#ux-arcade#ux-arcade :is(.uxa-head,.uxa-chat){border-color:var(--ad);background:transparent}
#ux-arcade#ux-arcade :is(.uxa-panel,.uxa-prow,.uxa-res,.dice-row,.quiz-q,.quiz-opt,.tr-text,.race-prompt,.uxa-pill,.uxa-solo,.uxa-chipbtn,.uxa-x,.uxa-code,.uxa-input,.mem-card,.rps-btn,.uxa-game,.uxa-cd,.uxa-logo>i){background:var(--ac);border-color:var(--ad);color:var(--at);box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
#ux-arcade#ux-arcade :is(.uxa-panel,.uxa-game,.rps-btn,.mem-card,.quiz-q){border-radius:16px}
#ux-arcade#ux-arcade .uxa-input{background:var(--ai)}
#ux-arcade#ux-arcade .uxa-code{border-style:dashed}
#ux-arcade#ux-arcade :is(.uxa-panel p,.uxa-sub,.uxa-logo small,.uxa-idle,.uxa-field>span,.uxa-h small,.uxa-game small,.uxa-game p,.uxa-center p,.uxa-note,.dice-pair small,.uxa-tag,.rps-card small,.tr-rest){color:var(--am)}
#ux-arcade#ux-arcade :is(.uxa-note.big,.uxa-logo b,.uxa-h,.uxa-panel h3,.uxa-game b,.uxa-chip,.uxa-pill b,.uxa-res b,.uxa-prow b){color:var(--at)}
#ux-arcade#ux-arcade .uxa-btn{background:var(--ac);border:1px solid var(--ad);color:var(--at);box-shadow:none;border-radius:12px;transition:background .15s,border-color .15s}
#ux-arcade#ux-arcade .uxa-btn:hover:not(:disabled){transform:none;box-shadow:none;border-color:#1a73e8}
#ux-arcade#ux-arcade .uxa-btn.primary{background:linear-gradient(135deg,#1a73e8,#7c3aed);border-color:transparent;color:#fff}
#ux-arcade#ux-arcade .uxa-btn.danger{background:#dc2626;border-color:transparent;color:#fff}
#ux-arcade#ux-arcade .uxa-btn.ghost{background:transparent}
#ux-arcade#ux-arcade .uxa-game{background:var(--ac)}
#ux-arcade#ux-arcade .uxa-game:hover{transform:none;box-shadow:none;border-color:var(--c)}
#ux-arcade#ux-arcade .uxa-game>i{background:color-mix(in srgb,var(--c) 14%,transparent);border-color:transparent}
#ux-arcade#ux-arcade :is(.uxa-solo,.uxa-chipbtn):hover{background:var(--ai);border-color:#1a73e8}
#ux-arcade#ux-arcade .uxa-chipbtn.on{background:color-mix(in srgb,var(--c) 16%,transparent);border-color:var(--c)}
#ux-arcade#ux-arcade .uxa-input:focus{border-color:#1a73e8;box-shadow:0 0 0 3px rgba(26,115,232,.18)}
#ux-arcade#ux-arcade .uxa-logo>i,#ux-arcade#ux-arcade .uxa-spin{color:#1a73e8}#ux-arcade#ux-arcade .uxa-spin{border-color:var(--ad);border-top-color:#1a73e8}
#ux-arcade#ux-arcade .uxa-banner{background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.4);color:inherit;box-shadow:none}
#ux-arcade#ux-arcade .c4-board{background:#1a73e8;border:0;box-shadow:none;border-radius:18px}
#ux-arcade#ux-arcade .c4-cell{box-shadow:none;background:#0b1b3a}
#ux-arcade#ux-arcade .c4-cell.on{background:var(--c);animation:none}
#ux-arcade#ux-arcade .mem-card{background:var(--ac)}
#ux-arcade#ux-arcade .rps-btn{background:var(--ac);color:var(--at)}
#ux-arcade#ux-arcade .rx-pad{box-shadow:none;border:0;border-radius:18px}
#ux-arcade#ux-arcade .uxa-trophy{box-shadow:none;animation:none}
#ux-arcade#ux-arcade :is(.quiz-opt):hover:not(:disabled){background:var(--ai);border-color:#1a73e8}
#ux-arcade#ux-arcade .quiz-opt.ok{background:rgba(34,197,94,.16);border-color:#22c55e}
#ux-arcade#ux-arcade .quiz-opt.bad{background:rgba(239,68,68,.14);border-color:#ef4444}
#ux-arcade#ux-arcade .uxa-note.ok,#ux-arcade#ux-arcade .tr-ok{color:#16a34a}#ux-arcade#ux-arcade .uxa-note.bad{color:#dc2626}
`;

    // ---------- styles (glass) ----------
    function injectCSS() {
        if (document.getElementById('uxa-styles')) return;
        const st = document.createElement('style');
        st.id = 'uxa-styles';
        st.textContent = `
body.uxa-lock{overflow:hidden}
#ux-arcade{position:fixed;inset:0;z-index:9500;display:none;align-items:center;justify-content:center;padding:14px;color:#eaf1fb;font-family:Poppins,system-ui,sans-serif;
 background:radial-gradient(60rem 40rem at 15% 0%,rgba(26,115,232,.45),transparent 60%),radial-gradient(50rem 40rem at 100% 100%,rgba(124,58,237,.45),transparent 60%),rgba(4,9,24,.82);
 -webkit-backdrop-filter:blur(26px) saturate(170%);backdrop-filter:blur(26px) saturate(170%)}
#ux-arcade.open{display:flex}
#ux-arcade *{box-sizing:border-box}
.uxa-orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;pointer-events:none;animation:uxaFloat 18s ease-in-out infinite alternate}
.uxa-orb.a{width:340px;height:340px;background:#1a73e8;left:6%;top:10%}.uxa-orb.b{width:300px;height:300px;background:#7c3aed;right:8%;bottom:8%;animation-delay:-6s}.uxa-orb.c{width:220px;height:220px;background:#06b6d4;right:30%;top:6%;animation-delay:-11s}
@keyframes uxaFloat{to{transform:translate(40px,-30px) scale(1.15)}}
.uxa-shell{position:relative;width:min(1040px,100%);height:min(780px,100%);display:flex;flex-direction:column;border-radius:30px;overflow:hidden;
 background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.05) 55%,rgba(255,255,255,.09));border:1px solid rgba(255,255,255,.26);
 box-shadow:0 1px 0 rgba(255,255,255,.45) inset,0 -1px 0 rgba(255,255,255,.08) inset,0 40px 90px -30px rgba(0,0,0,.7),0 0 0 1px rgba(20,60,160,.2);
 -webkit-backdrop-filter:blur(34px) saturate(190%);backdrop-filter:blur(34px) saturate(190%)}
.uxa-shell::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.18),transparent 22%)}
.uxa-head{position:relative;display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.14);flex-wrap:wrap}
.uxa-logo{display:flex;align-items:center;gap:12px;margin-right:auto}.uxa-logo>i{font-size:22px;color:#60a5fa;width:44px;height:44px;display:grid;place-items:center;border-radius:14px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22)}
.uxa-logo b{display:block;font-size:15px;font-weight:800}.uxa-logo small{font-size:10px;color:#9db1cf;font-weight:600}
.uxa-x{width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;cursor:pointer}.uxa-x:hover{background:rgba(255,255,255,.18)}
.uxa-roominfo{display:flex;align-items:center;gap:10px}.uxa-code{font:800 15px/1 ui-monospace,monospace;letter-spacing:.18em;padding:10px 14px;border-radius:12px;border:1px dashed rgba(255,255,255,.4);background:rgba(255,255,255,.08);color:#fff;cursor:pointer}
.uxa-idle{font-size:10px;color:#9db1cf;font-weight:700}
.uxa-headbtns{display:flex;gap:8px}
.uxa-main{position:relative;flex:1;overflow:auto;padding:18px;scrollbar-width:thin}
.uxa-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;border-radius:14px;border:1px solid rgba(255,255,255,.28);background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.06));color:#fff;font:700 12px Poppins,sans-serif;cursor:pointer;transition:transform .15s,box-shadow .2s,background .2s}
.uxa-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 24px -10px rgba(0,0,0,.6)}.uxa-btn:disabled{opacity:.45;cursor:not-allowed}
.uxa-btn.primary{background:linear-gradient(180deg,rgba(255,255,255,.3),transparent 55%),linear-gradient(135deg,#1a73e8,#7c3aed);border-color:rgba(255,255,255,.45);box-shadow:0 12px 26px -10px rgba(76,70,235,.8)}
.uxa-btn.danger{background:linear-gradient(180deg,rgba(255,255,255,.22),transparent 55%),linear-gradient(135deg,#ef4444,#be123c);border-color:rgba(255,255,255,.35)}
.uxa-btn.ghost{background:rgba(255,255,255,.06)}.uxa-btn.big{padding:14px 26px;font-size:13px}
.uxa-input{width:100%;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.26);background:rgba(255,255,255,.1);color:#fff;font:600 13px Poppins,sans-serif;outline:none}
.uxa-input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px rgba(96,165,250,.22)}.uxa-input::placeholder{color:#8aa0c4}.uxa-input.code{font-family:ui-monospace,monospace;letter-spacing:.3em;text-align:center;text-transform:uppercase}.uxa-input.center{text-align:center;font-size:18px}
.uxa-panel{padding:16px;border-radius:22px;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.2);box-shadow:0 1px 0 rgba(255,255,255,.3) inset;margin-bottom:14px}
.uxa-panel.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.uxa-panel h3{margin:0 0 6px;font-size:18px;font-weight:800}.uxa-panel p{margin:0 0 6px;font-size:12px;color:#c3d1ea}.uxa-sub{font-size:11px;color:#9db1cf}
.uxa-field{display:block}.uxa-field>span{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#9db1cf;margin-bottom:6px}.uxa-join{display:flex;gap:8px}
.uxa-h{margin:18px 2px 10px;font-size:13px;font-weight:800;display:flex;align-items:baseline;gap:10px}.uxa-h small{font-size:10px;color:#9db1cf;font-weight:600}
.uxa-games{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
.uxa-game{position:relative;text-align:left;padding:16px;border-radius:22px;cursor:pointer;color:#fff;border:1px solid rgba(255,255,255,.22);background:linear-gradient(150deg,color-mix(in srgb,var(--c) 28%,transparent),rgba(255,255,255,.05) 60%);box-shadow:0 1px 0 rgba(255,255,255,.3) inset;transition:transform .25s,box-shadow .25s}
.uxa-game:hover{transform:translateY(-4px);box-shadow:0 20px 40px -18px var(--c),0 1px 0 rgba(255,255,255,.4) inset}
.uxa-game>i{font-size:22px;color:var(--c);width:44px;height:44px;display:grid;place-items:center;border-radius:14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);margin-bottom:10px}
.uxa-game b{display:block;font-size:13px;font-weight:800}.uxa-game small{display:block;font-size:10px;color:#b4c4e2;font-weight:700;margin:2px 0 6px}.uxa-game p{font-size:10.5px;color:#c3d1ea;margin:0;line-height:1.45}.uxa-game em{position:absolute;right:12px;top:12px;font-style:normal;font-size:10px;font-weight:800}
.uxa-solos{display:flex;flex-wrap:wrap;gap:8px}.uxa-solo{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#fff;font:700 11px Poppins,sans-serif;cursor:pointer}.uxa-solo i{color:var(--c)}.uxa-solo:hover{background:rgba(255,255,255,.16)}
.uxa-banner{margin-bottom:14px;padding:12px 16px;border-radius:16px;font-size:12px;font-weight:700;background:linear-gradient(135deg,rgba(250,204,21,.22),rgba(251,146,60,.14));border:1px solid rgba(250,204,21,.4);color:#fde68a}
.uxa-center{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:320px;text-align:center}.uxa-center p{color:#9db1cf;font-size:12px;margin:0}
.uxa-spin{width:42px;height:42px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#60a5fa;animation:uxaSpin .8s linear infinite}@keyframes uxaSpin{to{transform:rotate(360deg)}}
.uxa-lobby{display:grid;grid-template-columns:1.1fr 1fr;gap:14px;align-items:start}
.uxa-pick{display:flex;flex-wrap:wrap;gap:8px}.uxa-chipbtn{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#fff;font:700 11px Poppins,sans-serif;cursor:pointer}.uxa-chipbtn i{color:var(--c)}.uxa-chipbtn.on{background:color-mix(in srgb,var(--c) 30%,transparent);border-color:var(--c)}
.uxa-plist{display:flex;flex-direction:column;gap:8px}.uxa-prow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}
.uxa-av{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;font:800 13px Poppins;font-style:normal;background:var(--c);color:#06122b}.uxa-prow b{flex:1;font-size:12.5px}.uxa-prow em{font-style:normal;color:#9db1cf;font-weight:600;font-size:10px}
.uxa-tag{font-size:9.5px;font-weight:800;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.1);color:#b4c4e2}.uxa-tag.ok{background:rgba(74,222,128,.2);color:#86efac}.uxa-tag.host{background:rgba(250,204,21,.2);color:#fde68a}
.uxa-mini{width:30px;height:30px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(239,68,68,.2);color:#fecaca;cursor:pointer}
.uxa-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:14px 0 4px}
.uxa-arena{max-width:760px;margin:0 auto}
.uxa-note{text-align:center;font-size:12px;font-weight:700;color:#c3d1ea;margin:8px 0}.uxa-note.big{font-size:15px;font-weight:800;color:#fff}.uxa-note.ok{color:#86efac}.uxa-note.bad{color:#fca5a5}
.uxa-cd{display:inline-block;min-width:44px;margin-left:8px;padding:3px 10px;border-radius:999px;font-size:12px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25)}.uxa-cd.hot{background:rgba(239,68,68,.3);color:#fecaca}
.uxa-strip{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px}.uxa-pill{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-left:4px solid var(--c);font-size:11px}.uxa-pill b{font-weight:700}.uxa-pill span{font-weight:800;color:var(--c)}.uxa-pill.me{background:rgba(255,255,255,.16)}.uxa-pill.gone{opacity:.4;text-decoration:line-through}
.uxa-chip{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;background:color-mix(in srgb,var(--c) 26%,transparent);border:1px solid var(--c)}
.uxa-legend{display:flex;gap:16px;justify-content:center;font-size:11px;margin-top:10px}.uxa-legend span{display:flex;align-items:center;gap:6px}
.c4-board{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:12px;border-radius:24px;background:linear-gradient(160deg,rgba(26,115,232,.45),rgba(30,58,138,.55));border:1px solid rgba(255,255,255,.3);box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 24px 50px -24px rgba(0,0,0,.7);max-width:520px;margin:10px auto}
.c4-col{display:flex;flex-direction:column;gap:6px;padding:4px;border-radius:14px;border:0;background:transparent;cursor:pointer}.c4-col:hover:not(:disabled){background:rgba(255,255,255,.12)}.c4-col:disabled{cursor:default}
.c4-cell{display:block;aspect-ratio:1;border-radius:50%;background:rgba(3,10,30,.65);box-shadow:inset 0 3px 8px rgba(0,0,0,.6)}.c4-cell.on{background:radial-gradient(circle at 35% 30%,#fff8,var(--c) 40%,color-mix(in srgb,var(--c) 70%,#000));animation:c4drop .35s cubic-bezier(.3,1.4,.5,1)}.c4-cell.win{box-shadow:0 0 0 3px #fff,0 0 22px var(--c)}
@keyframes c4drop{from{transform:translateY(-120px);opacity:.3}}.c4-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--c)}
.rps-pick,.rps-reveal{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:16px 0}.rps-btn{width:150px;padding:20px 10px;border-radius:24px;border:1px solid rgba(255,255,255,.28);background:linear-gradient(150deg,rgba(192,132,252,.3),rgba(255,255,255,.05));color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;font:800 13px Poppins}.rps-btn i{font-size:34px}.rps-btn:hover:not(:disabled){transform:translateY(-4px) scale(1.03)}.rps-btn:disabled{opacity:.45}
.rps-card{min-width:104px;padding:14px 12px;border-radius:20px;text-align:center;background:color-mix(in srgb,var(--c) 22%,transparent);border:1px solid var(--c);animation:uxaPop .4s}.rps-card i{font-size:30px;display:block;margin-bottom:6px}.rps-card b{display:block;font-size:11px}.rps-card small{font-size:10px;color:#c3d1ea}.rps-card em{color:#86efac;font-style:normal;font-weight:800}
@keyframes uxaPop{from{transform:scale(.6);opacity:0}}
.dice-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;margin:8px 0;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-left:5px solid var(--c);font-size:12px;font-weight:700}.dice-row.win{background:rgba(250,204,21,.16);border-color:#facc15}
.dice-pair{display:flex;align-items:center;gap:10px}.dice-pair em{font-style:normal;font-weight:800;color:#fde68a;margin-left:6px}.dice-pair small{color:#9db1cf}
.die{position:relative;width:38px;height:38px;border-radius:10px;background:linear-gradient(145deg,#fff,#cbd5e1);box-shadow:0 4px 10px rgba(0,0,0,.4);display:inline-grid;grid-template:repeat(3,1fr)/repeat(3,1fr);padding:6px;animation:uxaPop .35s}.die b{display:block;width:7px;height:7px;border-radius:50%;background:#0b1b3a;place-self:center}
.die.d1 b{grid-area:2/2}.die.d2 b:nth-child(1){grid-area:1/1}.die.d2 b:nth-child(2){grid-area:3/3}.die.d3 b:nth-child(1){grid-area:1/1}.die.d3 b:nth-child(2){grid-area:2/2}.die.d3 b:nth-child(3){grid-area:3/3}
.die.d4 b:nth-child(1){grid-area:1/1}.die.d4 b:nth-child(2){grid-area:1/3}.die.d4 b:nth-child(3){grid-area:3/1}.die.d4 b:nth-child(4){grid-area:3/3}
.die.d5 b:nth-child(1){grid-area:1/1}.die.d5 b:nth-child(2){grid-area:1/3}.die.d5 b:nth-child(3){grid-area:2/2}.die.d5 b:nth-child(4){grid-area:3/1}.die.d5 b:nth-child(5){grid-area:3/3}
.die.d6 b:nth-child(1){grid-area:1/1}.die.d6 b:nth-child(2){grid-area:2/1}.die.d6 b:nth-child(3){grid-area:3/1}.die.d6 b:nth-child(4){grid-area:1/3}.die.d6 b:nth-child(5){grid-area:2/3}.die.d6 b:nth-child(6){grid-area:3/3}
.quiz-q{margin:12px 0;padding:18px;border-radius:20px;text-align:center;font-size:16px;font-weight:800;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2)}
.quiz-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.quiz-opt{display:flex;align-items:center;gap:10px;text-align:left;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font:700 12.5px Poppins;cursor:pointer}.quiz-opt b{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:rgba(255,255,255,.15);flex:none}
.quiz-opt:hover:not(:disabled){background:rgba(255,255,255,.18)}.quiz-opt.ok{background:rgba(74,222,128,.28);border-color:#4ade80}.quiz-opt.bad{background:rgba(239,68,68,.28);border-color:#f87171}.quiz-opt.sel{border-color:#60a5fa;background:rgba(96,165,250,.25)}.quiz-opt:disabled{cursor:default}
.mem-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:420px;margin:12px auto}.mem-card{aspect-ratio:1;border-radius:18px;border:1px solid rgba(255,255,255,.28);background:linear-gradient(150deg,rgba(34,211,238,.35),rgba(255,255,255,.06));color:#fff;font-size:28px;cursor:pointer;transition:transform .3s}.mem-card span{display:block}.mem-card.up{background:rgba(255,255,255,.92);transform:rotateY(0)}.mem-card.done{background:color-mix(in srgb,var(--c) 40%,#fff);box-shadow:0 0 18px var(--c)}.mem-card:disabled{cursor:default}.mem-card:hover:not(:disabled){transform:scale(1.06)}
.tr-text{padding:16px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);font:600 16px/1.7 ui-monospace,monospace;margin:10px 0}.tr-ok{color:#86efac}.tr-cur{background:rgba(96,165,250,.5);border-radius:3px;color:#fff}.tr-rest{color:#b4c4e2}
.tr-bars{margin-top:14px;display:flex;flex-direction:column;gap:8px}.tr-bar{display:grid;grid-template-columns:140px 1fr 44px;align-items:center;gap:10px;font-size:11px;font-weight:700}.tr-bar i{display:block;height:10px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}.tr-bar u{display:block;height:100%;background:var(--c);border-radius:99px;transition:width .25s}.tr-bar em{font-style:normal;color:#b4c4e2;text-align:right}
.rx-pad{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:100%;height:230px;margin:14px 0;border-radius:30px;border:1px solid rgba(255,255,255,.3);color:#fff;cursor:pointer;font-family:Poppins;box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 24px 50px -24px rgba(0,0,0,.7);transition:background .1s}
.rx-pad strong{font-size:34px;font-weight:900;letter-spacing:.04em}.rx-pad small{font-size:12px;opacity:.85}.rx-pad.wait{background:linear-gradient(145deg,rgba(239,68,68,.65),rgba(127,29,29,.6))}.rx-pad.go{background:linear-gradient(145deg,rgba(34,197,94,.85),rgba(21,128,61,.8));animation:uxaPop .15s}.rx-pad.early{background:linear-gradient(145deg,rgba(234,179,8,.7),rgba(120,53,15,.6))}.rx-pad.show{background:rgba(255,255,255,.1)}.rx-pad:disabled{cursor:default}
.rx-res{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.race-prompt{margin:14px 0;padding:22px;border-radius:22px;text-align:center;font:900 34px Poppins;letter-spacing:.12em;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22)}
.bomb-range{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0;font:900 28px Poppins}.bomb-core{flex:1;text-align:center;padding:16px;border-radius:24px;background:radial-gradient(circle,rgba(248,113,113,.35),rgba(255,255,255,.05));border:1px solid rgba(248,113,113,.5)}.bomb-core i{font-size:42px;color:#f87171;display:block;animation:uxaShake 1s infinite}.bomb-core small{font-size:10px;color:#fecaca;font-weight:700}
@keyframes uxaShake{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg) scale(1.08)}}
.bomb-log{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px;font-size:11px}
.uxa-results{text-align:center;max-width:520px;margin:0 auto}.uxa-trophy{width:84px;height:84px;margin:6px auto 12px;border-radius:50%;display:grid;place-items:center;font-size:38px;color:#fff;background:linear-gradient(135deg,#facc15,#f97316);box-shadow:0 20px 40px -12px rgba(249,115,22,.7);animation:uxaPop .5s}.uxa-results h2{margin:0;font-size:24px;font-weight:900}
.uxa-reslist{margin:16px 0;display:flex;flex-direction:column;gap:8px}.uxa-res{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-left:5px solid var(--c);text-align:left}.uxa-res.win{background:rgba(250,204,21,.16);border-color:#facc15}.uxa-res .pos{font-size:20px;min-width:30px}.uxa-res b{flex:1;font-size:13px}.uxa-res em{font-style:normal;color:#9db1cf;font-size:10px}.uxa-res .sc{font-weight:800;color:#fde68a}
.uxa-chat{display:none;border-top:1px solid rgba(255,255,255,.14);padding:10px 14px;background:rgba(0,0,0,.18)}.chat-open .uxa-chat{display:block}.uxa-chatlog{max-height:120px;overflow:auto;font-size:11.5px;display:flex;flex-direction:column;gap:3px;margin-bottom:8px}.uxa-chatlog .sys{color:#9db1cf;font-style:italic}.uxa-chatrow{display:flex;gap:8px}
@media (max-width:720px){#ux-arcade{padding:0}.uxa-shell{border-radius:0;height:100%}.uxa-panel.row,.uxa-lobby{grid-template-columns:1fr}.quiz-grid{grid-template-columns:1fr}.tr-bar{grid-template-columns:90px 1fr 38px}.race-prompt{font-size:24px}.rx-pad{height:190px}.uxa-head{padding:10px 12px}.uxa-main{padding:12px}}
@media (prefers-reduced-motion:reduce){#ux-arcade *{animation:none!important;transition:none!important}}
`+themeCSS()+FLATCSS;
        document.head.appendChild(st);
    }

    // ---------- public API ----------
    function bootArcade() {
        const gm = window.GamesModule;
        if (gm) {
            gm.openArcade = openArcade;
            gm.closeArcade = closeArcade;
            gm.ARCADE_GAMES = GAMES;
            gm.ARCADE_ORDER = ORDER;
        }
        window.UnityArcade = { open: openArcade, close: closeArcade, games: GAMES, order: ORDER };
        // any element with data-arcade="open" (or ="game_id") opens the arcade
        document.addEventListener('click', e => {
            const t = e.target.closest && e.target.closest('[data-arcade]');
            if (!t) return;
            e.preventDefault();
            const v = t.getAttribute('data-arcade');
            openArcade(GAMES[v] ? { game: v } : {});
        });
        const q = new URLSearchParams(location.search);
        const room = (q.get('room') || '').toUpperCase();
        if (room.length === 5) openArcade({ code: room });
        else if (/games\.html$/i.test(location.pathname) || q.has('arcade')) openArcade();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootArcade); else bootArcade();
})();
