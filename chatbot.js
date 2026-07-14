/* ============================================================
   ROTARACT CLUB OF COIMBATORE UNITY - AI CHATBOT
   OpenRouter AI - Full general knowledge + Rotary expertise
   New API key - Complete bug fixes
   File: chatbot.js
   ============================================================ */

'use strict';

// ============================================================
// CHATBOT STATE
// ============================================================
var ChatState = {
    isOpen: false,
    isTyping: false,
    conversationHistory: [],
    sessionId: '',
    messageCount: 0,
    maxHistoryLength: 12,
    initialized: false,
    apiKey: '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',
    primaryModel: 'meta-llama/llama-3.1-8b-instruct:free',
    fallbackModel: 'mistralai/mistral-7b-instruct:free',
    backupModel: 'google/gemma-2-9b-it:free',
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    retryCount: 0,
    maxRetries: 2
};

// ============================================================
// ROTARY KNOWLEDGE BASE - Instant local responses
// ============================================================
var RotaryKB = {
    'what is rotary': 'Rotary International is a global service organization founded on February 23, 1905, by Paul P. Harris in Chicago, USA. It has over 1.4 million members in more than 46,000 clubs across 200+ countries. Rotarians are business and professional leaders who provide humanitarian service, promote peace, and build goodwill and understanding among nations.',

    'what is rotaract': 'Rotaract is a Rotary-sponsored service club for young men and women between the ages of 18 and 30. The name combines "Rotary" and "action." Rotaract was founded on March 13, 1968, when Rotary International granted a charter to the first club in Charlotte, North Carolina, USA. March 13 is celebrated as World Rotaract Day every year. Rotaract clubs work in partnership with sponsoring Rotary clubs on service projects.',

    'rotaract club of coimbatore unity': 'Rotaract Club of Coimbatore Unity is a vibrant service club chartered on 21st April 2014. It is proudly a Family of Rotary Club of Coimbatore East, under Rotary International District 3206 (Coimbatore | Pallakkad). Club ID: 91594. The club has been serving the community for over 11 years through five service avenues: Club Service, Community Service, Professional Service, International Service, and District Priority Projects. Contact: rc.cbeunity@gmail.com | Social: @rotaractunity',

    'district 3206': 'Rotary International District 3206 covers the regions of Coimbatore and Palakkad in South India. The district brings together numerous Rotary and Rotaract clubs committed to serving communities across these regions through Rotary\'s six areas of focus: promoting peace, fighting disease, providing clean water, saving mothers and children, supporting education, and growing local economies.',

    'rsamdio': 'RSAMDIO stands for Rotaract South Asia Multi District Information Organization. It is the official information and communication body for Rotaract clubs across multiple districts in South Asia. RSAMDIO facilitates communication, collaboration, and sharing of best practices among Rotaract clubs and Rotaract District Organisations across South Asian countries.',

    'rdo': 'RDO stands for Rotaract District Organisation. The Rotaract District Organisation 3206 coordinates all Rotaract clubs within Rotary International District 3206. It organizes district-level events, training programs, RYLA (Rotary Youth Leadership Awards), inter-club projects, and guides clubs toward achieving Rotary International standards.',

    'end polio': 'End Polio Now is Rotary International\'s flagship global initiative. Since 1985, Rotary and its partners have immunized more than 2.5 billion children in 122 countries against polio. Rotary has contributed over $2.1 billion to the global polio eradication effort. Polio cases have been reduced by 99.9 percent. Rotary works with the Global Polio Eradication Initiative (GPEI), which includes WHO, UNICEF, the US CDC, and the Bill & Melinda Gates Foundation. Currently, efforts focus on eliminating remaining cases in Afghanistan and Pakistan.',

    'rotary foundation': 'The Rotary Foundation is the charitable arm of Rotary International. It transforms member contributions into grants that fund impactful, sustainable projects worldwide. Programs include Global Grants, District Grants, Vocational Training Teams, Rotary Peace Fellowships, and RYLA. The Foundation has spent more than $4 billion on charitable work since 1917.',

    'four way test': 'The Four-Way Test is Rotary\'s ethical guide for things Rotarians think, say, or do. It was created by Herbert J. Taylor in 1932 and adopted by Rotary International in 1943. The four questions are: 1. Is it the TRUTH? 2. Is it FAIR to all concerned? 3. Will it build GOODWILL and BETTER FRIENDSHIPS? 4. Will it be BENEFICIAL to all concerned?',

    'rotary motto': 'The Rotary motto is "Service Above Self." Another important Rotary principle is "He profits most who serves best." These mottos reflect the core philosophy that serving others is the highest calling and that selfless service creates the greatest personal and community benefit.',

    'paul harris': 'Paul Percy Harris (April 19, 1868 - January 27, 1947) was the founder of Rotary International. He founded the first Rotary club on February 23, 1905, in Chicago, Illinois. Harris was an attorney who brought together professionals from different backgrounds to form a club emphasizing fellowship and community service. The "Paul Harris Fellow" recognition honors those who contribute $1,000 or more to The Rotary Foundation.',

    'how to join': 'To join Rotaract Club of Coimbatore Unity, you must be between 18 and 30 years of age and reside in or near Coimbatore. You can apply through the membership application form on our website in the "Join Us" section. You will need to provide your name, email, phone number, date of birth, blood group, and a professional photograph. After review by the club, approved applicants will be inducted as members. For more information, email us at rc.cbeunity@gmail.com',

    'service avenues': 'Rotaract clubs work through five service avenues: (1) Club Service - activities that strengthen the club internally through fellowship events, recruitment, training, and installations. (2) Community Service - projects improving local quality of life such as blood donation, health camps, environmental drives, and education programs. (3) Professional Service - developing vocational skills through career guidance, workshops, entrepreneurship programs, and mentorship. (4) International Service - promoting global understanding through partnerships, cultural exchanges, and international project collaborations. (5) District Priority Projects - aligned with goals set by the Rotary district for the year.',

    'rotary year': 'The Rotary year runs from July 1 to June 30. At the start of each new Rotary year, club officers including the President, Secretary, and Treasurer take their positions through an Installation Ceremony. The Rotary International President sets a theme for the year that guides all clubs and districts in their service activities.',

    'district governor': 'The District Governor is the chief executive officer of the Rotary district for a one-year term. The Governor represents Rotary International in the district, visits clubs, provides leadership training, inspires clubs to achieve their goals, and ensures clubs maintain Rotary\'s standards of excellence.',

    'peace fellowship': 'The Rotary Peace Fellowship is one of Rotary\'s most prestigious programs. It provides fully funded scholarships for peace and development professionals to study at one of Rotary\'s six peace centers at leading universities worldwide. Fellows earn a master\'s degree in peace and conflict resolution studies or complete a professional development certificate program.',

    'interact': 'Interact is Rotary\'s service club for young people ages 12 to 18. Interact clubs are sponsored by local Rotary clubs and work on two service projects per year - one that benefits the local community and one that promotes international understanding. Interact is the youngest of Rotary\'s family of programs.',

    'vocational training': 'Vocational Training Teams are groups of professionals organized by Rotary districts or clubs who travel internationally to share their expertise with people in other countries. They provide practical training in areas like healthcare, agriculture, education, and technology to help communities develop sustainable livelihoods.',

    'rotary areas of focus': 'Rotary focuses on six areas where it can make the greatest impact: (1) Promoting Peace through conflict prevention and resolution. (2) Fighting Disease through immunization and disease prevention. (3) Providing Clean Water, Sanitation, and Hygiene. (4) Saving Mothers and Children through maternal and child health programs. (5) Supporting Education through basic education and literacy. (6) Growing Local Economies through economic and community development.',

    'hello': 'Hello! Welcome to Rotaract Club of Coimbatore Unity. I am Unity Assistant, your AI chatbot. I can help you with questions about our club, Rotary International, Rotaract, District 3206, End Polio Now, or virtually any other topic. What would you like to know today?',

    'club service': 'Club Service is one of the five Rotaract service avenues focusing on activities that strengthen the club internally. This includes organizing fellowship events, installation ceremonies, celebrating club anniversaries, internal training programs, board meetings, member recruitment drives, and activities that build camaraderie and team spirit among club members.',

    'community service': 'Community Service focuses on projects that improve the quality of life in the local community. Examples include blood donation camps, tree planting drives, educational workshops for underprivileged children, health awareness programs, environmental cleanup drives, distributing essentials to those in need, and supporting local NGOs and charities.',

    'professional service': 'Professional Service develops the vocational skills of Rotaractors and encourages members to use their professional expertise to serve others. This includes career guidance workshops, resume building sessions, entrepreneurship seminars, skill development programs, industry visits, professional networking events, and mentorship programs with senior professionals.',

    'international service': 'International Service promotes international understanding and peace through activities connecting people across countries and cultures. Activities include international project partnerships with other Rotaract clubs, cultural exchange programs, participation in Rotary Foundation global grants, pen pal initiatives, and joint projects with clubs in other districts or countries.',

    'district priority': 'District Priority Projects are service projects aligned with the specific priorities set by the District Governor for the Rotary year. These projects address pressing needs identified by the district leadership and are coordinated across multiple clubs to create larger, more impactful initiatives that go beyond what individual clubs can achieve alone.',

    'ryla': 'RYLA stands for Rotary Youth Leadership Awards. It is a leadership training program organized by Rotary districts for young people, typically between 14 and 30 years of age. RYLA programs develop leadership skills, self-confidence, communication abilities, and a commitment to community service through intensive residential camps, workshops, and experiential learning.',

    'rotary international': 'Rotary International is headquartered in Evanston, Illinois, USA. It is one of the largest service organizations in the world, with over 1.4 million members in 46,000+ clubs in 200+ countries. The organization works across six areas of focus and is particularly known for its commitment to eradicating polio through the End Polio Now campaign.',

    'charter': 'The Rotaract Club of Coimbatore Unity was chartered on 21st April 2014. A charter is the official document from Rotary International recognizing a new Rotary or Rotaract club. The charter date marks the founding anniversary of the club, which is typically celebrated each year as Charter Anniversary or Chartering Day.',

    'club id': 'The Rotaract Club of Coimbatore Unity has Club ID 91594 assigned by Rotary International. This unique identifier is used in official Rotary records and correspondence to identify the club worldwide.',

    'what is your name': 'I am Unity Assistant, the official AI chatbot of Rotaract Club of Coimbatore Unity. I am here to help you with any questions - whether about Rotary, Rotaract, our club activities, or any other topic you need assistance with!',

    'who are you': 'I am Unity Assistant, the official AI chatbot for Rotaract Club of Coimbatore Unity. I can answer questions about Rotary International, Rotaract, District 3206, End Polio Now, our club, membership, projects, and virtually any other topic you would like to discuss!'
};

