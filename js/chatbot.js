/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY
   AI Chatbot - js/chatbot.js (shared between main & admin)
   ============================================================ */

(function () {
    'use strict';

    const cfg = window.UnityConfig;

    // ============================================================
    // CHATBOT INITIALIZATION
    // ============================================================
    function initChatbot() {
        const toggleBtn = document.getElementById('chatbot-toggle');
        if (!toggleBtn) return; // Not on main page

        const widget = document.getElementById('chatbot-widget');
        const minimizeBtn = document.getElementById('chatbot-minimize');
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');
        const messages = document.getElementById('chatbot-messages');
        const badge = document.getElementById('chatbot-badge');

        let conversationHistory = [
            {
                role: 'system',
                content: `You are the Unity Assistant for Rotaract Club of Coimbatore Unity.

CLUB DETAILS:
- Club Name: Rotaract Club of Coimbatore Unity
- Club ID: 91594
- Charter Date: 21st April 2014
- Family of: Rotary Club of Coimbatore East
- RI District: 3206 (Coimbatore | Pallakkad)
- Email: rc.cbeunity@gmail.com
- Location: Coimbatore, Tamil Nadu

YOUR EXPERTISE:
1. Rotary International - Founded 1905 by Paul Harris in Chicago
2. Rotaract - Youth service organization (ages 18-30), founded 1968
3. RI District 3206 - Covers Coimbatore and Pallakkad regions
4. RSAM District Organization - Rotaract, Interact, and SAM clubs
5. End Polio Now - Rotary's campaign to eradicate polio globally
6. The Four-Way Test - Is it the Truth? Is it Fair? Will it build Goodwill? Is it Beneficial?
7. Rotary Foundation - Charitable arm of Rotary International
8. Rotary's Seven Areas of Focus
9. District and club operations
10. General knowledge on all topics

PERSONALITY: Friendly, knowledgeable, concise, professional. 
Always respond in the same language as the user.
For club-specific questions, use the details provided above.`
            }
        ];

        // Toggle chatbot
        toggleBtn.addEventListener('click', () => {
            const isActive = widget.classList.toggle('active');
            if (isActive) {
                if (badge) badge.style.display = 'none';
                input?.focus();
                toggleBtn.querySelector('i').className = 'fas fa-times';
            } else {
                toggleBtn.querySelector('i').className = 'fas fa-robot';
            }
        });

        minimizeBtn?.addEventListener('click', () => {
            widget.classList.remove('active');
            toggleBtn.querySelector('i').className = 'fas fa-robot';
        });

        // Quick buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (input) {
                    input.value = btn.dataset.query;
                    input.style.height = 'auto';
                    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
                }
                sendMessage();
            });
        });

        // Send button
        sendBtn?.addEventListener('click', sendMessage);

        // Enter key (not Shift+Enter)
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        input?.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 80) + 'px';
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (widget.classList.contains('active') &&
                !widget.contains(e.target) &&
                !toggleBtn.contains(e.target)) {
                // Don't auto-close on main page, only minimize
            }
        });

        // ============================================================
        // SEND MESSAGE
        // ============================================================
        async function sendMessage() {
            const text = input?.value.trim();
            if (!text) return;

            // Clear input
            if (input) {
                input.value = '';
                input.style.height = 'auto';
            }

            // Add user message to history
            conversationHistory.push({ role: 'user', content: text });

            // Display user message
            appendMessage(text, 'user');

            // Show typing indicator
            const typingId = showTypingIndicator();

            try {
                const settings = await window.UnitySettings?.get() || {};
                const model = settings.chatbot_model || cfg.openrouter.model;
                const apiKey = cfg.openrouter.apiKey;

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'Rotaract Club of Coimbatore Unity'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: conversationHistory,
                        max_tokens: 1024,
                        temperature: 0.7
                    })
                });

                removeTypingIndicator(typingId);

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error?.message || 'API request failed');
                }

                const result = await response.json();
                const reply = result.choices?.[0]?.message?.content;

                if (!reply) throw new Error('No response from AI');

                // Add to history
                conversationHistory.push({ role: 'assistant', content: reply });

                // Keep history manageable (last 20 messages + system)
                if (conversationHistory.length > 21) {
                    conversationHistory = [
                        conversationHistory[0],
                        ...conversationHistory.slice(-20)
                    ];
                }

                appendMessage(reply, 'bot');

            } catch (err) {
                removeTypingIndicator(typingId);
                console.error('Chatbot error:', err);

                const errorMessages = [
                    "I'm having a bit of trouble connecting right now. Please try again in a moment!",
                    "Oops! Something went wrong on my end. Could you try asking again?",
                    "I couldn't process that request. Please check your connection and try again."
                ];

                appendMessage(errorMessages[Math.floor(Math.random() * errorMessages.length)], 'bot');
            }
        }

        // ============================================================
        // DISPLAY MESSAGE
        // ============================================================
        function appendMessage(text, sender) {
            if (!messages) return;

            const div = document.createElement('div');
            div.className = `chat-message ${sender === 'user' ? 'user-message' : 'bot-message'}`;
            div.innerHTML = `
                <div class="chat-avatar">
                    <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
                </div>
                <div class="chat-bubble">
                    <p>${formatMessageText(text)}</p>
                </div>
            `;

            messages.appendChild(div);

            // Smooth scroll to bottom
            requestAnimationFrame(() => {
                messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
            });
        }

        function formatMessageText(text) {
            if (!text) return '';

            // Escape HTML
            let formatted = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            // Format markdown-like syntax
            formatted = formatted
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;font-size:0.85em;">$1</code>')
                .replace(/\n\n/g, '</p><p style="margin:8px 0 0;">')
                .replace(/\n/g, '<br>');

            // Format numbered lists
            formatted = formatted.replace(/(\d+)\.\s/g, '<br><strong>$1.</strong> ');

            // Format bullet points
            formatted = formatted.replace(/^[-•]\s/gm, '<br>• ');

            return formatted;
        }

        function showTypingIndicator() {
            if (!messages) return null;

            const id = `typing-${Date.now()}`;
            const div = document.createElement('div');
            div.className = 'chat-message bot-message';
            div.id = id;
            div.innerHTML = `
                <div class="chat-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="chat-bubble">
                    <div style="display:flex;gap:5px;align-items:center;padding:4px 0;">
                        <div style="width:8px;height:8px;border-radius:50%;background:var(--primary-light, #3b82f6);animation:chatDot 1.2s ease-in-out infinite;"></div>
                        <div style="width:8px;height:8px;border-radius:50%;background:var(--primary-light, #3b82f6);animation:chatDot 1.2s ease-in-out 0.2s infinite;"></div>
                        <div style="width:8px;height:8px;border-radius:50%;background:var(--primary-light, #3b82f6);animation:chatDot 1.2s ease-in-out 0.4s infinite;"></div>
                    </div>
                </div>
            `;

            messages.appendChild(div);
            messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });

            // Add animation style if not exists
            if (!document.getElementById('chat-dot-style')) {
                const style = document.createElement('style');
                style.id = 'chat-dot-style';
                style.textContent = `
                    @keyframes chatDot {
                        0%, 100% { transform: translateY(0); opacity: 0.4; }
                        50% { transform: translateY(-5px); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }

            return id;
        }

        function removeTypingIndicator(id) {
            if (id) {
                const el = document.getElementById(id);
                if (el) el.remove();
            }
        }

        // ============================================================
        // KEYBOARD SHORTCUT
        // ============================================================
        document.addEventListener('keydown', (e) => {
            // Alt+C to open chatbot
            if (e.altKey && e.key === 'c') {
                toggleBtn.click();
            }
        });
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        // Small delay to ensure other modules are loaded
        setTimeout(initChatbot, 500);
    });

    // ============================================================
    // QUICK ANSWERS DATABASE (for offline fallback)
    // ============================================================
    window.ChatbotFAQ = {
        rotaract: "Rotaract is a Rotary-sponsored service organization for young adults aged 18-30. Founded in 1968 in Charlotte, North Carolina, Rotaract provides an opportunity for young men and women to enhance the knowledge and skills that will assist them in personal development, to address the physical and social needs of their communities, and to promote better relations between all people worldwide through a framework of friendship and service.",

        rotary: "Rotary International is a global network of 1.4 million neighbors, friends, leaders, and problem-solvers who see a world where people unite and take action to create lasting change across the globe, in our communities, and in ourselves. Founded in Chicago in 1905 by Paul Harris, Rotary's motto is 'Service Above Self'.",

        district3206: "Rotary International District 3206 covers the Coimbatore and Pallakkad regions of Tamil Nadu and Kerala, India. The district comprises numerous Rotary, Rotaract, and Interact clubs working together for community service and international goodwill.",

        endPolio: "End Polio Now is Rotary International's initiative to eradicate polio from the world. Since 1985, Rotary has contributed more than $2.1 billion and countless volunteer hours to protect nearly 3 billion children from polio. Polio cases have decreased by 99.9% since Rotary and its partners launched the Global Polio Eradication Initiative.",

        fourWayTest: "The Four-Way Test is a nonpartisan and nonsectarian ethical guide for Rotarians used in personal and professional relationships. It asks: (1) Is it the TRUTH? (2) Is it FAIR to all concerned? (3) Will it build GOODWILL and BETTER FRIENDSHIPS? (4) Will it be BENEFICIAL to all concerned?"
    };

    console.log('%c Chatbot.js loaded ', 'background:#8b5cf6;color:#fff;font-weight:700;padding:2px 8px;border-radius:4px;');

})();