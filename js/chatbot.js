// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// Advanced AI Chatbot System
// File: js/chatbot.js | Version: 5.0.0
// Context-Aware | Voice Input | Markdown | Memory
// ============================================

(function () {
    'use strict';

    const Chatbot = {
        // State
        isOpen: false,
        isTyping: false,
        isListening: false,
        conversationId: null,
        messageHistory: [],
        maxHistoryLength: 20,
        maxContextMessages: 10,
        voiceRecognition: null,
        currentUser: null,
        clubContext: null,

        // Configuration
        API_URL: 'https://openrouter.ai/api/v1/chat/completions',
        DEFAULT_MODEL: 'openai/gpt-4o',
        FALLBACK_MODEL: 'openai/gpt-4o-mini',
        MAX_TOKENS: 1500,
        TEMPERATURE: 0.7,

        // Quick action chips
        QUICK_ACTIONS: [
            { label: 'About Our Club', icon: 'fa-info-circle', query: 'Tell me about Rotaract Club of Coimbatore Unity.' },
            { label: 'District 3206', icon: 'fa-globe', query: 'What is Rotary International District 3206 and what are its key activities?' },
            { label: 'How to Join', icon: 'fa-user-plus', query: 'How can I join Rotaract Club of Coimbatore Unity?' },
            { label: 'Upcoming Events', icon: 'fa-calendar', query: 'What are the upcoming events in the next 7 days?' },
            { label: 'End Polio Now', icon: 'fa-shield-virus', query: 'Tell me about the End Polio Now campaign by Rotary International.' },
            { label: 'Rotary Focus Areas', icon: 'fa-bullseye', query: 'What are the seven focus areas of Rotary International?' },
            { label: 'DPP Projects', icon: 'fa-star', query: 'What are District Priority Projects (DPP) and the eight pillars?' },
            { label: 'Blood Donation', icon: 'fa-droplet', query: 'How does the blood donation request system work?' },
            { label: 'Four-Way Test', icon: 'fa-scale-balanced', query: 'What is the Four-Way Test of Rotary?' },
            { label: 'TRF', icon: 'fa-hand-holding-dollar', query: 'What is The Rotary Foundation (TRF)?' }
        ],

        // ==========================================
        // 1. INITIALIZATION
        // ==========================================
        async init() {
            this.conversationId = this.generateConversationId();
            this.loadHistoryFromStorage();
            this.setupVoiceRecognition();
            this.bindEvents();
            this.injectStyles();
            await this.loadContext();
            console.log('[Chatbot] Initialized v5.0.0');
        },

        async loadContext() {
            try {
                // Load current user if logged in
                if (window.AuthManager?.isLoggedIn?.()) {
                    this.currentUser = window.AuthManager.currentUser;
                }

                // Load club context (settings, upcoming events, etc.)
                const settings = {};
                if (window.SiteSettings?._cache) {
                    Object.keys(window.SiteSettings._cache).forEach(k => {
                        if (['club_name', 'parent_club', 'club_id', 'charter_date', 'district', 'district_region', 'current_rotary_year'].includes(k)) {
                            settings[k] = window.SiteSettings.get(k);
                        }
                    });
                }

                let upcomingEvents = [];
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
                    const { data } = await window.DB_ADMIN.from('events').select('event_name, date, start_time, venue, avenue_slug').eq('status', 'approved').gte('date', today).lte('date', nextWeek).limit(5);
                    upcomingEvents = data || [];
                } catch (e) { /* silent */ }

                let officeBearers = {};
                if (window.getOfficeBearers) {
                    officeBearers = await window.getOfficeBearers();
                }

                this.clubContext = {
                    settings,
                    upcomingEvents,
                    bearers: Object.keys(officeBearers).map(role => ({
                        role,
                        name: officeBearers[role]?.full_name,
                        portfolio: officeBearers[role]?.portfolio
                    })).filter(b => b.name)
                };
            } catch (e) {
                console.warn('[Chatbot] Context load error:', e);
            }
        },

        injectStyles() {
            if (document.getElementById('chatbot-styles-v5')) return;
            const style = document.createElement('style');
            style.id = 'chatbot-styles-v5';
            style.textContent = `
                .chat-message {
                    animation: chatSlideIn 300ms var(--ease, cubic-bezier(0.4,0,0.2,1));
                }
                @keyframes chatSlideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .chat-bubble-bot {
                    background: var(--bg-elevated, rgba(255,255,255,0.08));
                    color: var(--text-primary);
                    border: 1px solid var(--border);
                    border-radius: 16px 16px 16px 4px;
                    padding: 12px 14px;
                    font-size: 12px;
                    line-height: 1.6;
                    max-width: 100%;
                }
                .chat-bubble-user {
                    background: linear-gradient(135deg, #1a73e8, #7c3aed);
                    color: white;
                    border-radius: 16px 16px 4px 16px;
                    padding: 10px 14px;
                    font-size: 12px;
                    line-height: 1.6;
                    max-width: 100%;
                }
                .chat-bubble-bot p { margin: 0 0 8px; }
                .chat-bubble-bot p:last-child { margin-bottom: 0; }
                .chat-bubble-bot ul,
                .chat-bubble-bot ol { margin: 6px 0 8px 20px; padding: 0; }
                .chat-bubble-bot li { margin: 3px 0; }
                .chat-bubble-bot strong { font-weight: 700; color: var(--blue, #1a73e8); }
                .chat-bubble-bot em { font-style: italic; color: var(--purple, #7c3aed); }
                .chat-bubble-bot code {
                    background: rgba(26,115,232,0.08);
                    color: var(--blue);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-family: 'Courier New', monospace;
                }
                .chat-bubble-bot pre {
                    background: rgba(0,0,0,0.05);
                    padding: 10px;
                    border-radius: 8px;
                    overflow-x: auto;
                    margin: 8px 0;
                    font-size: 11px;
                }
                .dark .chat-bubble-bot pre { background: rgba(255,255,255,0.03); }
                .chat-bubble-bot blockquote {
                    border-left: 3px solid var(--blue);
                    padding-left: 10px;
                    margin: 8px 0;
                    color: var(--text-secondary);
                    font-style: italic;
                }
                .chat-bubble-bot a { color: var(--blue); text-decoration: underline; font-weight: 600; }
                .chat-bubble-bot h1, .chat-bubble-bot h2, .chat-bubble-bot h3 {
                    font-weight: 800;
                    margin: 12px 0 6px;
                    color: var(--text-primary);
                }
                .chat-bubble-bot h1 { font-size: 14px; }
                .chat-bubble-bot h2 { font-size: 13px; }
                .chat-bubble-bot h3 { font-size: 12px; color: var(--blue); }
                .chat-bubble-bot hr {
                    border: none;
                    border-top: 1px solid var(--border);
                    margin: 10px 0;
                }
                .chat-typing-dots {
                    display: inline-flex;
                    gap: 4px;
                    padding: 10px 14px;
                    background: var(--bg-elevated);
                    border: 1px solid var(--border);
                    border-radius: 16px 16px 16px 4px;
                }
                .chat-typing-dots span {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--blue);
                    animation: typingPulse 1.4s ease-in-out infinite;
                }
                .chat-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
                .chat-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typingPulse {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
                    30% { transform: translateY(-6px); opacity: 1; }
                }
                .chat-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 6px 12px;
                    background: var(--bg-card, rgba(255,255,255,0.6));
                    border: 1px solid var(--border);
                    border-radius: 100px;
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 180ms;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .chat-chip:hover {
                    border-color: var(--blue);
                    color: var(--blue);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(26,115,232,0.15);
                }
                .chat-chip i { font-size: 9px; }
                .voice-btn {
                    position: relative;
                }
                .voice-btn.listening {
                    background: var(--red) !important;
                    animation: voicePulse 1.5s ease-in-out infinite;
                }
                @keyframes voicePulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
                    50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
                }
                .message-actions {
                    display: flex;
                    gap: 6px;
                    margin-top: 6px;
                    opacity: 0;
                    transition: opacity 180ms;
                }
                .chat-message:hover .message-actions {
                    opacity: 1;
                }
                .message-action-btn {
                    padding: 3px 8px;
                    font-size: 9px;
                    font-weight: 600;
                    color: var(--text-tertiary);
                    background: transparent;
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 150ms;
                }
                .message-action-btn:hover {
                    color: var(--blue);
                    border-color: var(--blue);
                }
                .chat-welcome-panel {
                    padding: 16px;
                    background: linear-gradient(135deg, rgba(26,115,232,0.05), rgba(124,58,237,0.05));
                    border: 1px solid rgba(26,115,232,0.15);
                    border-radius: 16px;
                    margin-bottom: 12px;
                }
                .message-timestamp {
                    font-size: 9px;
                    color: var(--text-tertiary);
                    margin-top: 4px;
                    padding: 0 4px;
                }
                .chat-error-banner {
                    padding: 10px 12px;
                    background: rgba(239,68,68,0.08);
                    border: 1px solid rgba(239,68,68,0.2);
                    border-radius: 10px;
                    color: var(--red);
                    font-size: 11px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
            `;
            document.head.appendChild(style);
        },

        // ==========================================
        // 2. EVENT BINDINGS
        // ==========================================
        bindEvents() {
            const launcher = document.getElementById('chatbot-launcher');
            const closeBtn = document.getElementById('chatbot-close');
            const submitBtn = document.getElementById('chatbot-submit');
            const input = document.getElementById('chatbot-input');
            const panel = document.getElementById('chatbot-panel');

            if (launcher) launcher.addEventListener('click', () => this.toggle());
            if (closeBtn) closeBtn.addEventListener('click', () => this.close());
            if (submitBtn) submitBtn.addEventListener('click', () => this.sendMessage());
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });
                input.addEventListener('input', () => this.handleInputChange(input));
            }

            // Bind quick action chips
            document.querySelectorAll('.chat-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const text = chip.getAttribute('data-query') || chip.textContent.trim();
                    if (input) input.value = text;
                    this.sendMessage();
                });
            });

            // Close on outside click (mobile)
            document.addEventListener('click', (e) => {
                if (this.isOpen && window.innerWidth < 640) {
                    if (!panel?.contains(e.target) && !launcher?.contains(e.target)) {
                        // Optional: close on outside click
                    }
                }
            });

            // Escape key closes
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) this.close();
            });
        },

        handleInputChange(input) {
            // Auto-grow logic could go here
            const submitBtn = document.getElementById('chatbot-submit');
            if (submitBtn) {
                submitBtn.disabled = !input.value.trim();
            }
        },

        // ==========================================
        // 3. VOICE RECOGNITION
        // ==========================================
        setupVoiceRecognition() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) {
                console.log('[Chatbot] Voice recognition not supported');
                return;
            }

            this.voiceRecognition = new SR();
            this.voiceRecognition.continuous = false;
            this.voiceRecognition.interimResults = true;
            this.voiceRecognition.lang = 'en-IN';

            this.voiceRecognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(r => r[0].transcript)
                    .join('');
                const input = document.getElementById('chatbot-input');
                if (input) input.value = transcript;
            };

            this.voiceRecognition.onend = () => {
                this.isListening = false;
                this.updateVoiceButton();
                const input = document.getElementById('chatbot-input');
                if (input && input.value.trim()) {
                    setTimeout(() => this.sendMessage(), 500);
                }
            };

            this.voiceRecognition.onerror = (event) => {
                console.warn('[Chatbot] Voice error:', event.error);
                this.isListening = false;
                this.updateVoiceButton();
                if (event.error === 'not-allowed') {
                    this.showError('Microphone access denied');
                }
            };
        },

        toggleVoice() {
            if (!this.voiceRecognition) {
                this.showError('Voice input not supported in your browser');
                return;
            }
            if (this.isListening) {
                this.voiceRecognition.stop();
            } else {
                try {
                    this.voiceRecognition.start();
                    this.isListening = true;
                    this.updateVoiceButton();
                } catch (e) {
                    this.showError('Could not start voice input');
                }
            }
        },

        updateVoiceButton() {
            const btn = document.getElementById('chatbot-voice-btn');
            if (btn) {
                btn.classList.toggle('listening', this.isListening);
                btn.innerHTML = this.isListening
                    ? '<i class="fa-solid fa-stop text-xs"></i>'
                    : '<i class="fa-solid fa-microphone text-xs"></i>';
            }
        },

        // ==========================================
        // 4. OPEN / CLOSE / TOGGLE
        // ==========================================
        toggle() {
            if (this.isOpen) this.close();
            else this.open();
        },

        open() {
            this.isOpen = true;
            const panel = document.getElementById('chatbot-panel');
            if (panel) {
                panel.classList.remove('hidden');
                requestAnimationFrame(() => panel.classList.add('open'));
            }
            // Load context when opening
            this.loadContext();
            // Enhance existing panel UI
            this.enhancePanelUI();
            // Focus input
            setTimeout(() => {
                const input = document.getElementById('chatbot-input');
                if (input) input.focus();
            }, 300);
        },

        close() {
            this.isOpen = false;
            const panel = document.getElementById('chatbot-panel');
            if (panel) {
                panel.classList.remove('open');
                setTimeout(() => panel.classList.add('hidden'), 300);
            }
        },

        enhancePanelUI() {
            // Add quick action chips if not already enhanced
            const chipContainer = document.querySelector('#chatbot-panel .chat-chip')?.parentElement;
            if (chipContainer && !chipContainer.getAttribute('data-enhanced')) {
                chipContainer.setAttribute('data-enhanced', 'true');
                chipContainer.innerHTML = this.QUICK_ACTIONS.map(action => `
                    <button class="chat-chip" data-query="${action.query}" onclick="Chatbot.handleChipClick('${action.query.replace(/'/g, "\\'")}')">
                        <i class="fa-solid ${action.icon}"></i>${action.label}
                    </button>
                `).join('');
            }

            // Add voice input button if speech recognition available
            if (this.voiceRecognition) {
                const submitBtn = document.getElementById('chatbot-submit');
                if (submitBtn && !document.getElementById('chatbot-voice-btn')) {
                    const voiceBtn = document.createElement('button');
                    voiceBtn.id = 'chatbot-voice-btn';
                    voiceBtn.className = 'voice-btn w-10 h-10 bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-xl flex items-center justify-center hover:scale-105 transition-all';
                    voiceBtn.title = 'Voice Input';
                    voiceBtn.innerHTML = '<i class="fa-solid fa-microphone text-xs"></i>';
                    voiceBtn.addEventListener('click', () => this.toggleVoice());
                    submitBtn.parentElement.insertBefore(voiceBtn, submitBtn);
                }
            }

            // Enhance input placeholder
            const input = document.getElementById('chatbot-input');
            if (input && !input.getAttribute('data-enhanced')) {
                input.setAttribute('data-enhanced', 'true');
                input.setAttribute('placeholder', 'Ask about Rotary, District 3206, our club, or anything else...');
            }

            // Render welcome message with history if available
            this.renderInitialMessages();
        },

        handleChipClick(query) {
            const input = document.getElementById('chatbot-input');
            if (input) input.value = query;
            this.sendMessage();
        },

        // ==========================================
        // 5. MESSAGE SENDING
        // ==========================================
        async sendMessage() {
            const input = document.getElementById('chatbot-input');
            const logs = document.getElementById('chatbot-logs');
            if (!input || !logs) return;

            const message = input.value.trim();
            if (!message || this.isTyping) return;

            input.value = '';
            this.handleInputChange(input);

            // Add user message
            this.appendUserMessage(message);
            this.scrollToBottom();

            // Show typing indicator
            this.showTypingIndicator();

            // Call AI
            try {
                const response = await this.callAI(message);
                this.hideTypingIndicator();
                this.appendBotMessage(response);
                this.scrollToBottom();

                // Save to history
                this.messageHistory.push({ role: 'user', content: message });
                this.messageHistory.push({ role: 'assistant', content: response });
                this.trimHistory();
                this.saveHistoryToStorage();
            } catch (error) {
                this.hideTypingIndicator();
                console.error('[Chatbot] Error:', error);
                this.appendErrorMessage(error.message || 'Connection error. Please try again.');
                this.scrollToBottom();
            }
        },

        // ==========================================
        // 6. AI API CALL
        // ==========================================
        async callAI(userMessage) {
            const apiKey = window.AppConfig?.CHATBOT_API_KEY || window.SiteSettings?.get?.('chatbot_api_key');
            if (!apiKey) {
                throw new Error('API key not configured. Please contact administrator.');
            }

            const model = window.AppConfig?.CHATBOT_MODEL || window.SiteSettings?.get?.('chatbot_model', this.DEFAULT_MODEL);

            // Build messages array
            const messages = [
                { role: 'system', content: this.buildSystemPrompt() }
            ];

            // Add conversation history (last N messages for context)
            const recentHistory = this.messageHistory.slice(-this.maxContextMessages);
            recentHistory.forEach(msg => messages.push(msg));

            // Add current user message
            messages.push({ role: 'user', content: userMessage });

            try {
                const response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + apiKey,
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'Rotaract Unity Portal'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        max_tokens: this.MAX_TOKENS,
                        temperature: this.TEMPERATURE,
                        stream: false
                    })
                });

                if (!response.ok) {
                    // Try fallback model
                    if (model !== this.FALLBACK_MODEL) {
                        console.log('[Chatbot] Primary model failed, trying fallback');
                        return await this.callAIFallback(userMessage, apiKey, messages);
                    }
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;

                if (!content) {
                    throw new Error('Empty response from AI');
                }

                return content.trim();
            } catch (error) {
                console.error('[Chatbot] API error:', error);
                throw error;
            }
        },

        async callAIFallback(userMessage, apiKey, messages) {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiKey,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Rotaract Unity Portal'
                },
                body: JSON.stringify({
                    model: this.FALLBACK_MODEL,
                    messages: messages,
                    max_tokens: this.MAX_TOKENS,
                    temperature: this.TEMPERATURE
                })
            });

            if (!response.ok) throw new Error('AI service unavailable');
            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || 'I apologize, I could not generate a response.';
        },

        // ==========================================
        // 7. SYSTEM PROMPT CONSTRUCTION
        // ==========================================
        buildSystemPrompt() {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-IN');

            let contextInfo = '';
            if (this.clubContext) {
                if (this.clubContext.upcomingEvents?.length > 0) {
                    contextInfo += '\n\nUPCOMING EVENTS (Next 7 Days):\n';
                    this.clubContext.upcomingEvents.forEach(e => {
                        contextInfo += `- "${e.event_name}" on ${e.date} at ${e.start_time}, Venue: ${e.venue}\n`;
                    });
                }
                if (this.clubContext.bearers?.length > 0) {
                    contextInfo += '\n\nCURRENT OFFICE BEARERS:\n';
                    this.clubContext.bearers.forEach(b => {
                        contextInfo += `- ${b.portfolio || b.role}: ${b.name}\n`;
                    });
                }
            }

            let userInfo = '';
            if (this.currentUser) {
                userInfo = `\n\nThe user you are chatting with is logged in: ${this.currentUser.name} (${this.currentUser.portfolio || this.currentUser.role}).`;
            }

            return `You are the official AI assistant for **Rotaract Club of Coimbatore Unity** — a premier youth-led service organization.

CORE IDENTITY:
- **Club Name**: Rotaract Club of Coimbatore Unity
- **Parent Club**: Family of Rotary Club of Coimbatore East
- **Club ID**: 91594
- **Charter Date**: 21.04.2014
- **District**: Rotary International District 3206 (Coimbatore | Palakkad)
- **Current Rotary Year**: 2026-27
- **Motto**: Service Above Self

YOUR PERSONALITY:
- Professional, warm, and knowledgeable
- Enthusiastic about Rotaract and Rotary International
- Helpful and detail-oriented
- Format responses with clear structure using markdown (**bold**, *italic*, bullet points, headers)
- Use short paragraphs for readability
- Never use emojis
- When discussing dates/times, use the IST timezone

CURRENT CONTEXT:
- Today: ${dateStr}
- Current Time (IST): ${timeStr}
${contextInfo}${userInfo}

COMPREHENSIVE KNOWLEDGE AREAS:

**1. ROTARACT**
- Rotaract is a youth-led service organization for people ages 18+
- Sponsored by Rotary Clubs worldwide
- Focus: Fellowship, Leadership Development, Professional Growth, Community Service, International Understanding
- Four Avenues of Service: Club Service, Community Service, Professional Service, International Service

**2. ROTARY INTERNATIONAL**
- Global network of 1.4+ million neighbors, friends, and leaders
- 46,000+ clubs in 200+ countries and geographical areas
- Founded 1905 in Chicago by Paul P. Harris
- Headquarters: Evanston, Illinois, USA

**3. ROTARY INTERNATIONAL DISTRICT 3206**
- Covers Coimbatore and Palakkad regions
- Part of Rotary International
- Oversees Rotaract clubs including Rotaract Club of Coimbatore Unity
- Organizes district-wide initiatives, training programs, and signature events
- Hosts annual District Rotaract Conference (DRC)

**4. RSAMDIO**
- Rotaract South Asia Multi District Information Organisation
- Connects Rotaract districts across South Asia (India, Sri Lanka, Bangladesh, Nepal, Bhutan, Maldives, Pakistan)
- Facilitates cross-border project collaboration and knowledge sharing
- Promotes Rotaract activities and best practices

**5. SEVEN AREAS OF FOCUS (Rotary Foundation)**
1. Peace and Conflict Prevention/Resolution
2. Disease Prevention and Treatment
3. Water, Sanitation, and Hygiene (WASH)
4. Maternal and Child Health
5. Basic Education and Literacy
6. Economic and Community Development
7. Supporting the Environment (added 2020)

**6. END POLIO NOW**
- Rotary's #1 global priority since 1985
- Reduced polio cases by 99.9% globally
- Partners: WHO, UNICEF, CDC, Bill & Melinda Gates Foundation
- Only 2 countries remain endemic: Afghanistan and Pakistan
- Every $1 Rotary contributes is matched 2-to-1 by Gates Foundation

**7. THE FOUR-WAY TEST** (by Herbert J. Taylor, 1932)
Of the things we think, say or do:
1. Is it the TRUTH?
2. Is it FAIR to all concerned?
3. Will it build GOODWILL and better FRIENDSHIPS?
4. Will it be BENEFICIAL to all concerned?

**8. THE ROTARY FOUNDATION (TRF)**
- Charitable arm of Rotary International
- Transforms gifts into service projects worldwide
- Programs: PolioPlus, Global Grants, District Grants, Peace Fellowships
- Over $4 billion contributed to humanitarian causes

**9. DISTRICT PRIORITY PROJECTS (DPP)**
Eight pillars aligning with Rotary focus areas:
1. Peace and Conflict Prevention
2. Disease Prevention and Treatment
3. Water and Sanitation
4. Maternal and Child Health
5. Basic Education and Literacy
6. Economic and Community Development
7. Environment
8. Mental Health

DPP Categories:
- Category A: Awareness programs
- Category B: Hands-on service
- Category C: Sustainable impact (requires follow-up plan)

**10. OUR CLUB'S SPECIAL FEATURES**
- Emergency Blood Donation Request Portal (WhatsApp alerts to donor chairs)
- Monthly Bulletin & Newsletter publication
- Multiplayer game zone for member fellowship
- AI-powered admin portal for events, meetings, treasury
- Automatic birthday wishes to members
- Real-time project tracking across 5 avenues

**11. HOW TO JOIN**
- Age: 18+
- Visit the "Join Us" section on our website
- Fill the enrollment form with: Full Name, Email, Phone, DOB, Blood Group, Profession, Photo
- Membership Chair reviews application
- Approved candidates receive welcome email with portal access

**12. KEY ROLES IN OUR CLUB**
- President (leads the club)
- Immediate Past President (IPP)
- Vice President
- Secretary (Administration + Communication)
- Treasurer
- Advisor
- Avenue Directors (one per avenue)
- Specialized Chairs: DPP, Blood Donor, Club Editor, Public Image, Membership, TRF
- Board Members
- General Members

RESPONSE GUIDELINES:
- Keep answers concise but comprehensive
- Use **bold** for key terms and names
- Use bullet points for lists
- Use ## for section headers in longer responses
- When asked about events, cite from the UPCOMING EVENTS context above
- When asked about leaders, cite from CURRENT OFFICE BEARERS
- For specific club member info, direct them to the Members section
- For general knowledge questions beyond Rotary, answer helpfully but briefly
- Always maintain professional tone befitting Rotaract values
- If you don't know something specific, say so and suggest contacting the club at **rc.cbeunity@gmail.com**

Begin every response with substantive content immediately. Do not say "Sure", "Great question", or similar fillers.`;
        },

        // ==========================================
        // 8. MESSAGE RENDERING
        // ==========================================
        appendUserMessage(message) {
            const logs = document.getElementById('chatbot-logs');
            if (!logs) return;

            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            const div = document.createElement('div');
            div.className = 'chat-message flex flex-col items-end gap-1 ml-auto max-w-[85%]';
            div.innerHTML = `
                <div class="chat-bubble-user">${this.escapeHtml(message)}</div>
                <div class="message-timestamp text-right">${timeStr}</div>
            `;
            logs.appendChild(div);
        },

        appendBotMessage(markdown) {
            const logs = document.getElementById('chatbot-logs');
            if (!logs) return;

            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

            const div = document.createElement('div');
            div.className = 'chat-message flex gap-2.5 max-w-[90%]';
            div.innerHTML = `
                <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center flex-shrink-0 shadow-md">
                    <i class="fa-solid fa-robot text-white text-[10px]"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="chat-bubble-bot">${this.renderMarkdown(markdown)}</div>
                    <div class="flex items-center gap-3 mt-1 px-1">
                        <div class="message-timestamp">${timeStr}</div>
                        <div class="message-actions">
                            <button class="message-action-btn" onclick="Chatbot.copyMessage(this)">
                                <i class="fa-regular fa-copy mr-0.5"></i>Copy
                            </button>
                            <button class="message-action-btn" onclick="Chatbot.regenerateResponse()">
                                <i class="fa-solid fa-rotate mr-0.5"></i>Regenerate
                            </button>
                        </div>
                    </div>
                </div>
            `;
            logs.appendChild(div);
        },

        appendErrorMessage(error) {
            const logs = document.getElementById('chatbot-logs');
            if (!logs) return;

            const div = document.createElement('div');
            div.className = 'chat-message flex gap-2.5 max-w-[90%]';
            div.innerHTML = `
                <div class="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-triangle-exclamation text-red-500 text-[10px]"></i>
                </div>
                <div class="chat-error-banner flex-1">
                    <span>${this.escapeHtml(error)}</span>
                    <button class="ml-auto text-[10px] font-bold hover:underline" onclick="Chatbot.retryLastMessage()">Retry</button>
                </div>
            `;
            logs.appendChild(div);
        },

        showTypingIndicator() {
            this.isTyping = true;
            const logs = document.getElementById('chatbot-logs');
            if (!logs) return;

            const div = document.createElement('div');
            div.id = 'chatbot-typing-indicator';
            div.className = 'chat-message flex gap-2.5 max-w-[85%]';
            div.innerHTML = `
                <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center flex-shrink-0 shadow-md">
                    <i class="fa-solid fa-robot text-white text-[10px]"></i>
                </div>
                <div class="chat-typing-dots">
                    <span></span><span></span><span></span>
                </div>
            `;
            logs.appendChild(div);
            this.scrollToBottom();
        },

        hideTypingIndicator() {
            this.isTyping = false;
            const indicator = document.getElementById('chatbot-typing-indicator');
            if (indicator) indicator.remove();
        },

        renderInitialMessages() {
            const logs = document.getElementById('chatbot-logs');
            if (!logs || logs.getAttribute('data-initialized') === 'true') return;
            logs.setAttribute('data-initialized', 'true');
            logs.innerHTML = '';

            // Welcome panel
            const welcomePanel = document.createElement('div');
            welcomePanel.className = 'chat-welcome-panel';
            welcomePanel.innerHTML = `
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center shadow-md">
                        <i class="fa-solid fa-robot text-white"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-black">Unity AI Assistant</h4>
                        <p class="text-[9px] text-slate-500">Powered by advanced AI</p>
                    </div>
                </div>
                <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    I'm here to help with everything about <strong>Rotaract Club of Coimbatore Unity</strong>, Rotary International District 3206, upcoming events, membership, and general knowledge. Ask me anything!
                </p>
            `;
            logs.appendChild(welcomePanel);

            // Restore conversation history if exists
            if (this.messageHistory.length > 0) {
                const continuedPanel = document.createElement('div');
                continuedPanel.className = 'text-center py-2 text-[9px] text-slate-400 uppercase tracking-widest font-bold';
                continuedPanel.innerHTML = '<i class="fa-solid fa-clock-rotate-left mr-1"></i>Continuing previous conversation';
                logs.appendChild(continuedPanel);

                this.messageHistory.forEach(msg => {
                    if (msg.role === 'user') this.appendUserMessage(msg.content);
                    else this.appendBotMessage(msg.content);
                });
            }

            this.scrollToBottom();
        },

        // ==========================================
        // 9. MARKDOWN RENDERING
        // ==========================================
        renderMarkdown(text) {
            if (!text) return '';
            let html = this.escapeHtml(text);

            // Code blocks (```code```)
            html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
                return `<pre><code>${code.trim()}</code></pre>`;
            });

            // Inline code (`code`)
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

            // Headers (### ## #)
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

            // Bold (**text** or __text__)
            html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

            // Italic (*text* or _text_)
            html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
            html = html.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');

            // Links [text](url)
            html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

            // Horizontal rule
            html = html.replace(/^---$/gm, '<hr>');

            // Blockquotes
            html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

            // Unordered lists
            html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
            html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

            // Ordered lists
            html = html.replace(/^\d+\. (.+)$/gm, '<li class="numbered">$1</li>');
            html = html.replace(/(<li class="numbered">.*<\/li>\n?)+/g, (match) => `<ol>${match.replace(/class="numbered"/g, '')}</ol>`);

            // Paragraphs (double newline)
            html = html.split(/\n\n+/).map(para => {
                para = para.trim();
                if (!para) return '';
                if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') || para.startsWith('<pre') || para.startsWith('<blockquote') || para.startsWith('<hr')) return para;
                return `<p>${para.replace(/\n/g, '<br>')}</p>`;
            }).join('');

            return html;
        },

        // ==========================================
        // 10. MESSAGE ACTIONS
        // ==========================================
        copyMessage(btn) {
            const bubble = btn.closest('.chat-message')?.querySelector('.chat-bubble-bot');
            if (!bubble) return;
            const text = bubble.innerText;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    const original = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-check mr-0.5"></i>Copied!';
                    btn.style.color = 'var(--green)';
                    setTimeout(() => {
                        btn.innerHTML = original;
                        btn.style.color = '';
                    }, 1500);
                }).catch(() => {
                    window.AppToast?.error?.('Copy failed');
                });
            }
        },

        regenerateResponse() {
            if (this.messageHistory.length < 2 || this.isTyping) return;
            // Remove last bot response from history
            this.messageHistory.pop();
            // Get last user message
            const lastUserMsg = this.messageHistory[this.messageHistory.length - 1]?.content;
            if (!lastUserMsg) return;
            // Remove last bot bubble from UI
            const logs = document.getElementById('chatbot-logs');
            if (logs) {
                const messages = logs.querySelectorAll('.chat-message');
                const lastBot = Array.from(messages).reverse().find(m => m.querySelector('.chat-bubble-bot'));
                if (lastBot) lastBot.remove();
            }
            // Resend
            this.showTypingIndicator();
            this.callAI(lastUserMsg).then(response => {
                this.hideTypingIndicator();
                this.appendBotMessage(response);
                this.messageHistory.push({ role: 'assistant', content: response });
                this.saveHistoryToStorage();
                this.scrollToBottom();
            }).catch(err => {
                this.hideTypingIndicator();
                this.appendErrorMessage(err.message);
                this.scrollToBottom();
            });
        },

        retryLastMessage() {
            if (this.messageHistory.length === 0) return;
            const lastUserMsg = this.messageHistory[this.messageHistory.length - 1]?.content;
            if (!lastUserMsg) return;
            // Remove any error bubbles
            document.querySelectorAll('.chat-error-banner').forEach(e => e.closest('.chat-message')?.remove());
            // Pop and resend
            this.messageHistory.pop();
            const input = document.getElementById('chatbot-input');
            if (input) input.value = lastUserMsg;
            this.sendMessage();
        },

        clearConversation() {
            if (!confirm('Clear this conversation? History will be deleted.')) return;
            this.messageHistory = [];
            this.saveHistoryToStorage();
            const logs = document.getElementById('chatbot-logs');
            if (logs) {
                logs.removeAttribute('data-initialized');
                this.renderInitialMessages();
            }
            window.AppToast?.success?.('Conversation cleared');
        },

        // ==========================================
        // 11. STORAGE
        // ==========================================
        generateConversationId() {
            return 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        },

        saveHistoryToStorage() {
            try {
                const data = {
                    conversationId: this.conversationId,
                    history: this.messageHistory,
                    timestamp: Date.now()
                };
                localStorage.setItem('unity_chat_history', JSON.stringify(data));
            } catch (e) { /* silent */ }
        },

        loadHistoryFromStorage() {
            try {
                const raw = localStorage.getItem('unity_chat_history');
                if (!raw) return;
                const data = JSON.parse(raw);
                // Expire after 24 hours
                if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
                    localStorage.removeItem('unity_chat_history');
                    return;
                }
                this.conversationId = data.conversationId || this.generateConversationId();
                this.messageHistory = Array.isArray(data.history) ? data.history : [];
            } catch (e) {
                localStorage.removeItem('unity_chat_history');
            }
        },

        trimHistory() {
            if (this.messageHistory.length > this.maxHistoryLength) {
                this.messageHistory = this.messageHistory.slice(-this.maxHistoryLength);
            }
        },

        // ==========================================
        // 12. UTILITIES
        // ==========================================
        scrollToBottom() {
            const logs = document.getElementById('chatbot-logs');
            if (logs) {
                setTimeout(() => {
                    logs.scrollTop = logs.scrollHeight;
                }, 50);
            }
        },

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        showError(message) {
            if (window.AppToast?.error) {
                window.AppToast.error(message);
            } else {
                console.error('[Chatbot]', message);
            }
        }
    };

    // Global exposure
    window.Chatbot = Chatbot;

    // Auto-initialize when DOM ready (prevent duplicate init)
if (!window._chatbotInitialized) {
    window._chatbotInitialized = true;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Chatbot.init());
    } else {
        Chatbot.init();
    }
}

})();