// ============================================================
// SYSTEM PROMPT - Full general knowledge
// ============================================================
function getSystemPrompt() {
    return [
        'You are Unity Assistant, the official AI chatbot for Rotaract Club of Coimbatore Unity.',
        '',
        'CLUB DETAILS:',
        '- Club Name: Rotaract Club of Coimbatore Unity',
        '- Parent Club: Rotary Club of Coimbatore East',
        '- District: Rotary International District 3206 (Coimbatore | Pallakkad)',
        '- Club ID: 91594',
        '- Charter Date: 21st April 2014',
        '- Email: rc.cbeunity@gmail.com',
        '- Social Media: @rotaractunity',
        '- Location: Coimbatore, Tamil Nadu, India',
        '',
        'YOUR CAPABILITIES:',
        'You are a highly knowledgeable general-purpose AI assistant. You can answer questions on ANY topic including:',
        '- Science, Technology, Engineering, Mathematics',
        '- History, Geography, Current Events',
        '- Arts, Literature, Music, Culture',
        '- Business, Finance, Career Advice',
        '- Health, Wellness, Nutrition',
        '- Programming, Web Development, Data Science',
        '- General Knowledge and Trivia',
        '- AND all Rotary/Rotaract topics below',
        '',
        'ROTARY EXPERTISE:',
        '- Rotary International (founded 1905 by Paul Harris)',
        '- Rotaract (founded 1968, ages 18-30)',
        '- Rotary International District 3206 (Coimbatore | Pallakkad)',
        '- Rotaract District Organisation 3206 (RDO)',
        '- RSAMDIO (Rotaract South Asia Multi District Information Organization)',
        '- End Polio Now campaign',
        '- The Rotary Foundation',
        '- Four-Way Test',
        '- Five Service Avenues',
        '- RYLA (Rotary Youth Leadership Awards)',
        '- Rotary Peace Fellowship',
        '- Interact Clubs',
        '',
        'RESPONSE STYLE:',
        '- Be friendly, helpful, professional, and enthusiastic',
        '- Give comprehensive but concise answers (100-300 words typically)',
        '- For Rotary/club queries: be very detailed and accurate',
        '- For general queries: provide clear, helpful, accurate information',
        '- Never refuse to answer a reasonable question',
        '- For membership queries: direct to rc.cbeunity@gmail.com or the Join Us section',
        '- Use proper formatting with line breaks for readability',
        '- Never use emojis',
        '- Respond in the same language the user uses',
        '- Do not make up facts - if unsure, say so clearly'
    ].join('\n');
}

