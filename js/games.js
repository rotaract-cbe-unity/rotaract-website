/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - GAMES MODULE
   12+ Games | Multiplayer via Supabase Realtime
   ============================================================ */

const Games = {
    initialized: false,
    currentGame: null,
    currentUser: null,

    // Multiplayer state
    multiplayer: {
        room: null,
        role: null,
        subscription: null,
        chatSubscription: null,
        playerName: null
    },

    gamesList: [
        { id: 'tictactoe', name: 'Tic Tac Toe', description: 'Classic 3x3 grid. Play vs AI or friend online!', icon: 'grid', difficulty: 'easy', bg: 'tictactoe', multiplayer: true },
        { id: 'snake', name: 'Snake Game', description: 'Guide the snake to eat food.', icon: 'zap', difficulty: 'medium', bg: 'snake', multiplayer: false },
        { id: 'memory', name: 'Memory Match', description: 'Flip cards and find matching pairs.', icon: 'copy', difficulty: 'easy', bg: 'memory', multiplayer: true },
        { id: 'quiz', name: 'Rotaract Quiz', description: 'Test your Rotary knowledge.', icon: 'help-circle', difficulty: 'medium', bg: 'quiz', multiplayer: true },
        { id: 'wordle', name: 'Word Guess', description: 'Guess the 5-letter word.', icon: 'type', difficulty: 'hard', bg: 'wordle', multiplayer: false },
        { id: '2048', name: '2048', description: 'Combine tiles to reach 2048!', icon: 'square', difficulty: 'medium', bg: '2048', multiplayer: false },
        { id: 'reaction', name: 'Reaction Time', description: 'Test your reflexes.', icon: 'clock', difficulty: 'easy', bg: 'reaction', multiplayer: true },
        { id: 'math', name: 'Math Challenge', description: 'Solve math problems fast.', icon: 'plus-circle', difficulty: 'medium', bg: 'math', multiplayer: true },
        { id: 'typing', name: 'Typing Speed', description: 'Test your WPM speed.', icon: 'edit-3', difficulty: 'medium', bg: 'typing', multiplayer: true },
        { id: 'rockpaperscissors', name: 'Rock Paper Scissors', description: 'Classic hand game vs AI.', icon: 'hash', difficulty: 'easy', bg: 'reaction', multiplayer: true },
        { id: 'guessnumber', name: 'Number Guess', description: 'Guess number between 1-100.', icon: 'target', difficulty: 'easy', bg: 'math', multiplayer: false },
        { id: 'colormatch', name: 'Color Match', description: 'Match color words to colors.', icon: 'droplet', difficulty: 'medium', bg: 'memory', multiplayer: false }
    ],

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.loadCurrentUser();
        this.render();
        this.bindEvents();
        this.loadLeaderboard();
        this.checkUrlForRoom();
    },

    loadCurrentUser() {
        try {
            const session = localStorage.getItem('rotaract_unity_session');
            if (session) this.currentUser = JSON.parse(session);
        } catch (err) { /* silent */ }
    },

    checkUrlForRoom() {
        const params = new URLSearchParams(window.location.search);
        const roomCode = params.get('room');
        if (roomCode) {
            setTimeout(() => this.showJoinRoomModal(roomCode), 1000);
        }
    },

    // ============================================================
    // RENDER MAIN GAMES PAGE
    // ============================================================
    render() {
        const container = document.getElementById('gamesContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="games-container">
                <a href="index.html" class="games-back-link">
                    <i data-feather="arrow-left"></i>Back to Home
                </a>

                <div class="games-header">
                    <div class="games-header-icon"><i data-feather="play"></i></div>
                    <h1>Games Zone</h1>
                    <p>Play solo or challenge friends in real-time multiplayer!</p>
                </div>

                <div class="games-stats-bar">
                    <div class="games-stat-item">
                        <i data-feather="grid"></i>
                        <div><div class="stat-num">${this.gamesList.length}</div><div class="stat-label">Games</div></div>
                    </div>
                    <div class="games-stat-item">
                        <i data-feather="users"></i>
                        <div><div class="stat-num">${this.gamesList.filter(g => g.multiplayer).length}</div><div class="stat-label">Multiplayer</div></div>
                    </div>
                    <div class="games-stat-item">
                        <i data-feather="award"></i>
                        <div><div class="stat-num" id="totalPlays">0</div><div class="stat-label">Total Plays</div></div>
                    </div>
                </div>

                <!-- MULTIPLAYER ACTIONS -->
                <div class="multiplayer-actions" style="display:flex;gap:1rem;justify-content:center;margin-bottom:2rem;flex-wrap:wrap;">
                    <button class="btn btn-primary btn-lg" onclick="Games.showCreateRoomModal()">
                        <i data-feather="plus-circle"></i>Create Multiplayer Room
                    </button>
                    <button class="btn btn-outline btn-lg" onclick="Games.showJoinRoomModal()">
                        <i data-feather="log-in"></i>Join Room with Code
                    </button>
                </div>

                <div class="games-filter">
                    <button class="game-filter-btn active" data-filter="all">
                        <i data-feather="grid"></i>All Games
                    </button>
                    <button class="game-filter-btn" data-filter="multiplayer">
                        <i data-feather="users"></i>Multiplayer
                    </button>
                    <button class="game-filter-btn" data-filter="easy">
                        <i data-feather="smile"></i>Easy
                    </button>
                    <button class="game-filter-btn" data-filter="medium">
                        <i data-feather="meh"></i>Medium
                    </button>
                    <button class="game-filter-btn" data-filter="hard">
                        <i data-feather="frown"></i>Hard
                    </button>
                </div>

                <div class="games-grid" id="gamesGrid"></div>

                <div class="leaderboard-section">
                    <div class="leaderboard-header">
                        <h2><i data-feather="award" style="width:24px;height:24px;vertical-align:middle;margin-right:0.5rem;"></i>Top Scores</h2>
                    </div>
                    <div class="leaderboard-table-wrap">
                        <table class="leaderboard-table">
                            <thead><tr><th>Rank</th><th>Player</th><th>Game</th><th>Score</th></tr></thead>
                            <tbody id="leaderboardBody"><tr><td colspan="4" style="text-align:center;padding:2rem;">Loading...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.renderGamesList();
        if (typeof feather !== 'undefined') feather.replace();
    },

    renderGamesList(filter = 'all') {
        const grid = document.getElementById('gamesGrid');
        if (!grid) return;

        let filtered = this.gamesList;
        if (filter === 'multiplayer') filtered = this.gamesList.filter(g => g.multiplayer);
        else if (filter !== 'all') filtered = this.gamesList.filter(g => g.difficulty === filter);

        grid.innerHTML = filtered.map(game => `
            <div class="game-card" onclick="Games.startGame('${game.id}')">
                <div class="game-card-visual">
                    <div class="game-card-bg game-bg-${game.bg}"></div>
                    <div class="game-card-icon"><i data-feather="${game.icon}"></i></div>
                    <span class="game-card-difficulty difficulty-${game.difficulty}">${game.difficulty}</span>
                    ${game.multiplayer ? '<span style="position:absolute;top:0.75rem;left:0.75rem;padding:0.2rem 0.65rem;border-radius:12px;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:rgba(16,185,129,0.85);color:white;backdrop-filter:blur(8px);z-index:3;">MP</span>' : ''}
                </div>
                <div class="game-card-body">
                    <div class="game-card-title">${game.name}</div>
                    <div class="game-card-desc">${game.description}</div>
                    <div class="game-card-footer">
                        <div class="game-card-score">
                            <i data-feather="star"></i>
                            <span>Best: <span id="best-${game.id}">0</span></span>
                        </div>
                        <div class="game-card-play">Play <i data-feather="arrow-right"></i></div>
                    </div>
                </div>
            </div>
        `).join('');

        if (typeof feather !== 'undefined') feather.replace();
        this.loadBestScores();
    },

    bindEvents() {
        document.querySelectorAll('.game-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.game-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderGamesList(btn.dataset.filter);
            });
        });
    },

    // ============================================================
    // MULTIPLAYER: CREATE ROOM
    // ============================================================
    showCreateRoomModal() {
        const modal = this.createModal('createRoomModal', 'Create Multiplayer Room', `
            <form id="createRoomForm">
                <div class="form-group">
                    <label>Your Name</label>
                    <input type="text" id="hostName" required placeholder="Enter your name" value="${this.currentUser?.full_name || ''}">
                </div>
                <div class="form-group">
                    <label>Select Game</label>
                    <select id="gameType" required>
                        ${this.gamesList.filter(g => g.multiplayer).map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                    </select>
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i data-feather="plus-circle"></i>Create Room
                </button>
            </form>
        `);

        const form = document.getElementById('createRoomForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('hostName').value.trim();
            const gameType = document.getElementById('gameType').value;
            this.createRoom(name, gameType);
        });
    },

    showJoinRoomModal(prefilledCode = '') {
        const modal = this.createModal('joinRoomModal', 'Join Multiplayer Room', `
            <form id="joinRoomForm">
                <div class="form-group">
                    <label>Your Name</label>
                    <input type="text" id="guestName" required placeholder="Enter your name" value="${this.currentUser?.full_name || ''}">
                </div>
                <div class="form-group">
                    <label>Room Code</label>
                    <input type="text" id="roomCode" required placeholder="6-character code" maxlength="6" style="text-transform:uppercase;letter-spacing:8px;text-align:center;font-size:1.5rem;font-weight:700;" value="${prefilledCode}">
                </div>
                <button type="submit" class="btn btn-primary btn-block">
                    <i data-feather="log-in"></i>Join Room
                </button>
            </form>
        `);

        const form = document.getElementById('joinRoomForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('guestName').value.trim();
            const code = document.getElementById('roomCode').value.trim().toUpperCase();
            this.joinRoom(code, name);
        });
    },

    async createRoom(hostName, gameType) {
        try {
            // Generate room code
            const { data: codeData } = await supabaseAdmin.rpc('generate_room_code');
            const roomCode = codeData || Math.random().toString(36).substring(2, 8).toUpperCase();

            const initialGameState = this.getInitialGameState(gameType);

            const { data, error } = await supabaseAdmin.from('game_rooms').insert({
                room_code: roomCode,
                game_type: gameType,
                host_user_id: this.currentUser?.id || null,
                host_name: hostName,
                status: 'waiting',
                current_turn: 'host',
                game_state: initialGameState
            }).select().single();

            if (error) throw error;

            this.multiplayer.room = data;
            this.multiplayer.role = 'host';
            this.multiplayer.playerName = hostName;

            this.closeModal('createRoomModal');
            this.showWaitingRoom(data);
            this.subscribeToRoom(data.id);
        } catch (err) {
            console.error(err);
            if (typeof App !== 'undefined') App.toast('Failed to create room: ' + err.message, 'error');
        }
    },

    async joinRoom(roomCode, guestName) {
        try {
            const { data: room, error } = await supabaseAdmin
                .from('game_rooms')
                .select('*')
                .eq('room_code', roomCode)
                .single();

            if (error || !room) {
                if (typeof App !== 'undefined') App.toast('Room not found', 'error');
                return;
            }

            if (room.status !== 'waiting') {
                if (typeof App !== 'undefined') App.toast('Room is already full or finished', 'error');
                return;
            }

            const { data: updated } = await supabaseAdmin.from('game_rooms').update({
                guest_user_id: this.currentUser?.id || null,
                guest_name: guestName,
                status: 'playing',
                updated_at: new Date().toISOString()
            }).eq('id', room.id).select().single();

            this.multiplayer.room = updated;
            this.multiplayer.role = 'guest';
            this.multiplayer.playerName = guestName;

            this.closeModal('joinRoomModal');
            this.startMultiplayerGame(updated);
            this.subscribeToRoom(updated.id);
        } catch (err) {
            console.error(err);
            if (typeof App !== 'undefined') App.toast('Failed to join: ' + err.message, 'error');
        }
    },

    showWaitingRoom(room) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${room.room_code}`;
        const gameName = this.gamesList.find(g => g.id === room.game_type)?.name || room.game_type;

        this.openGameModal({ id: 'waiting', name: 'Waiting for Player', icon: 'clock' });
        const body = document.getElementById('gamePlayBody');

        body.innerHTML = `
            <div style="text-align:center;padding:2rem;">
                <div style="width:80px;height:80px;background:linear-gradient(135deg,#1a56db,#06b6d4);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;animation:pulse 2s infinite;">
                    <i data-feather="clock" style="width:40px;height:40px;color:white;"></i>
                </div>

                <h2 style="margin-bottom:0.5rem;">Waiting for Opponent...</h2>
                <p style="color:var(--text-muted);margin-bottom:2rem;">Share this code with your friend</p>

                <div style="background:linear-gradient(135deg,#1a56db,#06b6d4);color:white;padding:2rem;border-radius:16px;margin-bottom:2rem;">
                    <p style="margin-bottom:0.5rem;font-size:0.9rem;opacity:0.9;">Room Code</p>
                    <div style="font-size:3rem;font-weight:900;letter-spacing:10px;">${room.room_code}</div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <p style="color:var(--text-muted);margin-bottom:0.5rem;font-size:0.85rem;">Or share this link:</p>
                    <div style="display:flex;gap:0.5rem;max-width:500px;margin:0 auto;">
                        <input type="text" value="${shareUrl}" readonly id="shareUrl" style="flex:1;padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-glass);font-size:0.85rem;">
                        <button onclick="Games.copyShareUrl()" class="btn btn-primary btn-sm">
                            <i data-feather="copy"></i>Copy
                        </button>
                    </div>
                </div>

                <div style="padding:1rem;background:rgba(26,86,219,0.08);border-radius:12px;">
                    <p style="font-size:0.9rem;color:var(--text-primary);">
                        <strong>Game:</strong> ${gameName}<br>
                        <strong>Host:</strong> ${room.host_name}
                    </p>
                </div>
            </div>
        `;

        if (typeof feather !== 'undefined') feather.replace();
    },

    copyShareUrl() {
        const input = document.getElementById('shareUrl');
        if (input) {
            input.select();
            navigator.clipboard.writeText(input.value).then(() => {
                if (typeof App !== 'undefined') App.toast('Link copied!', 'success');
            });
        }
    },

    subscribeToRoom(roomId) {
        // Unsubscribe existing
        if (this.multiplayer.subscription) {
            this.multiplayer.subscription.unsubscribe();
        }

        // Subscribe to room updates
        this.multiplayer.subscription = supabaseClient
            .channel(`room:${roomId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_rooms',
                filter: `id=eq.${roomId}`
            }, (payload) => {
                this.handleRoomUpdate(payload.new);
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'game_moves',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                this.handleMove(payload.new);
            })
            .subscribe();
    },

    handleRoomUpdate(room) {
        this.multiplayer.room = room;

        // If waiting and now has guest, start game
        if (this.multiplayer.role === 'host' && room.status === 'playing' && room.guest_name) {
            if (typeof App !== 'undefined') App.toast(`${room.guest_name} joined!`, 'success');
            setTimeout(() => this.startMultiplayerGame(room), 500);
        }

        // Handle game state changes
        if (room.status === 'playing' && this.currentGame && this.multiplayer.room) {
            this.updateMultiplayerUI(room);
        }

        // Handle game finished
        if (room.status === 'finished' && room.winner) {
            this.handleGameEnd(room);
        }
    },

    handleMove(move) {
        // Only apply moves from opponent
        if (move.player_role !== this.multiplayer.role) {
            this.applyOpponentMove(move.move_data);
        }
    },

    // ============================================================
    // MULTIPLAYER GAME LAUNCHER
    // ============================================================
    startMultiplayerGame(room) {
        const game = this.gamesList.find(g => g.id === room.game_type);
        if (!game) return;

        this.currentGame = game.id;
        this.openGameModal(game);
        this.loadMultiplayerGame(game.id, room);
    },

    loadMultiplayerGame(gameId, room) {
        switch (gameId) {
            case 'tictactoe': this.initMPTicTacToe(room); break;
            case 'memory': this.initMPMemory(room); break;
            case 'quiz': this.initMPQuiz(room); break;
            case 'reaction': this.initMPReaction(room); break;
            case 'math': this.initMPMath(room); break;
            case 'typing': this.initMPTyping(room); break;
            case 'rockpaperscissors': this.initMPRPS(room); break;
            default: this.loadGame(gameId);
        }
    },

    // ============================================================
    // MULTIPLAYER TIC TAC TOE
    // ============================================================
    getInitialGameState(gameType) {
        const states = {
            tictactoe: { board: Array(9).fill(''), current: 'host' },
            memory: { cards: [], flipped: [], matched: {host:[], guest:[]}, currentPlayer: 'host', scores: {host:0, guest:0} },
            quiz: { currentQuestion: 0, scores: {host:0, guest:0}, answered: {host:false, guest:false} },
            reaction: { started: false, hostTime: null, guestTime: null },
            math: { problem: '', answer: 0, scores: {host:0, guest:0}, timeLeft: 60 },
            typing: { sentence: '', hostProgress: 0, guestProgress: 0, hostWPM: 0, guestWPM: 0 },
            rockpaperscissors: { hostChoice: null, guestChoice: null, scores: {host:0, guest:0}, round: 1 }
        };
        return states[gameType] || {};
    },

    async initMPTicTacToe(room) {
        const body = document.getElementById('gamePlayBody');
        const gs = room.game_state;
        const isMyTurn = gs.current === this.multiplayer.role;
        const opponentName = this.multiplayer.role === 'host' ? room.guest_name : room.host_name;
        const mySymbol = this.multiplayer.role === 'host' ? 'X' : 'O';
        const opponentSymbol = this.multiplayer.role === 'host' ? 'O' : 'X';

        body.innerHTML = `
            <div style="text-align:center;">
                <div style="display:flex;justify-content:space-around;margin-bottom:1.5rem;padding:1rem;background:var(--bg-glass);border-radius:12px;">
                    <div>
                        <div style="font-size:1.5rem;font-weight:800;color:${isMyTurn ? 'var(--success)' : 'var(--text-muted)'};">You (${mySymbol})</div>
                        <div style="font-size:0.85rem;color:var(--text-muted);">${this.multiplayer.playerName}</div>
                    </div>
                    <div style="font-size:1.5rem;color:var(--text-muted);">VS</div>
                    <div>
                        <div style="font-size:1.5rem;font-weight:800;color:${!isMyTurn ? 'var(--success)' : 'var(--text-muted)'};">${opponentName} (${opponentSymbol})</div>
                        <div style="font-size:0.85rem;color:var(--text-muted);">Opponent</div>
                    </div>
                </div>
                <div id="mpStatus" style="margin-bottom:1rem;font-weight:600;font-size:1.1rem;color:${isMyTurn ? 'var(--success)' : 'var(--warning)'};">
                    ${isMyTurn ? '🎯 Your Turn!' : `⏳ Waiting for ${opponentName}...`}
                </div>
                <div id="mpTTTBoard" style="display:grid;grid-template-columns:repeat(3,90px);gap:8px;justify-content:center;margin:0 auto;"></div>
                <p style="margin-top:1rem;color:var(--text-muted);font-size:0.85rem;">Room Code: <strong>${room.room_code}</strong></p>
            </div>
        `;

        this.renderMPTTTBoard(gs.board, isMyTurn);
    },

    renderMPTTTBoard(board, isMyTurn) {
        const boardEl = document.getElementById('mpTTTBoard');
        if (!boardEl) return;

        boardEl.innerHTML = board.map((cell, i) => `
            <div onclick="Games.mpTTTClick(${i})" style="width:90px;height:90px;background:var(--bg-glass);border:2px solid var(--border-color);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:800;cursor:${isMyTurn && cell === '' ? 'pointer' : 'not-allowed'};transition:all 0.2s;color:${cell === 'X' ? 'var(--primary)' : 'var(--danger)'};opacity:${isMyTurn ? 1 : 0.7};">${cell}</div>
        `).join('');
    },

    async mpTTTClick(index) {
        const gs = this.multiplayer.room.game_state;
        if (gs.current !== this.multiplayer.role || gs.board[index] !== '') return;

        const symbol = this.multiplayer.role === 'host' ? 'X' : 'O';
        gs.board[index] = symbol;
        gs.current = this.multiplayer.role === 'host' ? 'guest' : 'host';

        // Check win
        const winner = this.checkMPTTTWin(gs.board);
        let winnerRole = null;
        if (winner) {
            winnerRole = winner === 'X' ? 'host' : 'guest';
        } else if (gs.board.every(c => c !== '')) {
            winnerRole = 'draw';
        }

        const updateData = {
            game_state: gs,
            current_turn: gs.current,
            updated_at: new Date().toISOString()
        };

        if (winnerRole) {
            updateData.status = 'finished';
            updateData.winner = winnerRole;
        }

        await supabaseAdmin.from('game_rooms').update(updateData).eq('id', this.multiplayer.room.id);

        // Log move
        await supabaseAdmin.from('game_moves').insert({
            room_id: this.multiplayer.room.id,
            player_role: this.multiplayer.role,
            move_data: { position: index, symbol }
        });
    },

    checkMPTTTWin(board) {
        const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (const [a,b,c] of wins) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        return null;
    },

    updateMultiplayerUI(room) {
        if (this.currentGame === 'tictactoe') {
            const isMyTurn = room.game_state.current === this.multiplayer.role;
            const opponentName = this.multiplayer.role === 'host' ? room.guest_name : room.host_name;

            const statusEl = document.getElementById('mpStatus');
            if (statusEl) {
                statusEl.textContent = isMyTurn ? '🎯 Your Turn!' : `⏳ Waiting for ${opponentName}...`;
                statusEl.style.color = isMyTurn ? 'var(--success)' : 'var(--warning)';
            }

            this.renderMPTTTBoard(room.game_state.board, isMyTurn);
        } else if (this.currentGame === 'rockpaperscissors') {
            this.renderMPRPS(room);
        } else if (this.currentGame === 'reaction') {
            this.renderMPReaction(room);
        }
    },

    applyOpponentMove(moveData) {
        // Handled by handleRoomUpdate already
    },

    // ============================================================
    // MULTIPLAYER ROCK PAPER SCISSORS
    // ============================================================
    async initMPRPS(room) {
        const gs = room.game_state;
        const opponentName = this.multiplayer.role === 'host' ? room.guest_name : room.host_name;
        const myScore = this.multiplayer.role === 'host' ? gs.scores.host : gs.scores.guest;
        const opScore = this.multiplayer.role === 'host' ? gs.scores.guest : gs.scores.host;
        const myChoice = this.multiplayer.role === 'host' ? gs.hostChoice : gs.guestChoice;
        const opChoice = this.multiplayer.role === 'host' ? gs.guestChoice : gs.hostChoice;

        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `
            <div style="text-align:center;">
                <div style="display:flex;justify-content:space-around;margin-bottom:2rem;padding:1rem;background:var(--bg-glass);border-radius:12px;">
                    <div>
                        <div style="font-size:2rem;font-weight:800;color:var(--success);">${myScore}</div>
                        <div style="font-size:0.85rem;">${this.multiplayer.playerName}</div>
                    </div>
                    <div style="font-size:1.5rem;color:var(--text-muted);align-self:center;">Round ${gs.round}</div>
                    <div>
                        <div style="font-size:2rem;font-weight:800;color:var(--danger);">${opScore}</div>
                        <div style="font-size:0.85rem;">${opponentName}</div>
                    </div>
                </div>

                <div id="mpRPSStatus" style="margin-bottom:2rem;font-size:1.2rem;min-height:60px;">
                    ${myChoice && opChoice ? this.getRPSResult(myChoice, opChoice, opponentName) :
                      myChoice ? '⏳ Waiting for opponent to choose...' :
                      '👇 Make your choice below'}
                </div>

                <div style="display:flex;gap:1rem;justify-content:center;">
                    <button onclick="Games.mpRPSChoose('rock')" ${myChoice ? 'disabled' : ''} style="font-size:3rem;padding:1.5rem 2rem;background:${myChoice === 'rock' ? 'var(--primary)' : 'var(--bg-glass)'};border:2px solid var(--primary);border-radius:16px;cursor:${myChoice ? 'not-allowed' : 'pointer'};opacity:${myChoice ? 0.6 : 1};">✊</button>
                    <button onclick="Games.mpRPSChoose('paper')" ${myChoice ? 'disabled' : ''} style="font-size:3rem;padding:1.5rem 2rem;background:${myChoice === 'paper' ? 'var(--primary)' : 'var(--bg-glass)'};border:2px solid var(--primary);border-radius:16px;cursor:${myChoice ? 'not-allowed' : 'pointer'};opacity:${myChoice ? 0.6 : 1};">✋</button>
                    <button onclick="Games.mpRPSChoose('scissors')" ${myChoice ? 'disabled' : ''} style="font-size:3rem;padding:1.5rem 2rem;background:${myChoice === 'scissors' ? 'var(--primary)' : 'var(--bg-glass)'};border:2px solid var(--primary);border-radius:16px;cursor:${myChoice ? 'not-allowed' : 'pointer'};opacity:${myChoice ? 0.6 : 1};">✌️</button>
                </div>

                <p style="margin-top:1.5rem;color:var(--text-muted);font-size:0.85rem;">Room: <strong>${room.room_code}</strong> | Best of 5</p>
            </div>
        `;
    },

    renderMPRPS(room) {
        this.initMPRPS(room);
    },

    async mpRPSChoose(choice) {
        const gs = { ...this.multiplayer.room.game_state };
        if (this.multiplayer.role === 'host') gs.hostChoice = choice;
        else gs.guestChoice = choice;

        // Check if both chose
        if (gs.hostChoice && gs.guestChoice) {
            const winner = this.getRPSWinner(gs.hostChoice, gs.guestChoice);
            if (winner === 'host') gs.scores.host++;
            if (winner === 'guest') gs.scores.guest++;

            // Check game over
            if (gs.scores.host >= 3 || gs.scores.guest >= 3) {
                await supabaseAdmin.from('game_rooms').update({
                    game_state: gs,
                    status: 'finished',
                    winner: gs.scores.host >= 3 ? 'host' : 'guest',
                    host_score: gs.scores.host,
                    guest_score: gs.scores.guest,
                    updated_at: new Date().toISOString()
                }).eq('id', this.multiplayer.room.id);
                return;
            }

            // Reset choices for next round after 2 seconds
            setTimeout(async () => {
                gs.hostChoice = null;
                gs.guestChoice = null;
                gs.round++;
                await supabaseAdmin.from('game_rooms').update({
                    game_state: gs,
                    updated_at: new Date().toISOString()
                }).eq('id', this.multiplayer.room.id);
            }, 2500);
        }

        await supabaseAdmin.from('game_rooms').update({
            game_state: gs,
            updated_at: new Date().toISOString()
        }).eq('id', this.multiplayer.room.id);
    },

    getRPSWinner(host, guest) {
        if (host === guest) return 'draw';
        if ((host === 'rock' && guest === 'scissors') || (host === 'paper' && guest === 'rock') || (host === 'scissors' && guest === 'paper')) return 'host';
        return 'guest';
    },

    getRPSResult(myChoice, opChoice, opponentName) {
        const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
        const winner = this.getRPSWinner(
            this.multiplayer.role === 'host' ? myChoice : opChoice,
            this.multiplayer.role === 'host' ? opChoice : myChoice
        );
        let result = '';
        if (winner === 'draw') result = "It's a tie!";
        else if (winner === this.multiplayer.role) result = 'You Win this round! 🎉';
        else result = `${opponentName} wins this round!`;

        return `You: ${emojis[myChoice]} vs ${opponentName}: ${emojis[opChoice]}<br><strong>${result}</strong>`;
    },

    // ============================================================
    // MULTIPLAYER REACTION TIME
    // ============================================================
    async initMPReaction(room) {
        const gs = room.game_state;
        const opponentName = this.multiplayer.role === 'host' ? room.guest_name : room.host_name;

        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `
            <div style="text-align:center;">
                <h3 style="margin-bottom:1rem;">Reaction Time Battle vs ${opponentName}</h3>
                <div style="display:flex;justify-content:space-around;margin-bottom:2rem;">
                    <div>
                        <div id="mpMyTime" style="font-size:1.8rem;font-weight:800;color:var(--primary);">${gs.hostTime && this.multiplayer.role === 'host' ? gs.hostTime + 'ms' : gs.guestTime && this.multiplayer.role === 'guest' ? gs.guestTime + 'ms' : '-'}</div>
                        <div style="font-size:0.85rem;">You</div>
                    </div>
                    <div>
                        <div id="mpOpTime" style="font-size:1.8rem;font-weight:800;color:var(--danger);">${gs.hostTime && this.multiplayer.role === 'guest' ? gs.hostTime + 'ms' : gs.guestTime && this.multiplayer.role === 'host' ? gs.guestTime + 'ms' : '-'}</div>
                        <div style="font-size:0.85rem;">${opponentName}</div>
                    </div>
                </div>
                <div id="mpReactionBox" class="reaction-box reaction-idle" onclick="Games.mpReactionStart()">
                    Click to Start Your Timer
                </div>
                <p style="margin-top:1rem;color:var(--text-muted);">Both players click to compare reaction times!</p>
            </div>
        `;
    },

    renderMPReaction(room) {
        this.initMPReaction(room);
    },

    mpReactionStart() {
        const box = document.getElementById('mpReactionBox');
        if (!box) return;

        box.className = 'reaction-box reaction-waiting';
        box.textContent = 'Wait for GREEN...';

        const delay = Math.random() * 3000 + 1500;
        setTimeout(() => {
            const startTime = Date.now();
            box.className = 'reaction-box reaction-ready';
            box.textContent = 'CLICK NOW!';

            box.onclick = async () => {
                const time = Date.now() - startTime;
                box.className = 'reaction-box reaction-idle';
                box.innerHTML = `Your Time: <strong>${time}ms</strong>`;

                const gs = { ...this.multiplayer.room.game_state };
                if (this.multiplayer.role === 'host') gs.hostTime = time;
                else gs.guestTime = time;

                if (gs.hostTime && gs.guestTime) {
                    const winner = gs.hostTime < gs.guestTime ? 'host' : 'guest';
                    await supabaseAdmin.from('game_rooms').update({
                        game_state: gs,
                        status: 'finished',
                        winner: winner,
                        host_score: gs.hostTime,
                        guest_score: gs.guestTime,
                        updated_at: new Date().toISOString()
                    }).eq('id', this.multiplayer.room.id);
                } else {
                    await supabaseAdmin.from('game_rooms').update({
                        game_state: gs,
                        updated_at: new Date().toISOString()
                    }).eq('id', this.multiplayer.room.id);
                }

                box.onclick = null;
            };
        }, delay);
    },

    // ============================================================
    // MULTIPLAYER QUIZ
    // ============================================================
    async initMPQuiz(room) {
        const gs = room.game_state;
        const questions = [
            { q: "What is the Rotary motto?", options: ["Service Above Self", "Peace Through Service", "Do Good", "Serve Humanity"], correct: 0 },
            { q: "When was Rotaract founded?", options: ["1968", "1975", "1985", "1990"], correct: 0 },
            { q: "Our club ID?", options: ["91594", "12345", "56789", "67890"], correct: 0 },
            { q: "Our district?", options: ["3206", "3201", "3212", "3220"], correct: 0 },
            { q: "How many avenues of service?", options: ["3", "4", "5", "6"], correct: 2 }
        ];

        if (!gs.questions) {
            gs.questions = questions;
            await supabaseAdmin.from('game_rooms').update({ game_state: gs }).eq('id', this.multiplayer.room.id);
        }

        const opponentName = this.multiplayer.role === 'host' ? room.guest_name : room.host_name;
        const myScore = this.multiplayer.role === 'host' ? gs.scores.host : gs.scores.guest;
        const opScore = this.multiplayer.role === 'host' ? gs.scores.guest : gs.scores.host;
        const currentQ = gs.questions[gs.currentQuestion];

        if (!currentQ) {
            // Game over
            const winner = gs.scores.host > gs.scores.guest ? 'host' : gs.scores.host < gs.scores.guest ? 'guest' : 'draw';
            await supabaseAdmin.from('game_rooms').update({
                status: 'finished',
                winner,
                host_score: gs.scores.host,
                guest_score: gs.scores.guest
            }).eq('id', this.multiplayer.room.id);
            return;
        }

        const alreadyAnswered = this.multiplayer.role === 'host' ? gs.answered.host : gs.answered.guest;

        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `
            <div class="quiz-container">
                <div style="display:flex;justify-content:space-around;margin-bottom:1.5rem;">
                    <div><div style="font-size:1.5rem;font-weight:800;color:var(--primary);">${myScore}</div><div>You</div></div>
                    <div><div style="font-size:1.5rem;font-weight:800;color:var(--danger);">${opScore}</div><div>${opponentName}</div></div>
                </div>
                <p style="text-align:center;">Question ${gs.currentQuestion + 1} of ${gs.questions.length}</p>
                <div class="quiz-question">${currentQ.q}</div>
                <div class="quiz-options">
                    ${currentQ.options.map((opt, i) => `
                        <button class="quiz-option" onclick="Games.mpQuizAnswer(${i})" ${alreadyAnswered ? 'disabled style="opacity:0.5;"' : ''}>
                            ${String.fromCharCode(65 + i)}. ${opt}
                        </button>
                    `).join('')}
                </div>
                ${alreadyAnswered ? '<p style="text-align:center;margin-top:1rem;color:var(--warning);">⏳ Waiting for opponent...</p>' : ''}
            </div>
        `;
    },

    async mpQuizAnswer(index) {
        const gs = { ...this.multiplayer.room.game_state };
        const currentQ = gs.questions[gs.currentQuestion];

        if (this.multiplayer.role === 'host') gs.answered.host = true;
        else gs.answered.guest = true;

        if (index === currentQ.correct) {
            if (this.multiplayer.role === 'host') gs.scores.host += 100;
            else gs.scores.guest += 100;
        }

        // If both answered, move to next question
        if (gs.answered.host && gs.answered.guest) {
            setTimeout(async () => {
                gs.currentQuestion++;
                gs.answered = { host: false, guest: false };
                await supabaseAdmin.from('game_rooms').update({
                    game_state: gs,
                    updated_at: new Date().toISOString()
                }).eq('id', this.multiplayer.room.id);
            }, 1500);
        }

        await supabaseAdmin.from('game_rooms').update({
            game_state: gs,
            updated_at: new Date().toISOString()
        }).eq('id', this.multiplayer.room.id);
    },

    // ============================================================
    // GAME END HANDLER
    // ============================================================
    handleGameEnd(room) {
        const isWinner = room.winner === this.multiplayer.role;
        const isDraw = room.winner === 'draw';
        const opponentName = this.multiplayer.role === 'host' ? room.guest_name : room.host_name;

        let message;
        if (isDraw) message = "It's a Draw!";
        else if (isWinner) message = '🎉 You Won!';
        else message = `${opponentName} Won!`;

        const body = document.getElementById('gamePlayBody');
        if (!body) return;

        setTimeout(() => {
            const overlay = document.createElement('div');
            overlay.className = 'game-over-overlay';
            overlay.innerHTML = `
                <h2>${isDraw ? 'DRAW' : isWinner ? 'VICTORY' : 'DEFEAT'}</h2>
                <div class="game-over-score" style="color:${isWinner ? 'var(--success)' : isDraw ? 'var(--warning)' : 'var(--danger)'};">${message}</div>
                <div class="game-over-label">Multiplayer Game</div>
                <div class="game-over-actions">
                    <button class="btn btn-primary" onclick="Games.closeGame()">
                        <i data-feather="check"></i>Exit
                    </button>
                </div>
            `;
            body.parentElement.style.position = 'relative';
            body.parentElement.appendChild(overlay);
            if (typeof feather !== 'undefined') feather.replace();

            // Save score for winner
            if (isWinner && this.currentUser) {
                this.saveScore(100);
            }
        }, 1000);
    },

    // ============================================================
    // MODAL HELPERS
    // ============================================================
    createModal(id, title, content) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'game-play-modal';
        modal.style.zIndex = '9900';
        modal.innerHTML = `
            <div style="background:var(--bg-tertiary);max-width:500px;width:calc(100% - 2rem);padding:2rem;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                    <h3 style="margin:0;">${title}</h3>
                    <button onclick="Games.closeModal('${id}')" style="background:transparent;border:none;cursor:pointer;color:var(--text-muted);">
                        <i data-feather="x"></i>
                    </button>
                </div>
                ${content}
            </div>
        `;
        document.body.appendChild(modal);
        if (typeof feather !== 'undefined') feather.replace();
        return modal;
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.remove();
    },

    // ============================================================
    // GAME LAUNCHER (Solo games)
    // ============================================================
    startGame(gameId) {
        const game = this.gamesList.find(g => g.id === gameId);
        if (!game) return;

        // If multiplayer game, ask user if solo or MP
        if (game.multiplayer) {
            this.showGameModeChoice(game);
            return;
        }

        this.currentGame = gameId;
        this.openGameModal(game);
        this.loadGame(gameId);
    },

    showGameModeChoice(game) {
        const modal = this.createModal('modeChoiceModal', `Choose Mode: ${game.name}`, `
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <button class="btn btn-primary btn-lg" onclick="Games.closeModal('modeChoiceModal'); Games.launchSolo('${game.id}');">
                    <i data-feather="user"></i>Play Solo (vs AI)
                </button>
                <button class="btn btn-success btn-lg" onclick="Games.closeModal('modeChoiceModal'); Games.showCreateRoomModal(); setTimeout(() => document.getElementById('gameType').value='${game.id}', 100);">
                    <i data-feather="users"></i>Create Multiplayer Room
                </button>
                <button class="btn btn-outline btn-lg" onclick="Games.closeModal('modeChoiceModal'); Games.showJoinRoomModal();">
                    <i data-feather="log-in"></i>Join with Room Code
                </button>
            </div>
        `);
    },

    launchSolo(gameId) {
        const game = this.gamesList.find(g => g.id === gameId);
        this.currentGame = gameId;
        this.openGameModal(game);
        this.loadGame(gameId);
    },

    openGameModal(game) {
        const existing = document.getElementById('gamePlayModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'gamePlayModal';
        modal.className = 'game-play-modal';
        modal.innerHTML = `
            <div class="game-play-container">
                <div class="game-play-header">
                    <h3><i data-feather="${game.icon}"></i> ${game.name}${this.multiplayer.room ? ' - Multiplayer' : ''}</h3>
                    <div class="game-play-controls">
                        <div class="game-score-display">
                            <i data-feather="star"></i>
                            <span>Score: <span id="gameScore">0</span></span>
                        </div>
                        <div class="game-timer-display" id="gameTimerContainer" style="display:none;">
                            <i data-feather="clock"></i>
                            <span id="gameTimer">0</span>
                        </div>
                        <button class="game-play-close" onclick="Games.closeGame()">
                            <i data-feather="x"></i>
                        </button>
                    </div>
                </div>
                <div class="game-play-body" id="gamePlayBody"></div>
                <div class="game-play-footer">
                    <button class="btn btn-outline" onclick="Games.closeGame()">
                        <i data-feather="log-out"></i>Exit
                    </button>
                    ${!this.multiplayer.room ? '<button class="btn btn-primary" onclick="Games.restartGame()"><i data-feather="refresh-cw"></i>Restart</button>' : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        if (typeof feather !== 'undefined') feather.replace();
    },

    closeGame() {
        const modal = document.getElementById('gamePlayModal');
        if (modal) modal.remove();
        document.body.style.overflow = '';

        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.timerInterval) clearInterval(this.timerInterval);

        // Unsubscribe multiplayer
        if (this.multiplayer.subscription) {
            this.multiplayer.subscription.unsubscribe();
            this.multiplayer.subscription = null;
        }

        // Clear URL params
        if (window.history.replaceState) {
            const url = new URL(window.location);
            url.searchParams.delete('room');
            window.history.replaceState({}, '', url);
        }

        this.currentGame = null;
        this.multiplayer.room = null;
        this.multiplayer.role = null;
    },

    restartGame() {
        if (this.currentGame) this.loadGame(this.currentGame);
    },

    setScore(score) {
        const el = document.getElementById('gameScore');
        if (el) el.textContent = score;
    },

    // ============================================================
    // SOLO GAME LOADER (imports from previous games.js)
    // ============================================================
    loadGame(gameId) {
        this.setScore(0);
        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.timerInterval) clearInterval(this.timerInterval);

        switch (gameId) {
            case 'tictactoe': this.initTicTacToe(); break;
            case 'snake': this.initSnake(); break;
            case 'memory': this.initMemory(); break;
            case 'quiz': this.initQuiz(); break;
            case 'wordle': this.initWordle(); break;
            case '2048': this.init2048(); break;
            case 'reaction': this.initReaction(); break;
            case 'math': this.initMath(); break;
            case 'typing': this.initTyping(); break;
            case 'rockpaperscissors': this.initRPS(); break;
            case 'guessnumber': this.initGuessNumber(); break;
            case 'colormatch': this.initColorMatch(); break;
        }
    },

    // ============================================================
    // ALL SOLO GAMES (Same as previous version)
    // ============================================================
    initTicTacToe() {
        const body = document.getElementById('gamePlayBody');
        this.tttState = { board: Array(9).fill(''), current: 'X', over: false, ps: 0, as: 0 };
        body.innerHTML = `<div style="text-align:center;"><div style="display:flex;justify-content:center;gap:2rem;margin-bottom:1.5rem;"><div><div style="font-size:2rem;font-weight:800;color:var(--primary);" id="tttP">0</div><div>You</div></div><div><div style="font-size:2rem;font-weight:800;color:var(--danger);" id="tttA">0</div><div>AI</div></div></div><div id="tttS" style="margin-bottom:1rem;font-weight:600;">Your Turn</div><div id="tttB" style="display:grid;grid-template-columns:repeat(3,90px);gap:8px;justify-content:center;margin:0 auto;"></div></div>`;
        this.renderTTT();
    },
    renderTTT() {
        const b = document.getElementById('tttB');
        if (b) b.innerHTML = this.tttState.board.map((c,i)=>`<div onclick="Games.tttClick(${i})" style="width:90px;height:90px;background:var(--bg-glass);border:2px solid var(--border-color);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:800;cursor:pointer;color:${c==='X'?'var(--primary)':'var(--danger)'};">${c}</div>`).join('');
    },
    tttClick(i) {
        if (this.tttState.over || this.tttState.board[i]) return;
        this.tttState.board[i] = 'X';
        this.renderTTT();
        if (this.checkTTTWin('X')) { this.tttState.ps++; document.getElementById('tttP').textContent = this.tttState.ps; document.getElementById('tttS').textContent = 'You Won!'; this.tttState.over=true; this.setScore(this.tttState.ps*100); this.saveScore(this.tttState.ps*100); setTimeout(()=>{this.tttState.board=Array(9).fill('');this.tttState.over=false;this.renderTTT();document.getElementById('tttS').textContent='Your Turn';},2000); return; }
        if (this.tttState.board.every(c=>c)) { document.getElementById('tttS').textContent='Draw!'; setTimeout(()=>{this.tttState.board=Array(9).fill('');this.renderTTT();document.getElementById('tttS').textContent='Your Turn';},2000); return; }
        setTimeout(() => {
            const empty = this.tttState.board.map((c,i)=>c===''?i:null).filter(x=>x!==null);
            const move = empty[Math.floor(Math.random()*empty.length)];
            this.tttState.board[move] = 'O';
            this.renderTTT();
            if (this.checkTTTWin('O')) { this.tttState.as++; document.getElementById('tttA').textContent=this.tttState.as; document.getElementById('tttS').textContent='AI Won!'; setTimeout(()=>{this.tttState.board=Array(9).fill('');this.renderTTT();document.getElementById('tttS').textContent='Your Turn';},2000); }
        }, 500);
    },
    checkTTTWin(p) { const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; return w.some(l=>l.every(i=>this.tttState.board[i]===p)); },

    initSnake() {
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div style="text-align:center;"><canvas id="snakeC" width="400" height="400" style="background:#0f172a;border-radius:12px;"></canvas><p style="margin-top:1rem;">Use Arrow Keys or WASD</p></div>`;
        const canvas = document.getElementById('snakeC');
        const ctx = canvas.getContext('2d');
        this.snake = { s: [{x:10,y:10}], f: {x:15,y:15}, v: {x:0,y:0}, sc: 0 };
        this.snakeDir = null;
        const kh = (e) => {
            const k = e.key.toLowerCase();
            if (['arrowup','w'].includes(k)) this.snakeDir='up';
            if (['arrowdown','s'].includes(k)) this.snakeDir='down';
            if (['arrowleft','a'].includes(k)) this.snakeDir='left';
            if (['arrowright','d'].includes(k)) this.snakeDir='right';
        };
        document.addEventListener('keydown', kh);
        this.gameInterval = setInterval(() => {
            if (this.snakeDir==='up' && this.snake.v.y!==1) this.snake.v={x:0,y:-1};
            if (this.snakeDir==='down' && this.snake.v.y!==-1) this.snake.v={x:0,y:1};
            if (this.snakeDir==='left' && this.snake.v.x!==1) this.snake.v={x:-1,y:0};
            if (this.snakeDir==='right' && this.snake.v.x!==-1) this.snake.v={x:1,y:0};
            const h = { x: this.snake.s[0].x + this.snake.v.x, y: this.snake.s[0].y + this.snake.v.y };
            if (h.x<0||h.x>=20||h.y<0||h.y>=20||this.snake.s.some(s=>s.x===h.x&&s.y===h.y)) {
                clearInterval(this.gameInterval);
                document.removeEventListener('keydown', kh);
                this.saveScore(this.snake.sc);
                this.showGameOver(this.snake.sc, 'Snake');
                return;
            }
            this.snake.s.unshift(h);
            if (h.x===this.snake.f.x&&h.y===this.snake.f.y) { this.snake.sc+=10; this.setScore(this.snake.sc); this.snake.f={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}; }
            else this.snake.s.pop();
            ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,400,400);
            this.snake.s.forEach((s,i)=>{ ctx.fillStyle=i===0?'#06b6d4':'#1a56db'; ctx.fillRect(s.x*20,s.y*20,18,18); });
            ctx.fillStyle='#dc2626'; ctx.beginPath(); ctx.arc(this.snake.f.x*20+10,this.snake.f.y*20+10,8,0,Math.PI*2); ctx.fill();
        }, 120);
    },

    initMemory() {
        const symbols = ['🌟','❤️','🎯','🚀','⚡','🎨','🎵','🏆'];
        this.memory = { cards: [...symbols,...symbols].sort(()=>Math.random()-0.5), flipped:[], matched:[], moves:0, score:0 };
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div style="text-align:center;"><div>Moves: <strong id="mMoves">0</strong></div><div id="mBoard" style="display:grid;grid-template-columns:repeat(4,80px);gap:10px;justify-content:center;margin:1rem auto;"></div></div>`;
        this.renderMem();
    },
    renderMem() {
        const b = document.getElementById('mBoard');
        if (b) b.innerHTML = this.memory.cards.map((c,i) => {
            const f = this.memory.flipped.includes(i)||this.memory.matched.includes(i);
            return `<div onclick="Games.memClick(${i})" style="width:80px;height:80px;background:${f?'linear-gradient(135deg,#1a56db,#06b6d4)':'var(--bg-glass)'};border:2px solid var(--border-color);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2rem;cursor:pointer;">${f?c:'?'}</div>`;
        }).join('');
    },
    memClick(i) {
        if (this.memory.flipped.length>=2 || this.memory.flipped.includes(i) || this.memory.matched.includes(i)) return;
        this.memory.flipped.push(i);
        this.renderMem();
        if (this.memory.flipped.length===2) {
            this.memory.moves++;
            document.getElementById('mMoves').textContent = this.memory.moves;
            const [a,b] = this.memory.flipped;
            if (this.memory.cards[a]===this.memory.cards[b]) {
                this.memory.matched.push(a,b); this.memory.score+=100; this.setScore(this.memory.score); this.memory.flipped=[];
                if (this.memory.matched.length===this.memory.cards.length) { setTimeout(()=>{ this.saveScore(this.memory.score); this.showGameOver(this.memory.score,'Memory'); },500); }
            } else setTimeout(()=>{ this.memory.flipped=[]; this.renderMem(); }, 800);
        }
    },

    initQuiz() {
        const qs = [{q:"Rotary motto?",options:["Service Above Self","Peace","Do Good","Serve"],correct:0},{q:"Rotaract founded?",options:["1968","1975","1985","1990"],correct:0},{q:"Club ID?",options:["91594","12345","56789","67890"],correct:0}];
        this.quiz = { c: 0, s: 0, qs };
        this.rQ();
    },
    rQ() {
        const q = this.quiz.qs[this.quiz.c];
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div class="quiz-container"><p>Q${this.quiz.c+1}/${this.quiz.qs.length}</p><div class="quiz-question">${q.q}</div><div class="quiz-options">${q.options.map((o,i)=>`<button class="quiz-option" onclick="Games.qA(${i})">${String.fromCharCode(65+i)}. ${o}</button>`).join('')}</div></div>`;
    },
    qA(i) {
        const q = this.quiz.qs[this.quiz.c];
        if (i===q.correct) { this.quiz.s+=100; this.setScore(this.quiz.s); }
        this.quiz.c++;
        if (this.quiz.c>=this.quiz.qs.length) { this.saveScore(this.quiz.s); this.showGameOver(this.quiz.s,'Quiz'); }
        else setTimeout(()=>this.rQ(), 800);
    },

    initWordle() {
        const words = ['ROTARY','UNITY','SERVE','PEACE','SMILE'];
        this.wordle = { word: words[Math.floor(Math.random()*words.length)], guesses: [] };
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div style="text-align:center;"><div id="wG" class="wordle-grid"></div><input type="text" id="wI" maxlength="${this.wordle.word.length}" style="padding:0.75rem;font-size:1.5rem;text-align:center;letter-spacing:8px;text-transform:uppercase;margin:1rem 0;border:2px solid var(--primary);border-radius:12px;background:var(--bg-tertiary);color:var(--text-primary);width:250px;"><br><button onclick="Games.wSubmit()" class="btn btn-primary">Submit</button></div>`;
        this.renderW();
        const input = document.getElementById('wI');
        input.focus();
        input.addEventListener('keydown', (e) => { if (e.key==='Enter') this.wSubmit(); });
    },
    renderW() {
        const g = document.getElementById('wG');
        if (!g) return;
        let h = '';
        for (let i=0;i<6;i++) {
            h += '<div class="wordle-row">';
            const gu = this.wordle.guesses[i] || '';
            for (let j=0;j<this.wordle.word.length;j++) {
                const l = gu[j] || '';
                let c = 'wordle-tile';
                if (l) { if (l===this.wordle.word[j]) c+=' correct'; else if (this.wordle.word.includes(l)) c+=' present'; else c+=' absent'; }
                h += `<div class="${c}">${l}</div>`;
            }
            h += '</div>';
        }
        g.innerHTML = h;
    },
    wSubmit() {
        const i = document.getElementById('wI');
        const g = i.value.toUpperCase();
        if (g.length!==this.wordle.word.length) return;
        this.wordle.guesses.push(g);
        i.value = '';
        this.renderW();
        if (g===this.wordle.word) { const s = (7-this.wordle.guesses.length)*100; this.setScore(s); this.saveScore(s); setTimeout(()=>this.showGameOver(s,'Word Guess'),500); }
        else if (this.wordle.guesses.length>=6) setTimeout(()=>this.showGameOver(0,'Word Guess',`Word: ${this.wordle.word}`),500);
    },

    init2048() {
        this.g2048 = { b: Array(4).fill(null).map(()=>Array(4).fill(0)), s: 0 };
        this.add2048T(); this.add2048T();
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div style="text-align:center;"><div id="g2Board" class="game-2048-board"></div><p style="margin-top:1rem;">Use Arrow Keys</p></div>`;
        this.render2048();
        const kh = (e) => {
            let m = false;
            if (e.key==='ArrowUp') m=this.move2048('up');
            if (e.key==='ArrowDown') m=this.move2048('down');
            if (e.key==='ArrowLeft') m=this.move2048('left');
            if (e.key==='ArrowRight') m=this.move2048('right');
            if (m) { this.add2048T(); this.render2048(); }
        };
        document.addEventListener('keydown', kh);
        this.g2048.kh = kh;
    },
    add2048T() {
        const e = [];
        for (let i=0;i<4;i++) for (let j=0;j<4;j++) if (this.g2048.b[i][j]===0) e.push({x:i,y:j});
        if (!e.length) return;
        const p = e[Math.floor(Math.random()*e.length)];
        this.g2048.b[p.x][p.y] = Math.random()<0.9?2:4;
    },
    render2048() {
        const b = document.getElementById('g2Board');
        if (!b) return;
        let h = '';
        for (let i=0;i<4;i++) for (let j=0;j<4;j++) { const v = this.g2048.b[i][j]; h += `<div class="tile-2048" ${v?`data-value="${v}"`:''}>${v||''}</div>`; }
        b.innerHTML = h;
        this.setScore(this.g2048.s);
    },
    move2048(d) {
        let m = false;
        const r = (mat) => mat[0].map((_,i)=>mat.map(row=>row[i]).reverse());
        let b = this.g2048.b.map(row=>[...row]);
        if (d==='up') b=r(r(r(b)));
        if (d==='right') b=r(r(b));
        if (d==='down') b=r(b);
        for (let i=0;i<4;i++) {
            const row = b[i].filter(v=>v!==0);
            for (let j=0;j<row.length-1;j++) { if (row[j]===row[j+1]) { row[j]*=2; this.g2048.s+=row[j]; row.splice(j+1,1); } }
            while (row.length<4) row.push(0);
            if (JSON.stringify(row)!==JSON.stringify(b[i])) m=true;
            b[i]=row;
        }
        if (d==='up') b=r(b);
        if (d==='right') b=r(r(b));
        if (d==='down') b=r(r(r(b)));
        this.g2048.b = b;
        return m;
    },

    initReaction() {
        this.react = { state: 'idle' };
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div id="rB" class="reaction-box reaction-idle" onclick="Games.rClick()">Click to Start</div>`;
    },
    rClick() {
        const b = document.getElementById('rB');
        if (this.react.state==='idle') {
            this.react.state='waiting';
            b.className='reaction-box reaction-waiting';
            b.textContent='Wait for GREEN...';
            setTimeout(() => { this.react.state='ready'; this.react.st=Date.now(); b.className='reaction-box reaction-ready'; b.textContent='CLICK NOW!'; }, Math.random()*3000+1000);
        } else if (this.react.state==='ready') {
            const t = Date.now()-this.react.st;
            const s = Math.max(0,1000-t);
            this.setScore(s); this.saveScore(s);
            b.className='reaction-box reaction-idle';
            b.innerHTML = `<div class="reaction-result">${t}ms</div>`;
            this.react.state='idle';
        }
    },

    initMath() {
        this.math = { s: 0, tL: 60 };
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div class="math-container"><div id="mP" class="math-problem">Ready!</div><input type="number" id="mI" class="math-input" autofocus><button onclick="Games.mS()" class="btn btn-primary btn-block">Submit</button></div>`;
        document.getElementById('gameTimerContainer').style.display='flex';
        this.newMath();
        const i = document.getElementById('mI');
        i.focus();
        i.addEventListener('keydown', (e) => { if (e.key==='Enter') this.mS(); });
        this.timerInterval = setInterval(() => {
            this.math.tL--;
            document.getElementById('gameTimer').textContent = this.math.tL+'s';
            if (this.math.tL<=0) { clearInterval(this.timerInterval); this.saveScore(this.math.s); this.showGameOver(this.math.s,'Math'); }
        }, 1000);
    },
    newMath() {
        const ops = ['+','-','×'];
        const op = ops[Math.floor(Math.random()*3)];
        const a = Math.floor(Math.random()*20)+1, b = Math.floor(Math.random()*20)+1;
        this.mAns = op==='+'?a+b:op==='-'?a-b:a*b;
        document.getElementById('mP').textContent = `${a} ${op} ${b}`;
        const i = document.getElementById('mI');
        if (i) { i.value=''; i.focus(); }
    },
    mS() {
        const i = document.getElementById('mI');
        if (parseInt(i.value)===this.mAns) { this.math.s+=10; this.setScore(this.math.s); }
        this.newMath();
    },

    initTyping() {
        const ss = ['The quick brown fox jumps over the lazy dog','Service above self is the Rotary motto','Rotaract Club of Coimbatore Unity'];
        this.typ = { s: ss[Math.floor(Math.random()*ss.length)], st: null };
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div class="typing-container"><div id="tT" class="typing-text">${this.typ.s}</div><input type="text" id="tI" class="typing-input" placeholder="Start typing..." autofocus><div class="typing-stats"><div class="typing-stat"><div class="typing-stat-value" id="tW">0</div><div class="typing-stat-label">WPM</div></div><div class="typing-stat"><div class="typing-stat-value" id="tA">100</div><div class="typing-stat-label">Accuracy</div></div></div></div>`;
        const i = document.getElementById('tI');
        i.focus();
        i.addEventListener('input', () => this.tCheck());
    },
    tCheck() {
        const i = document.getElementById('tI');
        const t = i.value;
        if (!this.typ.st) this.typ.st = Date.now();
        let h = '';
        for (let j=0;j<this.typ.s.length;j++) {
            let c = '';
            if (j<t.length) c = t[j]===this.typ.s[j]?'correct-char':'wrong-char';
            else if (j===t.length) c = 'current-char';
            h += `<span class="${c}">${this.typ.s[j]}</span>`;
        }
        document.getElementById('tT').innerHTML = h;
        const time = (Date.now()-this.typ.st)/60000;
        const w = Math.round((t.trim().split(/\s+/).length)/time) || 0;
        let cor = 0;
        for (let j=0;j<t.length;j++) if (t[j]===this.typ.s[j]) cor++;
        const a = t.length>0?Math.round((cor/t.length)*100):100;
        document.getElementById('tW').textContent = w;
        document.getElementById('tA').textContent = a;
        if (t===this.typ.s) { const s = Math.round(w*(a/100)*10); this.setScore(s); this.saveScore(s); setTimeout(()=>this.showGameOver(s,'Typing'),500); }
    },

    initRPS() {
        this.rps = { w:0, l:0, d:0 };
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div style="text-align:center;"><div style="display:flex;justify-content:space-around;margin-bottom:2rem;"><div><div id="rW" style="font-size:2rem;color:var(--success);">0</div>Wins</div><div><div id="rD" style="font-size:2rem;color:var(--warning);">0</div>Draws</div><div><div id="rL" style="font-size:2rem;color:var(--danger);">0</div>Losses</div></div><div id="rR" style="font-size:1.5rem;margin-bottom:2rem;min-height:60px;">Choose!</div><div style="display:flex;gap:1rem;justify-content:center;"><button onclick="Games.rP('rock')" class="btn btn-outline" style="font-size:3rem;padding:1.5rem;">✊</button><button onclick="Games.rP('paper')" class="btn btn-outline" style="font-size:3rem;padding:1.5rem;">✋</button><button onclick="Games.rP('scissors')" class="btn btn-outline" style="font-size:3rem;padding:1.5rem;">✌️</button></div></div>`;
    },
    rP(p) {
        const c = ['rock','paper','scissors'];
        const a = c[Math.floor(Math.random()*3)];
        const e = {rock:'✊',paper:'✋',scissors:'✌️'};
        let r;
        if (p===a) { r="Tie!"; this.rps.d++; }
        else if ((p==='rock'&&a==='scissors')||(p==='paper'&&a==='rock')||(p==='scissors'&&a==='paper')) { r='You Win!'; this.rps.w++; this.setScore(this.rps.w*100); }
        else { r='AI Wins!'; this.rps.l++; }
        document.getElementById('rR').innerHTML = `${e[p]} vs ${e[a]}<br>${r}`;
        document.getElementById('rW').textContent = this.rps.w;
        document.getElementById('rD').textContent = this.rps.d;
        document.getElementById('rL').textContent = this.rps.l;
        if (this.rps.w>=5) this.saveScore(this.rps.w*100);
    },

    initGuessNumber() {
        this.gn = { t: Math.floor(Math.random()*100)+1, a: 0, max: 10 };
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div style="text-align:center;"><p>Guess 1-100</p><p>Attempts: <span id="gA">0</span>/10</p><input type="number" id="gI" min="1" max="100" style="padding:1rem;font-size:2rem;text-align:center;width:200px;border:2px solid var(--primary);border-radius:12px;background:var(--bg-tertiary);color:var(--text-primary);"><br><button onclick="Games.gG()" class="btn btn-primary">Guess</button><div id="gH" style="margin-top:1.5rem;font-size:1.2rem;"></div></div>`;
        const i = document.getElementById('gI');
        i.focus();
        i.addEventListener('keydown', (e) => { if (e.key==='Enter') this.gG(); });
    },
    gG() {
        const i = document.getElementById('gI');
        const g = parseInt(i.value);
        this.gn.a++;
        document.getElementById('gA').textContent = this.gn.a;
        const h = document.getElementById('gH');
        if (g===this.gn.t) { const s = (this.gn.max-this.gn.a+1)*100; h.innerHTML = `<span style="color:var(--success);">Correct!</span>`; this.setScore(s); this.saveScore(s); setTimeout(()=>this.showGameOver(s,'Number'),1500); }
        else if (this.gn.a>=this.gn.max) { h.innerHTML = `<span style="color:var(--danger);">Game Over! Number: ${this.gn.t}</span>`; setTimeout(()=>this.showGameOver(0,'Number'),1500); }
        else h.innerHTML = g<this.gn.t?'<span style="color:var(--warning);">Too Low!</span>':'<span style="color:var(--warning);">Too High!</span>';
        i.value=''; i.focus();
    },

    initColorMatch() {
        this.cm = { s: 0, tL: 30 };
        const body = document.getElementById('gamePlayBody');
        body.innerHTML = `<div style="text-align:center;"><p>Does WORD match COLOR?</p><div id="cD" style="font-size:4rem;font-weight:800;margin:2rem 0;">READY</div><div style="display:flex;gap:1rem;justify-content:center;"><button onclick="Games.cA(true)" class="btn btn-success">YES</button><button onclick="Games.cA(false)" class="btn btn-danger">NO</button></div></div>`;
        document.getElementById('gameTimerContainer').style.display='flex';
        this.newColor();
        this.timerInterval = setInterval(() => {
            this.cm.tL--;
            document.getElementById('gameTimer').textContent = this.cm.tL+'s';
            if (this.cm.tL<=0) { clearInterval(this.timerInterval); this.saveScore(this.cm.s); this.showGameOver(this.cm.s,'Color'); }
        }, 1000);
    },
    newColor() {
        const cs = [{n:'RED',h:'#dc2626'},{n:'GREEN',h:'#16a34a'},{n:'BLUE',h:'#1a56db'},{n:'YELLOW',h:'#f59e0b'}];
        const w = cs[Math.floor(Math.random()*cs.length)];
        const c = Math.random()>0.5?w:cs[Math.floor(Math.random()*cs.length)];
        this.cMatch = w.n===c.n;
        const d = document.getElementById('cD');
        if (d) { d.textContent = w.n; d.style.color = c.h; }
    },
    cA(a) {
        if (a===this.cMatch) { this.cm.s+=10; this.setScore(this.cm.s); }
        else { this.cm.s = Math.max(0,this.cm.s-5); this.setScore(this.cm.s); }
        this.newColor();
    },

    showGameOver(score, name, msg = '') {
        const body = document.getElementById('gamePlayBody');
        if (!body) return;
        const existing = document.querySelector('.game-over-overlay');
        if (existing) existing.remove();
        const o = document.createElement('div');
        o.className = 'game-over-overlay';
        o.innerHTML = `<h2>Game Over</h2><div class="game-over-score">${score}</div><div class="game-over-label">${name}</div>${msg?`<p style="color:white;margin-bottom:1.5rem;">${msg}</p>`:''}<div class="game-over-actions"><button class="btn btn-primary" onclick="Games.restartGame(); document.querySelector('.game-over-overlay')?.remove();"><i data-feather="refresh-cw"></i>Again</button><button class="btn btn-outline" onclick="Games.closeGame();"><i data-feather="log-out"></i>Exit</button></div>`;
        body.parentElement.style.position = 'relative';
        body.parentElement.appendChild(o);
        if (typeof feather !== 'undefined') feather.replace();
    },

    // ============================================================
    // SCORES
    // ============================================================
    async saveScore(score) {
        try {
            if (typeof supabaseAdmin === 'undefined' || !this.currentGame) return;
            await supabaseAdmin.from('game_scores').insert({
                user_id: this.currentUser?.id || null,
                game_name: this.currentGame,
                score, played_at: new Date().toISOString()
            });
            this.loadLeaderboard();
        } catch (err) { console.error(err); }
    },

    async loadBestScores() {
        try {
            const { data } = await supabaseAdmin.from('game_scores').select('game_name, score').order('score', { ascending: false });
            if (!data) return;
            const best = {};
            data.forEach(s => { if (!best[s.game_name] || s.score > best[s.game_name]) best[s.game_name] = s.score; });
            Object.keys(best).forEach(g => { const el = document.getElementById(`best-${g}`); if (el) el.textContent = best[g]; });
            const tp = document.getElementById('totalPlays');
            if (tp) tp.textContent = data.length;
        } catch { /* silent */ }
    },

    async loadLeaderboard() {
        try {
            const tbody = document.getElementById('leaderboardBody');
            if (!tbody) return;
            const { data } = await supabaseAdmin.from('game_scores').select('*').order('score', { ascending: false }).limit(10);
            if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text-muted);">No scores yet!</td></tr>'; return; }
            const userIds = data.map(s => s.user_id).filter(Boolean);
            let userMap = {};
            if (userIds.length) {
                const { data: users } = await supabaseAdmin.from('users').select('id, full_name').in('id', userIds);
                (users || []).forEach(u => { userMap[u.id] = u.full_name; });
            }
            tbody.innerHTML = data.map((s,i) => {
                const rc = i===0?'gold':i===1?'silver':i===2?'bronze':'';
                const n = userMap[s.user_id] || 'Anonymous';
                const gn = this.gamesList.find(g => g.id === s.game_name)?.name || s.game_name;
                return `<tr><td class="leaderboard-rank ${rc}">${i+1}</td><td><div class="leaderboard-player"><div class="leaderboard-avatar">${n.charAt(0).toUpperCase()}</div><span>${n}</span></div></td><td>${gn}</td><td class="leaderboard-score">${s.score}</td></tr>`;
            }).join('');
        } catch { /* silent */ }
    }
};

document.addEventListener('DOMContentLoaded', () => Games.init());
window.Games = Games;