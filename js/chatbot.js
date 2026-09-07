/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - AI CHATBOT
   OpenRouter AI (GPT-4o) | Context-Aware | Rotary Expert
   Beautiful UX | Typing Animation | Chat History
   ============================================================ */

const Chatbot = {
    // ============================================================
    // CONFIGURATION
    // ============================================================
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: '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',
    model: 'openai/gpt-4o',
    initialized: false,
    isOpen: false,
    isTyping: false,
    messageHistory: [],
    contextData: [],
    maxHistoryLength: 20,
    storageKey: 'rotaract_unity_chat_history',

    // System prompt for AI
    systemPrompt: `You are Unity Assistant, the official AI chatbot for the Rotaract Club of Coimbatore Unity.

CLUB INFORMATION:
- Club Name: Rotaract Club of Coimbatore Unity
- Parent Club: Family of Rotary Club of Coimbatore East
- Club ID: 91594
- Charter Date: 21.4.2014
- District: Rotary International District 3206 (Coimbatore | Pallakkad)
- Email: rc.cbeunity@gmail.com

YOUR EXPERTISE:
You are an expert on:
1. Rotary International - history, mission, structure, programs
2. Rotaract - youth service organization, membership, activities
3. Rotary International District 3206 - all clubs, events, leadership
4. Rotaract District Organisation 3206 (RDO 3206)
5. RSAMDIO (Rotaract South Asia Multi-District Information Organisation)
6. End Polio Now campaign
7. The Rotary Foundation (TRF) - grants, programs, donations
8. Four-Way Test and Rotary values
9. Areas of focus and avenues of service
10. Rotaract Club of Coimbatore Unity - our projects, members, events
11. General knowledge questions

RESPONSE GUIDELINES:
- Be friendly, professional, and enthusiastic
- Use "we" and "our" when referring to the club (you represent the club)
- Provide accurate, concise answers
- If asked about specific member details, projects, or events, mention that visitors can check the website sections
- Use full names like "Rotary International District 3206" - do not use abbreviations unless commonly known
- For unrelated questions, provide helpful general knowledge answers
- Keep responses conversational and easy to read
- Use bullet points or numbered lists when helpful
- Always maintain the Rotary motto: "Service Above Self"
- If you don't know something specific about our club, suggest contacting rc.cbeunity@gmail.com

TONE: Warm, informative, professional, service-oriented`,

    // ============================================================
    // INITIALIZATION
    // ============================================================
    init() {
        if (this.initialized) return;
        this.initialized = true;

        this.bindEvents();
        this.loadContext();
        this.loadChatHistory();
        this.loadSettings();
    },

    bindEvents() {
        // Toggle button
        const toggleBtn = document.getElementById('chatbotToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Minimize button
        const minimizeBtn = document.getElementById('chatbotMinimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.close());
        }

        // Form submit
        const form = document.getElementById('chatbotForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Input enter key
        const input = document.getElementById('chatbotInput');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSubmit();
                }
            });
        }

        // Close on outside click (optional)
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('chatbotWidget');
            if (widget && !widget.contains(e.target) && this.isOpen) {
                // Don't auto-close, keep chat persistent
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },

    // ============================================================
    // LOAD SETTINGS FROM SUPABASE
    // ============================================================
    async loadSettings() {
        try {
            // Get chatbot API key from settings if available
            if (typeof App !== 'undefined' && App.settings) {
                const s = App.settings;
                if (s.chatbot_api_key && s.chatbot_api_key.trim()) {
                    this.apiKey = s.chatbot_api_key.trim();
                }
                if (s.chatbot_model && s.chatbot_model.trim()) {
                    this.model = s.chatbot_model.trim();
                }
            }

            // Wait for settings if not loaded yet
            let attempts = 0;
            const check = () => {
                attempts++;
                if (typeof App !== 'undefined' && App.settings && Object.keys(App.settings).length > 0) {
                    const s = App.settings;
                    if (s.chatbot_api_key && s.chatbot_api_key.trim()) {
                        this.apiKey = s.chatbot_api_key.trim();
                    }
                    if (s.chatbot_model && s.chatbot_model.trim()) {
                        this.model = s.chatbot_model.trim();
                    }
                    return;
                }
                if (attempts < 20) {
                    setTimeout(check, 500);
                }
            };
            setTimeout(check, 500);
        } catch (err) {
            console.warn('Chatbot settings load error:', err);
        }
    },

    // ============================================================
    // LOAD CONTEXT DATA FROM SUPABASE
    // ============================================================
    async loadContext() {
        try {
            const { data, error } = await supabaseClient
                .from('chatbot_context')
                .select('*');

            if (error) throw error;
            this.contextData = data || [];
        } catch (err) {
            console.error('Chatbot context load error:', err);
            this.contextData = [];
        }
    },

    // ============================================================
    // TOGGLE WINDOW
    // ============================================================
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        const window_ = document.getElementById('chatbotWindow');
        const toggleBtn = document.getElementById('chatbotToggle');
        const openIcon = document.querySelector('.chatbot-icon-open');
        const closeIcon = document.querySelector('.chatbot-icon-close');

        if (window_) window_.classList.remove('hidden');
        this.isOpen = true;

        if (openIcon) openIcon.classList.add('hidden');
        if (closeIcon) closeIcon.classList.remove('hidden');

        // Focus input
        setTimeout(() => {
            const input = document.getElementById('chatbotInput');
            if (input) input.focus();

            // Scroll to bottom
            this.scrollToBottom();
        }, 100);

        // Track opening
        if (typeof App !== 'undefined' && App.logActivity) {
            App.logActivity('chatbot_opened');
        }
    },

    close() {
        const window_ = document.getElementById('chatbotWindow');
        const openIcon = document.querySelector('.chatbot-icon-open');
        const closeIcon = document.querySelector('.chatbot-icon-close');

        if (window_) window_.classList.add('hidden');
        this.isOpen = false;

        if (openIcon) openIcon.classList.remove('hidden');
        if (closeIcon) closeIcon.classList.add('hidden');
    },

    // ============================================================
    // MESSAGE HANDLING
    // ============================================================
    async handleSubmit() {
        const input = document.getElementById('chatbotInput');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        // Prevent multiple simultaneous requests
        if (this.isTyping) {
            if (typeof App !== 'undefined' && App.toast) {
                App.toast('Please wait for the current response', 'warning', 2000);
            }
            return;
        }

        // Clear input
        input.value = '';

        // Add user message to UI
        this.addMessage(message, 'user');

        // Add to history
        this.messageHistory.push({ role: 'user', content: message });

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Get AI response
            const response = await this.getAIResponse(message);

            // Remove typing indicator
            this.hideTypingIndicator();

            // Add bot response
            if (response) {
                this.addMessage(response, 'bot');
                this.messageHistory.push({ role: 'assistant', content: response });
            } else {
                this.addMessage(this.getFallbackResponse(message), 'bot');
            }

            // Save history
            this.saveChatHistory();

            // Trim history if too long
            if (this.messageHistory.length > this.maxHistoryLength) {
                this.messageHistory = this.messageHistory.slice(-this.maxHistoryLength);
            }
        } catch (err) {
            console.error('Chatbot error:', err);
            this.hideTypingIndicator();
            this.addMessage(this.getErrorResponse(err), 'bot');
        }
    },

    // ============================================================
    // AI API CALL (OpenRouter)
    // ============================================================
    async getAIResponse(userMessage) {
        try {
            // Build context from local data
            const contextInfo = this.buildContextInfo();

            // Build messages array
            const messages = [
                {
                    role: 'system',
                    content: this.systemPrompt + '\n\nADDITIONAL CONTEXT:\n' + contextInfo
                }
            ];

            // Add recent conversation history (last 10 messages)
            const recentHistory = this.messageHistory.slice(-10);
            messages.push(...recentHistory);

            // Make API call
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Rotaract Unity Chatbot'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 800,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('OpenRouter API error:', response.status, errorText);
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();

            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content.trim();
            }

            if (data.error) {
                throw new Error(data.error.message || 'API error');
            }

            throw new Error('Invalid response format');
        } catch (err) {
            console.error('AI response error:', err);

            // Try to use local context data as fallback
            const localAnswer = this.getLocalAnswer(userMessage);
            if (localAnswer) return localAnswer;

            throw err;
        }
    },

    // ============================================================
    // BUILD CONTEXT INFO FROM LOCAL DATA
    // ============================================================
    buildContextInfo() {
        let context = '';

        if (this.contextData && this.contextData.length > 0) {
            context += 'CLUB KNOWLEDGE BASE:\n';
            this.contextData.forEach(item => {
                context += `\n[${item.topic}] (${item.category}): ${item.content}\n`;
            });
        }

        // Add current club settings if available
        if (typeof App !== 'undefined' && App.settings) {
            const s = App.settings;
            context += '\n\nCURRENT CLUB DATA:\n';
            if (s.club_name) context += `Club Name: ${s.club_name}\n`;
            if (s.parent_club) context += `Parent Club: ${s.parent_club}\n`;
            if (s.club_id) context += `Club ID: ${s.club_id}\n`;
            if (s.charter_date) context += `Charter Date: ${s.charter_date}\n`;
            if (s.district) context += `District: ${s.district}\n`;
            if (s.address) context += `Address: ${s.address}\n`;
            if (s.club_email) context += `Contact Email: ${s.club_email}\n`;
        }

        return context;
    },

    // ============================================================
    // LOCAL FALLBACK - Search context data
    // ============================================================
    getLocalAnswer(question) {
        if (!this.contextData || this.contextData.length === 0) return null;

        const lowerQ = question.toLowerCase();
        const keywords = lowerQ.split(/\s+/).filter(w => w.length > 2);

        // Score each context item
        const scored = this.contextData.map(item => {
            const text = (item.topic + ' ' + item.category + ' ' + item.content).toLowerCase();
            let score = 0;

            keywords.forEach(kw => {
                if (text.includes(kw)) score += 1;
                if (item.topic.toLowerCase().includes(kw)) score += 2;
            });

            return { item, score };
        });

        // Sort by score
        scored.sort((a, b) => b.score - a.score);

        if (scored[0] && scored[0].score >= 2) {
            return scored[0].item.content;
        }

        return null;
    },

    getFallbackResponse(question) {
        return `I apologize, but I'm having trouble processing your question right now. Here's what I can help with:

• Rotary International & District 3206
• Rotaract programs & activities
• Our club - Rotaract Club of Coimbatore Unity
• End Polio Now campaign
• The Rotary Foundation
• Membership information

For specific queries, please contact us at rc.cbeunity@gmail.com`;
    },

    getErrorResponse(err) {
        return `I'm currently experiencing technical difficulties. Please try again in a moment.

In the meantime, feel free to:
• Browse our projects section
• Check our members page
• Read our latest bulletin
• Contact us at rc.cbeunity@gmail.com

Thank you for your patience!`;
    },

    // ============================================================
    // UI FUNCTIONS
    // ============================================================
    addMessage(text, type = 'bot') {
        const messages = document.getElementById('chatbotMessages');
        if (!messages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.innerHTML = `
            <div class="chat-bubble">${this.formatMessage(text)}</div>
        `;

        messages.appendChild(messageDiv);
        this.scrollToBottom();
    },

    /**
     * Format message content (convert markdown-like syntax to HTML)
     */
    formatMessage(text) {
        if (!text) return '';

        // Escape HTML first
        let formatted = this.esc(text);

        // Convert **bold** to <strong>
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Convert *italic* to <em>
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Convert URLs to links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">$1</a>'
        );

        // Convert email addresses to mailto links
        formatted = formatted.replace(
            /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
            '<a href="mailto:$1" style="color: inherit; text-decoration: underline;">$1</a>'
        );

        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        // Convert bullet points (• or *) at start of line
        formatted = formatted.replace(/^([•\-\*])\s+/gm, '• ');

        // Convert numbered lists (keep as is but style)
        formatted = formatted.replace(/^(\d+)\.\s+/gm, '$1. ');

        return formatted;
    },

    showTypingIndicator() {
        this.isTyping = true;
        const messages = document.getElementById('chatbotMessages');
        if (!messages) return;

        // Remove existing typing indicator if any
        this.hideTypingIndicator();

        const typing = document.createElement('div');
        typing.id = 'chatTypingIndicator';
        typing.className = 'chat-message bot';
        typing.innerHTML = `
            <div class="chat-typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        messages.appendChild(typing);
        this.scrollToBottom();

        // Disable send button
        const sendBtn = document.querySelector('.chatbot-send');
        if (sendBtn) sendBtn.disabled = true;
    },

    hideTypingIndicator() {
        this.isTyping = false;
        const typing = document.getElementById('chatTypingIndicator');
        if (typing) typing.remove();

        // Re-enable send button
        const sendBtn = document.querySelector('.chatbot-send');
        if (sendBtn) sendBtn.disabled = false;
    },

    scrollToBottom() {
        const messages = document.getElementById('chatbotMessages');
        if (!messages) return;

        setTimeout(() => {
            messages.scrollTop = messages.scrollHeight;
        }, 50);
    },

    // ============================================================
    // CHAT HISTORY PERSISTENCE
    // ============================================================
    saveChatHistory() {
        try {
            // Only save last 10 messages to avoid storage bloat
            const toSave = this.messageHistory.slice(-10);
            localStorage.setItem(this.storageKey, JSON.stringify({
                history: toSave,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.warn('Save chat history error:', err);
        }
    },

    loadChatHistory() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (!saved) return;

            const data = JSON.parse(saved);

            // Only restore if less than 24 hours old
            const ageMs = Date.now() - (data.timestamp || 0);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            if (ageMs > maxAge) {
                localStorage.removeItem(this.storageKey);
                return;
            }

            if (data.history && Array.isArray(data.history)) {
                this.messageHistory = data.history;

                // Restore messages in UI
                const messages = document.getElementById('chatbotMessages');
                if (messages && data.history.length > 0) {
                    // Keep welcome message, add history
                    data.history.forEach(msg => {
                        if (msg.role === 'user') {
                            this.addMessageWithoutTracking(msg.content, 'user');
                        } else if (msg.role === 'assistant') {
                            this.addMessageWithoutTracking(msg.content, 'bot');
                        }
                    });
                }
            }
        } catch (err) {
            console.warn('Load chat history error:', err);
            localStorage.removeItem(this.storageKey);
        }
    },

    addMessageWithoutTracking(text, type) {
        const messages = document.getElementById('chatbotMessages');
        if (!messages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.innerHTML = `
            <div class="chat-bubble">${this.formatMessage(text)}</div>
        `;
        messages.appendChild(messageDiv);
    },

    clearHistory() {
        this.messageHistory = [];
        localStorage.removeItem(this.storageKey);

        const messages = document.getElementById('chatbotMessages');
        if (messages) {
            messages.innerHTML = `
                <div class="chat-message bot">
                    <div class="chat-bubble">
                        Chat cleared! How can I help you today?
                    </div>
                </div>
            `;
        }

        if (typeof App !== 'undefined' && App.toast) {
            App.toast('Chat history cleared', 'info');
        }
    },

    // ============================================================
    // QUICK REPLIES / SUGGESTIONS
    // ============================================================
    injectQuickReplies() {
        const messages = document.getElementById('chatbotMessages');
        if (!messages) return;

        const suggestions = [
            'What is Rotaract?',
            'How to join?',
            'About our club',
            'What is District 3206?',
            'End Polio Now'
        ];

        const div = document.createElement('div');
        div.className = 'chat-quick-replies';
        div.innerHTML = suggestions.map(s => `
            <button class="chat-quick-reply" onclick="Chatbot.sendQuickReply('${this.esc(s)}')">${s}</button>
        `).join('');

        messages.appendChild(div);
        this.scrollToBottom();
    },

    sendQuickReply(text) {
        const input = document.getElementById('chatbotInput');
        if (input) {
            input.value = text;
            this.handleSubmit();
        }
    },

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

// ============================================================
// INJECT ADDITIONAL STYLES
// ============================================================
(function() {
    if (document.getElementById('chatbotAdditionalStyles')) return;

    const style = document.createElement('style');
    style.id = 'chatbotAdditionalStyles';
    style.textContent = `
        .chat-bubble a {
            color: inherit !important;
            text-decoration: underline;
            word-break: break-all;
        }
        .chat-quick-replies {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
            padding: 0.5rem;
            margin-top: 0.5rem;
        }
        .chat-quick-reply {
            padding: 0.4rem 0.85rem;
            background: var(--bg-glass);
            border: 1px solid var(--primary);
            color: var(--primary);
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
        }
        .chat-quick-reply:hover {
            background: var(--primary);
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 10px var(--primary-glow);
        }
        .chat-message strong {
            font-weight: 700;
        }
        .chat-message em {
            font-style: italic;
        }
    `;
    document.head.appendChild(style);
})();

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof Chatbot !== 'undefined') Chatbot.init();
    }, 800);
});

// Global exposure
window.Chatbot = Chatbot;