// ============================================================
// INITIALIZE CHATBOT
// ============================================================
function initChatbot() {
    if (ChatState.initialized) return;

    // Set session ID
    ChatState.sessionId = (AppState && AppState.chatSessionId) ? AppState.chatSessionId : generateUUID();
    ChatState.initialized = true;

    // Load API key from settings
    var settingsKey = '';
    if (typeof getSetting === 'function') {
        settingsKey = getSetting('ai_api_key', '');
    }
    if (settingsKey && settingsKey.indexOf('sk-or-v1-') === 0) {
        ChatState.apiKey = settingsKey;
    }

    console.log('%c Chatbot initialized ', 'background:#0057b7;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;');
}

// ============================================================
// TOGGLE CHATBOT WINDOW
// ============================================================
function toggleChatbot() {
    var win = document.getElementById('chatbotWindow');
    var openIcon = document.querySelector('.chatbot-icon-open');
    var closeIcon = document.querySelector('.chatbot-icon-close');

    if (!win) return;

    ChatState.isOpen = !ChatState.isOpen;
    if (AppState) AppState.chatbotOpen = ChatState.isOpen;

    if (ChatState.isOpen) {
        win.style.display = 'flex';
        if (openIcon) openIcon.style.display = 'none';
        if (closeIcon) closeIcon.style.display = 'block';

        if (!ChatState.initialized) initChatbot();

        // Focus input
        setTimeout(function() {
            var inp = document.getElementById('chatInput');
            if (inp) inp.focus();
            scrollChatToBottom();
        }, 150);

    } else {
        win.style.display = 'none';
        if (openIcon) openIcon.style.display = 'block';
        if (closeIcon) closeIcon.style.display = 'none';
    }

    if (typeof refreshIcons === 'function') refreshIcons();
}

// ============================================================
// CLEAR CHAT
// ============================================================
function clearChat() {
    ChatState.conversationHistory = [];
    ChatState.messageCount = 0;

    var msgs = document.getElementById('chatbotMessages');
    if (msgs) {
        msgs.innerHTML = createBotMsgHTML('Chat cleared. Ask me anything - about Rotary, Rotaract, our club, or any topic you need help with!');
        if (typeof refreshIcons === 'function') refreshIcons();
    }

    var sugg = document.getElementById('chatbotSuggestions');
    if (sugg) sugg.style.display = 'flex';
}

// ============================================================
// ASK SUGGESTION
// ============================================================
function askSuggestion(text) {
    if (!text) return;

    // Hide suggestions
    var sugg = document.getElementById('chatbotSuggestions');
    if (sugg) sugg.style.display = 'none';

    // Set and send
    var inp = document.getElementById('chatInput');
    if (inp) inp.value = text;
    sendChatMessage({ preventDefault: function() {} });
}

// ============================================================
// SEND CHAT MESSAGE - Main entry point
// ============================================================
async function sendChatMessage(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (ChatState.isTyping) return;

    var inp = document.getElementById('chatInput');
    if (!inp) return;

    var userMsg = inp.value.trim();
    if (!userMsg) return;

    // Clear input immediately
    inp.value = '';

    // Initialize if needed
    if (!ChatState.initialized) initChatbot();

    // Hide suggestions on first message
    var sugg = document.getElementById('chatbotSuggestions');
    if (sugg) sugg.style.display = 'none';

    ChatState.messageCount++;
    ChatState.retryCount = 0;

    // Check if chatbot is enabled
    if (typeof getSetting === 'function' && getSetting('chatbot_enabled', 'true') === 'false') {
        addUserMsg(userMsg);
        addBotMsg('The chatbot is currently disabled. Please contact us at rc.cbeunity@gmail.com for assistance.');
        return;
    }

    // Add user message to UI
    addUserMsg(userMsg);

    // Show typing indicator
    ChatState.isTyping = true;
    var typingId = showTyping();

    try {
        var response = await getResponse(userMsg);

        removeTyping(typingId);
        ChatState.isTyping = false;
        addBotMsg(response);

        // Update history
        ChatState.conversationHistory.push({ role: 'user', content: userMsg });
        ChatState.conversationHistory.push({ role: 'assistant', content: response });

        // Trim history
        if (ChatState.conversationHistory.length > ChatState.maxHistoryLength * 2) {
            ChatState.conversationHistory = ChatState.conversationHistory.slice(-ChatState.maxHistoryLength);
        }

        // Save to database
        await saveChatToDB(userMsg, response);

    } catch (err) {
        removeTyping(typingId);
        ChatState.isTyping = false;
        console.error('Chatbot error:', err);

        // Try local knowledge as fallback
        var localAnswer = getLocalAnswer(userMsg);
        var fallbackMsg = localAnswer ||
            'I encountered an issue processing your request. Please try rephrasing your question, or contact us directly at rc.cbeunity@gmail.com for assistance.';

        addBotMsg(fallbackMsg);
        await saveChatToDB(userMsg, fallbackMsg);
    }
}

// ============================================================
// GET RESPONSE - Smart routing
// ============================================================
async function getResponse(userMsg) {
    // 1. Check local knowledge first for Rotary topics (faster)
    var localAnswer = getLocalAnswer(userMsg);

    // Use local for very specific Rotary questions (high confidence)
    if (localAnswer && isRotaryQuery(userMsg)) {
        await simulateDelay(500 + Math.random() * 400);
        return localAnswer;
    }

    // 2. Try AI API for all other questions
    try {
        var aiResponse = await callOpenRouterAPI(userMsg);
        if (aiResponse && aiResponse.length > 10) {
            return aiResponse;
        }
    } catch (apiErr) {
        console.warn('Primary API failed:', apiErr.message);

        // 3. Try fallback model
        try {
            var fallbackResponse = await callOpenRouterAPI(userMsg, ChatState.fallbackModel);
            if (fallbackResponse && fallbackResponse.length > 10) {
                return fallbackResponse;
            }
        } catch (fallbackErr) {
            console.warn('Fallback model failed:', fallbackErr.message);

            // 4. Try backup model
            try {
                var backupResponse = await callOpenRouterAPI(userMsg, ChatState.backupModel);
                if (backupResponse && backupResponse.length > 10) {
                    return backupResponse;
                }
            } catch (backupErr) {
                console.warn('Backup model failed:', backupErr.message);
            }
        }
    }

    // 5. Final fallback to local knowledge
    if (localAnswer) return localAnswer;

    throw new Error('All response methods failed');
}

// ============================================================
// CALL OPENROUTER API
// ============================================================
async function callOpenRouterAPI(userMsg, modelOverride) {
    var model = modelOverride || ChatState.primaryModel;
    var apiKey = ChatState.apiKey;

    if (!apiKey) throw new Error('No API key configured');

    // Build messages with history
    var messages = [{ role: 'system', content: getSystemPrompt() }];

    // Add recent conversation history (last 6 exchanges)
    var recentHistory = ChatState.conversationHistory.slice(-6);
    recentHistory.forEach(function(m) {
        messages.push({ role: m.role, content: m.content });
    });

    // Add current message
    messages.push({ role: 'user', content: userMsg });

    // Timeout controller
    var controller = null;
    var timeoutId = null;

    try {
        if (window.AbortController) {
            controller = new AbortController();
            timeoutId = setTimeout(function() {
                if (controller) controller.abort();
            }, 18000); // 18 second timeout
        }

        var fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey,
                'HTTP-Referer': window.location.href || 'https://rotaractunity.netlify.app',
                'X-Title': 'Rotaract Club of Coimbatore Unity - Unity Assistant'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: 500,
                temperature: 0.72,
                top_p: 0.9,
                stream: false
            })
        };

        if (controller) {
            fetchOptions.signal = controller.signal;
        }

        var response = await fetch(ChatState.apiEndpoint, fetchOptions);

        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) {
            var errorText = '';
            try { errorText = await response.text(); } catch (e) {}
            console.error('API Error', response.status, errorText.substring(0, 200));
            throw new Error('API responded with status ' + response.status);
        }

        var data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'API returned error');
        }

        var content = data.choices &&
            data.choices[0] &&
            data.choices[0].message &&
            data.choices[0].message.content;

        if (!content || content.trim().length === 0) {
            throw new Error('Empty response from API');
        }

        return content.trim();

    } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        throw err;
    }
}

// ============================================================
// IS ROTARY QUERY - Detect Rotary-specific questions
// ============================================================
function isRotaryQuery(msg) {
    if (!msg) return false;
    var lower = msg.toLowerCase();
    var keywords = [
        'rotary', 'rotaract', 'district', 'rdo', 'rsamdio', 'polio',
        'charter', 'club id', 'four way', 'four-way', 'service avenue',
        'paul harris', 'interact', 'ryla', 'rotarian', 'fellowship',
        'coimbatore unity', 'rc.cbe', 'district 3206', 'end polio'
    ];
    return keywords.some(function(k) { return lower.indexOf(k) !== -1; });
}

// ============================================================
// GET LOCAL ANSWER - Match from knowledge base
// ============================================================
function getLocalAnswer(msg) {
    if (!msg) return null;
    var lower = msg.toLowerCase().trim();

    // Direct key match
    var keys = Object.keys(RotaryKB);
    for (var i = 0; i < keys.length; i++) {
        if (lower.indexOf(keys[i]) !== -1) {
            return RotaryKB[keys[i]];
        }
    }

    // Pattern matching
    if (lower.indexOf('polio') !== -1) return RotaryKB['end polio'];
    if (lower.indexOf('foundation') !== -1 || lower.indexOf('grant') !== -1) return RotaryKB['rotary foundation'];
    if ((lower.indexOf('four') !== -1 && lower.indexOf('test') !== -1) || lower.indexOf('4-way') !== -1) return RotaryKB['four way test'];
    if (lower.indexOf('motto') !== -1 || lower.indexOf('service above self') !== -1) return RotaryKB['rotary motto'];
    if (lower.indexOf('paul harris') !== -1 || lower.indexOf('founder') !== -1) return RotaryKB['paul harris'];
    if (lower.indexOf('join') !== -1 || lower.indexOf('membership') !== -1 || lower.indexOf('member') !== -1) return RotaryKB['how to join'];
    if (lower.indexOf('avenue') !== -1) return RotaryKB['service avenues'];
    if ((lower.indexOf('3206') !== -1 || lower.indexOf('district') !== -1) && lower.indexOf('coimbatore') !== -1) return RotaryKB['district 3206'];
    if (lower.indexOf('unity') !== -1 || (lower.indexOf('coimbatore') !== -1 && lower.indexOf('club') !== -1)) return RotaryKB['rotaract club of coimbatore unity'];
    if (lower.indexOf('rsamdio') !== -1 || lower.indexOf('south asia multi') !== -1) return RotaryKB['rsamdio'];
    if (lower.indexOf(' rdo') !== -1 || lower.indexOf('district org') !== -1) return RotaryKB['rdo'];
    if (lower.indexOf('peace') !== -1 && lower.indexOf('fellow') !== -1) return RotaryKB['peace fellowship'];
    if (lower.indexOf('ryla') !== -1 || lower.indexOf('youth leadership award') !== -1) return RotaryKB['ryla'];
    if (lower.indexOf('community service') !== -1) return RotaryKB['community service'];
    if (lower.indexOf('club service') !== -1) return RotaryKB['club service'];
    if (lower.indexOf('professional service') !== -1) return RotaryKB['professional service'];
    if (lower.indexOf('international service') !== -1) return RotaryKB['international service'];
    if (lower.indexOf('district priority') !== -1) return RotaryKB['district priority'];
    if (lower.indexOf('areas of focus') !== -1 || lower.indexOf('area of focus') !== -1) return RotaryKB['rotary areas of focus'];
    if (lower.indexOf('rotary year') !== -1 || (lower.indexOf('july') !== -1 && lower.indexOf('june') !== -1)) return RotaryKB['rotary year'];
    if (lower.indexOf('district governor') !== -1 || (lower.indexOf('governor') !== -1 && lower.indexOf('district') !== -1)) return RotaryKB['district governor'];
    if (lower.indexOf('interact') !== -1 && lower.indexOf('rotaract') === -1) return RotaryKB['interact'];
    if (lower.indexOf('vocational') !== -1 || lower.indexOf('vtt') !== -1) return RotaryKB['vocational training'];
    if (lower.indexOf('charter') !== -1 || lower.indexOf('chartered') !== -1) return RotaryKB['charter'];
    if (lower.indexOf('club id') !== -1 || lower.indexOf('91594') !== -1) return RotaryKB['club id'];
    if (lower.indexOf('your name') !== -1 || lower.indexOf('what are you') !== -1) return RotaryKB['what is your name'];
    if (lower.indexOf('who are you') !== -1 || lower.indexOf('who is this') !== -1) return RotaryKB['who are you'];
    if (lower.indexOf('hello') !== -1 || lower.indexOf('hi') !== -1 || lower.indexOf('hey') !== -1 || lower.indexOf('namaste') !== -1) return RotaryKB['hello'];
    if (lower.indexOf('thank') !== -1) return 'You are very welcome! Feel free to ask me anything else - about Rotary, Rotaract, our club, or any other topic. Service Above Self!';
    if (lower.indexOf('bye') !== -1 || lower.indexOf('goodbye') !== -1) return 'Goodbye! It was great chatting with you. Come back anytime. Remember, Service Above Self - the Rotary way!';

    return null;
}

// ============================================================
// SIMULATE DELAY (for local responses)
// ============================================================
function simulateDelay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ============================================================
// ADD USER MESSAGE TO UI
// ============================================================
function addUserMsg(msg) {
    var msgs = document.getElementById('chatbotMessages');
    if (!msgs) return;

    var div = document.createElement('div');
    div.className = 'chat-message user-message';
    div.innerHTML = [
        '<div class="chat-avatar"><i data-lucide="user"></i></div>',
        '<div class="chat-bubble"><p>' + (typeof escapeHtml === 'function' ? escapeHtml(msg) : msg) + '</p></div>'
    ].join('');

    msgs.appendChild(div);
    scrollChatToBottom();
    if (typeof refreshIcons === 'function') refreshIcons();
}

// ============================================================
// ADD BOT MESSAGE TO UI
// ============================================================
function addBotMsg(msg) {
    var msgs = document.getElementById('chatbotMessages');
    if (!msgs) return;

    var div = document.createElement('div');
    div.className = 'chat-message bot-message';
    div.innerHTML = createBotMsgHTML(msg);
    msgs.appendChild(div);
    scrollChatToBottom();
    if (typeof refreshIcons === 'function') refreshIcons();
}

// ============================================================
// CREATE BOT MESSAGE HTML
// ============================================================
function createBotMsgHTML(msg) {
    if (!msg) msg = '';
    var safeMsg = typeof escapeHtml === 'function' ? escapeHtml(msg) : msg;

    // Format: convert double newlines to paragraphs, single newlines to <br>
    var formatted = safeMsg
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return [
        '<div class="chat-avatar"><i data-lucide="bot"></i></div>',
        '<div class="chat-bubble"><p>' + formatted + '</p></div>'
    ].join('');
}

// ============================================================
// TYPING INDICATOR
// ============================================================
function showTyping() {
    var msgs = document.getElementById('chatbotMessages');
    if (!msgs) return null;

    var id = 'typing-' + Date.now();
    var div = document.createElement('div');
    div.id = id;
    div.className = 'chat-message bot-message';
    div.innerHTML = [
        '<div class="chat-avatar"><i data-lucide="bot"></i></div>',
        '<div class="chat-bubble">',
        '<div class="typing-indicator"><span></span><span></span><span></span></div>',
        '</div>'
    ].join('');

    msgs.appendChild(div);
    scrollChatToBottom();
    if (typeof refreshIcons === 'function') refreshIcons();
    return id;
}

function removeTyping(id) {
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ============================================================
// SCROLL TO BOTTOM
// ============================================================
function scrollChatToBottom() {
    var msgs = document.getElementById('chatbotMessages');
    if (msgs) {
        setTimeout(function() { msgs.scrollTop = msgs.scrollHeight; }, 60);
    }
}

// ============================================================
// SAVE CHAT TO DATABASE
// ============================================================
async function saveChatToDB(userMsg, botResponse) {
    try {
        if (typeof supabase === 'undefined' || !supabase) return;
        await supabase.from('chatbot_conversations').insert({
            session_id: ChatState.sessionId,
            user_message: userMsg || '',
            bot_response: botResponse || ''
        });
    } catch (e) {
        console.warn('Chat DB save error (non-critical):', e);
    }
}

// ============================================================
// KEYBOARD HANDLER
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    var inp = document.getElementById('chatInput');
    if (inp) {
        inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage({ preventDefault: function() {} });
            }
        });
    }

    // Initialize chatbot
    initChatbot();
});

// ============================================================
// ADMIN: EXPORT CONVERSATIONS
// ============================================================
async function exportChatConversations() {
    try {
        if (typeof supabase === 'undefined' || !supabase) return;
        if (!window.XLSX) { showToast('error', 'Error', 'Excel library not loaded'); return; }

        var result = await supabase
            .from('chatbot_conversations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (result.error) throw result.error;

        var data = (result.data || []).map(function(c, i) {
            return {
                'S.No': i + 1,
                'Session': c.session_id ? c.session_id.substring(0, 8) + '...' : '-',
                'User Message': c.user_message || '',
                'Bot Response': (c.bot_response || '').substring(0, 200),
                'Date Time': typeof formatTimestamp === 'function' ? formatTimestamp(c.created_at) : c.created_at
            };
        });

        var ws = XLSX.utils.json_to_sheet(data);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Conversations');
        XLSX.writeFile(wb, 'Unity_Chatbot_Conversations_' + new Date().toISOString().split('T')[0] + '.xlsx');

        if (typeof showToast === 'function') showToast('success', 'Exported', 'Conversations exported successfully');
    } catch (err) {
        console.error('Export chat error:', err);
        if (typeof showToast === 'function') showToast('error', 'Export Failed', err.message);
    }
}

// ============================================================
// ADMIN: CHAT STATISTICS
// ============================================================
async function getChatStats() {
    try {
        if (typeof supabase === 'undefined' || !supabase) return null;

        var result = await supabase
            .from('chatbot_conversations')
            .select('session_id, created_at');

        if (result.error) return null;

        var data = result.data || [];
        var sessions = new Set(data.map(function(d) { return d.session_id; }));
        var todayData = data.filter(function(d) {
            return typeof isToday === 'function' ? isToday(d.created_at) : true;
        });

        return {
            totalMessages: data.length,
            uniqueSessions: sessions.size,
            today: todayData.length
        };
    } catch (err) {
        return null;
    }
}

// ============================================================
// UPDATE API KEY (Called when settings change)
// ============================================================
function updateChatbotApiKey(newKey) {
    if (newKey && newKey.indexOf('sk-or-v1-') === 0) {
        ChatState.apiKey = newKey;
        console.log('Chatbot API key updated');
    }
}

console.log('%c chatbot.js loaded ', 'background:#0057b7;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;');