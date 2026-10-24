// ============================================
// ROTARACT CLUB OF COIMBATORE UNITY
// COMPLETE ADVANCED ADMIN PORTAL SYSTEM
// File: js/admin.js | Version: 16.1.0 (Team Chat, Reset Data, live site settings)
// All Sessions Built-In | Full CRUD | Reports Engine
// ULTRA-POWERFUL SITE SETTINGS CONTROL
// ============================================

(function () {
    'use strict';

    // ================================================================
    // TEAM CHAT  -  WhatsApp-style group chat for the admin portal
    // Storage: Supabase tables (see chat_setup.sql) with an automatic
    // "this browser only" fallback so the feature never errors out.
    // ================================================================
    const ChatApp = (function () {
        const LS = 'unity_chat_';
        // Premium icon set (Font Awesome) - used for reactions, stickers and message previews
        const RX = {
            like: { i: 'fa-thumbs-up', c: '#2563eb', n: 'Like' }, love: { i: 'fa-heart', c: '#e11d48', n: 'Love' }, laugh: { i: 'fa-face-laugh-squint', c: '#f59e0b', n: 'Haha' },
            wow: { i: 'fa-face-surprise', c: '#f59e0b', n: 'Wow' }, sad: { i: 'fa-face-sad-tear', c: '#64748b', n: 'Sad' }, thanks: { i: 'fa-hands-praying', c: '#7c3aed', n: 'Thanks' },
            helpful: { i: 'fa-lightbulb', c: '#eab308', n: 'Helpful' }, done: { i: 'fa-circle-check', c: '#16a34a', n: 'Done' }
        };
        const QUICK = ['like', 'love', 'laugh', 'wow', 'sad', 'thanks', 'helpful'];
        const STICKERS = [
            ['smile', 'fa-face-smile', '#f59e0b'], ['grin', 'fa-face-grin-beam', '#f59e0b'], ['joy', 'fa-face-grin-tears', '#f59e0b'], ['wink', 'fa-face-grin-wink', '#f59e0b'], ['cool', 'fa-face-grin-stars', '#f59e0b'], ['hearteyes', 'fa-face-grin-hearts', '#e11d48'],
            ['kiss', 'fa-face-kiss-wink-heart', '#e11d48'], ['meh', 'fa-face-meh', '#64748b'], ['cry', 'fa-face-sad-cry', '#3b82f6'], ['angry', 'fa-face-angry', '#dc2626'], ['roll', 'fa-face-rolling-eyes', '#64748b'], ['tired', 'fa-face-tired', '#64748b'],
            ['like', 'fa-thumbs-up', '#2563eb'], ['dislike', 'fa-thumbs-down', '#64748b'], ['clap', 'fa-hands-clapping', '#f59e0b'], ['pray', 'fa-hands-praying', '#7c3aed'], ['handshake', 'fa-handshake', '#0ea5e9'], ['muscle', 'fa-dumbbell', '#475569'],
            ['peace', 'fa-hand-peace', '#f59e0b'], ['wave', 'fa-hand', '#f59e0b'], ['point', 'fa-hand-point-right', '#f59e0b'], ['fist', 'fa-hand-fist', '#f59e0b'],
            ['heart', 'fa-heart', '#e11d48'], ['star', 'fa-star', '#f59e0b'], ['fire', 'fa-fire', '#f97316'], ['bolt', 'fa-bolt', '#eab308'], ['sparkle', 'fa-wand-magic-sparkles', '#a855f7'], ['gem', 'fa-gem', '#06b6d4'],
            ['trophy', 'fa-trophy', '#eab308'], ['medal', 'fa-medal', '#f59e0b'], ['crown', 'fa-crown', '#eab308'], ['rocket', 'fa-rocket', '#7c3aed'], ['target', 'fa-bullseye', '#dc2626'], ['idea', 'fa-lightbulb', '#eab308'],
            ['check', 'fa-circle-check', '#16a34a'], ['cross', 'fa-circle-xmark', '#dc2626'], ['warn', 'fa-triangle-exclamation', '#f59e0b'], ['info', 'fa-circle-info', '#2563eb'], ['question', 'fa-circle-question', '#7c3aed'], ['flag', 'fa-flag', '#dc2626'],
            ['bell', 'fa-bell', '#f59e0b'], ['calendar', 'fa-calendar-check', '#2563eb'], ['clock', 'fa-clock', '#64748b'], ['pin', 'fa-thumbtack', '#dc2626'], ['clip', 'fa-paperclip', '#64748b'], ['mail', 'fa-envelope', '#2563eb'],
            ['phone', 'fa-phone', '#16a34a'], ['location', 'fa-location-dot', '#dc2626'], ['camera', 'fa-camera', '#475569'], ['music', 'fa-music', '#a855f7'], ['gift', 'fa-gift', '#ec4899'], ['cake', 'fa-cake-candles', '#ec4899'],
            ['coffee', 'fa-mug-hot', '#92400e'], ['pizza', 'fa-pizza-slice', '#f97316'], ['blood', 'fa-droplet', '#dc2626'], ['sun', 'fa-sun', '#f59e0b'], ['moon', 'fa-moon', '#6366f1'], ['leaf', 'fa-seedling', '#16a34a'],
            ['eyes', 'fa-eye', '#475569'], ['party', 'fa-champagne-glasses', '#f59e0b'], ['book', 'fa-book-open', '#2563eb'], ['money', 'fa-sack-dollar', '#16a34a']
        ];
        const STK = {}; STICKERS.forEach(s => { STK[s[0]] = { i: s[1], c: s[2] }; });
        const DEFAULT_TEMPLATES = [':like: Thanks!', ':check: On it', 'Noted, will update shortly.', 'Meeting in 10 minutes — please join.', 'Please share the latest report.', ':check: Approved'];
        const EDIT_WINDOW = 30 * 60 * 1000;

        const esc = s => AdminPanel.esc(s);
        function rxIcon(k) { const r = RX[k]; return r ? '<i class="fa-solid ' + r.i + '" style="color:' + r.c + '"></i>' : esc(k); }
        function tokens(h) {
            return String(h).replace(/:([a-z0-9_]{2,20}):/g, (m, n) => {
                const s = STK[n] || RX[n]; if (!s) return m;
                return '<i class="fa-solid ' + s.i + ' tc-st" style="color:' + s.c + '" title=":' + n + ':"></i>';
            });
        }
        const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
        const nowIso = () => new Date().toISOString();
        const ls = {
            get(k, d) { try { const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
            set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } }
        };
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const must = res => { if (res && res.error) throw res.error; return res ? res.data : null; };
        const sb = () => window.DB_ADMIN;

        // ---------------------------------------------------------------
        // Repositories
        // ---------------------------------------------------------------
        const DBRepo = {
            name: 'db',
            async probe() { must(await sb().from('chat_rooms').select('id').limit(1)); must(await sb().from('chat_messages').select('id').limit(1)); must(await sb().from('chat_members').select('id').limit(1)); },
            async ext() { try { must(await sb().from('chat_rep').select('user_id').limit(1)); must(await sb().from('chat_members').select('muted_until,notify').limit(1)); return true; } catch (e) { return false; } },
            async reps() { return must(await sb().from('chat_rep').select('*').limit(500)) || []; },
            async bumpRep(uid, name, d) {
                try {
                    const res = await sb().rpc('chat_rep_bump', { p_user: uid, p_name: name || '', p_points: d.points || 0, p_msgs: d.msgs || 0, p_reactions: d.reactions || 0, p_helpful: d.helpful || 0, p_kudos: d.kudos || 0, p_tasks: d.tasks_done || 0 });
                    if (!res.error && res.data) return Array.isArray(res.data) ? res.data[0] : res.data;
                } catch (e) { /* fall back to read-modify-write */ }
                const cur = (must(await sb().from('chat_rep').select('*').eq('user_id', uid).limit(1)) || [])[0] || { user_id: uid, user_name: name, points: 0, msgs: 0, reactions: 0, helpful: 0, kudos: 0, tasks_done: 0 };
                const row = { user_id: uid, user_name: name || cur.user_name, points: Math.max(0, (cur.points || 0) + (d.points || 0)), msgs: (cur.msgs || 0) + (d.msgs || 0), reactions: (cur.reactions || 0) + (d.reactions || 0), helpful: (cur.helpful || 0) + (d.helpful || 0), kudos: (cur.kudos || 0) + (d.kudos || 0), tasks_done: (cur.tasks_done || 0) + (d.tasks_done || 0), updated_at: nowIso() };
                must(await sb().from('chat_rep').upsert(row, { onConflict: 'user_id' })); return row;
            },
            async myMemberships(uid) { return must(await sb().from('chat_members').select('*').eq('user_id', uid)) || []; },
            async rooms(ids) { return ids.length ? (must(await sb().from('chat_rooms').select('*').in('id', ids)) || []) : []; },
            async members(ids) { return ids.length ? (must(await sb().from('chat_members').select('*').in('room_id', ids)) || []) : []; },
            async recent(ids, limit) { return ids.length ? (must(await sb().from('chat_messages').select('*').in('room_id', ids).neq('status', 'scheduled').order('created_at', { ascending: false }).limit(limit)) || []) : []; },
            async messages(roomId, before, limit) {
                let q = sb().from('chat_messages').select('*').eq('room_id', roomId).neq('status', 'scheduled').order('created_at', { ascending: false }).limit(limit);
                if (before) q = q.lt('created_at', before);
                return (must(await q) || []).reverse();
            },
            async since(roomId, at) { return must(await sb().from('chat_messages').select('*').eq('room_id', roomId).neq('status', 'scheduled').gt('created_at', at).order('created_at', { ascending: true }).limit(200)) || []; },
            async search(roomId, text) { return must(await sb().from('chat_messages').select('*').eq('room_id', roomId).neq('status', 'scheduled').eq('deleted_all', false).ilike('body', '%' + text.replace(/[%_]/g, m => '\\' + m) + '%').order('created_at', { ascending: false }).limit(60)) || []; },
            async starred(uid, roomIds) { return roomIds.length ? (must(await sb().from('chat_messages').select('*').in('room_id', roomIds).contains('starred_by', [uid]).order('created_at', { ascending: false }).limit(200)) || []) : []; },
            async scheduled(uid) { return must(await sb().from('chat_messages').select('*').eq('sender_id', uid).eq('status', 'scheduled').order('scheduled_for', { ascending: true }).limit(100)) || []; },
            async addRoom(r) { return (must(await sb().from('chat_rooms').insert(r).select()) || [])[0] || r; },
            async setRoom(id, p) { must(await sb().from('chat_rooms').update(p).eq('id', id)); },
            async delRoom(id) { must(await sb().from('chat_rooms').delete().eq('id', id)); },
            async addMembers(rows) { if (rows.length) must(await sb().from('chat_members').upsert(rows, { onConflict: 'room_id,user_id' })); },
            async setMember(roomId, uid, p) { must(await sb().from('chat_members').update(p).eq('room_id', roomId).eq('user_id', uid)); },
            async setMyMembers(uid, p) { must(await sb().from('chat_members').update(p).eq('user_id', uid)); },
            async delMember(roomId, uid) { must(await sb().from('chat_members').delete().eq('room_id', roomId).eq('user_id', uid)); },
            async addMessage(m) { must(await sb().from('chat_messages').insert(m)); return m; },
            async setMessage(id, p) { must(await sb().from('chat_messages').update(p).eq('id', id)); },
            async delMessage(id) { must(await sb().from('chat_messages').delete().eq('id', id)); },
            async clearRoom(roomId) { must(await sb().from('chat_messages').delete().eq('room_id', roomId)); },
            async purgeExpired(roomId) { try { await sb().from('chat_messages').delete().eq('room_id', roomId).lt('expires_at', nowIso()); } catch (e) { /* best effort */ } }
        };

        const LocalRepo = {
            name: 'local',
            _bc: null,
            _load() { return ls.get('local_db', { rooms: [], members: [], messages: [] }); },
            _save(d) { ls.set('local_db', d); },
            async probe() { /* always available */ },
            async ext() { return true; },
            async reps() { return this._load().rep || []; },
            async bumpRep(uid, name, d) {
                const db = this._load(); db.rep = db.rep || [];
                let cur = db.rep.find(x => x.user_id === uid); if (!cur) { cur = { user_id: uid, user_name: name, points: 0, msgs: 0, reactions: 0, helpful: 0, kudos: 0, tasks_done: 0 }; db.rep.push(cur); }
                cur.user_name = name || cur.user_name; cur.points = Math.max(0, cur.points + (d.points || 0)); ['msgs', 'reactions', 'helpful', 'kudos', 'tasks_done'].forEach(k => { cur[k] = (cur[k] || 0) + (d[k] || 0); }); cur.updated_at = nowIso();
                this._save(db); return Object.assign({}, cur);
            },
            async myMemberships(uid) { return this._load().members.filter(m => m.user_id === uid); },
            async rooms(ids) { return this._load().rooms.filter(r => ids.includes(r.id)); },
            async members(ids) { return this._load().members.filter(m => ids.includes(m.room_id)); },
            async recent(ids, limit) { return this._load().messages.filter(m => ids.includes(m.room_id) && m.status !== 'scheduled').sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit); },
            async messages(roomId, before, limit) {
                let a = this._load().messages.filter(m => m.room_id === roomId && m.status !== 'scheduled');
                if (before) a = a.filter(m => m.created_at < before);
                return a.sort((x, y) => x.created_at.localeCompare(y.created_at)).slice(-limit);
            },
            async since(roomId, at) { return this._load().messages.filter(m => m.room_id === roomId && m.status !== 'scheduled' && m.created_at > at).sort((x, y) => x.created_at.localeCompare(y.created_at)); },
            async search(roomId, t) { t = t.toLowerCase(); return this._load().messages.filter(m => m.room_id === roomId && m.status !== 'scheduled' && !m.deleted_all && (m.body || '').toLowerCase().includes(t)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60); },
            async starred(uid, ids) { return this._load().messages.filter(m => ids.includes(m.room_id) && (m.starred_by || []).includes(uid)).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
            async scheduled(uid) { return this._load().messages.filter(m => m.sender_id === uid && m.status === 'scheduled').sort((a, b) => (a.scheduled_for || '').localeCompare(b.scheduled_for || '')); },
            async addRoom(r) { const d = this._load(); d.rooms.push(r); this._save(d); return r; },
            async setRoom(id, p) { const d = this._load(); const r = d.rooms.find(x => x.id === id); if (r) Object.assign(r, p); this._save(d); },
            async delRoom(id) { const d = this._load(); d.rooms = d.rooms.filter(r => r.id !== id); d.members = d.members.filter(m => m.room_id !== id); d.messages = d.messages.filter(m => m.room_id !== id); this._save(d); },
            async addMembers(rows) { const d = this._load(); rows.forEach(r => { const i = d.members.findIndex(m => m.room_id === r.room_id && m.user_id === r.user_id); if (i >= 0) Object.assign(d.members[i], r); else d.members.push(Object.assign({ id: uuid() }, r)); }); this._save(d); },
            async setMember(roomId, uid, p) { const d = this._load(); d.members.filter(m => m.room_id === roomId && m.user_id === uid).forEach(m => Object.assign(m, p)); this._save(d); },
            async setMyMembers(uid, p) { const d = this._load(); d.members.filter(m => m.user_id === uid).forEach(m => Object.assign(m, p)); this._save(d); },
            async delMember(roomId, uid) { const d = this._load(); d.members = d.members.filter(m => !(m.room_id === roomId && m.user_id === uid)); this._save(d); },
            async addMessage(m) { const d = this._load(); d.messages.push(m); this._save(d); return m; },
            async setMessage(id, p) { const d = this._load(); const m = d.messages.find(x => x.id === id); if (m) Object.assign(m, p); this._save(d); },
            async delMessage(id) { const d = this._load(); d.messages = d.messages.filter(m => m.id !== id); this._save(d); },
            async clearRoom(roomId) { const d = this._load(); d.messages = d.messages.filter(m => m.room_id !== roomId); this._save(d); },
            async purgeExpired(roomId) { const d = this._load(); const t = nowIso(); d.messages = d.messages.filter(m => !(m.room_id === roomId && m.expires_at && m.expires_at < t)); this._save(d); }
        };

        // ---------------------------------------------------------------
        // State
        // ---------------------------------------------------------------
        const TC = {
            repo: null, mode: '', booted: false, root: null,
            me: null, directory: [], dirById: new Map(),
            rooms: new Map(), members: new Map(), msgs: new Map(), hasMore: new Map(),
            activeId: null, filter: 'all', q: '',
            reply: null, editing: null, urgent: false, drafts: ls.get('drafts', {}),
            typing: {}, seen: ls.get('seen', {}), presence: {},
            menu: null, modal: null, info: false, searching: false, searchHits: null,
            prefs: Object.assign({ sound: true, desktop: false, tone: 'soft', wall: 'default', fs: 'm', pins: [], dnd: { on: false, from: '22:00', to: '07:00', urgent: true } }, ls.get('prefs', {})),
            rep: new Map(), notifs: ls.get('notifs', []), reminders: ls.get('reminders', []), ext: true, lastRepMsg: 0,
            templates: ls.get('templates', DEFAULT_TEMPLATES.slice()),
            unreadAt: null, timers: [], net: null, bc: null, lastTyping: 0, rec: null,
            lastPoll: 0, lastDeliv: 0, scheduled: [], starredIds: new Set(), setupError: ''
        };

        Object.defineProperty(TC, 'mounted', { get() { return !!(this.root && this.root.isConnected); }, set() { /* derived */ } });
        const SETUP_SQL = "-- ============================================================\n-- UNITY ADMIN TEAM CHAT  -  run ONCE in Supabase > SQL Editor\n-- Safe to re-run (uses IF NOT EXISTS).\n-- ============================================================\ncreate table if not exists public.chat_rooms (\n  id uuid primary key default gen_random_uuid(),\n  name text not null default 'New group',\n  description text default '',\n  kind text not null default 'group',            -- group | dm\n  created_by text,\n  only_admins_send boolean not null default false,\n  disappearing_secs integer not null default 0,  -- 0 = off\n  pinned_message_id text,\n  is_archived boolean not null default false,\n  created_at timestamptz not null default now()\n);\n\ncreate table if not exists public.chat_members (\n  id uuid primary key default gen_random_uuid(),\n  room_id uuid not null references public.chat_rooms(id) on delete cascade,\n  user_id text not null,\n  user_name text,\n  role text not null default 'member',           -- admin | member\n  joined_at timestamptz not null default now(),\n  last_read_at timestamptz not null default now(),\n  last_delivered_at timestamptz not null default now(),\n  muted boolean not null default false,\n  archived boolean not null default false,\n  cleared_at timestamptz,\n  unique (room_id, user_id)\n);\n\ncreate table if not exists public.chat_messages (\n  id uuid primary key,\n  room_id uuid not null references public.chat_rooms(id) on delete cascade,\n  sender_id text not null,\n  sender_name text,\n  kind text not null default 'text',             -- text | image | file | voice | poll | card | task | location | system\n  body text default '',\n  reply_to text,\n  attachment jsonb,\n  poll jsonb,\n  reactions jsonb not null default '{}'::jsonb,\n  starred_by jsonb not null default '[]'::jsonb,\n  deleted_for jsonb not null default '[]'::jsonb,\n  deleted_all boolean not null default false,\n  forwarded boolean not null default false,\n  mentions jsonb not null default '[]'::jsonb,\n  priority text not null default 'normal',       -- normal | urgent\n  status text not null default 'sent',           -- sent | scheduled\n  scheduled_for timestamptz,\n  expires_at timestamptz,\n  edited_at timestamptz,\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists chat_members_user_idx   on public.chat_members (user_id);\ncreate index if not exists chat_members_room_idx   on public.chat_members (room_id);\ncreate index if not exists chat_messages_room_idx  on public.chat_messages (room_id, created_at desc);\ncreate index if not exists chat_messages_sched_idx on public.chat_messages (sender_id, status);\n\n-- ---- v2 upgrade: timed mute, notify mode, reputation ----\nalter table public.chat_members add column if not exists muted_until timestamptz;\nalter table public.chat_members add column if not exists notify text not null default 'all';   -- all | mentions\n\ncreate table if not exists public.chat_rep (\n  user_id text primary key,\n  user_name text,\n  points integer not null default 0,\n  msgs integer not null default 0,\n  reactions integer not null default 0,\n  helpful integer not null default 0,\n  kudos integer not null default 0,\n  tasks_done integer not null default 0,\n  updated_at timestamptz not null default now()\n);\nalter table public.chat_rep disable row level security;\n\n-- atomic reputation counter (used by the portal; it falls back to a plain update if missing)\ncreate or replace function public.chat_rep_bump(p_user text, p_name text, p_points int, p_msgs int, p_reactions int, p_helpful int, p_kudos int, p_tasks int)\nreturns public.chat_rep language sql as $$\n  insert into public.chat_rep as r (user_id, user_name, points, msgs, reactions, helpful, kudos, tasks_done, updated_at)\n  values (p_user, p_name, greatest(0, p_points), p_msgs, p_reactions, p_helpful, p_kudos, p_tasks, now())\n  on conflict (user_id) do update set\n    user_name = coalesce(excluded.user_name, r.user_name),\n    points = greatest(0, r.points + p_points), msgs = r.msgs + p_msgs, reactions = r.reactions + p_reactions,\n    helpful = r.helpful + p_helpful, kudos = r.kudos + p_kudos, tasks_done = r.tasks_done + p_tasks, updated_at = now()\n  returning r.*;\n$$;\n\n-- The portal talks to Supabase with the service key, so RLS is not needed.\n-- If you turned RLS on for these tables, add policies or run:\nalter table public.chat_rooms    disable row level security;\nalter table public.chat_members  disable row level security;\nalter table public.chat_messages disable row level security;\n";

        function meId() { return TC.me ? TC.me.id : null; }
        function person(uid) {
            const d = TC.dirById.get(uid);
            if (d) return d;
            for (const arr of TC.members.values()) { const m = arr.find(x => x.user_id === uid); if (m) return { id: uid, name: m.user_name || 'Member', role: '', photo: '' }; }
            return { id: uid, name: 'Member', role: '', photo: '' };
        }
        function prettyRole(r) { return String(r || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
        const HUES = [210, 262, 190, 340, 24, 150, 290, 45];
        function hue(s) { let h = 0; String(s || '').split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return HUES[h % HUES.length]; }
        function initials(n) { const p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
        function avatar(name, photo, size, extra) {
            const s = size || 40, h = hue(name);
            if (photo) return `<span class="tc-av ${extra || ''}" style="width:${s}px;height:${s}px"><img src="${esc(photo)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()"><b style="background:hsl(${h} 70% 46%)">${esc(initials(name))}</b></span>`;
            return `<span class="tc-av noimg ${extra || ''}" style="width:${s}px;height:${s}px"><b style="background:hsl(${h} 70% 46%);font-size:${Math.round(s * .38)}px">${esc(initials(name))}</b></span>`;
        }
        function roomMembers(id) { return TC.members.get(id) || []; }
        function myMember(id) { return roomMembers(id).find(m => m.user_id === meId()); }
        function isAdmin(id) { const m = myMember(id); return !!(m && m.role === 'admin') || (TC.me && TC.me.role === 'super_admin' && !!m); }
        function roomTitle(r) {
            if (!r) return '';
            if (r.kind === 'dm') { const o = roomMembers(r.id).find(m => m.user_id !== meId()); if (o) return person(o.user_id).name; return roomMembers(r.id).length === 1 ? 'Saved notes' : (r.name || 'Chat'); }
            return r.name || 'Group';
        }
        function roomPhoto(r) { if (r && r.kind === 'dm') { const o = roomMembers(r.id).find(m => m.user_id !== meId()); return o ? person(o.user_id).photo : ''; } return ''; }
        function canSend(id) { const r = TC.rooms.get(id); if (!r || !myMember(id)) return false; return !r.only_admins_send || isAdmin(id); }
        function active() { return TC.activeId ? TC.rooms.get(TC.activeId) : null; }
        function list(id) { if (!TC.msgs.has(id)) TC.msgs.set(id, []); return TC.msgs.get(id); }
        function isExpired(m) { return m.expires_at && new Date(m.expires_at).getTime() < Date.now(); }
        function visible(m) {
            if (m.deleted_for && m.deleted_for.includes(meId())) return false;
            if (isExpired(m)) return false;
            const mm = myMember(m.room_id);
            return !(mm && mm.cleared_at && m.created_at <= mm.cleared_at);
        }
        function upsertMsg(m) {
            const arr = list(m.room_id), i = arr.findIndex(x => x.id === m.id);
            if (i >= 0) arr[i] = Object.assign(arr[i], m); else { arr.push(m); arr.sort((a, b) => a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0); }
            return arr.find(x => x.id === m.id);
        }
        function lastMsg(id) { const a = list(id).filter(visible); return a[a.length - 1] || null; }
        function unreadCount(id) {
            const mm = myMember(id); if (!mm) return 0;
            const t = mm.last_read_at || '';
            return list(id).filter(m => m.sender_id !== meId() && m.kind !== 'system' && m.created_at > t && visible(m)).length;
        }
        function totalUnread() { let n = 0; TC.rooms.forEach((r, id) => { const mm = myMember(id); if (mm && !mm.archived && !isMuted(mm)) n += unreadCount(id); }); return n; }
        function mentionedMe(m) { return (m.mentions || []).some(x => x && x.id === meId()); }

        function fmtTime(iso) { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
        function dayKey(iso) { const d = new Date(iso); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
        function dayLabel(iso) {
            const d = new Date(iso), n = new Date(), y = new Date(Date.now() - 864e5);
            if (dayKey(iso) === dayKey(n.toISOString())) return 'Today';
            if (dayKey(iso) === dayKey(y.toISOString())) return 'Yesterday';
            return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric' });
        }
        function listTime(iso) {
            if (!iso) return '';
            if (dayKey(iso) === dayKey(nowIso())) return fmtTime(iso);
            if (dayKey(iso) === dayKey(new Date(Date.now() - 864e5).toISOString())) return 'Yesterday';
            return new Date(iso).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
        }
        const KIND_ICON = { image: 'fa-image', file: 'fa-file-lines', voice: 'fa-microphone', poll: 'fa-chart-simple', card: 'fa-link', task: 'fa-list-check', location: 'fa-location-dot' };
        function previewBody(m) {
            if (!m) return '';
            if (m.deleted_all) return 'This message was deleted';
            const a = m.attachment || {};
            switch (m.kind) {
                case 'image': return m.body || 'Photo';
                case 'file': return a.name || 'File';
                case 'voice': return 'Voice message';
                case 'poll': return (m.poll && m.poll.q) || 'Poll';
                case 'card': return a.title || 'Shared item';
                case 'task': return a.title || 'Task';
                case 'location': return 'Location';
                default: return m.body || '';
            }
        }
        // plain text (toasts, exports)
        function preview(m) { if (!m) return ''; return (m.kind !== 'system' && m.sender_id === meId() && !m.deleted_all ? 'You: ' : '') + previewBody(m).replace(/:([a-z0-9_]{2,20}):/g, (x, n) => (STK[n] || RX[n]) ? '' : x); }
        // rich HTML (lists, quotes) with an icon instead of an emoji
        function pv(m, strip) {
            if (!m) return '';
            const pre = !strip && m.kind !== 'system' && m.sender_id === meId() && !m.deleted_all ? 'You: ' : '';
            const ic = m.deleted_all ? 'fa-ban' : KIND_ICON[m.kind];
            return esc(pre) + (ic ? '<i class="fa-solid ' + ic + ' tc-pvi"></i> ' : '') + tokens(esc(previewBody(m)));
        }
        function say(type, msg) { try { if (window.AppToast && AppToast[type]) AppToast[type](msg); else console.log('[chat]', msg); } catch (e) { /* ignore */ } }

        // ---------------------------------------------------------------
        // Network (live updates): Supabase broadcast + same-browser tabs
        // ---------------------------------------------------------------
        function netInit() {
            if (TC.bc || TC.net) return;
            try { TC.bc = new BroadcastChannel('unity-chat-bc'); TC.bc.onmessage = e => onNet(e.data); } catch (e) { TC.bc = null; }
            if (TC.mode === 'db') {
                try {
                    const ch = sb().channel('unity-admin-chat', { config: { broadcast: { self: false } } });
                    ch.on('broadcast', { event: 'm' }, p => onNet(p && p.payload)).subscribe();
                    TC.net = ch;
                } catch (e) { TC.net = null; }
            }
        }
        function netStop() {
            try { if (TC.bc) TC.bc.close(); } catch (e) { /* ignore */ }
            try { if (TC.net && sb() && sb().removeChannel) sb().removeChannel(TC.net); } catch (e) { /* ignore */ }
            TC.bc = null; TC.net = null;
        }
        function emit(p) {
            p.from = meId();
            try { if (TC.bc) TC.bc.postMessage(p); } catch (e) { /* ignore */ }
            try { if (TC.net) TC.net.send({ type: 'broadcast', event: 'm', payload: p }); } catch (e) { /* ignore */ }
        }
        function memberIds(roomId) { return roomMembers(roomId).map(m => m.user_id); }

        let reloadTimer = null;
        function scheduleReload() { clearTimeout(reloadTimer); reloadTimer = setTimeout(() => loadAll().then(() => { renderList(); if (TC.activeId) renderChatArea(); badge(); }).catch(() => { }), 250); }

        function onNet(p) {
            try {
                if (!p || typeof p !== 'object' || !TC.booted) return;
                const mine = p.from === meId();
                switch (p.t) {
                    case 'hb': if (!mine) { TC.presence[p.from] = Date.now(); TC.seen[p.from] = Date.now(); ls.set('seen', TC.seen); if (TC.mounted) { renderHead(); } } break;
                    case 'hello': if (!mine) heartbeat(); break;
                    case 'typing': if (!mine && p.room) { (TC.typing[p.room] = TC.typing[p.room] || {})[p.from] = Date.now() + 4000; if (TC.activeId === p.room) renderHead(); } break;
                    case 'msg': {
                        const m = p.msg; if (!m) return;
                        if (!(p.to || []).includes(meId())) return;
                        if (!TC.rooms.has(m.room_id)) { scheduleReload(); return; }
                        const had = list(m.room_id).some(x => x.id === m.id);
                        upsertMsg(m);
                        if (!had && !mine) onIncoming(m);
                        afterMessageChange(m.room_id, !had && !mine);
                        break;
                    }
                    case 'upd': { const m = p.msg; if (!m || !TC.rooms.has(m.room_id)) return; upsertMsg(m); afterMessageChange(m.room_id, false); break; }
                    case 'del': { if (!p.room) return; const a = list(p.room), i = a.findIndex(x => x.id === p.id); if (i >= 0) a.splice(i, 1); afterMessageChange(p.room, false); break; }
                    case 'read': case 'deliv': {
                        const mm = roomMembers(p.room).find(x => x.user_id === p.from);
                        if (mm) { if (p.t === 'read') { mm.last_read_at = p.at; if (mm.last_delivered_at < p.at) mm.last_delivered_at = p.at; } else mm.last_delivered_at = p.at; }
                        if (TC.activeId === p.room && TC.mounted) renderMessages(false);
                        break;
                    }
                    case 'rep': if (p.row && p.row.user_id) TC.rep.set(p.row.user_id, p.row); break;
                    case 'kudos': if ((p.to || []).includes(meId())) { pushNotif({ id: 'k-' + Date.now(), type: 'kudos', room: TC.activeId || '', msg: '', by: p.by || 'Someone', text: 'Thanks for your help!', at: nowIso(), read: false }); if (!inQuiet()) { beep(false); showToast({ title: (p.by || 'Someone') + ' sent you kudos', icon: 'fa-heart', color: '#ec4899', html: 'Your reputation just went up +10.', kind: 'kudos' }); } } break;
                    case 'ping': if ((p.to || []).includes(meId()) && !inQuiet()) { beep(false); showToast({ title: p.title || 'Update', icon: 'fa-circle-check', color: '#16a34a', html: esc(p.text || ''), room: p.room || '' }); } break;
                    case 'room': if ((p.to || []).includes(meId()) || TC.rooms.has(p.room)) scheduleReload(); break;
                    default: break;
                }
            } catch (e) { console.warn('[chat] net handler', e); }
        }
        function afterMessageChange(roomId, incoming) {
            if (TC.mounted) {
                renderList();
                if (TC.activeId === roomId) { renderMessages(incoming); renderHead(); if (incoming) markRead(roomId); }
            }
            badge();
        }

        let audioCtx = null;
        // ---------------------------------------------------------------
        // Reputation  (points, levels, badges, kudos, leaderboard)
        // ---------------------------------------------------------------
        const LEVELS = [
            { min: 0, n: 'Newcomer', i: 'fa-seedling', c: '#64748b' }, { min: 50, n: 'Contributor', i: 'fa-star', c: '#0ea5e9' }, { min: 150, n: 'Active Member', i: 'fa-bolt', c: '#f59e0b' },
            { min: 350, n: 'Trusted', i: 'fa-shield-heart', c: '#16a34a' }, { min: 700, n: 'Champion', i: 'fa-trophy', c: '#a855f7' }, { min: 1500, n: 'Legend', i: 'fa-crown', c: '#eab308' }
        ];
        const BADGES = [
            { n: 'Helper', i: 'fa-hand-holding-heart', d: '5 helpful votes', t: r => r.helpful >= 5 }, { n: 'Conversation starter', i: 'fa-comments', d: '100 messages', t: r => r.msgs >= 100 },
            { n: 'Appreciated', i: 'fa-heart', d: '3 kudos received', t: r => r.kudos >= 3 }, { n: 'Task master', i: 'fa-list-check', d: '5 tasks completed', t: r => (r.tasks_done || 0) >= 5 }, { n: 'Well liked', i: 'fa-thumbs-up', d: '20 reactions', t: r => r.reactions >= 20 }
        ];
        function levelOf(p) { let l = LEVELS[0]; LEVELS.forEach(x => { if (p >= x.min) l = x; }); return { l, next: LEVELS.find(x => x.min > p) || null }; }
        function repRow(uid) { return TC.rep.get(uid) || { user_id: uid, user_name: person(uid).name, points: 0, msgs: 0, reactions: 0, helpful: 0, kudos: 0, tasks_done: 0 }; }
        function repBadge(uid) { const r = repRow(uid), l = levelOf(r.points).l; return '<i class="fa-solid ' + l.i + ' tc-lvl" style="color:' + l.c + '" title="' + esc(l.n + ' · ' + r.points + ' pts') + '"></i>'; }
        async function bumpRep(uid, d) {
            if (!uid || !TC.repo) return;
            try {
                const row = await TC.repo.bumpRep(uid, person(uid).name, d);
                if (row) { TC.rep.set(uid, row); emit({ t: 'rep', row }); }
            } catch (e) { /* reputation is best effort */ }
        }
        function awardOnce(key) {
            const a = ls.get('awarded', {}); if (a[key]) return false;
            a[key] = 1; const ks = Object.keys(a); if (ks.length > 600) ks.slice(0, 200).forEach(k => delete a[k]);
            ls.set('awarded', a); return true;
        }
        async function giveKudos(uid) {
            if (!uid || uid === meId()) return false;
            const g = ls.get('kudos', {}), today = new Date().toISOString().slice(0, 10);
            if (g[uid] === today) { say('info', 'You already sent kudos to ' + person(uid).name + ' today.'); return false; }
            g[uid] = today; ls.set('kudos', g);
            await bumpRep(uid, { points: 10, kudos: 1 });
            emit({ t: 'kudos', to: [uid], by: TC.me.name });
            say('success', 'Kudos sent to ' + person(uid).name); return true;
        }

        // ---------------------------------------------------------------
        // Notification engine
        // ---------------------------------------------------------------
        function isMuted(mm) { return !!(mm && (mm.muted || (mm.muted_until && new Date(mm.muted_until).getTime() > Date.now()))); }
        function muteLabel(mm) {
            if (!mm) return 'Off';
            if (mm.muted) return 'Muted always';
            if (mm.muted_until && new Date(mm.muted_until).getTime() > Date.now()) return 'Muted until ' + new Date(mm.muted_until).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
            return (mm.notify === 'mentions') ? 'Mentions & urgent only' : 'All messages';
        }
        function inQuiet() {
            const d = TC.prefs.dnd; if (!d || !d.on) return false;
            const f = String(d.from || '22:00').split(':').map(Number), t = String(d.to || '07:00').split(':').map(Number), n = new Date();
            const cur = n.getHours() * 60 + n.getMinutes(), a = f[0] * 60 + (f[1] || 0), b = t[0] * 60 + (t[1] || 0);
            return a <= b ? (cur >= a && cur < b) : (cur >= a || cur < b);
        }
        function pushNotif(n) {
            if (TC.notifs.some(x => x.id === n.id)) return;
            TC.notifs.unshift(n); TC.notifs = TC.notifs.slice(0, 60); ls.set('notifs', TC.notifs); updateBell();
        }
        function unreadNotifs() { return TC.notifs.filter(n => !n.read).length; }
        function updateBell() {
            const b = TC.root && TC.root.querySelector('#tc-bell-n'); if (!b) return;
            const n = unreadNotifs(); b.textContent = n > 9 ? '9+' : n; b.style.display = n ? '' : 'none';
        }
        let baseTitle = null;
        function updateTitle(n) {
            try {
                const cur = document.title.replace(/^\(\d+\+?\)\s/, ''); baseTitle = cur;
                document.title = (n > 0 ? '(' + (n > 99 ? '99+' : n) + ') ' : '') + cur;
            } catch (e) { /* ignore */ }
        }
        const TONES = { soft: [[660, 0, .22]], chime: [[880, 0, .14], [1320, .14, .2]], pop: [[520, 0, .09], [780, .09, .1]], bell: [[1046, 0, .3], [784, .12, .3]] };
        function beep(urgent, force) {
            if (!TC.prefs.sound && !force) return;
            try {
                audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
                const seq = urgent ? [[880, 0, .16], [880, .22, .16], [1175, .44, .3]] : (TONES[TC.prefs.tone] || TONES.soft), t0 = audioCtx.currentTime;
                seq.forEach(s => {
                    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
                    o.type = TC.prefs.tone === 'pop' ? 'triangle' : 'sine'; o.frequency.value = s[0];
                    g.gain.setValueAtTime(.0001, t0 + s[1]); g.gain.exponentialRampToValueAtTime(.13, t0 + s[1] + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + s[1] + s[2]);
                    o.connect(g); g.connect(audioCtx.destination); o.start(t0 + s[1]); o.stop(t0 + s[1] + s[2] + .02);
                });
            } catch (e) { /* audio blocked until a user gesture */ }
        }
        function toastHost() {
            let h = document.getElementById('tc-toasts');
            if (!h) { h = document.createElement('div'); h.id = 'tc-toasts'; h.className = 'tc-toasts'; h.setAttribute('role', 'status'); h.setAttribute('aria-live', 'polite'); document.body.appendChild(h); h.addEventListener('click', onToastClick); h.addEventListener('keydown', e => { if (e.target.classList && e.target.classList.contains('tc-toast-in') && e.key === 'Enter') { e.preventDefault(); toastSend(e.target.closest('.tc-toast')); } }); }
            return h;
        }
        function showToast(o) {
            const h = toastHost(), el = document.createElement('div');
            el.className = 'tc-toast' + (o.urgent ? ' urgent' : '') + (o.kind ? ' ' + o.kind : '');
            el.setAttribute('data-room', o.room || ''); el.setAttribute('data-msg', o.msg || '');
            el.innerHTML = (o.icon ? '<span class="tc-toast-ic" style="--c:' + o.color + '"><i class="fa-solid ' + o.icon + '"></i></span>' : avatar(o.name || '?', o.photo || '', 38)) +
                '<div class="tc-toast-b"><b>' + esc(o.title) + '</b><span>' + o.html + '</span><div class="tc-toast-a">' + (o.room ? '<button data-act="open">Open</button>' : '') + (o.reply ? '<button data-act="reply">Reply</button>' : '') + (o.mute ? '<button data-act="mute">Mute</button>' : '') + '</div>' +
                '<div class="tc-toast-r" style="display:none"><input class="tc-toast-in" maxlength="1000" placeholder="Type a reply…"><button data-act="sendreply" aria-label="Send reply"><i class="fa-solid fa-paper-plane"></i></button></div></div><button class="tc-toast-x" data-act="x" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>';
            h.appendChild(el);
            while (h.children.length > 4) h.firstChild.remove();
            if (!o.urgent) { const arm = ms => { clearTimeout(el._t); el._t = setTimeout(() => el.remove(), ms); }; arm(8000); el.addEventListener('mouseenter', () => clearTimeout(el._t)); el.addEventListener('focusin', () => clearTimeout(el._t)); el.addEventListener('mouseleave', () => { if (!el.querySelector('.tc-toast-in:focus')) arm(4000); }); }
            return el;
        }
        function toastSend(el) {
            if (!el) return; const inp = el.querySelector('.tc-toast-in'), room = el.getAttribute('data-room'), v = inp ? inp.value.trim() : '';
            if (!v || !room) return;
            send({ roomId: room, body: v, kind: 'text', reply_to: el.getAttribute('data-msg') || null }).then(r => { if (r) { say('success', 'Reply sent'); el.remove(); } });
        }
        function onToastClick(e) {
            const b = e.target.closest('[data-act]'), el = e.target.closest('.tc-toast'); if (!b || !el) return;
            const act = b.getAttribute('data-act'), room = el.getAttribute('data-room');
            if (act === 'x') el.remove();
            else if (act === 'open') { el.remove(); gotoRoom(room, el.getAttribute('data-msg')); }
            else if (act === 'reply') { const r = el.querySelector('.tc-toast-r'); r.style.display = 'flex'; const i = r.querySelector('input'); i.focus(); clearTimeout(el._t); }
            else if (act === 'sendreply') toastSend(el);
            else if (act === 'mute') { const mm = (TC.members.get(room) || []).find(x => x.user_id === meId()); if (mm) { setMine(room, { muted_until: new Date(Date.now() + 8 * 3600000).toISOString(), muted: false }); say('info', 'Muted for 8 hours'); } el.remove(); }
        }
        async function gotoRoom(id, msgId) {
            try { const m = document.getElementById('admin-portal-modal'); if (m && m.classList.contains('hidden') && window.openAdminPortal) window.openAdminPortal(); } catch (e) { /* ignore */ }
            if (!TC.mounted) { try { AdminPanel.navigateTo('chat'); } catch (e) { /* ignore */ } for (let i = 0; i < 25 && !TC.mounted; i++) await sleep(120); }
            if (TC.rooms.has(id)) { await openRoom(id); if (msgId) jumpTo(msgId); }
        }
        function desktopNotify(title, body, tag, onclick) {
            try {
                if (TC.prefs.desktop && window.Notification && Notification.permission === 'granted' && document.hidden) {
                    const n = new Notification(title, { body, tag }); n.onclick = () => { window.focus(); n.close(); if (onclick) onclick(); };
                }
            } catch (e) { /* ignore */ }
        }
        function onIncoming(m) {
            const mm = myMember(m.room_id);
            if (!mm || m.kind === 'system') return;
            const r = TC.rooms.get(m.room_id), urgent = m.priority === 'urgent', mention = mentionedMe(m);
            const replyToMe = !!(m.reply_to && list(m.room_id).some(x => x.id === m.reply_to && x.sender_id === meId()));
            const task = m.kind === 'task' && m.attachment && (m.attachment.assignees || []).includes(meId());
            const important = urgent || mention || replyToMe || task;
            const who = m.sender_name || person(m.sender_id).name, rt = r ? roomTitle(r) : 'Chat';
            if (important) pushNotif({ id: m.id, type: urgent ? 'urgent' : task ? 'task' : mention ? 'mention' : 'reply', room: m.room_id, msg: m.id, by: who, text: previewBody(m).slice(0, 140), at: nowIso(), read: false });
            if (isMuted(mm) && !urgent) return;
            if (mm.notify === 'mentions' && !important) return;
            const quiet = inQuiet() && !(urgent && (!TC.prefs.dnd || TC.prefs.dnd.urgent !== false));
            const here = TC.mounted && TC.activeId === m.room_id && !document.hidden;
            if (quiet) return;
            if (here) { beep(false); return; }
            beep(urgent);
            const label = urgent ? 'Urgent' : task ? 'Task assigned to you' : mention ? 'Mentioned you' : replyToMe ? 'Replied to you' : '';
            showToast({ room: m.room_id, msg: m.id, title: (r && r.kind !== 'dm' ? rt + ' · ' : '') + who, name: who, photo: person(m.sender_id).photo, html: (label ? '<em class="tc-toast-tag">' + label + '</em> ' : '') + pv(m, true), urgent, reply: canSend(m.room_id), mute: !urgent });
            desktopNotify((urgent ? 'Urgent — ' : '') + (r && r.kind !== 'dm' ? rt : who), (r && r.kind !== 'dm' ? who + ': ' : '') + previewBody(m).replace(/:[a-z0-9_]{2,20}:/g, '').slice(0, 140), 'tc-' + m.room_id, () => gotoRoom(m.room_id, m.id));
        }
        function badge() { try { const n = totalUnread(); AdminPanel.updateBadge('chat', n); updateTitle(n); updateBell(); } catch (e) { /* ignore */ } }

        // reminders
        function addReminder(m, at) {
            TC.reminders.push({ id: uuid(), msg: m.id, room: m.room_id, at, text: previewBody(m).slice(0, 120), by: m.sender_name || person(m.sender_id).name });
            ls.set('reminders', TC.reminders);
        }
        function checkReminders() {
            const now = Date.now(), due = TC.reminders.filter(r => new Date(r.at).getTime() <= now);
            if (!due.length) return;
            TC.reminders = TC.reminders.filter(r => !due.includes(r)); ls.set('reminders', TC.reminders);
            due.forEach(r => {
                pushNotif({ id: 'rem-' + r.id, type: 'reminder', room: r.room, msg: r.msg, by: r.by, text: r.text, at: nowIso(), read: false });
                if (!inQuiet()) {
                    beep(false);
                    showToast({ room: r.room, msg: r.msg, title: 'Reminder', icon: 'fa-bell', color: '#f59e0b', html: esc((r.by ? r.by + ': ' : '') + r.text), kind: 'reminder' });
                    desktopNotify('Reminder', (r.by ? r.by + ': ' : '') + r.text, 'tc-rem-' + r.id, () => gotoRoom(r.room, r.msg));
                }
            });
        }

        // ---------------------------------------------------------------
        // Tasks
        // ---------------------------------------------------------------
        function taskStats(a) {
            const as = a.assignees || [], done = a.done || {};
            const n = as.length ? as.filter(u => done[u]).length : Object.keys(done).length, total = as.length || 1;
            return { n, total, all: as.length ? n === as.length : n >= 1 };
        }
        function canMarkTask(a) { const as = a.assignees || []; return !as.length || as.includes(meId()); }
        async function toggleTask(m) {
            const a = JSON.parse(JSON.stringify(m.attachment || {})); if (!canMarkTask(a)) { say('info', 'This task is assigned to someone else.'); return; }
            a.done = a.done || {}; const had = !!a.done[meId()];
            if (had) delete a.done[meId()]; else a.done[meId()] = nowIso();
            await patchMsg(m, { attachment: a });
            if (!had && awardOnce('task|' + m.id + '|' + meId())) bumpRep(meId(), { points: 4, tasks_done: 1 });
            if (!had && m.sender_id !== meId()) pushNotifRemote(m.sender_id, 'Task done', TC.me.name + ' completed “' + (a.title || 'task') + '”');
            renderMessages(false);
        }
        function pushNotifRemote(uid, title, text) { emit({ t: 'ping', to: [uid], title, text, room: TC.activeId }); }

        // ---------------------------------------------------------------
        // Loading
        // ---------------------------------------------------------------
        let loading = null;
        async function loadDirectory() {
            const map = new Map();
            try {
                const { data } = await sb().from('users').select('id, full_name, role, photo_url, is_active').neq('role', 'member');
                (data || []).forEach(u => { if (u.is_active === false) return; map.set(String(u.id), { id: String(u.id), name: u.full_name || 'Admin', role: u.role || '', photo: u.photo_url || '' }); });
            } catch (e) { /* directory is optional */ }
            if (TC.me) map.set(TC.me.id, { id: TC.me.id, name: TC.me.name, role: TC.me.role, photo: TC.me.photo });
            TC.directory = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
            TC.dirById = map;
        }
        async function loadAll() {
            if (loading) return loading;
            loading = (async () => {
                try {
                    const mem = await TC.repo.myMemberships(meId());
                    const ids = mem.map(m => m.room_id);
                    const [rooms, allMem, recent] = await Promise.all([TC.repo.rooms(ids), TC.repo.members(ids), TC.repo.recent(ids, 400)]);
                    TC.rooms = new Map(rooms.map(r => [r.id, r]));
                    const g = new Map();
                    allMem.forEach(m => { if (!g.has(m.room_id)) g.set(m.room_id, []); g.get(m.room_id).push(m); });
                    TC.members = g;
                    [...TC.msgs.keys()].forEach(k => { if (!TC.rooms.has(k)) TC.msgs.delete(k); });
                    recent.forEach(upsertMsg);
                    TC.scheduled = await TC.repo.scheduled(meId());
                    try { if (TC.ext) TC.rep = new Map((await TC.repo.reps()).map(x => [x.user_id, x])); } catch (e) { /* reputation optional */ }
                    try { const st = await TC.repo.starred(meId(), ids); TC.starredIds = new Set(st.map(x => x.id)); st.forEach(upsertMsg); } catch (e) { /* optional */ }
                } finally { loading = null; }
            })();
            return loading;
        }
        async function pollActive() {
            const id = TC.activeId; if (!id || !TC.mounted) return;
            const a = list(id), last = a.length ? a[a.length - 1].created_at : '1970-01-01T00:00:00Z';
            try {
                const rows = await TC.repo.since(id, last);
                let fresh = false;
                rows.forEach(r => { if (!a.some(x => x.id === r.id)) { fresh = true; if (r.sender_id !== meId()) onIncoming(r); } upsertMsg(r); });
                if (fresh) { renderMessages(true); renderList(); markRead(id); badge(); }
            } catch (e) { /* network hiccup */ }
        }
        async function markDelivered() {
            if (Date.now() - TC.lastDeliv < 8000) return; TC.lastDeliv = Date.now();
            const at = nowIso();
            try { await TC.repo.setMyMembers(meId(), { last_delivered_at: at }); } catch (e) { return; }
            TC.members.forEach((arr, rid) => { const mm = arr.find(x => x.user_id === meId()); if (mm) mm.last_delivered_at = at; emit({ t: 'deliv', room: rid, at }); });
        }
        function heartbeat() { TC.presence[meId()] = Date.now(); emit({ t: 'hb', name: TC.me.name }); }

        // ---------------------------------------------------------------
        // Boot (runs once after login, also from the sidebar badge)
        // ---------------------------------------------------------------
        async function boot() {
            if (TC.booted) return;
            const u = window.AuthManager && AuthManager.currentUser;
            if (!u || !u.id) return;
            TC.me = { id: String(u.id), name: u.name || u.full_name || 'Admin', role: u.role || '', photo: u.photoUrl || u.photo_url || '' };
            try {
                if (ls.get('mode', '') === 'local') { TC.repo = LocalRepo; TC.mode = 'local'; }
                else {
                    try { await DBRepo.probe(); TC.repo = DBRepo; TC.mode = 'db'; TC.setupError = ''; }
                    catch (e) { TC.repo = null; TC.mode = 'missing'; TC.setupError = (e && e.message) || 'Chat tables were not found.'; }
                }
                await loadDirectory();
                if (!TC.repo) { TC.booted = true; return; }
                TC.ext = await TC.repo.ext();
                await loadAll();
                TC.booted = true;
                netInit();
                start();
                badge();
            } catch (e) {
                console.warn('[chat] boot failed:', e);
                TC.mode = 'missing'; TC.setupError = (e && e.message) || String(e); TC.repo = null; TC.booted = true;
            }
        }
        function start() {
            stop(true);
            heartbeat(); emit({ t: 'hello' });
            TC.timers.push(setInterval(heartbeat, 20000));
            TC.timers.push(setInterval(() => { if (TC.mounted && !document.hidden) pollActive(); }, 8000));
            TC.timers.push(setInterval(() => { loadAll().then(() => { if (TC.mounted) { renderList(); if (TC.activeId) { renderHead(); } } badge(); }).catch(() => { }); markDelivered(); }, 30000));
            TC.timers.push(setInterval(runScheduler, 15000));
            TC.timers.push(setInterval(checkReminders, 20000));
            TC.timers.push(setInterval(() => {
                const now = Date.now(); let dirty = false;
                Object.keys(TC.typing).forEach(r => Object.keys(TC.typing[r]).forEach(u => { if (TC.typing[r][u] < now) { delete TC.typing[r][u]; dirty = true; } }));
                if (dirty && TC.mounted) renderHead();
                if (TC.mounted && TC.activeId) { const r = TC.rooms.get(TC.activeId); if (r && r.disappearing_secs && list(r.id).some(isExpired)) renderMessages(false); }
            }, 1500));
            markDelivered(); runScheduler(); checkReminders();
        }
        function stop(keepNet) { TC.timers.forEach(clearInterval); TC.timers = []; if (!keepNet) netStop(); }
        function reset() { stop(false); Object.assign(TC, { booted: false, repo: null, me: null, rooms: new Map(), members: new Map(), msgs: new Map(), activeId: null, root: null, typing: {}, presence: {} }); }

        async function runScheduler() {
            if (!TC.repo || !TC.scheduled.length) return;
            const due = TC.scheduled.filter(m => m.scheduled_for && new Date(m.scheduled_for).getTime() <= Date.now());
            for (const m of due) {
                try {
                    const patch = { status: 'sent', created_at: nowIso() };
                    const r = TC.rooms.get(m.room_id);
                    if (r && r.disappearing_secs) patch.expires_at = new Date(Date.now() + r.disappearing_secs * 1000).toISOString();
                    await TC.repo.setMessage(m.id, patch);
                    Object.assign(m, patch);
                    TC.scheduled = TC.scheduled.filter(x => x.id !== m.id);
                    if (TC.rooms.has(m.room_id)) { upsertMsg(m); emit({ t: 'msg', msg: m, to: memberIds(m.room_id) }); afterMessageChange(m.room_id, false); }
                } catch (e) { /* retry next tick */ }
            }
        }

        // ---------------------------------------------------------------
        // Actions
        // ---------------------------------------------------------------
        function parseMentions(body, roomId) {
            const out = [];
            if (/(^|\s)@all(\s|$)/.test(body) && isAdmin(roomId)) { roomMembers(roomId).forEach(m => { if (m.user_id !== meId()) out.push({ id: m.user_id, name: person(m.user_id).name }); }); return out; }
            roomMembers(roomId).forEach(m => { const p = person(m.user_id); if (m.user_id !== meId() && p.name && body.includes('@' + p.name)) out.push({ id: m.user_id, name: p.name }); });
            return out;
        }
        async function send(opts) {
            const roomId = opts.roomId || TC.activeId;
            const r = TC.rooms.get(roomId);
            if (!r || !myMember(roomId)) { say('warning', 'You are no longer in this chat.'); return null; }
            if (!canSend(roomId)) { say('warning', 'Only admins can send messages in this group.'); return null; }
            const body = String(opts.body || '').replace(/\s+$/g, '');
            const secs = r.disappearing_secs || 0;
            const scheduled = !!opts.scheduled_for;
            const row = {
                id: uuid(), room_id: roomId, sender_id: meId(), sender_name: TC.me.name, kind: opts.kind || 'text', body,
                reply_to: opts.reply_to || null, attachment: opts.attachment || null, poll: opts.poll || null, reactions: {}, starred_by: [],
                deleted_for: [], deleted_all: false, forwarded: !!opts.forwarded, mentions: opts.kind === 'text' ? parseMentions(body, roomId) : [],
                priority: opts.priority || 'normal', status: scheduled ? 'scheduled' : 'sent', scheduled_for: scheduled ? opts.scheduled_for : null,
                expires_at: (!scheduled && secs) ? new Date(Date.now() + secs * 1000).toISOString() : null, edited_at: null, created_at: nowIso()
            };
            if (!scheduled) { upsertMsg(row); TC.pending = TC.pending || new Map(); TC.pending.set(row.id, 'sending'); afterMessageChange(roomId, true); }
            try {
                await TC.repo.addMessage(row);
                if (TC.pending) TC.pending.delete(row.id);
                if (scheduled) { TC.scheduled.push(row); say('success', 'Message scheduled for ' + new Date(row.scheduled_for).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + '. Keep the portal open at that time.'); }
                else {
                    emit({ t: 'msg', msg: row, to: memberIds(roomId) }); if (TC.mounted) { renderMessages(false); renderList(); }
                    if (row.kind !== 'system') {
                        const now = Date.now(), pts = now - TC.lastRepMsg > 20000 ? 1 : 0; TC.lastRepMsg = now; bumpRep(meId(), { points: pts, msgs: 1 });
                        if (row.reply_to) { const q = list(roomId).find(x => x.id === row.reply_to); if (q && q.sender_id !== meId() && awardOnce('reply|' + row.id)) bumpRep(q.sender_id, { points: 2 }); }
                    }
                }
                return row;
            } catch (e) {
                console.warn('[chat] send failed', e);
                if (scheduled) say('error', 'Could not schedule: ' + (e.message || e));
                else { TC.pending.set(row.id, 'failed'); if (TC.mounted) renderMessages(false); say('error', 'Message not sent. Tap the red icon to retry.'); }
                return null;
            }
        }
        async function retry(id) {
            const m = list(TC.activeId).find(x => x.id === id); if (!m) return;
            TC.pending.set(id, 'sending'); renderMessages(false);
            try { await TC.repo.addMessage(m); TC.pending.delete(id); emit({ t: 'msg', msg: m, to: memberIds(m.room_id) }); } catch (e) { TC.pending.set(id, 'failed'); say('error', 'Still offline — try again shortly.'); }
            renderMessages(false);
        }
        async function patchMsg(m, patch, broadcast) {
            Object.assign(m, patch);
            try { await TC.repo.setMessage(m.id, patch); } catch (e) { say('error', 'Could not save change: ' + (e.message || e)); return false; }
            if (broadcast !== false) emit({ t: 'upd', msg: m, to: memberIds(m.room_id) });
            return true;
        }
        async function sendText() {
            const inp = TC.root && TC.root.querySelector('#tc-input'); if (!inp) return;
            const text = inp.value.replace(/\s+$/g, ''); if (!text.trim()) return;
            const roomId = TC.activeId;
            if (TC.editing) {
                const m = list(roomId).find(x => x.id === TC.editing);
                TC.editing = null;
                if (m && m.sender_id === meId()) { await patchMsg(m, { body: text, edited_at: nowIso(), mentions: parseMentions(text, roomId) }); }
                inp.value = ''; autoGrow(inp); renderComposerMeta(); renderMessages(false); return;
            }
            const reply = TC.reply, urgent = TC.urgent;
            inp.value = ''; autoGrow(inp); delete TC.drafts[roomId]; ls.set('drafts', TC.drafts);
            TC.reply = null; TC.urgent = false; renderComposerMeta();
            await send({ body: text, kind: 'text', reply_to: reply ? reply.id : null, priority: urgent ? 'urgent' : 'normal' });
            inp.focus();
        }
        async function markRead(id) {
            if (!TC.mounted || document.hidden || TC.activeId !== id) return;
            const mm = myMember(id); if (!mm) return;
            const newest = list(id).filter(visible).slice(-1)[0];
            if (!newest || (mm.last_read_at && newest.created_at <= mm.last_read_at)) return;
            const at = nowIso();
            mm.last_read_at = at;
            try { await TC.repo.setMember(id, meId(), { last_read_at: at, last_delivered_at: at }); emit({ t: 'read', room: id, at }); } catch (e) { /* retry on next open */ }
            renderList(); badge();
        }
        async function toggleReaction(m, emoji) {
            const rx = JSON.parse(JSON.stringify(m.reactions || {}));
            const had = (rx[emoji] || []).includes(meId());
            Object.keys(rx).forEach(k => { rx[k] = rx[k].filter(u => u !== meId()); if (!rx[k].length) delete rx[k]; });
            if (!had) (rx[emoji] = rx[emoji] || []).push(meId());
            await patchMsg(m, { reactions: rx }); renderMessages(false);
            if (!had && m.sender_id !== meId() && awardOnce('rx|' + m.id + '|' + meId() + '|' + emoji)) { const h = emoji === 'helpful'; bumpRep(m.sender_id, { points: h ? 6 : 2, reactions: 1, helpful: h ? 1 : 0 }); }
        }
        async function toggleStar(m) {
            const s = new Set(m.starred_by || []);
            if (s.has(meId())) { s.delete(meId()); TC.starredIds.delete(m.id); } else { s.add(meId()); TC.starredIds.add(m.id); }
            await patchMsg(m, { starred_by: [...s] }, false); renderMessages(false); say('info', s.has(meId()) ? 'Message starred' : 'Star removed');
        }
        async function deleteForMe(m) { const d = (m.deleted_for || []).concat(meId()); await patchMsg(m, { deleted_for: d }, false); afterMessageChange(m.room_id, false); }
        async function deleteForAll(m) {
            if (!(m.sender_id === meId() || isAdmin(m.room_id))) return;
            await patchMsg(m, { deleted_all: true, body: '', attachment: null, poll: null, mentions: [] });
            const r = TC.rooms.get(m.room_id); if (r && r.pinned_message_id === m.id) await setRoom(r.id, { pinned_message_id: null }, true);
            afterMessageChange(m.room_id, false);
        }
        async function setRoom(id, patch, quiet) {
            const r = TC.rooms.get(id); if (!r) return false;
            Object.assign(r, patch);
            try { await TC.repo.setRoom(id, patch); } catch (e) { say('error', 'Could not update: ' + (e.message || e)); return false; }
            emit({ t: 'room', room: id, to: memberIds(id) });
            if (TC.mounted) { renderList(); if (TC.activeId === id) { renderHead(); renderMessages(false); renderComposerMeta(); if (TC.info) renderInfo(); } }
            return true;
        }
        async function setMine(id, patch) {
            const mm = myMember(id); if (!mm) return;
            Object.assign(mm, patch);
            try { await TC.repo.setMember(id, meId(), patch); } catch (e) { say('error', 'Could not save: ' + (e.message || e)); }
            if (TC.mounted) { renderList(); renderHead(); } badge();
        }
        async function systemMsg(roomId, text) {
            const row = { id: uuid(), room_id: roomId, sender_id: meId(), sender_name: TC.me.name, kind: 'system', body: text, reactions: {}, starred_by: [], deleted_for: [], deleted_all: false, mentions: [], priority: 'normal', status: 'sent', created_at: nowIso(), expires_at: null };
            try { await TC.repo.addMessage(row); upsertMsg(row); emit({ t: 'msg', msg: row, to: memberIds(roomId) }); } catch (e) { /* cosmetic */ }
        }
        async function createGroup(name, desc, ids) {
            const id = uuid(), at = nowIso();
            const room = { id, name: name.trim() || 'New group', description: desc || '', kind: 'group', created_by: meId(), only_admins_send: false, disappearing_secs: 0, pinned_message_id: null, is_archived: false, created_at: at };
            await TC.repo.addRoom(room);
            const all = [meId()].concat(ids.filter(x => x !== meId()));
            const rows = all.map(uid => ({ room_id: id, user_id: uid, user_name: person(uid).name, role: uid === meId() ? 'admin' : 'member', joined_at: at, last_read_at: at, last_delivered_at: at, muted: false, archived: false }));
            await TC.repo.addMembers(rows);
            TC.rooms.set(id, room); TC.members.set(id, rows);
            await systemMsg(id, TC.me.name + ' created the group “' + room.name + '”');
            emit({ t: 'room', room: id, to: all });
            return id;
        }
        async function openDM(uid) {
            for (const [id, r] of TC.rooms) { if (r.kind === 'dm') { const ids = memberIds(id); if (ids.includes(uid) && ids.includes(meId()) && (uid !== meId() || ids.length === 1)) return id; } }
            const id = uuid(), at = nowIso();
            const room = { id, name: '', description: '', kind: 'dm', created_by: meId(), only_admins_send: false, disappearing_secs: 0, pinned_message_id: null, is_archived: false, created_at: at };
            await TC.repo.addRoom(room);
            const rows = [...new Set([meId(), uid])].map(u => ({ room_id: id, user_id: u, user_name: person(u).name, role: 'member', joined_at: at, last_read_at: at, last_delivered_at: at, muted: false, archived: false }));
            await TC.repo.addMembers(rows);
            TC.rooms.set(id, room); TC.members.set(id, rows);
            emit({ t: 'room', room: id, to: [...new Set([meId(), uid])] });
            return id;
        }
        async function addToGroup(roomId, uids) {
            const at = nowIso(), have = memberIds(roomId);
            const rows = uids.filter(u => !have.includes(u)).map(u => ({ room_id: roomId, user_id: u, user_name: person(u).name, role: 'member', joined_at: at, last_read_at: at, last_delivered_at: at, muted: false, archived: false }));
            if (!rows.length) return;
            await TC.repo.addMembers(rows);
            roomMembers(roomId).push(...rows);
            await systemMsg(roomId, TC.me.name + ' added ' + rows.map(r => r.user_name).join(', '));
            emit({ t: 'room', room: roomId, to: memberIds(roomId) });
        }
        async function removeFromGroup(roomId, uid) {
            const name = person(uid).name, before = memberIds(roomId);
            await systemMsg(roomId, uid === meId() ? TC.me.name + ' left' : TC.me.name + ' removed ' + name);
            await TC.repo.delMember(roomId, uid);
            TC.members.set(roomId, roomMembers(roomId).filter(m => m.user_id !== uid));
            emit({ t: 'room', room: roomId, to: before });
        }
        async function setRole(roomId, uid, role) {
            await TC.repo.setMember(roomId, uid, { role });
            const mm = roomMembers(roomId).find(m => m.user_id === uid); if (mm) mm.role = role;
            await systemMsg(roomId, TC.me.name + (role === 'admin' ? ' made ' : ' removed admin from ') + person(uid).name);
            emit({ t: 'room', room: roomId, to: memberIds(roomId) });
        }
        async function deleteGroup(roomId) {
            const to = memberIds(roomId);
            await TC.repo.delRoom(roomId);
            TC.rooms.delete(roomId); TC.members.delete(roomId); TC.msgs.delete(roomId);
            emit({ t: 'room', room: roomId, to });
            if (TC.activeId === roomId) TC.activeId = null;
        }
        async function clearChat(roomId) { await setMine(roomId, { cleared_at: nowIso() }); if (TC.mounted) renderMessages(false); }
        async function vote(m, optId) {
            const poll = JSON.parse(JSON.stringify(m.poll || {})); if (!poll.options || poll.closed) return;
            poll.options.forEach(o => { o.votes = o.votes || []; });
            const opt = poll.options.find(o => o.id === optId); if (!opt) return;
            const has = opt.votes.includes(meId());
            if (!poll.multi) poll.options.forEach(o => { o.votes = o.votes.filter(u => u !== meId()); });
            if (has) opt.votes = opt.votes.filter(u => u !== meId()); else if (!opt.votes.includes(meId())) opt.votes.push(meId());
            await patchMsg(m, { poll }); renderMessages(false);
        }
        async function forwardTo(m, roomIds) {
            let n = 0;
            for (const rid of roomIds) {
                if (!canSend(rid)) continue;
                const r = await send({ roomId: rid, kind: m.kind === 'system' ? 'text' : m.kind, body: m.body, attachment: m.attachment, poll: m.poll ? Object.assign({}, m.poll, { options: (m.poll.options || []).map(o => ({ id: o.id, t: o.t, votes: [] })), closed: false }) : null, forwarded: true });
                if (r) n++;
            }
            say(n ? 'success' : 'warning', n ? 'Forwarded to ' + n + ' chat' + (n > 1 ? 's' : '') : 'Nothing forwarded');
        }
        async function uploadFile(file) {
            const isImg = /^image\//.test(file.type);
            if (window.AppUploader && AppUploader.upload) {
                try { const res = await AppUploader.upload(file, { type: 'photo', folder: 'chat' }); if (res && res.url) return { url: res.url, name: file.name, size: file.size, mime: file.type, image: isImg }; } catch (e) { /* fall back below */ }
            }
            if (file.size > 700 * 1024) throw new Error('Upload service unavailable and the file is larger than 700 KB.');
            const url = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => no(fr.error); fr.readAsDataURL(file); });
            return { url, name: file.name, size: file.size, mime: file.type, image: isImg };
        }
        async function sendFiles(files) {
            const cinp = TC.root && TC.root.querySelector('#tc-input'); let cap = cinp ? cinp.value.trim() : '';
            if (cap && cinp) { cinp.value = ''; autoGrow(cinp); delete TC.drafts[TC.activeId]; ls.set('drafts', TC.drafts); renderComposerMeta(); }
            for (const f of Array.from(files || [])) {
                if (f.size > 15 * 1048576) { say('warning', f.name + ' is larger than 15 MB.'); continue; }
                say('info', 'Uploading ' + f.name + '…');
                try {
                    const att = await uploadFile(f);
                    await send({ kind: att.image ? 'image' : 'file', body: cap, attachment: att, reply_to: TC.reply ? TC.reply.id : null });
                    TC.reply = null; cap = ''; renderComposerMeta();
                } catch (e) { say('error', 'Upload failed: ' + (e.message || e)); }
            }
        }
        async function toggleRecord() {
            const btn = TC.root && TC.root.querySelector('[data-tc="mic"]');
            if (TC.rec) { try { TC.rec.mr.stop(); } catch (e) { /* ignore */ } return; }
            if (!navigator.mediaDevices || !window.MediaRecorder) { say('warning', 'Voice notes are not supported in this browser.'); return; }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mr = new MediaRecorder(stream), chunks = [], t0 = Date.now();
                TC.rec = { mr, stream, t0 };
                mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
                mr.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop());
                    const dur = Math.round((Date.now() - t0) / 1000), cancelled = TC.rec && TC.rec.cancel;
                    TC.rec = null; renderComposerMeta();
                    if (cancelled || dur < 1 || !chunks.length) return;
                    const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
                    if (blob.size > 1.6 * 1048576) { say('warning', 'Voice note too long — keep it under 2 minutes.'); return; }
                    const url = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
                    await send({ kind: 'voice', body: '', attachment: { url, dur, mime: blob.type, name: 'voice.webm' } });
                };
                mr.start(); renderComposerMeta();
                setTimeout(() => { if (TC.rec && TC.rec.mr === mr && mr.state === 'recording') mr.stop(); }, 120000);
            } catch (e) { say('warning', 'Microphone permission was denied.'); TC.rec = null; renderComposerMeta(); }
            if (btn) btn.blur();
        }
        function exportChat(roomId) {
            const r = TC.rooms.get(roomId); if (!r) return;
            const lines = list(roomId).filter(m => visible(m) && !m.deleted_all).map(m => {
                const d = new Date(m.created_at), stamp = d.toLocaleDateString() + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return m.kind === 'system' ? '[' + stamp + '] ' + m.body : '[' + stamp + '] ' + (m.sender_name || person(m.sender_id).name) + ': ' + preview(m).replace(/^You: /, '');
            });
            const blob = new Blob(['Team chat — ' + roomTitle(r) + '\n\n' + lines.join('\n')], { type: 'text/plain' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'chat_' + roomTitle(r).replace(/[^\w]+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.txt';
            document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        }

        // ---------------------------------------------------------------
        // Rendering helpers
        // ---------------------------------------------------------------
        const $ = sel => (TC.root ? TC.root.querySelector(sel) : null);
        function ico(c) { return '<i class="fa-solid ' + c + '"></i>'; }
        function fmt(text, mentions) {
            let h = tokens(esc(text || ''));
            h = h.replace(/```([\s\S]+?)```/g, '<code class="tc-mono">$1</code>');
            h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,!?;:)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
            h = h.replace(/(^|[\s(>])\*([^*\n]+)\*(?=$|[\s).,!?<])/g, '$1<b>$2</b>');
            h = h.replace(/(^|[\s(>])_([^_\n]+)_(?=$|[\s).,!?<])/g, '$1<i>$2</i>');
            h = h.replace(/(^|[\s(>])~([^~\n]+)~(?=$|[\s).,!?<])/g, '$1<s>$2</s>');
            (mentions || []).forEach(mn => { if (mn && mn.name) { const t = esc('@' + mn.name); h = h.split(t).join('<span class="tc-mention' + (mn.id === meId() ? ' me' : '') + '">' + t + '</span>'); } });
            return h.replace(/\n/g, '<br>');
        }
        function autoGrow(t) { if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }
        function isOnline(uid) { return uid === meId() || (TC.presence[uid] && Date.now() - TC.presence[uid] < 50000); }
        function lastSeen(uid) { const t = TC.seen[uid]; if (!t) return 'offline'; const d = new Date(t); return 'last seen ' + (dayKey(d.toISOString()) === dayKey(nowIso()) ? 'today at ' : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' at ') + fmtTime(d.toISOString()); }
        function tickState(m) {
            const others = roomMembers(m.room_id).filter(x => x.user_id !== meId());
            if (!others.length) return 'sent';
            if (others.every(o => o.last_read_at && o.last_read_at >= m.created_at)) return 'read';
            if (others.some(o => (o.last_delivered_at && o.last_delivered_at >= m.created_at) || isOnline(o.user_id))) return 'deliv';
            return 'sent';
        }
        function ticksHtml(m) {
            const p = TC.pending && TC.pending.get(m.id);
            if (p === 'sending') return '<span class="tc-tick wait" title="Sending">' + ico('fa-clock') + '</span>';
            if (p === 'failed') return '<button class="tc-tick fail" data-tc="retry" data-id="' + m.id + '" title="Not sent — tap to retry">' + ico('fa-circle-exclamation') + '</button>';
            const s = tickState(m);
            return '<span class="tc-tick ' + s + '" title="' + (s === 'read' ? 'Read' : s === 'deliv' ? 'Delivered' : 'Sent') + '">' + ico(s === 'sent' ? 'fa-check' : 'fa-check-double') + '</span>';
        }
        function replyQuote(m) {
            const q = m.reply_to && list(m.room_id).find(x => x.id === m.reply_to);
            if (!m.reply_to) return '';
            if (!q) return '<div class="tc-quote gone"><b>Original message</b><span>Not available</span></div>';
            const mine = q.sender_id === meId();
            return '<div class="tc-quote" data-tc="jump" data-id="' + q.id + '"><b style="color:hsl(' + hue(q.sender_id) + ' 60% 42%)">' + esc(mine ? 'You' : (q.sender_name || person(q.sender_id).name)) + '</b><span>' + pv(q, true) + '</span></div>';
        }
        function pollHtml(m) {
            const p = m.poll || {}, opts = p.options || [];
            const total = opts.reduce((n, o) => n + (o.votes || []).length, 0);
            return '<div class="tc-poll"><div class="tc-poll-q">' + ico('fa-chart-simple') + ' ' + esc(p.q || 'Poll') + '</div><small>' + (p.multi ? 'Select one or more' : 'Select one') + (p.closed ? ' · closed' : '') + '</small>' +
                opts.map(o => { const v = (o.votes || []).length, pc = total ? Math.round(v * 100 / total) : 0, on = (o.votes || []).includes(meId()); return '<button class="tc-opt ' + (on ? 'on' : '') + '" data-tc="vote" data-id="' + m.id + '" data-opt="' + esc(o.id) + '" ' + (p.closed ? 'disabled' : '') + '><i style="width:' + pc + '%"></i><span class="tc-chk">' + (on ? ico('fa-check') : '') + '</span><em>' + esc(o.t) + '</em><b>' + v + '</b></button>'; }).join('') +
                '<small>' + total + ' vote' + (total === 1 ? '' : 's') + '</small></div>';
        }
        function attachHtml(m) {
            const a = m.attachment || {};
            if (m.kind === 'image') return '<img class="tc-img" src="' + esc(a.url) + '" alt="' + esc(a.name || 'photo') + '" loading="lazy" data-tc="view" data-url="' + esc(a.url) + '" onerror="this.outerHTML=\'<div class=tc-file>Image unavailable</div>\'">';
            if (m.kind === 'voice') return '<div class="tc-voice">' + ico('fa-microphone') + '<audio controls preload="none" src="' + esc(a.url) + '"></audio><small>' + Math.floor((a.dur || 0) / 60) + ':' + String((a.dur || 0) % 60).padStart(2, '0') + '</small></div>';
            if (m.kind === 'file') return '<a class="tc-file" href="' + esc(a.url) + '" target="_blank" rel="noopener noreferrer" download="' + esc(a.name || 'file') + '">' + ico('fa-file-lines') + '<span><b>' + esc(a.name || 'File') + '</b><small>' + (a.size ? Math.max(1, Math.round(a.size / 1024)) + ' KB' : 'Document') + '</small></span>' + ico('fa-download') + '</a>';
            if (m.kind === 'card') return '<button class="tc-card" data-tc="opencard" data-id="' + m.id + '">' + ico(a.type === 'meeting' ? 'fa-people-group' : 'fa-calendar-days') + '<span><b>' + esc(a.title || 'Item') + '</b><small>' + esc([a.date, a.venue].filter(Boolean).join(' · ')) + '</small></span>' + ico('fa-arrow-up-right-from-square') + '</button>';
            if (m.kind === 'task') return taskHtml(m);
            if (m.kind === 'location') return locHtml(m);
            return '';
        }
        function reactionsHtml(m) {
            const rx = m.reactions || {}, ks = Object.keys(rx).filter(k => (rx[k] || []).length);
            if (!ks.length) return '';
            return '<div class="tc-rx">' + ks.map(k => '<button data-tc="react" data-id="' + m.id + '" data-e="' + esc(k) + '" class="' + (rx[k].includes(meId()) ? 'on' : '') + '" title="' + esc((RX[k] ? RX[k].n + ': ' : '') + rx[k].map(u => person(u).name).join(', ')) + '">' + rxIcon(k) + (rx[k].length > 1 ? '<b>' + rx[k].length + '</b>' : '') + '</button>').join('') + '</div>';
        }
        function bubbleHtml(m, prev, showName, showAv, grouped) {
            const mine = m.sender_id === meId();
            if (m.kind === 'system') return '<div class="tc-sys"><span>' + esc(m.body) + '</span></div>';
            const starred = (m.starred_by || []).includes(meId());
            let inner;
            if (m.deleted_all) inner = '<div class="tc-del">' + ico('fa-ban') + ' ' + (mine ? 'You deleted this message' : 'This message was deleted') + '</div>';
            else {
                inner = (m.forwarded ? '<div class="tc-fwd">' + ico('fa-share') + ' Forwarded</div>' : '') + replyQuote(m) +
                    (m.kind === 'poll' ? pollHtml(m) : attachHtml(m)) + (m.body ? '<div class="tc-text">' + fmt(m.body, m.mentions) + '</div>' : '');
            }
            const meta = '<span class="tc-meta">' + (m.expires_at ? '<span title="Disappearing message">' + ico('fa-hourglass-half') + '</span>' : '') + (starred ? '<span class="tc-star">' + ico('fa-star') + '</span>' : '') + (m.edited_at && !m.deleted_all ? '<em>edited</em>' : '') + '<time>' + fmtTime(m.created_at) + '</time>' + (mine && !m.deleted_all ? ticksHtml(m) : '') + '</span>';
            const sender = showName && !mine ? '<div class="tc-who" data-tc="profile" data-uid="' + esc(m.sender_id) + '" style="color:hsl(' + hue(m.sender_id) + ' 62% 40%)">' + esc(m.sender_name || person(m.sender_id).name) + ' ' + repBadge(m.sender_id) + '</div>' : '';
            const av = !mine && TC.rooms.get(m.room_id) && TC.rooms.get(m.room_id).kind !== 'dm' ? (showAv ? '<span class="tc-avbtn" data-tc="profile" data-uid="' + esc(m.sender_id) + '">' + avatar(person(m.sender_id).name, person(m.sender_id).photo, 30) + '</span>' : '<span class="tc-av-gap"></span>') : '';
            return '<div class="tc-row ' + (mine ? 'mine' : 'theirs') + (grouped ? ' grouped' : '') + '" data-id="' + m.id + '">' + av +
                '<div class="tc-bubwrap"><div class="tc-bub' + (m.priority === 'urgent' && !m.deleted_all ? ' urgent' : '') + (m.deleted_all ? ' deleted' : '') + (mentionedMe(m) && !mine ? ' mentioned' : '') + '">' +
                (m.deleted_all ? '' : '<button class="tc-chev" data-tc="mmenu" data-id="' + m.id + '" aria-label="Message options">' + ico('fa-chevron-down') + '</button>') +
                (m.priority === 'urgent' && !m.deleted_all ? '<div class="tc-urg">' + ico('fa-triangle-exclamation') + ' URGENT</div>' : '') +
                sender + inner + meta + '</div>' + (m.deleted_all ? '' : reactionsHtml(m)) + '</div></div>';
        }

        function renderList() {
            const el = $('#tc-list'); if (!el) return;
            const q = TC.q.trim().toLowerCase();
            let rooms = [...TC.rooms.values()].filter(r => myMember(r.id));
            rooms.forEach(r => { r._last = lastMsg(r.id); r._t = r._last ? r._last.created_at : r.created_at; });
            const pins = TC.prefs.pins || [];
            rooms.sort((a, b) => { const pa = pins.includes(a.id), pb = pins.includes(b.id); if (pa !== pb) return pa ? -1 : 1; return a._t < b._t ? 1 : -1; });
            const f = TC.filter;
            rooms = rooms.filter(r => {
                const mm = myMember(r.id);
                if (f === 'archived') return mm.archived;
                if (mm.archived) return false;
                if (f === 'unread') return unreadCount(r.id) > 0;
                if (f === 'groups') return r.kind !== 'dm';
                return true;
            });
            if (q) rooms = rooms.filter(r => roomTitle(r).toLowerCase().includes(q) || list(r.id).some(m => !m.deleted_all && (m.body || '').toLowerCase().includes(q)));
            let html = rooms.map(r => {
                const mm = myMember(r.id), n = unreadCount(r.id), m = r._last, active = TC.activeId === r.id;
                const typers = Object.keys(TC.typing[r.id] || {}).filter(u => u !== meId());
                let pvh;
                if (typers.length) pvh = '<span class="tc-typing-txt">' + (r.kind === 'dm' ? 'typing…' : esc(person(typers[0]).name.split(' ')[0]) + ' is typing…') + '</span>';
                else if (m) { const who = r.kind !== 'dm' && m.kind !== 'system' && m.sender_id !== meId() ? esc((m.sender_name || person(m.sender_id).name).split(' ')[0]) + ': ' : ''; pvh = who + pv(m, false); }
                else pvh = '<i>No messages yet</i>';
                const men = list(r.id).some(x => x.sender_id !== meId() && mentionedMe(x) && x.created_at > (mm.last_read_at || '') && visible(x));
                return '<button class="tc-item ' + (active ? 'on' : '') + '" data-tc="open" data-id="' + r.id + '">' +
                    avatar(roomTitle(r), roomPhoto(r), 48, r.kind === 'dm' && isOnline((roomMembers(r.id).find(x => x.user_id !== meId()) || {}).user_id) ? 'online' : '') +
                    '<span class="tc-item-main"><span class="tc-item-top"><b>' + esc(roomTitle(r)) + '</b><time class="' + (n ? 'unread' : '') + '">' + listTime(r._t) + '</time></span>' +
                    '<span class="tc-item-bot"><span class="tc-pv">' + pvh + '</span>' + (pins.includes(r.id) ? '<span class="tc-pinned">' + ico('fa-thumbtack') + '</span>' : '') + (isMuted(mm) ? '<span class="tc-mute">' + ico('fa-bell-slash') + '</span>' : '') + (men ? '<span class="tc-at">@</span>' : '') + (n ? '<span class="tc-badge' + (isMuted(mm) ? ' muted' : '') + '">' + (n > 99 ? '99+' : n) + '</span>' : '') + '</span></span></button>';
            }).join('');
            if (q) {
                const have = new Set();
                TC.rooms.forEach(r => { if (r.kind === 'dm') roomMembers(r.id).forEach(m => have.add(m.user_id)); });
                const people = TC.directory.filter(p => p.id !== meId() && !have.has(p.id) && p.name.toLowerCase().includes(q));
                if (people.length) html += '<div class="tc-sec">People</div>' + people.map(p => '<button class="tc-item" data-tc="dm" data-uid="' + esc(p.id) + '">' + avatar(p.name, p.photo, 48) + '<span class="tc-item-main"><span class="tc-item-top"><b>' + esc(p.name) + '</b></span><span class="tc-item-bot"><span class="tc-pv">' + esc(prettyRole(p.role)) + '</span></span></span></button>').join('');
            }
            if (!html) html = '<div class="tc-empty-list">' + ico('fa-comments') + '<p>' + (q ? 'No chats match “' + esc(TC.q) + '”' : f === 'archived' ? 'No archived chats' : f === 'unread' ? 'You are all caught up' : 'No chats yet') + '</p>' + (!q && f === 'all' ? '<button class="tc-btn pri" data-tc="newgroup">' + ico('fa-users') + ' Start a group</button>' : '') + '</div>';
            el.innerHTML = html;
            TC.root.querySelectorAll('.tc-chips button').forEach(b => b.classList.toggle('on', b.getAttribute('data-f') === f));
            const un = TC.root.querySelector('[data-f="unread"] .tc-count'); if (un) { const t = totalUnread(); un.textContent = t ? t : ''; }
        }

        function headSub(r) {
            const typers = Object.keys(TC.typing[r.id] || {}).filter(u => u !== meId());
            if (typers.length) return '<span class="tc-typing-txt">' + (r.kind === 'dm' ? 'typing…' : esc(typers.map(u => person(u).name.split(' ')[0]).join(', ')) + ' typing…') + '</span>';
            if (r.kind === 'dm') { const o = roomMembers(r.id).find(x => x.user_id !== meId()); if (!o) return ''; return isOnline(o.user_id) ? '<span class="tc-on">online</span>' : esc(lastSeen(o.user_id)); }
            const names = roomMembers(r.id).map(m => m.user_id === meId() ? 'You' : person(m.user_id).name.split(' ')[0]);
            return esc(names.slice(0, 5).join(', ') + (names.length > 5 ? ' +' + (names.length - 5) : ''));
        }
        function renderHead() {
            const el = $('#tc-head'); const r = active(); if (!el || !r) return;
            el.innerHTML = '<button class="tc-ib tc-back" data-tc="back" aria-label="Back to chats">' + ico('fa-arrow-left') + '</button>' +
                '<button class="tc-head-main" data-tc="info">' + avatar(roomTitle(r), roomPhoto(r), 42) + '<span><b>' + esc(roomTitle(r)) + '</b><small>' + headSub(r) + '</small></span></button>' +
                '<div class="tc-head-btns"><button class="tc-ib" data-tc="search" title="Search in chat" aria-label="Search in chat">' + ico('fa-magnifying-glass') + '</button><button class="tc-ib" data-tc="gallery" title="Media, docs and links" aria-label="Media">' + ico('fa-photo-film') + '</button><button class="tc-ib" data-tc="chatmenu" title="More" aria-label="More">' + ico('fa-ellipsis-vertical') + '</button></div>';
            const pin = $('#tc-pin');
            if (pin) {
                const pm = r.pinned_message_id && list(r.id).find(x => x.id === r.pinned_message_id && !x.deleted_all);
                pin.innerHTML = pm ? '<button data-tc="jump" data-id="' + pm.id + '">' + ico('fa-thumbtack') + '<span><b>Pinned message</b><em>' + pv(pm, true) + '</em></span></button>' : '';
                pin.style.display = pm ? '' : 'none';
            }
            const sb = $('#tc-searchbar'); if (sb) sb.style.display = TC.searching ? '' : 'none';
        }
        function renderMessages(stick) {
            const el = $('#tc-msgs'); const r = active(); if (!el || !r) return;
            const near = el.scrollHeight - el.scrollTop - el.clientHeight < 160, prevTop = el.scrollTop, prevH = el.scrollHeight;
            const arr = list(r.id).filter(visible);
            let html = '', lastDay = '', prev = null, dividerDone = false;
            if (TC.hasMore.get(r.id)) html += '<div class="tc-more"><button data-tc="older">' + ico('fa-clock-rotate-left') + ' Load earlier messages</button></div>';
            if (r.disappearing_secs) html += '<div class="tc-sys note"><span>' + ico('fa-hourglass-half') + ' Messages disappear after ' + (r.disappearing_secs >= 604800 ? '7 days' : r.disappearing_secs >= 86400 ? '24 hours' : r.disappearing_secs + 's') + '.</span></div>';
            arr.forEach(m => {
                const dk = dayKey(m.created_at);
                if (dk !== lastDay) { html += '<div class="tc-day"><span>' + dayLabel(m.created_at) + '</span></div>'; lastDay = dk; prev = null; }
                if (!dividerDone && TC.unreadAt && m.created_at > TC.unreadAt && m.sender_id !== meId() && m.kind !== 'system') {
                    dividerDone = true; const n = arr.filter(x => x.created_at > TC.unreadAt && x.sender_id !== meId() && x.kind !== 'system').length;
                    html += '<div class="tc-unread" id="tc-unread-line"><span>' + n + ' unread message' + (n > 1 ? 's' : '') + '</span></div>'; prev = null;
                }
                const sameRun = prev && prev.sender_id === m.sender_id && prev.kind !== 'system' && m.kind !== 'system' && (new Date(m.created_at) - new Date(prev.created_at)) < 5 * 60000;
                html += bubbleHtml(m, prev, r.kind !== 'dm' && !sameRun, !sameRun, sameRun);
                prev = m;
            });
            if (!arr.length) html += '<div class="tc-empty-chat">' + ico('fa-lock') + '<p>No messages yet — say hello! Messages here are visible only to chat members.</p></div>';
            el.innerHTML = html;
            if (stick === 'bottom' || (stick === true && (near || (arr.length && arr[arr.length - 1].sender_id === meId())))) el.scrollTop = el.scrollHeight;
            else if (stick === 'unread') { const u = el.querySelector('#tc-unread-line'); if (u) el.scrollTop = Math.max(0, u.offsetTop - 80); else el.scrollTop = el.scrollHeight; }
            else if (stick === 'keep-top') el.scrollTop = el.scrollHeight - prevH + prevTop;
            else el.scrollTop = prevTop;
            updateJump();
        }
        function updateJump() {
            const el = $('#tc-msgs'), j = $('#tc-jumpbtn'); if (!el || !j) return;
            const far = el.scrollHeight - el.scrollTop - el.clientHeight > 260;
            j.style.display = far ? '' : 'none';
        }
        function renderComposerMeta() {
            const el = $('#tc-meta'), r = active(); if (!el || !r) return;
            let h = '';
            if (TC.editing) h = '<div class="tc-bar edit">' + ico('fa-pen') + '<span><b>Editing message</b></span><button data-tc="cancelbar" aria-label="Cancel">' + ico('fa-xmark') + '</button></div>';
            else if (TC.reply) h = '<div class="tc-bar">' + ico('fa-reply') + '<span><b>Replying to ' + esc(TC.reply.sender_id === meId() ? 'yourself' : (TC.reply.sender_name || person(TC.reply.sender_id).name)) + '</b><em>' + pv(TC.reply, true) + '</em></span><button data-tc="cancelbar" aria-label="Cancel">' + ico('fa-xmark') + '</button></div>';
            if (TC.rec) h += '<div class="tc-bar rec"><span class="tc-recdot"></span><span><b>Recording voice note…</b><em>Tap the stop button to send</em></span><button data-tc="cancelrec" aria-label="Cancel recording">' + ico('fa-trash') + '</button></div>';
            el.innerHTML = h;
            const comp = $('#tc-composer'); if (!comp) return;
            const allowed = canSend(r.id);
            comp.classList.toggle('locked', !allowed);
            const note = $('#tc-locked'); if (note) note.style.display = allowed ? 'none' : '';
            const u = $('[data-tc="urgent"]'); if (u) u.classList.toggle('on', TC.urgent);
            const inp = $('#tc-input'), has = inp && inp.value.trim().length > 0;
            const sendBtn = $('[data-tc="send"]'), mic = $('[data-tc="mic"]');
            if (sendBtn) sendBtn.style.display = (has || TC.editing) ? '' : 'none';
            if (mic) { mic.style.display = (has || TC.editing) ? 'none' : ''; mic.classList.toggle('rec', !!TC.rec); mic.innerHTML = TC.rec ? ico('fa-stop') : ico('fa-microphone'); }
        }
        function renderChatArea() {
            const main = $('#tc-main'); if (!main) return;
            const r = active();
            TC.root.classList.toggle('has-chat', !!r);
            if (!r) { main.innerHTML = '<div class="tc-welcome"><div class="tc-welcome-ico">' + ico('fa-comments') + '</div><h2>Team Chat</h2><p>Private conversations for your admin team. Pick a chat on the left, or start a new one.</p><div class="tc-welcome-btns"><button class="tc-btn pri" data-tc="newchat">' + ico('fa-message') + ' New chat</button><button class="tc-btn" data-tc="newgroup">' + ico('fa-users') + ' New group</button></div><small>' + ico('fa-lock') + ' Visible only to signed-in portal admins</small></div>'; return; }
            main.innerHTML = '<header class="tc-head" id="tc-head"></header><div class="tc-searchbar" id="tc-searchbar" style="display:none"><input id="tc-sq" placeholder="Search in this chat…" autocomplete="off"><span id="tc-sinfo"></span><button class="tc-ib" data-tc="closesearch" aria-label="Close search">' + ico('fa-xmark') + '</button></div><div class="tc-pin" id="tc-pin" style="display:none"></div>' +
                '<div class="tc-msgs" id="tc-msgs" tabindex="0"></div><button class="tc-jump" id="tc-jumpbtn" data-tc="tobottom" style="display:none" aria-label="Jump to latest">' + ico('fa-angles-down') + '</button>' +
                '<footer class="tc-composer" id="tc-composer"><div id="tc-meta"></div><div class="tc-suggest" id="tc-suggest" style="display:none"></div>' +
                '<div class="tc-locked" id="tc-locked" style="display:none">' + ico('fa-lock') + ' Only admins can send messages in this group.</div>' +
                '<div class="tc-compose-row"><button class="tc-ib" data-tc="emoji" aria-label="Emoji">' + ico('fa-face-smile') + '</button><button class="tc-ib" data-tc="attach" aria-label="Attach">' + ico('fa-paperclip') + '</button><button class="tc-ib urg" data-tc="urgent" title="Mark next message urgent" aria-label="Urgent">' + ico('fa-flag') + '</button>' +
                '<textarea id="tc-input" rows="1" placeholder="Type a message — @ to mention, / for quick replies" maxlength="4000" autocomplete="off"></textarea>' +
                '<button class="tc-send" data-tc="send" aria-label="Send" style="display:none">' + ico('fa-paper-plane') + '</button><button class="tc-send mic" data-tc="mic" aria-label="Voice note">' + ico('fa-microphone') + '</button></div>' +
                '<input type="file" id="tc-file" multiple hidden></footer><aside class="tc-info" id="tc-info" style="display:none"></aside>';
            renderHead(); renderMessages('unread'); renderComposerMeta();
            const inp = $('#tc-input'); if (inp) { inp.value = TC.drafts[r.id] || ''; autoGrow(inp); renderComposerMeta(); if (window.matchMedia && !matchMedia('(hover:none)').matches) inp.focus(); }
            if (TC.info) renderInfo();
        }
        function overlay() { return $('#tc-overlay'); }
        function closeMenu() { TC.menu = null; const o = $('#tc-pop'); if (o) o.remove(); }
        function closeModal() { TC.modal = null; const o = overlay(); if (o) { o.innerHTML = ''; o.classList.remove('on'); } }
        function modal(title, body, foot, cls) {
            const o = overlay(); if (!o) return;
            closeMenu(); TC.modal = title;
            o.innerHTML = '<div class="tc-scrim" data-tc="closemodal"></div><div class="tc-modal ' + (cls || '') + '" role="dialog" aria-label="' + esc(title) + '"><div class="tc-modal-h"><b>' + esc(title) + '</b><button class="tc-ib" data-tc="closemodal" aria-label="Close">' + ico('fa-xmark') + '</button></div><div class="tc-modal-b">' + body + '</div>' + (foot ? '<div class="tc-modal-f">' + foot + '</div>' : '') + '</div>';
            o.classList.add('on');
            const f = o.querySelector('input[type=text],input[type=search],textarea'); if (f && window.matchMedia && !matchMedia('(hover:none)').matches) f.focus();
        }
        function popup(anchor, html, cls) {
            closeMenu(); const root = TC.root; if (!root || !anchor) return;
            const pop = document.createElement('div'); pop.id = 'tc-pop'; pop.className = 'tc-pop ' + (cls || ''); pop.innerHTML = html; root.appendChild(pop);
            const rr = root.getBoundingClientRect(), ar = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
            let left = ar.right - rr.left - pw, top = ar.bottom - rr.top + 6;
            if (left < 8) left = 8; if (left + pw > rr.width - 8) left = Math.max(8, rr.width - pw - 8);
            if (top + ph > rr.height - 8) top = Math.max(8, ar.top - rr.top - ph - 6);
            pop.style.left = left + 'px'; pop.style.top = top + 'px';
            TC.menu = true;
        }

        // ---------------------------------------------------------------
        // Opening chats, info panel, modals
        // ---------------------------------------------------------------
        async function openRoom(id) {
            if (!TC.rooms.has(id)) return;
            closeMenu(); closeModal();
            TC.activeId = id; TC.reply = null; TC.editing = null; TC.urgent = false; TC.info = false; TC.searching = false; TC.searchHits = null; TC.sug = null;
            const mm = myMember(id); TC.unreadAt = mm ? mm.last_read_at : null;
            renderChatArea(); renderList();
            try {
                const rows = await TC.repo.messages(id, null, 60);
                rows.forEach(upsertMsg); TC.hasMore.set(id, rows.length >= 60);
                const r = TC.rooms.get(id); if (r && r.disappearing_secs) TC.repo.purgeExpired(id);
            } catch (e) { say('warning', 'Could not load messages — showing what is cached.'); }
            if (TC.activeId !== id) return;
            renderHead(); renderMessages('unread'); renderList();
            setTimeout(() => markRead(id), 400);
            if (TC.root) TC.root.classList.add('has-chat');
        }
        function back() { TC.activeId = null; TC.info = false; renderChatArea(); renderList(); }
        async function loadOlder() {
            const id = TC.activeId; if (!id) return;
            const a = list(id); if (!a.length) return;
            try { const rows = await TC.repo.messages(id, a[0].created_at, 60); rows.forEach(upsertMsg); TC.hasMore.set(id, rows.length >= 60); renderMessages('keep-top'); } catch (e) { say('error', 'Could not load earlier messages.'); }
        }
        async function jumpTo(id) {
            let el = TC.root.querySelector('.tc-row[data-id="' + id + '"]');
            let guard = 0;
            while (!el && TC.hasMore.get(TC.activeId) && guard++ < 12) { await loadOlder(); el = TC.root.querySelector('.tc-row[data-id="' + id + '"]'); const m = list(TC.activeId).find(x => x.id === id); if (m && !el) break; }
            if (!el) { say('info', 'That message is not available.'); return; }
            el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1800);
        }
        function toggleRow(label, sub, on, act) { return '<button class="tc-trow" data-tc="' + act + '"><span><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><i class="tc-sw ' + (on ? 'on' : '') + '"></i></button>'; }
        function renderInfo() {
            const el = $('#tc-info'), r = active(); if (!el || !r) return;
            if (!TC.info) { el.style.display = 'none'; return; }
            el.style.display = '';
            const admin = isAdmin(r.id), mm = myMember(r.id), mem = roomMembers(r.id);
            const dis = r.disappearing_secs || 0;
            let h = '<div class="tc-info-h"><b>' + (r.kind === 'dm' ? 'Contact info' : 'Group info') + '</b><button class="tc-ib" data-tc="info" aria-label="Close">' + ico('fa-xmark') + '</button></div><div class="tc-info-b">' +
                '<div class="tc-info-top">' + avatar(roomTitle(r), roomPhoto(r), 92) + '<h3>' + esc(roomTitle(r)) + '</h3><p>' + (r.kind === 'dm' ? esc(prettyRole((TC.dirById.get((mem.find(x => x.user_id !== meId()) || {}).user_id) || {}).role)) : mem.length + ' members') + '</p>' +
                (r.kind !== 'dm' ? '<div class="tc-desc">' + (r.description ? esc(r.description) : '<i>No description</i>') + '</div>' + (admin ? '<button class="tc-link" data-tc="editgroup">' + ico('fa-pen') + ' Edit name & description</button>' : '') : '') + '</div>' +
                '<div class="tc-info-sec"><button class="tc-trow plain" data-tc="gallery"><span><b>' + ico('fa-photo-film') + ' Media, docs and links</b></span>' + ico('fa-chevron-right') + '</button>' +
                '<button class="tc-trow plain" data-tc="starredroom"><span><b>' + ico('fa-star') + ' Starred messages</b></span>' + ico('fa-chevron-right') + '</button></div>' +
                '<div class="tc-info-sec">' + '<button class="tc-trow" data-tc="mutepick"><span><b>Notifications</b><small>' + esc(muteLabel(mm)) + '</small></span>' + ico('fa-chevron-right') + '</button>' + toggleRow('Archive chat', 'Hide from your main list', mm && mm.archived, 'archive') +
                (r.kind !== 'dm' && admin ? toggleRow('Only admins can send', 'Announcement mode', r.only_admins_send, 'onlyadmins') : '') +
                (admin || r.kind === 'dm' ? '<label class="tc-select"><span><b>Disappearing messages</b><small>New messages vanish after the chosen time</small></span><select data-tc-sel="disappear"><option value="0" ' + (!dis ? 'selected' : '') + '>Off</option><option value="86400" ' + (dis === 86400 ? 'selected' : '') + '>24 hours</option><option value="604800" ' + (dis === 604800 ? 'selected' : '') + '>7 days</option></select></label>' : '') + '</div>';
            if (r.kind !== 'dm') {
                h += '<div class="tc-info-sec"><div class="tc-sec-h"><b>' + mem.length + ' members</b>' + (admin ? '<button class="tc-link" data-tc="addmembers">' + ico('fa-user-plus') + ' Add</button>' : '') + '</div>' +
                    mem.slice().sort((a, b) => (b.role === 'admin') - (a.role === 'admin') || person(a.user_id).name.localeCompare(person(b.user_id).name)).map(m => {
                        const p = person(m.user_id), me = m.user_id === meId();
                        return '<div class="tc-mrow" data-tc="profile" data-uid="' + esc(m.user_id) + '">' + avatar(p.name, p.photo, 38, isOnline(m.user_id) ? 'online' : '') + '<span><b>' + esc(p.name) + (me ? ' (You)' : '') + ' ' + repBadge(m.user_id) + '</b><small>' + esc(prettyRole(p.role) || 'Member') + '</small></span>' + (m.role === 'admin' ? '<em class="tc-adm">Admin</em>' : '') +
                            (admin && !me ? '<button class="tc-ib sm" data-tc="memberact" data-uid="' + esc(m.user_id) + '" aria-label="Member options">' + ico('fa-ellipsis-vertical') + '</button>' : '') + '</div>';
                    }).join('') + '</div>';
            }
            h += '<div class="tc-info-sec danger"><button class="tc-trow plain" data-tc="export"><span><b>' + ico('fa-file-export') + ' Export chat</b></span></button><button class="tc-trow plain red" data-tc="clear"><span><b>' + ico('fa-broom') + ' Clear chat</b></span></button>' +
                (r.kind === 'dm' ? '<button class="tc-trow plain red" data-tc="deletechat"><span><b>' + ico('fa-trash') + ' Delete chat</b></span></button>' : '<button class="tc-trow plain red" data-tc="leave"><span><b>' + ico('fa-right-from-bracket') + ' Leave group</b></span></button>' + (admin ? '<button class="tc-trow plain red" data-tc="deletechat"><span><b>' + ico('fa-trash') + ' Delete group for everyone</b></span></button>' : '')) + '</div></div>';
            el.innerHTML = h;
        }
        function personRows(people, mode, selected) {
            return people.map(p => '<label class="tc-prow" data-name="' + esc(p.name.toLowerCase()) + '">' + (mode === 'pick' ? '<input type="checkbox" value="' + esc(p.id) + '" ' + (selected && selected.has(p.id) ? 'checked' : '') + '>' : '') +
                avatar(p.name, p.photo, 40, isOnline(p.id) ? 'online' : '') + '<span><b>' + esc(p.name) + '</b><small>' + esc(prettyRole(p.role) || 'Admin') + '</small></span>' + (mode === 'dm' ? '<button hidden data-tc="dm" data-uid="' + esc(p.id) + '"></button>' : '') + '</label>').join('');
        }
        function showNewChat() {
            const people = TC.directory.filter(p => p.id !== meId());
            modal('New chat', '<div class="tc-m-search"><input type="search" id="tc-ms" placeholder="Search people" autocomplete="off"></div><button class="tc-prow action" data-tc="newgroup"><i class="tc-circ">' + ico('fa-users') + '</i><span><b>New group</b><small>Chat with several admins</small></span></button><div class="tc-plist" id="tc-plist">' +
                (people.length ? people.map(p => '<button class="tc-prow" data-tc="dm" data-uid="' + esc(p.id) + '" data-name="' + esc(p.name.toLowerCase()) + '">' + avatar(p.name, p.photo, 40, isOnline(p.id) ? 'online' : '') + '<span><b>' + esc(p.name) + '</b><small>' + esc(prettyRole(p.role) || 'Admin') + '</small></span></button>').join('') : '<p class="tc-hint">No other admins found yet. Add admin users first (Admin Users).</p>') + '</div>');
        }
        function showNewGroup() {
            const people = TC.directory.filter(p => p.id !== meId());
            modal('New group', '<label class="tc-fl"><span>Group name</span><input type="text" id="tc-gname" maxlength="60" placeholder="e.g. Board of Directors"></label><label class="tc-fl"><span>Description (optional)</span><input type="text" id="tc-gdesc" maxlength="200" placeholder="What is this group for?"></label><div class="tc-m-search"><input type="search" id="tc-ms" placeholder="Search people" autocomplete="off"></div><div class="tc-plist" id="tc-plist">' +
                (people.length ? personRows(people, 'pick') : '<p class="tc-hint">No other admins found yet.</p>') + '</div>', '<button class="tc-btn" data-tc="closemodal">Cancel</button><button class="tc-btn pri" data-tc="creategroup">' + ico('fa-check') + ' Create group</button>');
        }
        function showAddMembers() {
            const r = active(); if (!r) return; const have = new Set(memberIds(r.id));
            const people = TC.directory.filter(p => !have.has(p.id));
            modal('Add members', '<div class="tc-m-search"><input type="search" id="tc-ms" placeholder="Search people" autocomplete="off"></div><div class="tc-plist" id="tc-plist">' + (people.length ? personRows(people, 'pick') : '<p class="tc-hint">Everyone is already in this group.</p>') + '</div>', '<button class="tc-btn" data-tc="closemodal">Cancel</button><button class="tc-btn pri" data-tc="doaddmembers">' + ico('fa-user-plus') + ' Add</button>');
        }
        function showForward(m) {
            TC.fwd = m;
            const rooms = [...TC.rooms.values()].filter(r => myMember(r.id) && canSend(r.id));
            modal('Forward to…', '<div class="tc-m-search"><input type="search" id="tc-ms" placeholder="Search chats" autocomplete="off"></div><div class="tc-plist" id="tc-plist">' + rooms.map(r => '<label class="tc-prow" data-name="' + esc(roomTitle(r).toLowerCase()) + '"><input type="checkbox" value="' + r.id + '">' + avatar(roomTitle(r), roomPhoto(r), 40) + '<span><b>' + esc(roomTitle(r)) + '</b><small>' + (r.kind === 'dm' ? 'Direct chat' : roomMembers(r.id).length + ' members') + '</small></span></label>').join('') + '</div>', '<button class="tc-btn" data-tc="closemodal">Cancel</button><button class="tc-btn pri" data-tc="doforward">' + ico('fa-share') + ' Forward</button>');
        }
        function showPoll() {
            modal('Create poll', '<label class="tc-fl"><span>Question</span><input type="text" id="tc-pq" maxlength="140" placeholder="Ask a question"></label><div id="tc-popts"><label class="tc-fl"><span>Options</span><input type="text" class="tc-po" maxlength="80" placeholder="Option 1"></label><input type="text" class="tc-po tc-fl-in" maxlength="80" placeholder="Option 2"></div><button class="tc-link" data-tc="addopt">' + ico('fa-plus') + ' Add option</button><label class="tc-check"><input type="checkbox" id="tc-pmulti"> Allow multiple answers</label>', '<button class="tc-btn" data-tc="closemodal">Cancel</button><button class="tc-btn pri" data-tc="dopoll">' + ico('fa-paper-plane') + ' Send poll</button>');
        }
        function showSchedule() {
            const inp = $('#tc-input'); const text = inp ? inp.value.trim() : '';
            if (!text) { say('info', 'Type your message first, then choose Schedule.'); return; }
            const d = new Date(Date.now() + 3600000); d.setMinutes(0, 0, 0);
            const pad = n => String(n).padStart(2, '0'), v = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
            modal('Schedule message', '<div class="tc-quote plain"><span>' + esc(text.length > 160 ? text.slice(0, 160) + '…' : text) + '</span></div><label class="tc-fl"><span>Send at</span><input type="datetime-local" id="tc-when" value="' + v + '"></label><p class="tc-hint">' + ico('fa-circle-info') + ' Scheduled messages are sent from your open admin portal at the chosen time.</p>', '<button class="tc-btn" data-tc="closemodal">Cancel</button><button class="tc-btn pri" data-tc="doschedule">' + ico('fa-clock') + ' Schedule</button>');
        }
        function showScheduled() {
            const rows = TC.scheduled.slice().sort((a, b) => a.scheduled_for < b.scheduled_for ? -1 : 1);
            modal('Scheduled messages', rows.length ? rows.map(m => '<div class="tc-srow"><span><b>' + esc(TC.rooms.get(m.room_id) ? roomTitle(TC.rooms.get(m.room_id)) : 'Chat') + '</b><em>' + esc(new Date(m.scheduled_for).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })) + '</em><small>' + esc(m.body) + '</small></span><button class="tc-ib sm" data-tc="cancelsched" data-id="' + m.id + '" aria-label="Cancel scheduled message">' + ico('fa-trash') + '</button></div>').join('') : '<p class="tc-hint center">' + ico('fa-clock') + '<br>No scheduled messages.</p>');
        }
        function showTemplates(pick) {
            modal('Quick replies', '<div class="tc-tpl">' + (TC.templates.length ? TC.templates.map((t, i) => '<div class="tc-trow plain"><button class="tc-tpl-t" data-tc="usetpl" data-i="' + i + '">' + esc(t) + '</button><button class="tc-ib sm" data-tc="deltpl" data-i="' + i + '" aria-label="Delete">' + ico('fa-trash') + '</button></div>').join('') : '<p class="tc-hint center">No quick replies yet.</p>') + '</div><div class="tc-addtpl"><input type="text" id="tc-ntpl" maxlength="200" placeholder="Add a quick reply"><button class="tc-btn pri" data-tc="addtpl">' + ico('fa-plus') + ' Add</button></div><p class="tc-hint">Tip: type <b>/</b> in the message box to pick one instantly.</p>');
        }
        function showPrefs() { showSettings(); }
        async function showStarred(roomOnly) {
            let rows = [];
            try { const ids = roomOnly ? [TC.activeId] : [...TC.rooms.keys()]; rows = await TC.repo.starred(meId(), ids); rows.forEach(upsertMsg); } catch (e) { /* show what we have */ }
            rows = rows.filter(m => visible(m) && !m.deleted_all);
            modal('Starred messages', rows.length ? rows.map(m => '<button class="tc-srow link" data-tc="gotomsg" data-id="' + m.id + '" data-room="' + m.room_id + '"><span><b>' + esc(m.sender_id === meId() ? 'You' : (m.sender_name || person(m.sender_id).name)) + ' · ' + esc(TC.rooms.get(m.room_id) ? roomTitle(TC.rooms.get(m.room_id)) : '') + '</b><em>' + esc(new Date(m.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })) + '</em><small>' + pv(m, true) + '</small></span></button>').join('') : '<p class="tc-hint center">' + ico('fa-star') + '<br>No starred messages yet.<br>Open a message menu and tap Star.</p>');
        }
        async function showGallery() {
            const id = TC.activeId; if (!id) return;
            try { const rows = await TC.repo.messages(id, null, 400); rows.forEach(upsertMsg); } catch (e) { /* cached */ }
            const all = list(id).filter(m => visible(m) && !m.deleted_all);
            const media = all.filter(m => m.kind === 'image'), docs = all.filter(m => m.kind === 'file' || m.kind === 'voice');
            const links = []; all.forEach(m => { (String(m.body || '').match(/https?:\/\/[^\s<]+/g) || []).forEach(u => links.push({ u, m })); });
            const tab = TC.galTab || 'media'; TC.galTab = tab;
            const tabs = '<div class="tc-tabs"><button data-tc="galtab" data-t="media" class="' + (tab === 'media' ? 'on' : '') + '">Media <b>' + media.length + '</b></button><button data-tc="galtab" data-t="docs" class="' + (tab === 'docs' ? 'on' : '') + '">Docs <b>' + docs.length + '</b></button><button data-tc="galtab" data-t="links" class="' + (tab === 'links' ? 'on' : '') + '">Links <b>' + links.length + '</b></button></div>';
            let body;
            if (tab === 'media') body = media.length ? '<div class="tc-grid">' + media.slice().reverse().map(m => '<button data-tc="view" data-url="' + esc(m.attachment.url) + '"><img src="' + esc(m.attachment.url) + '" alt="" loading="lazy"></button>').join('') + '</div>' : '<p class="tc-hint center">No photos shared yet.</p>';
            else if (tab === 'docs') body = docs.length ? docs.slice().reverse().map(m => '<a class="tc-srow link" href="' + esc(m.attachment.url) + '" target="_blank" rel="noopener noreferrer"><span><b>' + ico(m.kind === 'voice' ? 'fa-microphone' : 'fa-file-lines') + ' ' + esc(m.attachment.name || 'File') + '</b><em>' + esc(new Date(m.created_at).toLocaleDateString()) + '</em></span></a>').join('') : '<p class="tc-hint center">No documents yet.</p>';
            else body = links.length ? links.slice().reverse().map(x => '<a class="tc-srow link" href="' + esc(x.u) + '" target="_blank" rel="noopener noreferrer"><span><b>' + esc(x.u) + '</b><em>' + esc(new Date(x.m.created_at).toLocaleDateString()) + '</em></span></a>').join('') : '<p class="tc-hint center">No links yet.</p>';
            modal('Media, docs and links', tabs + body, '', 'wide');
        }
        function showMsgInfo(m) {
            const others = roomMembers(m.room_id).filter(x => x.user_id !== meId());
            const read = others.filter(o => o.last_read_at && o.last_read_at >= m.created_at), deliv = others.filter(o => !read.includes(o) && ((o.last_delivered_at && o.last_delivered_at >= m.created_at) || isOnline(o.user_id))), rest = others.filter(o => !read.includes(o) && !deliv.includes(o));
            const grp = (title, arr, cls) => '<div class="tc-info-sec"><div class="tc-sec-h"><b class="' + cls + '">' + title + '</b></div>' + (arr.length ? arr.map(o => '<div class="tc-mrow">' + avatar(person(o.user_id).name, person(o.user_id).photo, 34) + '<span><b>' + esc(person(o.user_id).name) + '</b><small>' + (title === 'Read by' && o.last_read_at ? esc(new Date(o.last_read_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })) : '') + '</small></span></div>').join('') : '<p class="tc-hint">—</p>') + '</div>';
            modal('Message info', '<div class="tc-quote plain"><span>' + pv(m, true) + '</span><small>' + esc(new Date(m.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })) + '</small></div>' + grp('Read by', read, 'blue') + grp('Delivered to', deliv, '') + grp('Sent to', rest, ''));
        }
        async function showShare() {
            modal('Share a project or meeting', '<p class="tc-hint center"><i class="fa-solid fa-spinner fa-spin"></i> Loading…</p>');
            let ev = [], me = [];
            try { const a = await sb().from('events').select('id, event_name, date, venue, status').order('date', { ascending: false }).limit(25); ev = a.data || []; } catch (e) { /* none */ }
            try { const b = await sb().from('meetings').select('id, meeting_name, date').order('date', { ascending: false }).limit(15); me = b.data || []; } catch (e) { /* none */ }
            TC.shareItems = ev.map(x => ({ type: 'event', id: x.id, title: x.event_name, date: x.date, venue: x.venue || '' })).concat(me.map(x => ({ type: 'meeting', id: x.id, title: x.meeting_name, date: x.date, venue: '' })));
            if (TC.modal !== 'Share a project or meeting') return;
            modal('Share a project or meeting', TC.shareItems.length ? '<div class="tc-plist">' + TC.shareItems.map((x, i) => '<button class="tc-prow" data-tc="doshare" data-i="' + i + '"><i class="tc-circ">' + ico(x.type === 'meeting' ? 'fa-people-group' : 'fa-calendar-days') + '</i><span><b>' + esc(x.title) + '</b><small>' + esc(x.type === 'meeting' ? 'Meeting' : 'Project') + (x.date ? ' · ' + esc(x.date) : '') + '</small></span></button>').join('') + '</div>' : '<p class="tc-hint center">No projects or meetings found.</p>');
        }
        function showEditGroup() {
            const r = active(); if (!r) return;
            modal('Edit group', '<label class="tc-fl"><span>Group name</span><input type="text" id="tc-gname" maxlength="60" value="' + esc(r.name) + '"></label><label class="tc-fl"><span>Description</span><input type="text" id="tc-gdesc" maxlength="200" value="' + esc(r.description || '') + '"></label>', '<button class="tc-btn" data-tc="closemodal">Cancel</button><button class="tc-btn pri" data-tc="dosaveGroup">' + ico('fa-check') + ' Save</button>');
        }
        function showDelete(m) {
            const canAll = m.sender_id === meId() || isAdmin(m.room_id);
            TC.delTarget = m.id;
            modal('Delete message?', '<div class="tc-quote plain"><span>' + pv(m, true) + '</span></div>', (canAll ? '<button class="tc-btn red" data-tc="delall">' + ico('fa-trash') + ' Delete for everyone</button>' : '') + '<button class="tc-btn" data-tc="delme">Delete for me</button><button class="tc-btn" data-tc="closemodal">Cancel</button>', 'stack');
        }
        function messageMenu(m, anchor) {
            const mine = m.sender_id === meId();
            const r = TC.rooms.get(m.room_id);
            const canEdit = mine && m.kind === 'text' && (Date.now() - new Date(m.created_at).getTime()) < EDIT_WINDOW && !m.deleted_all;
            const canPin = r && (r.kind === 'dm' || isAdmin(r.id) || !r.only_admins_send);
            const starred = (m.starred_by || []).includes(meId());
            const item = (act, icon, label, red) => '<button data-tc="' + act + '" data-id="' + m.id + '" class="' + (red ? 'red' : '') + '">' + ico(icon) + '<span>' + label + '</span></button>';
            popup(anchor, '<div class="tc-quickrx">' + QUICK.map(e => '<button data-tc="react" data-id="' + m.id + '" data-e="' + e + '" title="' + RX[e].n + '">' + rxIcon(e) + '</button>').join('') + '</div>' +
                (canSend(m.room_id) ? item('reply', 'fa-reply', 'Reply') : '') + (m.body ? item('copy', 'fa-copy', 'Copy') : '') + item('forward', 'fa-share', 'Forward') + item('remind', 'fa-bell', 'Remind me') + item('maketask', 'fa-list-check', 'Make task') + (!mine && m.kind !== 'system' ? item('giveKudosMsg', 'fa-heart', 'Give kudos') : '') + item('star', starred ? 'fa-star-half-stroke' : 'fa-star', starred ? 'Unstar' : 'Star') +
                (canPin ? item('pin', 'fa-thumbtack', r && r.pinned_message_id === m.id ? 'Unpin' : 'Pin') : '') + (mine ? item('minfo', 'fa-circle-info', 'Message info') : '') + (canEdit ? item('edit', 'fa-pen', 'Edit') : '') + item('delete', 'fa-trash', 'Delete', true), 'msgmenu');
        }
        function chatMenu(anchor) {
            const r = active(); if (!r) return; const mm = myMember(r.id);
            const item = (act, icon, label, red) => '<button data-tc="' + act + '" class="' + (red ? 'red' : '') + '">' + ico(icon) + '<span>' + label + '</span></button>';
            popup(anchor, item('info', 'fa-circle-info', r.kind === 'dm' ? 'Contact info' : 'Group info') + item('search', 'fa-magnifying-glass', 'Search') + item('mutepick', isMuted(mm) ? 'fa-bell' : 'fa-bell-slash', isMuted(mm) ? 'Notifications (muted)' : 'Notifications') + item('pinchat', 'fa-thumbtack', (TC.prefs.pins || []).includes(r.id) ? 'Unpin chat' : 'Pin chat to top') + item('tasks', 'fa-list-check', 'Tasks') + item('archive', 'fa-box-archive', mm && mm.archived ? 'Unarchive' : 'Archive chat') +
                item('scheduled', 'fa-clock', 'Scheduled messages') + item('export', 'fa-file-export', 'Export chat') + item('clear', 'fa-broom', 'Clear chat', true), 'chatmenu');
        }
        function sideMenu(anchor) {
            const item = (act, icon, label) => '<button data-tc="' + act + '">' + ico(icon) + '<span>' + label + '</span></button>';
            popup(anchor, item('newgroup', 'fa-users', 'New group') + item('starred', 'fa-star', 'Starred messages') + item('scheduled', 'fa-clock', 'Scheduled messages') + item('notes', 'fa-bookmark', 'Saved notes') + item('broadcast', 'fa-bullhorn', 'Broadcast') + item('leaderboard', 'fa-ranking-star', 'Leaderboard') + item('myprofile', 'fa-id-badge', 'My profile') + item('templates', 'fa-bolt', 'Quick replies') + item('prefs', 'fa-gear', 'Settings'), 'sidemenu');
        }
        function attachMenu(anchor) {
            const item = (act, icon, label, c) => '<button data-tc="' + act + '"><i class="tc-circ ' + c + '">' + ico(icon) + '</i><span>' + label + '</span></button>';
            popup(anchor, item('pickimg', 'fa-image', 'Photo', 'c1') + item('pickdoc', 'fa-file-lines', 'Document', 'c2') + item('poll', 'fa-chart-simple', 'Poll', 'c3') + item('share', 'fa-calendar-days', 'Project / meeting', 'c4') + item('task', 'fa-list-check', 'Task', 'c7') + item('location', 'fa-location-dot', 'Location', 'c8') + item('schedule', 'fa-clock', 'Schedule message', 'c5') + item('templates', 'fa-bolt', 'Quick replies', 'c6'), 'attachmenu up');
        }
        function insertAtCaret(text) {
            const inp = $('#tc-input'); if (!inp) return;
            const s = inp.selectionStart == null ? inp.value.length : inp.selectionStart, e = inp.selectionEnd == null ? s : inp.selectionEnd;
            inp.value = inp.value.slice(0, s) + text + inp.value.slice(e);
            inp.selectionStart = inp.selectionEnd = s + text.length; autoGrow(inp); inp.focus(); onComposerInput();
        }
        function onComposerInput() {
            const inp = $('#tc-input'), r = active(); if (!inp || !r) return;
            autoGrow(inp); renderComposerMeta();
            TC.drafts[r.id] = inp.value; if (!inp.value) delete TC.drafts[r.id];
            clearTimeout(TC._dt); TC._dt = setTimeout(() => ls.set('drafts', TC.drafts), 400);
            if (inp.value && Date.now() - TC.lastTyping > 2500) { TC.lastTyping = Date.now(); emit({ t: 'typing', room: r.id, to: memberIds(r.id) }); }
            const pos = inp.selectionStart == null ? inp.value.length : inp.selectionStart, before = inp.value.slice(0, pos);
            const mm = before.match(/(^|\s)@([^\s@]*)$/), tm = before.match(/^\/([^\n]*)$/);
            if (mm && r.kind !== 'dm') { const q = mm[2].toLowerCase(); const items = roomMembers(r.id).filter(m => m.user_id !== meId()).map(m => person(m.user_id)).filter(p => p.name.toLowerCase().includes(q)).slice(0, 6); setSuggest('mention', items, mm[0].length - mm[1].length); }
            else if (tm) { const q = tm[1].toLowerCase(); setSuggest('tpl', TC.templates.map((t, i) => ({ t, i })).filter(x => x.t.toLowerCase().includes(q)).slice(0, 6), tm[0].length); }
            else setSuggest(null, []);
        }
        function setSuggest(mode, items, len) {
            const el = $('#tc-suggest'); if (!el) return;
            if (!mode || !items.length) { TC.sug = null; el.style.display = 'none'; el.innerHTML = ''; return; }
            TC.sug = { mode, items, idx: 0, len };
            el.style.display = '';
            el.innerHTML = items.map((x, i) => mode === 'mention' ? '<button data-tc="sug" data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '">' + avatar(x.name, x.photo, 28) + '<span>' + esc(x.name) + '</span></button>' : '<button data-tc="sug" data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '">' + ico('fa-bolt') + '<span>' + esc(x.t) + '</span></button>').join('');
        }
        function applySuggest(i) {
            const s = TC.sug, inp = $('#tc-input'); if (!s || !inp) return;
            const x = s.items[i]; if (!x) return;
            const pos = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
            const start = pos - s.len + (s.mode === 'mention' ? 0 : 0);
            const before = inp.value.slice(0, Math.max(0, start)), after = inp.value.slice(pos);
            const ins = s.mode === 'mention' ? '@' + x.name + ' ' : x.t;
            inp.value = before + ins + after; inp.selectionStart = inp.selectionEnd = (before + ins).length;
            setSuggest(null, []); autoGrow(inp); inp.focus(); onComposerInput();
        }

        // ---------------------------------------------------------------
        // Event handling
        // ---------------------------------------------------------------
        function findMsg(id) { return list(TC.activeId).find(x => x.id === id) || null; }
        function checked(sel) { return Array.from(TC.root.querySelectorAll(sel + ' input[type=checkbox]:checked')).map(i => i.value); }
        function filterRows(q) { q = (q || '').toLowerCase(); TC.root.querySelectorAll('#tc-plist [data-name]').forEach(r => { r.style.display = r.getAttribute('data-name').includes(q) ? '' : 'none'; }); }
        function fileInput(accept) { const f = $('#tc-file'); if (!f) return; f.accept = accept; f.value = ''; f.click(); }
        function rerootAfterReset() { const ws = AdminPanel.workspace; if (ws && AdminPanel.currentPage === 'chat') mount(ws); }

        async function act(a, t, e) {
            const id = t.getAttribute('data-id');
            switch (a) {
                case 'open': openRoom(id); break;
                case 'dm': { const uid = t.getAttribute('data-uid'); try { const rid = await openDM(uid); closeModal(); TC.q = ''; const qi = $('#tc-q'); if (qi) qi.value = ''; openRoom(rid); } catch (er) { say('error', 'Could not start chat: ' + (er.message || er)); } break; }
                case 'filter': TC.filter = t.getAttribute('data-f'); renderList(); break;
                case 'newchat': showNewChat(); break;
                case 'newgroup': closeMenu(); showNewGroup(); break;
                case 'sidemenu': sideMenu(t); break;
                case 'back': back(); break;
                case 'info': TC.info = !TC.info; closeMenu(); renderInfo(); break;
                case 'search': closeMenu(); TC.searching = true; TC.searchHits = null; renderHead(); { const q = $('#tc-sq'); if (q) { q.value = ''; q.focus(); } const si = $('#tc-sinfo'); if (si) si.innerHTML = ''; } break;
                case 'closesearch': TC.searching = false; TC.searchHits = null; renderHead(); break;
                case 'snext': case 'sprev': { const h = TC.searchHits; if (!h || !h.length) break; TC.searchIdx = (TC.searchIdx + (a === 'snext' ? 1 : h.length - 1)) % h.length; showHit(); break; }
                case 'gallery': closeMenu(); showGallery(); break;
                case 'galtab': TC.galTab = t.getAttribute('data-t'); showGallery(); break;
                case 'chatmenu': chatMenu(t); break;
                case 'tobottom': { const m = $('#tc-msgs'); if (m) m.scrollTo({ top: m.scrollHeight, behavior: 'smooth' }); break; }
                case 'older': loadOlder(); break;
                case 'jump': closeMenu(); jumpTo(id); break;
                case 'gotomsg': { const rid = t.getAttribute('data-room'); closeModal(); if (TC.activeId !== rid) await openRoom(rid); jumpTo(id); break; }
                case 'vote': { const m = findMsg(id); if (m) vote(m, t.getAttribute('data-opt')); break; }
                case 'react': { const m = findMsg(id); closeMenu(); if (m) toggleReaction(m, t.getAttribute('data-e')); break; }
                case 'mmenu': { const m = findMsg(id); if (m) messageMenu(m, t); break; }
                case 'retry': retry(id); break;
                case 'opencard': { const m = findMsg(id); if (m && m.attachment) AdminPanel.navigateTo(m.attachment.type === 'meeting' ? 'meetings' : 'events'); break; }
                case 'view': modal('Photo', '<img class="tc-viewer" src="' + esc(t.getAttribute('data-url')) + '" alt="Shared photo">', '<a class="tc-btn" href="' + esc(t.getAttribute('data-url')) + '" target="_blank" rel="noopener noreferrer">' + ico('fa-up-right-from-square') + ' Open original</a>', 'wide'); break;
                case 'emoji': popup(t, '<div class="tc-emoji">' + STICKERS.map(x => '<button data-tc="emo" data-e=":' + x[0] + ':" title="' + x[0] + '"><i class="fa-solid ' + x[1] + '" style="color:' + x[2] + '"></i></button>').join('') + '</div>', 'emoji up'); break;
                case 'emo': insertAtCaret(t.getAttribute('data-e') + ' '); break;
                case 'attach': attachMenu(t); break;
                case 'pickimg': closeMenu(); fileInput('image/*'); break;
                case 'pickdoc': closeMenu(); fileInput('*/*'); break;
                case 'poll': closeMenu(); showPoll(); break;
                case 'share': closeMenu(); showShare(); break;
                case 'schedule': closeMenu(); showSchedule(); break;
                case 'templates': closeMenu(); showTemplates(); break;
                case 'starred': closeMenu(); showStarred(false); break;
                case 'starredroom': showStarred(true); break;
                case 'scheduled': closeMenu(); showScheduled(); break;
                case 'prefs': closeMenu(); showPrefs(); break;
                case 'urgent': TC.urgent = !TC.urgent; renderComposerMeta(); say('info', TC.urgent ? 'Next message will be sent as URGENT' : 'Urgent turned off'); break;
                case 'send': sendText(); break;
                case 'mic': toggleRecord(); break;
                case 'cancelrec': if (TC.rec) { TC.rec.cancel = true; try { TC.rec.mr.stop(); } catch (er) { TC.rec = null; renderComposerMeta(); } } break;
                case 'cancelbar': { const inp = $('#tc-input'); if (TC.editing && inp) { inp.value = TC.drafts[TC.activeId] || ''; autoGrow(inp); } TC.reply = null; TC.editing = null; renderComposerMeta(); break; }
                case 'closemodal': closeModal(); break;
                case 'sug': applySuggest(Number(t.getAttribute('data-i'))); break;
                // message menu
                case 'reply': { const m = findMsg(id); closeMenu(); if (m && canSend(m.room_id)) { TC.reply = m; TC.editing = null; renderComposerMeta(); const i = $('#tc-input'); if (i) i.focus(); } break; }
                case 'copy': { const m = findMsg(id); closeMenu(); if (m) { try { await navigator.clipboard.writeText(m.body || ''); say('success', 'Copied'); } catch (er) { say('warning', 'Copy is blocked by the browser.'); } } break; }
                case 'forward': { const m = findMsg(id); closeMenu(); if (m) showForward(m); break; }
                case 'star': { const m = findMsg(id); closeMenu(); if (m) toggleStar(m); break; }
                case 'pin': { const m = findMsg(id), r = active(); closeMenu(); if (m && r) { await setRoom(r.id, { pinned_message_id: r.pinned_message_id === m.id ? null : m.id }); renderHead(); } break; }
                case 'minfo': { const m = findMsg(id); closeMenu(); if (m) showMsgInfo(m); break; }
                case 'edit': { const m = findMsg(id); closeMenu(); const inp = $('#tc-input'); if (m && inp) { TC.editing = m.id; TC.reply = null; inp.value = m.body; autoGrow(inp); renderComposerMeta(); inp.focus(); } break; }
                case 'delete': { const m = findMsg(id); closeMenu(); if (m) showDelete(m); break; }
                case 'delme': { const m = findMsg(TC.delTarget); closeModal(); if (m) deleteForMe(m); break; }
                case 'delall': { const m = findMsg(TC.delTarget); closeModal(); if (m) deleteForAll(m); break; }
                // groups
                case 'creategroup': {
                    const name = (($('#tc-gname') || {}).value || '').trim(), ids = checked('#tc-plist');
                    if (!name) { say('warning', 'Give the group a name.'); break; }
                    if (!ids.length) { say('warning', 'Pick at least one member.'); break; }
                    t.disabled = true;
                    try { const rid = await createGroup(name, (($('#tc-gdesc') || {}).value || '').trim(), ids); closeModal(); openRoom(rid); } catch (er) { say('error', 'Could not create group: ' + (er.message || er)); t.disabled = false; }
                    break;
                }
                case 'addmembers': showAddMembers(); break;
                case 'doaddmembers': { const r = active(), ids = checked('#tc-plist'); if (!r || !ids.length) { say('warning', 'Pick someone to add.'); break; } try { await addToGroup(r.id, ids); closeModal(); renderInfo(); renderMessages(true); } catch (er) { say('error', 'Could not add: ' + (er.message || er)); } break; }
                case 'memberact': { const uid = t.getAttribute('data-uid'), r = active(); if (!r) break; const mm = roomMembers(r.id).find(x => x.user_id === uid); popup(t, '<button data-tc="mrole" data-uid="' + esc(uid) + '" data-role="' + (mm && mm.role === 'admin' ? 'member' : 'admin') + '">' + ico('fa-user-shield') + '<span>' + (mm && mm.role === 'admin' ? 'Remove as admin' : 'Make group admin') + '</span></button><button class="red" data-tc="mremove" data-uid="' + esc(uid) + '">' + ico('fa-user-minus') + '<span>Remove from group</span></button>', 'sidemenu'); break; }
                case 'mrole': { const r = active(); closeMenu(); if (r) { try { await setRole(r.id, t.getAttribute('data-uid'), t.getAttribute('data-role')); renderInfo(); renderMessages(true); } catch (er) { say('error', 'Failed: ' + (er.message || er)); } } break; }
                case 'mremove': { const r = active(), uid = t.getAttribute('data-uid'); closeMenu(); if (r && confirm('Remove ' + person(uid).name + ' from this group?')) { try { await removeFromGroup(r.id, uid); renderInfo(); renderMessages(true); } catch (er) { say('error', 'Failed: ' + (er.message || er)); } } break; }
                case 'mute': { const r = active(); if (r) { await setMine(r.id, { muted: !(myMember(r.id) || {}).muted }); closeMenu(); renderInfo(); } break; }
                case 'archive': { const r = active(); if (r) { const to = !(myMember(r.id) || {}).archived; await setMine(r.id, { archived: to }); closeMenu(); say('info', to ? 'Chat archived' : 'Chat restored'); if (to) back(); else renderInfo(); } break; }
                case 'onlyadmins': { const r = active(); if (r && isAdmin(r.id)) { await setRoom(r.id, { only_admins_send: !r.only_admins_send }); await systemMsg(r.id, TC.me.name + (r.only_admins_send ? ' restricted sending to admins' : ' allowed everyone to send')); renderMessages(true); } break; }
                case 'editgroup': showEditGroup(); break;
                case 'dosaveGroup': { const r = active(), n = (($('#tc-gname') || {}).value || '').trim(); if (!r) break; if (!n) { say('warning', 'Name cannot be empty.'); break; } await setRoom(r.id, { name: n, description: (($('#tc-gdesc') || {}).value || '').trim() }); closeModal(); break; }
                case 'export': closeMenu(); { const r = active(); if (r) { exportChat(r.id); say('success', 'Chat exported'); } } break;
                case 'clear': { closeMenu(); const r = active(); if (r && confirm('Clear all messages for you? Other members keep their copy.')) clearChat(r.id); break; }
                case 'leave': { const r = active(); if (r && confirm('Leave “' + roomTitle(r) + '”?')) { try { await removeFromGroup(r.id, meId()); TC.rooms.delete(r.id); TC.members.delete(r.id); back(); badge(); } catch (er) { say('error', 'Could not leave: ' + (er.message || er)); } } break; }
                case 'deletechat': {
                    const r = active(); if (!r) break;
                    if (r.kind === 'dm') { if (confirm('Delete this chat from your list?')) { try { await TC.repo.delMember(r.id, meId()); emit({ t: 'room', room: r.id, to: memberIds(r.id) }); TC.rooms.delete(r.id); TC.members.delete(r.id); back(); badge(); } catch (er) { say('error', 'Failed: ' + (er.message || er)); } } }
                    else if (confirm('Delete “' + roomTitle(r) + '” for EVERYONE? All messages will be removed permanently.')) { try { await deleteGroup(r.id); back(); badge(); } catch (er) { say('error', 'Failed: ' + (er.message || er)); } }
                    break;
                }
                case 'doforward': { const ids = checked('#tc-plist'), m = TC.fwd; if (!m || !ids.length) { say('warning', 'Choose at least one chat.'); break; } closeModal(); await forwardTo(m, ids); break; }
                case 'addopt': { const box = $('#tc-popts'); if (box && box.querySelectorAll('.tc-po').length < 8) { const i = document.createElement('input'); i.type = 'text'; i.className = 'tc-po tc-fl-in'; i.maxLength = 80; i.placeholder = 'Option ' + (box.querySelectorAll('.tc-po').length + 1); box.appendChild(i); i.focus(); } break; }
                case 'dopoll': {
                    const q = (($('#tc-pq') || {}).value || '').trim(), opts = Array.from(TC.root.querySelectorAll('.tc-po')).map(i => i.value.trim()).filter(Boolean);
                    if (!q) { say('warning', 'Add a question.'); break; } if (opts.length < 2) { say('warning', 'Add at least two options.'); break; }
                    const multi = !!($('#tc-pmulti') || {}).checked; closeModal();
                    await send({ kind: 'poll', body: '', poll: { q, multi, closed: false, options: opts.map((t2, i) => ({ id: 'o' + i, t: t2, votes: [] })) } });
                    break;
                }
                case 'doschedule': {
                    const inp = $('#tc-input'), v = ($('#tc-when') || {}).value, when = v ? new Date(v) : null;
                    if (!inp || !inp.value.trim()) { closeModal(); break; }
                    if (!when || isNaN(when) || when.getTime() < Date.now() + 20000) { say('warning', 'Pick a time at least a minute from now.'); break; }
                    const body = inp.value, urgent = TC.urgent; closeModal();
                    const r = await send({ kind: 'text', body, scheduled_for: when.toISOString(), priority: urgent ? 'urgent' : 'normal' });
                    if (r) { inp.value = ''; delete TC.drafts[TC.activeId]; ls.set('drafts', TC.drafts); TC.urgent = false; autoGrow(inp); renderComposerMeta(); }
                    break;
                }
                case 'cancelsched': { try { await TC.repo.delMessage(id); TC.scheduled = TC.scheduled.filter(x => x.id !== id); showScheduled(); } catch (er) { say('error', 'Failed: ' + (er.message || er)); } break; }
                case 'usetpl': { const tx = TC.templates[Number(t.getAttribute('data-i'))]; closeModal(); if (tx != null) insertAtCaret(tx); break; }
                case 'deltpl': TC.templates.splice(Number(t.getAttribute('data-i')), 1); ls.set('templates', TC.templates); showTemplates(); break;
                case 'addtpl': { const i = $('#tc-ntpl'), v = i ? i.value.trim() : ''; if (v) { TC.templates.push(v); ls.set('templates', TC.templates); showTemplates(); } break; }
                case 'doshare': { const x = (TC.shareItems || [])[Number(t.getAttribute('data-i'))]; closeModal(); if (x) await send({ kind: 'card', body: '', attachment: { type: x.type, id: x.id, title: x.title, date: x.date, venue: x.venue } }); break; }
                case 'pref-sound': TC.prefs.sound = !TC.prefs.sound; ls.set('prefs', TC.prefs); showPrefs(); if (TC.prefs.sound) beep(false); break;
                case 'pref-desktop': {
                    if (!window.Notification) { say('warning', 'This browser does not support desktop alerts.'); break; }
                    if (TC.prefs.desktop) { TC.prefs.desktop = false; }
                    else { let p = Notification.permission; if (p === 'default') { try { p = await Notification.requestPermission(); } catch (er) { p = 'denied'; } } TC.prefs.desktop = p === 'granted'; if (p !== 'granted') say('warning', 'Notifications are blocked — allow them in your browser settings.'); }
                    ls.set('prefs', TC.prefs); showPrefs(); break;
                }
                case 'trycloud': ls.set('mode', ''); reset(); await boot(); rerootAfterReset(); break;
                default: await act2(a, t, e); break;
            }
        }
        function showHit() {
            const h = TC.searchHits, si = $('#tc-sinfo'); if (!si) return;
            if (!h || !h.length) { si.innerHTML = '<em>No results</em>'; return; }
            si.innerHTML = '<em>' + (TC.searchIdx + 1) + ' / ' + h.length + '</em><button class="tc-ib sm" data-tc="sprev" aria-label="Previous result">' + ico('fa-chevron-up') + '</button><button class="tc-ib sm" data-tc="snext" aria-label="Next result">' + ico('fa-chevron-down') + '</button>';
            jumpTo(h[TC.searchIdx].id);
        }
        async function doSearch(q) {
            const r = active(); if (!r) return;
            q = q.trim();
            if (q.length < 2) { TC.searchHits = null; const si = $('#tc-sinfo'); if (si) si.innerHTML = ''; return; }
            try { const rows = await TC.repo.search(r.id, q); TC.searchHits = rows.filter(visible); rows.forEach(upsertMsg); TC.searchIdx = 0; showHit(); } catch (e) { say('error', 'Search failed.'); }
        }

        function bind(root) {
            root.addEventListener('click', e => {
                if (TC.menu && !e.target.closest('#tc-pop')) closeMenu();
                const t = e.target.closest('[data-tc]');
                if (!t || !root.contains(t) || t.disabled) return;
                const a = t.getAttribute('data-tc');
                if (a === 'closemodal' && t.classList.contains('tc-scrim') === false && e.target.closest('.tc-modal') && t.tagName !== 'BUTTON') return;
                Promise.resolve(act(a, t, e)).catch(err => { console.warn('[chat] action failed', a, err); say('error', 'Something went wrong. Please try again.'); });
            });
            root.addEventListener('input', e => {
                const t = e.target;
                if (t.id === 'tc-q') { TC.q = t.value; renderList(); }
                else if (t.id === 'tc-input') onComposerInput();
                else if (t.id === 'tc-ms') filterRows(t.value);
                else if (t.id === 'tc-sq') { clearTimeout(TC._st); TC._st = setTimeout(() => doSearch(t.value), 280); }
            });
            root.addEventListener('change', async e => {
                const t = e.target;
                if (t.id === 'tc-file') { await sendFiles(t.files); t.value = ''; }
                else if (onChange2(t)) { /* handled */ }
                else if (t.getAttribute && t.getAttribute('data-tc-sel') === 'disappear') {
                    const r = active(); if (!r) return; const v = Number(t.value) || 0;
                    if (await setRoom(r.id, { disappearing_secs: v })) { await systemMsg(r.id, TC.me.name + (v ? ' turned on disappearing messages (' + (v >= 604800 ? '7 days' : '24 hours') + ')' : ' turned off disappearing messages')); renderMessages(true); }
                }
            });
            root.addEventListener('keydown', e => {
                const t = e.target;
                if (t.id === 'tc-input') {
                    if (TC.sug) {
                        const n = TC.sug.items.length;
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); TC.sug.idx = (TC.sug.idx + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; $('#tc-suggest').querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === TC.sug.idx)); return; }
                        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySuggest(TC.sug.idx); return; }
                        if (e.key === 'Escape') { e.preventDefault(); setSuggest(null, []); return; }
                    }
                    const touch = window.matchMedia && matchMedia('(hover:none)').matches;
                    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !touch) { e.preventDefault(); sendText(); }
                    else if (e.key === 'Escape') { if (TC.reply || TC.editing) { e.preventDefault(); act('cancelbar', t, e); } }
                    else if (e.key === 'ArrowUp' && !t.value) {
                        const mine = list(TC.activeId).filter(m => m.sender_id === meId() && m.kind === 'text' && !m.deleted_all && Date.now() - new Date(m.created_at) < EDIT_WINDOW).pop();
                        if (mine) { e.preventDefault(); TC.editing = mine.id; t.value = mine.body; autoGrow(t); renderComposerMeta(); }
                    }
                } else if (t.id === 'tc-sq' && e.key === 'Enter') { e.preventDefault(); act(e.shiftKey ? 'sprev' : 'snext', t, e); }
                else if (t.id === 'tc-sq' && e.key === 'Escape') act('closesearch', t, e);
            });
            root.addEventListener('paste', e => {
                if (e.target.id !== 'tc-input') return;
                const files = e.clipboardData && e.clipboardData.files;
                if (files && files.length) { e.preventDefault(); sendFiles(files); }
            });
            const dropZone = () => $('#tc-main');
            root.addEventListener('dragover', e => { if (TC.activeId && e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) { e.preventDefault(); const z = dropZone(); if (z) z.classList.add('drop'); } });
            root.addEventListener('dragleave', e => { if (!root.contains(e.relatedTarget)) { const z = dropZone(); if (z) z.classList.remove('drop'); } });
            root.addEventListener('drop', e => { const z = dropZone(); if (z) z.classList.remove('drop'); if (TC.activeId && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); sendFiles(e.dataTransfer.files); } });
            root.addEventListener('scroll', e => { if (e.target.id === 'tc-msgs') { updateJump(); if (e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 40 && TC.activeId) markRead(TC.activeId); } }, true);
        }
        document.addEventListener('keydown', e => {
            if (!(TC.root && TC.root.isConnected)) return;
            if (e.key === 'Escape') { if (TC.modal) closeModal(); else if (TC.menu) closeMenu(); }
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { const q = $('#tc-q'); if (q) { e.preventDefault(); if (TC.activeId) back(); q.focus(); q.select(); } }
            else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                const ids = Array.from(TC.root.querySelectorAll('#tc-list .tc-item[data-id]')).map(x => x.getAttribute('data-id')); if (!ids.length) return;
                e.preventDefault(); const i = ids.indexOf(TC.activeId), n = e.key === 'ArrowDown' ? Math.min(ids.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1); openRoom(ids[n]);
            }
        });
        document.addEventListener('visibilitychange', () => { if (!document.hidden && TC.mounted && TC.activeId) markRead(TC.activeId); });


        // ---------------------------------------------------------------
        // Premium extras: profile, leaderboard, notification centre, settings,
        // mute picker, tasks, reminders, broadcast, location, saved notes
        // ---------------------------------------------------------------
        function applyLook() { if (!TC.root) return; TC.root.setAttribute('data-wall', TC.prefs.wall || 'default'); TC.root.setAttribute('data-fs', TC.prefs.fs || 'm'); }
        function savePrefs() { ls.set('prefs', TC.prefs); applyLook(); }
        function rankOf(uid) { const all = TC.directory.map(p => [p.id, repRow(p.id).points]).sort((a, b) => b[1] - a[1]); const i = all.findIndex(x => x[0] === uid); return i < 0 ? 0 : i + 1; }
        function showProfile(uid) {
            const p = person(uid), r = repRow(uid), lv = levelOf(r.points), l = lv.l, next = lv.next, me = uid === meId();
            const pct = next ? Math.min(100, Math.round((r.points - l.min) * 100 / (next.min - l.min))) : 100;
            const earned = BADGES.filter(b => b.t(r));
            const stat = (i, n, t) => '<div><i class="fa-solid ' + i + '"></i><b>' + n + '</b><small>' + t + '</small></div>';
            modal('Profile', '<div class="tc-prof"><div class="tc-prof-top">' + avatar(p.name, p.photo, 84, isOnline(uid) ? 'online' : '') + '<h3>' + esc(p.name) + (me ? ' <small>(You)</small>' : '') + '</h3><p>' + esc(prettyRole(p.role) || 'Member') + '</p>' +
                '<span class="tc-lvlchip" style="--c:' + l.c + '"><i class="fa-solid ' + l.i + '"></i> ' + l.n + '</span></div>' +
                '<div class="tc-prog"><div><b>' + r.points + ' pts</b><small>' + (next ? (next.min - r.points) + ' to ' + next.n : 'Top level reached') + '</small></div><span><i style="width:' + pct + '%;background:' + l.c + '"></i></span></div>' +
                '<div class="tc-stats">' + stat('fa-message', r.msgs, 'Messages') + stat('fa-thumbs-up', r.reactions, 'Reactions') + stat('fa-hand-holding-heart', r.helpful, 'Helpful') + stat('fa-heart', r.kudos, 'Kudos') + stat('fa-list-check', r.tasks_done || 0, 'Tasks') + stat('fa-ranking-star', '#' + rankOf(uid), 'Rank') + '</div>' +
                '<div class="tc-badges">' + (earned.length ? earned.map(b => '<span title="' + esc(b.d) + '"><i class="fa-solid ' + b.i + '"></i>' + b.n + '</span>').join('') : '<em>No badges yet — they unlock as ' + (me ? 'you' : 'they') + ' contribute.</em>') + '</div></div>',
                me ? '<button class="tc-btn" data-tc="closemodal">Close</button><button class="tc-btn pri" data-tc="leaderboard">' + ico('fa-ranking-star') + ' Leaderboard</button>' :
                    '<button class="tc-btn" data-tc="dm" data-uid="' + esc(uid) + '">' + ico('fa-message') + ' Message</button><button class="tc-btn pri" data-tc="kudos" data-uid="' + esc(uid) + '">' + ico('fa-heart') + ' Give kudos</button>', 'tc-profmodal');
        }
        function showLeaderboard() {
            const rows = TC.directory.map(p => ({ p, r: repRow(p.id) })).sort((a, b) => b.r.points - a.r.points || a.p.name.localeCompare(b.p.name));
            const medal = ['#eab308', '#94a3b8', '#b45309'];
            modal('Leaderboard', '<p class="tc-hint">Earn points by helping, replying, reacting, completing tasks and receiving kudos.</p><div class="tc-lb">' + rows.map((x, i) => {
                const l = levelOf(x.r.points).l;
                return '<button class="tc-lbrow" data-tc="profile" data-uid="' + esc(x.p.id) + '"><span class="tc-rank">' + (i < 3 ? '<i class="fa-solid fa-medal" style="color:' + medal[i] + '"></i>' : (i + 1)) + '</span>' + avatar(x.p.name, x.p.photo, 38) +
                    '<span class="tc-lbn"><b>' + esc(x.p.name) + (x.p.id === meId() ? ' (You)' : '') + '</b><small><i class="fa-solid ' + l.i + '" style="color:' + l.c + '"></i> ' + l.n + '</small></span><em>' + x.r.points + '</em></button>';
            }).join('') + '</div>', '<button class="tc-btn" data-tc="closemodal">Close</button>');
        }
        const NI = { mention: ['fa-at', '#0ea5e9'], reply: ['fa-reply', '#16a34a'], urgent: ['fa-triangle-exclamation', '#dc2626'], task: ['fa-list-check', '#7c3aed'], reminder: ['fa-bell', '#f59e0b'], kudos: ['fa-heart', '#ec4899'] };
        const NL = { mention: 'mentioned you', reply: 'replied to you', urgent: 'sent an urgent message', task: 'assigned you a task', reminder: 'Reminder', kudos: 'sent you kudos' };
        function showNotifs() {
            const ns = TC.notifs;
            modal('Notifications', ns.length ? '<div class="tc-nlist">' + ns.map((n, i) => { const ic = NI[n.type] || NI.mention; return '<button class="tc-nrow ' + (n.read ? '' : 'new') + '" data-tc="notifopen" data-i="' + i + '"><span class="tc-toast-ic" style="--c:' + ic[1] + '"><i class="fa-solid ' + ic[0] + '"></i></span><span><b>' + esc(n.type === 'reminder' ? 'Reminder' : n.by) + ' <em>' + (n.type === 'reminder' ? '' : NL[n.type] || '') + '</em></b><small>' + esc(n.text || '') + '</small></span><time>' + listTime(n.at) + '</time></button>'; }).join('') + '</div>' :
                '<div class="tc-empty-list">' + ico('fa-bell') + '<p>You are all caught up.</p></div>', '<button class="tc-btn" data-tc="notifclear">Clear all</button><button class="tc-btn pri" data-tc="notifread">Mark all read</button>');
        }
        function showSettings() {
            const perm = window.Notification ? Notification.permission : 'unsupported', d = TC.prefs.dnd || {};
            const seg = (key, val, opts) => '<div class="tc-seg">' + opts.map(o => '<button data-tc="pref-' + key + '" data-v="' + o[0] + '" class="' + (val === o[0] ? 'on' : '') + '">' + (o[2] ? ico(o[2]) + ' ' : '') + o[1] + '</button>').join('') + '</div>';
            modal('Chat settings', '<div class="tc-set"><h4>' + ico('fa-bell') + ' Notifications</h4>' +
                toggleRow('Sound', 'Play a tone for new messages', TC.prefs.sound, 'pref-sound') +
                '<div class="tc-setrow"><span><b>Tone</b></span>' + seg('tone', TC.prefs.tone || 'soft', [['soft', 'Soft'], ['chime', 'Chime'], ['pop', 'Pop'], ['bell', 'Bell']]) + '<button class="tc-link" data-tc="testsound">' + ico('fa-play') + ' Test</button></div>' +
                toggleRow('Desktop alerts', perm === 'denied' ? 'Blocked in browser settings' : perm === 'unsupported' ? 'Not supported by this browser' : 'Show alerts when this tab is in the background', TC.prefs.desktop && perm === 'granted', 'pref-desktop') +
                toggleRow('Quiet hours', 'Silence alerts during set hours', d.on, 'pref-dnd') +
                (d.on ? '<div class="tc-setrow"><span><b>From</b></span><input type="time" id="tc-dnd-from" value="' + esc(d.from || '22:00') + '"><span><b>To</b></span><input type="time" id="tc-dnd-to" value="' + esc(d.to || '07:00') + '"></div>' + toggleRow('Urgent breaks through', 'Urgent messages still alert you', d.urgent !== false, 'pref-dndurg') : '') +
                '<h4>' + ico('fa-palette') + ' Appearance</h4><div class="tc-setrow"><span><b>Chat background</b></span>' + seg('wall', TC.prefs.wall || 'default', [['default', 'Classic'], ['mint', 'Mint'], ['dusk', 'Dusk'], ['sand', 'Sand'], ['plain', 'Plain']]) + '</div>' +
                '<div class="tc-setrow"><span><b>Text size</b></span>' + seg('fs', TC.prefs.fs || 'm', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]) + '</div>' +
                '<h4>' + ico('fa-database') + ' Storage</h4><div class="tc-storage"><b>' + ico(TC.mode === 'db' ? 'fa-cloud' : 'fa-hard-drive') + ' ' + (TC.mode === 'db' ? 'Cloud sync is on' : 'Local mode (this browser only)') + '</b><small>' + (TC.mode === 'db' ? 'Messages are stored in your Supabase database and shared live with every admin.' : 'Chats are saved only in this browser. Run chat_setup.sql in Supabase to share chats with the whole team.') + '</small>' +
                (TC.mode === 'local' ? '<button class="tc-btn pri" data-tc="trycloud">' + ico('fa-cloud') + ' Switch to cloud sync</button>' : '') + (TC.mode === 'db' && !TC.ext ? '<small class="tc-err">Reputation and timed mute need the updated SQL.</small><button class="tc-btn pri" data-tc="copysql">' + ico('fa-copy') + ' Copy updated SQL</button>' : '') + '</div>' +
                '<p class="tc-hint">Shortcuts: <kbd>Ctrl</kbd>+<kbd>K</kbd> search chats · <kbd>Alt</kbd>+<kbd>↑/↓</kbd> switch chat · admins can use <b>@all</b></p></div>', '<button class="tc-btn pri" data-tc="closemodal">Done</button>');
        }
        function showMute() {
            const r = active(); if (!r) return; const mm = myMember(r.id) || {}; const long = TC.ext || TC.mode === 'local';
            const opt = (k, t, i) => '<button class="tc-trow plain" data-tc="domute" data-d="' + k + '"><span><b>' + ico(i) + ' ' + t + '</b></span></button>';
            modal('Notifications for “' + roomTitle(r) + '”', '<p class="tc-hint"><b>' + esc(muteLabel(mm)) + '</b></p>' + (long ? opt('8h', 'Mute for 8 hours', 'fa-moon') + opt('1w', 'Mute for 1 week', 'fa-calendar-week') : '') + opt('always', 'Mute always', 'fa-bell-slash') + (isMuted(mm) ? opt('off', 'Unmute', 'fa-bell') : '') +
                (long ? '<h4 class="tc-h4">When not muted</h4><div class="tc-seg full"><button data-tc="notifymode" data-m="all" class="' + (mm.notify !== 'mentions' ? 'on' : '') + '">All messages</button><button data-tc="notifymode" data-m="mentions" class="' + (mm.notify === 'mentions' ? 'on' : '') + '">Mentions & urgent</button></div>' : '<small class="tc-err">Run the updated chat_setup.sql for timed mute.</small>') +
                '<p class="tc-hint">Urgent messages always get through unless the chat is muted.</p>', '<button class="tc-btn pri" data-tc="closemodal">Done</button>');
        }
        function showTask(prefill) {
            const r = active(); if (!r) return;
            const people = roomMembers(r.id).filter(m => r.kind !== 'dm' || m.user_id !== meId() || roomMembers(r.id).length === 1);
            modal('New task', '<label class="tc-fl"><span>Task</span><input type="text" id="tc-tt" maxlength="140" placeholder="What needs to be done?" value="' + esc(prefill || '') + '"></label><label class="tc-fl"><span>Due (optional)</span><input type="datetime-local" id="tc-td"></label>' +
                '<div class="tc-fl"><span>Assign to</span></div><div class="tc-plist" id="tc-plist" style="max-height:200px">' + people.map(m => { const p = person(m.user_id); return '<label class="tc-prow"><input type="checkbox" value="' + esc(m.user_id) + '">' + avatar(p.name, p.photo, 32) + '<span><b>' + esc(p.name) + (m.user_id === meId() ? ' (You)' : '') + '</b></span></label>'; }).join('') + '</div><p class="tc-hint">Leave empty so anyone can complete it. Completing a task earns +4 points.</p>',
                '<button class="tc-btn" data-tc="closemodal">Cancel</button><button class="tc-btn pri" data-tc="dotask">' + ico('fa-paper-plane') + ' Create</button>');
        }
        function taskHtml(m) {
            const a = m.attachment || {}, s = taskStats(a), as = a.assignees || [], due = a.due ? new Date(a.due) : null, od = due && !s.all && due.getTime() < Date.now(), mine = (a.done || {})[meId()];
            return '<div class="tc-task' + (s.all ? ' done' : '') + '"><div class="tc-task-h"><i class="fa-solid ' + (s.all ? 'fa-circle-check' : 'fa-list-check') + '"></i><b>' + esc(a.title || 'Task') + '</b></div>' +
                (due ? '<small class="' + (od ? 'od' : '') + '">' + ico('fa-calendar-day') + ' Due ' + due.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + (od ? ' · overdue' : '') + '</small>' : '') +
                (as.length ? '<div class="tc-task-as">' + as.map(u => '<span class="' + ((a.done || {})[u] ? 'ok' : '') + '" title="' + esc(person(u).name + ((a.done || {})[u] ? ' — done' : '')) + '">' + avatar(person(u).name, person(u).photo, 24) + '</span>').join('') + '</div>' : '') +
                '<div class="tc-task-p"><span><i style="width:' + Math.round(s.n * 100 / s.total) + '%"></i></span><small>' + s.n + '/' + s.total + ' done</small></div>' +
                (canMarkTask(a) && !m.deleted_all ? '<button class="tc-btn ' + (mine ? '' : 'pri') + ' sm" data-tc="tasktoggle" data-id="' + m.id + '">' + ico(mine ? 'fa-rotate-left' : 'fa-check') + ' ' + (mine ? 'Undo' : 'Mark done') + '</button>' : '') + '</div>';
        }
        function showTasks() {
            const r = active(); if (!r) return;
            const ts = list(r.id).filter(m => m.kind === 'task' && !m.deleted_all && visible(m)).reverse();
            modal('Tasks', ts.length ? '<div class="tc-tasks">' + ts.map(m => { const a = m.attachment || {}, s = taskStats(a); return '<button class="tc-trow plain" data-tc="gotomsg" data-room="' + r.id + '" data-id="' + m.id + '"><span><b>' + ico(s.all ? 'fa-circle-check' : 'fa-list-check') + ' ' + esc(a.title || 'Task') + '</b><small>' + s.n + '/' + s.total + ' done' + (a.due ? ' · due ' + new Date(a.due).toLocaleDateString() : '') + '</small></span></button>'; }).join('') + '</div>' : '<div class="tc-empty-list">' + ico('fa-list-check') + '<p>No tasks in this chat yet.</p></div>', '<button class="tc-btn" data-tc="closemodal">Close</button><button class="tc-btn pri" data-tc="task">' + ico('fa-plus') + ' New task</button>');
        }
        function showRemind(m) {
            TC.remTarget = m.id;
            const o = (k, t) => '<button class="tc-trow plain" data-tc="doremind" data-d="' + k + '"><span><b>' + ico('fa-clock') + ' ' + t + '</b></span></button>';
            modal('Remind me about this', o('20', 'In 20 minutes') + o('60', 'In 1 hour') + o('180', 'In 3 hours') + o('tom', 'Tomorrow, 9:00 AM') + (TC.reminders.length ? '<p class="tc-hint">' + TC.reminders.length + ' pending reminder' + (TC.reminders.length > 1 ? 's' : '') + '</p>' : ''), '<button class="tc-btn" data-tc="closemodal">Cancel</button>');
        }
        function showBroadcast() {
            const people = TC.directory.filter(p => p.id !== meId());
            modal('Broadcast message', '<p class="tc-hint">Send one message privately to each selected person.</p><label class="tc-fl"><span>Message</span><textarea id="tc-bt" rows="3" maxlength="1000" placeholder="Write your announcement…"></textarea></label><div class="tc-plist" id="tc-plist" style="max-height:220px">' +
                people.map(p => '<label class="tc-prow"><input type="checkbox" value="' + esc(p.id) + '">' + avatar(p.name, p.photo, 32) + '<span><b>' + esc(p.name) + '</b><small>' + esc(prettyRole(p.role)) + '</small></span></label>').join('') + '</div>', '<button class="tc-btn" data-tc="closemodal">Cancel</button><button class="tc-btn pri" data-tc="dobroadcast">' + ico('fa-bullhorn') + ' Send</button>');
        }
        async function openNotes() {
            for (const [id, r] of TC.rooms) { if (r.kind === 'dm' && memberIds(id).length === 1 && memberIds(id)[0] === meId()) return id; }
            return openDM(meId());
        }
        function shareLocation() {
            if (!navigator.geolocation) { say('warning', 'Location is not supported by this browser.'); return; }
            say('info', 'Getting your location…');
            navigator.geolocation.getCurrentPosition(async pos => {
                await send({ kind: 'location', body: '', attachment: { lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5), acc: Math.round(pos.coords.accuracy || 0) } });
            }, () => say('warning', 'Location permission was denied.'), { enableHighAccuracy: true, timeout: 10000 });
        }
        function locHtml(m) {
            const a = m.attachment || {}, u = 'https://www.google.com/maps?q=' + encodeURIComponent(a.lat + ',' + a.lng);
            return '<a class="tc-card tc-loc" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + ico('fa-location-dot') + '<span><b>Shared location</b><small>' + esc(a.lat + ', ' + a.lng) + (a.acc ? ' · ±' + a.acc + ' m' : '') + '</small></span>' + ico('fa-arrow-up-right-from-square') + '</a>';
        }
        function onChange2(t) {
            if (t.id === 'tc-dnd-from' || t.id === 'tc-dnd-to') { TC.prefs.dnd = Object.assign({ on: true, urgent: true }, TC.prefs.dnd, t.id === 'tc-dnd-from' ? { from: t.value } : { to: t.value }); savePrefs(); return true; }
            return false;
        }
        async function act2(a, t, e) {
            const id = t.getAttribute('data-id'), uid = t.getAttribute('data-uid'), r = active();
            switch (a) {
                case 'profile': if (uid) showProfile(uid); break;
                case 'leaderboard': closeMenu(); showLeaderboard(); break;
                case 'kudos': if (uid && await giveKudos(uid)) showProfile(uid); break;
                case 'notifs': closeMenu(); showNotifs(); break;
                case 'notifopen': { const n = TC.notifs[Number(t.getAttribute('data-i'))]; if (n) { n.read = true; ls.set('notifs', TC.notifs); updateBell(); closeModal(); gotoRoom(n.room, n.msg); } break; }
                case 'notifread': TC.notifs.forEach(n => { n.read = true; }); ls.set('notifs', TC.notifs); updateBell(); showNotifs(); break;
                case 'notifclear': TC.notifs = []; ls.set('notifs', TC.notifs); updateBell(); showNotifs(); break;
                case 'mutepick': closeMenu(); showMute(); break;
                case 'domute': {
                    if (!r) break; const d = t.getAttribute('data-d'), h = { '8h': 8 * 3600000, '1w': 7 * 86400000 };
                    const patch = d === 'always' ? { muted: true } : d === 'off' ? { muted: false } : { muted: false };
                    if (TC.ext || TC.mode === 'local') patch.muted_until = h[d] ? new Date(Date.now() + h[d]).toISOString() : null;
                    await setMine(r.id, patch); say('info', d === 'off' ? 'Notifications on' : 'Muted'); showMute(); break;
                }
                case 'notifymode': if (r) { await setMine(r.id, { notify: t.getAttribute('data-m') }); showMute(); } break;
                case 'copysql': try { await navigator.clipboard.writeText(SETUP_SQL); say('success', 'SQL copied — paste it into the Supabase SQL Editor.'); } catch (er) { say('info', 'Copy failed — open chat_setup.sql instead.'); } break;
                case 'pref-tone': TC.prefs.tone = t.getAttribute('data-v'); savePrefs(); beep(false, true); showSettings(); break;
                case 'pref-wall': TC.prefs.wall = t.getAttribute('data-v'); savePrefs(); showSettings(); break;
                case 'pref-fs': TC.prefs.fs = t.getAttribute('data-v'); savePrefs(); showSettings(); break;
                case 'pref-dnd': TC.prefs.dnd = Object.assign({ from: '22:00', to: '07:00', urgent: true }, TC.prefs.dnd, { on: !(TC.prefs.dnd && TC.prefs.dnd.on) }); savePrefs(); showSettings(); break;
                case 'pref-dndurg': TC.prefs.dnd = Object.assign({}, TC.prefs.dnd, { urgent: !(TC.prefs.dnd && TC.prefs.dnd.urgent !== false) }); savePrefs(); showSettings(); break;
                case 'testsound': beep(false, true); break;
                case 'task': closeMenu(); showTask(''); break;
                case 'tasks': closeMenu(); showTasks(); break;
                case 'maketask': { const m = findMsg(id); closeMenu(); if (m) showTask(previewBody(m).replace(/:([a-z0-9_]{2,20}):/g, '').slice(0, 140)); break; }
                case 'dotask': {
                    const title = (($('#tc-tt') || {}).value || '').trim(); if (!title) { say('warning', 'Describe the task.'); break; }
                    const dv = ($('#tc-td') || {}).value, as = checked('#tc-plist'); closeModal();
                    await send({ kind: 'task', body: '', attachment: { title, due: dv ? new Date(dv).toISOString() : null, assignees: as, done: {} } }); break;
                }
                case 'tasktoggle': { const m = findMsg(id); if (m) await toggleTask(m); break; }
                case 'remind': { const m = findMsg(id); closeMenu(); if (m) showRemind(m); break; }
                case 'doremind': {
                    const m = findMsg(TC.remTarget); closeModal(); if (!m) break; const d = t.getAttribute('data-d'); let at;
                    if (d === 'tom') { const x = new Date(); x.setDate(x.getDate() + 1); x.setHours(9, 0, 0, 0); at = x; } else at = new Date(Date.now() + Number(d) * 60000);
                    addReminder(m, at.toISOString()); say('success', 'Reminder set for ' + at.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })); break;
                }
                case 'giveKudosMsg': { const m = findMsg(id); closeMenu(); if (m) giveKudos(m.sender_id); break; }
                case 'broadcast': closeMenu(); showBroadcast(); break;
                case 'dobroadcast': {
                    const text = (($('#tc-bt') || {}).value || '').trim(), ids = checked('#tc-plist');
                    if (!text) { say('warning', 'Write a message first.'); break; } if (!ids.length) { say('warning', 'Pick at least one person.'); break; }
                    closeModal(); let n = 0;
                    for (const u of ids) { try { const rid = await openDM(u); if (await send({ roomId: rid, kind: 'text', body: text })) n++; } catch (er) { /* skip */ } }
                    say(n ? 'success' : 'warning', n ? 'Sent to ' + n + ' ' + (n > 1 ? 'people' : 'person') : 'Nothing sent'); renderList(); break;
                }
                case 'location': closeMenu(); shareLocation(); break;
                case 'notes': { closeMenu(); const rid = await openNotes(); renderList(); await openRoom(rid); break; }
                case 'myprofile': closeMenu(); showProfile(meId()); break;
                case 'pinchat': { if (r) { const p = TC.prefs.pins = TC.prefs.pins || []; const i = p.indexOf(r.id); if (i >= 0) p.splice(i, 1); else p.unshift(r.id); savePrefs(); closeMenu(); renderList(); say('info', i >= 0 ? 'Chat unpinned' : 'Chat pinned to top'); } break; }
                default: break;
            }
        }

        // ---------------------------------------------------------------
        // Mount
        // ---------------------------------------------------------------
        function setupScreen() {
            return '<div class="tc-setup"><div class="tc-setup-card"><div class="tc-welcome-ico">' + ico('fa-comments') + '</div><h2>Set up Team Chat</h2><p>One quick step: create the chat tables in your Supabase project so messages are shared live between every admin.</p>' +
                '<ol><li>Open <b>Supabase → SQL Editor</b></li><li>Paste the script below and press <b>Run</b></li><li>Come back here and press <b>Check again</b></li></ol>' +
                '<textarea class="tc-sql" readonly rows="8" id="tc-sql">' + esc(SETUP_SQL) + '</textarea>' +
                '<div class="tc-setup-btns"><button class="tc-btn pri" data-setup="copy">' + ico('fa-copy') + ' Copy SQL</button><button class="tc-btn" data-setup="recheck">' + ico('fa-rotate') + ' Check again</button><button class="tc-btn ghost" data-setup="local">' + ico('fa-hard-drive') + ' Use on this browser only</button></div>' +
                (TC.setupError ? '<small class="tc-err">' + esc(TC.setupError) + '</small>' : '') + '</div></div>';
        }
        async function mount(ws) {
            if (!ws) return;
            const u = window.AuthManager && AuthManager.currentUser;
            if (TC.booted && TC.me && u && String(u.id) !== TC.me.id) reset();
            if (!TC.booted) { ws.innerHTML = '<div class="tc-loading"><i class="fa-solid fa-spinner fa-spin"></i> Opening Team Chat…</div>'; await boot(); }
            if (!TC.repo) {
                ws.innerHTML = setupScreen();
                ws.querySelector('.tc-setup').addEventListener('click', async e => {
                    const b = e.target.closest('[data-setup]'); if (!b) return;
                    const k = b.getAttribute('data-setup');
                    if (k === 'copy') { try { await navigator.clipboard.writeText(SETUP_SQL); say('success', 'SQL copied — paste it into the Supabase SQL Editor.'); } catch (er) { const ta = ws.querySelector('#tc-sql'); if (ta) { ta.select(); say('info', 'Press Ctrl+C to copy.'); } } }
                    else if (k === 'recheck') { reset(); await mount(ws); }
                    else if (k === 'local') { ls.set('mode', 'local'); reset(); await mount(ws); }
                });
                return;
            }
            TC.root = document.createElement('div');
            TC.root.className = 'tc-app';
            TC.root.id = 'tc-app';
            TC.root.innerHTML = '<aside class="tc-side"><div class="tc-side-head"><div class="tc-me">' + avatar(TC.me.name, TC.me.photo, 40) + '<span><b>Team Chat</b><small>' + (TC.mode === 'db' ? ico('fa-cloud') + ' Live' : ico('fa-hard-drive') + ' This browser only') + '</small></span></div><div class="tc-side-btns"><button class="tc-ib tc-bellb" data-tc="notifs" title="Notifications" aria-label="Notifications">' + ico('fa-bell') + '<span class="tc-bellN" id="tc-bell-n" style="display:none"></span></button><button class="tc-ib" data-tc="newchat" title="New chat" aria-label="New chat">' + ico('fa-message') + '</button><button class="tc-ib" data-tc="sidemenu" title="Menu" aria-label="Menu">' + ico('fa-ellipsis-vertical') + '</button></div></div>' +
                (TC.mode === 'db' && !TC.ext ? '<button class="tc-localbar" data-tc="prefs">' + ico('fa-triangle-exclamation') + ' Run the updated SQL to unlock reputation & timed mute. <u>Details</u></button>' : '') +
                (TC.mode === 'local' ? '<button class="tc-localbar" data-tc="prefs">' + ico('fa-triangle-exclamation') + ' Local mode — chats are not shared. <u>Set up cloud sync</u></button>' : '') +
                '<div class="tc-search">' + ico('fa-magnifying-glass') + '<input id="tc-q" type="search" placeholder="Search chats or people" autocomplete="off" value="' + esc(TC.q) + '"></div>' +
                '<div class="tc-chips"><button data-tc="filter" data-f="all" class="on">All</button><button data-tc="filter" data-f="unread">Unread <span class="tc-count"></span></button><button data-tc="filter" data-f="groups">Groups</button><button data-tc="filter" data-f="archived">Archived</button></div><div class="tc-list" id="tc-list"></div></aside>' +
                '<section class="tc-main" id="tc-main"></section><div class="tc-overlay" id="tc-overlay"></div>';
            ws.innerHTML = ''; ws.appendChild(TC.root);
            bind(TC.root); applyLook(); updateBell();
            renderList(); renderChatArea();
            loadAll().then(() => { renderList(); if (TC.activeId && TC.rooms.has(TC.activeId)) { renderHead(); renderMessages(false); } else if (TC.activeId) { TC.activeId = null; renderChatArea(); } badge(); }).catch(() => { });
            emit({ t: 'hello' }); markDelivered();
        }

        return {
            render: mount, boot, reset, unread: totalUnread, state: TC,
            _test: { giveKudos, bumpRep, repRow, levelOf, onIncoming, isMuted, inQuiet, checkReminders, addReminder, toggleTask, showProfile, showLeaderboard, showNotifs, showSettings, showMute, showTask, act2, send, openDM, createGroup, openRoom, loadAll, LocalRepo, DBRepo, emit, onNet }
        };
    })();


    const AdminPanel = {
        currentPage: 'dashboard',
        initialized: false,
        workspace: null,
        activeModal: null,
        realtimeSubscriptions: [],
        pageHistory: [],

        async init() {
            if (!window.AuthManager?.isLoggedIn()) {
                window.AppToast?.error('Access credentials rejected.', 'Security Core');
                return;
            }
            this.workspace = document.getElementById('admin-workspace');
            if (!this.workspace) return;
            this.applyGlassStyles();
            if (!this.initialized) {
                this.injectSidebar();
                this.bindMenuEvents();
                this.bindKeyboardShortcuts();
                this.bindGlobalActionEvents();
                this.initRealtimeSync();
                this.initialized = true;
            }
            this.filterMenuByRole();
            try { ChatApp.boot(); } catch (e) { /* chat is optional */ }
            await this.updateHeaderBadges();
            await this.loadPage(this.currentPage || 'dashboard');
            this.logActivity('PORTAL_ACCESS', 'session', null, { timestamp: new Date().toISOString() });
        },

        normalizePageId(id) {
            if (!id) return 'dashboard';
            let p = id.toLowerCase().trim();
            if (p.startsWith('admin-')) p = p.substring(6);
            if (p === 'adminusers') p = 'users';
            if (p === 'projects') p = 'events';
            return p;
        },

        applyGlassStyles() { /* styles now live in css/admin.css (single source of truth) */ },

        injectSidebar() {
            const sidebar = document.querySelector('#admin-portal-modal aside');
            if (!sidebar || sidebar.hasAttribute('data-injected')) return;
            sidebar.setAttribute('data-injected', 'true');
            const menuTree = [
                { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', shortcut: '1' },
                { id: 'events', icon: 'fa-calendar-days', label: 'Projects', shortcut: '2' },
                { id: 'meetings', icon: 'fa-people-group', label: 'Meetings', shortcut: '3' },
                { id: 'treasury', icon: 'fa-wallet', label: 'Treasury', shortcut: '4' },
                { id: 'members', icon: 'fa-users', label: 'Members', shortcut: '5' },
                { id: 'applications', icon: 'fa-user-plus', label: 'Applications', shortcut: '6', badge: 'applications' },
                { id: 'reports', icon: 'fa-file-lines', label: 'Reports', shortcut: '7' },
                { id: 'emails', icon: 'fa-envelope', label: 'Email Hub', shortcut: '8' },
                { id: 'bulletins', icon: 'fa-newspaper', label: 'Bulletins', shortcut: '9' },
                { id: 'blood', icon: 'fa-droplet', label: 'Blood Desk', badge: 'blood' },
                { id: 'chat', icon: 'fa-comments', label: 'Team Chat', badge: 'chat' },
                { id: 'activity', icon: 'fa-clock-rotate-left', label: 'Activity' },
                { id: 'users', icon: 'fa-user-shield', label: 'Admin Users', superOnly: true },
                { id: 'settings', icon: 'fa-sliders', label: 'Site Settings', superOnly: true },
                { id: 'system', icon: 'fa-heart-pulse', label: 'System Health', superOnly: true }
            ];
            sidebar.innerHTML = menuTree.map((it, i) => `
                <button class="admin-menu-btn ${i === 0 ? 'active' : ''} w-full py-2.5 px-3 rounded-xl text-[11px] font-semibold flex items-center gap-2.5 relative"
                    data-target="${it.id}" ${it.superOnly ? 'data-super-admin-only="true"' : ''} ${it.badge ? `data-badge-key="${it.badge}"` : ''} title="${it.label}${it.shortcut ? ` (Ctrl+${it.shortcut})` : ''}">
                    <span class="ap-ico"><i class="fa-solid ${it.icon}"></i></span>
                    <span class="ap-menu-label">${it.label}</span>
                    ${it.badge ? `<span class="notification-badge hidden" data-badge="${it.badge}">0</span>` : ''}
                </button>
            `).join('');
        },

        filterMenuByRole() {
            const user = window.AuthManager?.currentUser;
            if (!user) return;
            const role = user.role;
            document.querySelectorAll('.admin-menu-btn').forEach(btn => {
                const target = this.normalizePageId(btn.getAttribute('data-target'));
                const superOnly = btn.getAttribute('data-super-admin-only') === 'true';
                let visible = true;
                if (superOnly && role !== 'super_admin') visible = false;
                else {
                    const accessMap = {
                        dashboard: true, events: this.isExecutive(role) || ['avenue_director', 'avenue_chair', 'dpp_chair'].includes(role),
                        meetings: this.isExecutive(role) || user.isBoardMember || user.is_board_member,
                        treasury: ['super_admin', 'advisor', 'president', 'treasurer'].includes(role),
                        members: this.isExecutive(role), applications: this.isExecutive(role), reports: this.isExecutive(role),
                        emails: this.isExecutive(role), bulletins: this.isExecutive(role) || role === 'avenue_director',
                        blood: this.isExecutive(role) || role === 'avenue_chair', activity: this.isExecutive(role),
                        settings: ['super_admin', 'advisor'].includes(role)
                    };
                    visible = accessMap[target] !== undefined ? accessMap[target] : true;
                }
                btn.style.display = visible ? '' : 'none';
            });
        },

        isExecutive(role) {
            return ['super_admin', 'advisor', 'president', 'ipp', 'vice_president', 'secretary', 'secretary_admin', 'secretary_comm', 'treasurer'].includes(role);
        },

        bindMenuEvents() {
            document.querySelectorAll('.admin-menu-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const rawTarget = btn.getAttribute('data-target');
                    if (!rawTarget) return;
                    document.querySelectorAll('.admin-menu-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.loadPage(rawTarget);
                });
            });
        },

        bindKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                const portal = document.getElementById('admin-portal-modal');
                if (!portal || portal.classList.contains('hidden')) return;
                if (e.key === 'Escape' && this.activeModal) { this.closeModal(); return; }
                if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
                    e.preventDefault();
                    const btns = Array.from(document.querySelectorAll('.admin-menu-btn')).filter(b => b.style.display !== 'none');
                    const idx = parseInt(e.key) - 1;
                    if (btns[idx]) btns[idx].click();
                }
                if (e.ctrlKey && e.key === 'r' && !e.shiftKey) { e.preventDefault(); this.loadPage(this.currentPage); }
            });
        },

        bindGlobalActionEvents() {
            document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
                if (confirm('End your active portal session?')) { await this.logActivity('LOGOUT', 'session', null, {}); window.AuthManager?.logout(); }
            });
            document.getElementById('admin-portal-close')?.addEventListener('click', () => {
                document.getElementById('admin-portal-modal')?.classList.add('hidden');
            });
        },

        initRealtimeSync() {
            if (!window.DB_ADMIN?.channel) return;
            try {
                this.realtimeSubscriptions.push(
                    window.DB_ADMIN.channel('realtime-apps').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'membership_applications' }, () => { this.updateHeaderBadges(); window.AppToast?.info('New membership application received.'); }).subscribe(),
                    window.DB_ADMIN.channel('realtime-blood').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blood_requests' }, (p) => { this.updateHeaderBadges(); window.AppToast?.warning('New blood request received.'); }).subscribe(),
                    window.DB_ADMIN.channel('realtime-settings').on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => { if (this.currentPage === 'settings') { window.AppToast?.info('Settings synced from another session.'); } }).subscribe()
                );
            } catch (e) {}
        },

        async updateHeaderBadges() {
            try {
                const [apps, blood] = await Promise.all([this.dbCount('membership_applications', { status: 'pending' }), this.dbCount('blood_requests', { status: 'active' })]);
                this.updateBadge('applications', apps);
                this.updateBadge('blood', blood);
            } catch (e) {}
        },

        updateBadge(key, count) {
            document.querySelectorAll(`[data-badge="${key}"]`).forEach(badge => {
                if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.classList.remove('hidden'); }
                else badge.classList.add('hidden');
            });
        },

        async loadPage(pageId) {
            const cleanId = this.normalizePageId(pageId);
            this.pageHistory.push(this.currentPage);
            if (this.pageHistory.length > 20) this.pageHistory.shift();
            this.currentPage = cleanId;
            this.workspace.innerHTML = this.renderLoader();

            try {
                const externalMap = {
                    events: 'AdminEvents', meetings: 'AdminMeetings', treasury: 'AdminTreasury',
                    members: 'AdminMembers', applications: 'Applications', emails: 'EmailHub',
                    blood: 'BloodDesk', activity: 'ActivityLog', users: 'AdminUsers', system: 'SystemHealth'
                };

                if (cleanId === 'dashboard') { await this.renderDashboard(); }
                else if (cleanId === 'reports') { if (window.Reports?.render) await window.Reports.render(this.workspace); else await this.modules.reports.render(this.workspace); }
                else if (cleanId === 'bulletins') { await this.modules.bulletins.render(this.workspace); }
                else if (cleanId === 'settings') { await this.modules.settings.render(this.workspace); }
                else {
                    const extName = externalMap[cleanId];
                    if (extName && window[extName]?.render) {
                        await window[extName].render(this.workspace);
                    } else if (this.modules[cleanId]?.render) {
                        await this.modules[cleanId].render(this.workspace);
                    } else {
                        this.workspace.innerHTML = this.renderError(`Module "${cleanId}" is not available. Check that the corresponding JS file is included in your HTML.`);
                    }
                }
                this.workspace.scrollTop = 0;
            } catch (e) {
                console.error('Router error:', e);
                this.workspace.innerHTML = this.renderError(e.message);
            }
        },

        navigateTo(page) {
            const cleanId = this.normalizePageId(page);
            const btn = document.querySelector(`.admin-menu-btn[data-target="${cleanId}"]`);
            if (btn) btn.click();
            else this.loadPage(cleanId);
        },

        async renderDashboard() {
            const user = window.AuthManager?.currentUser || { full_name: 'Admin', role: 'admin' };
            const now = new Date();
            const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
            const firstName = (user.name || user.full_name || 'Admin').split(' ')[0];

            const [members, upcoming, pending, month, treasury, activity, birthdays, apps, blood, meetings] = await Promise.all([
                this.getClubMemberCount(), this.getUpcomingEventsCount(), this.dbCount('events', { status: 'pending_approval' }),
                this.getMonthProjectCount(), this.getTreasurySummary(), this.getRecentActivity(8), this.getTodayBirthdays(),
                this.dbCount('membership_applications', { status: 'pending' }), this.dbCount('blood_requests', { status: 'active' }), this.getUpcomingMeetings(3)
            ]);

            this.workspace.innerHTML = `
                <div class="p-6 lg:p-10">
                    <div class="admin-page-header">
                        <div>
                            <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>Executive Dashboard</span></div>
                            <h1 class="admin-page-title">${greeting}, ${firstName}</h1>
                            <p class="admin-page-subtitle">Unity Core Portal &bull; Synced ${now.toLocaleTimeString()}</p>
                        </div>
                        <div class="flex items-center gap-3 flex-wrap">
                            <span class="live-indicator"><span class="live-dot"></span>LIVE</span>
                            <button class="btn-primary btn-sm" onclick="AdminPanel.loadPage('dashboard')"><i class="fa-solid fa-rotate"></i> Refresh</button>
                        </div>
                    </div>

                    <div class="admin-stats-grid stagger-list">
                        ${this.statCard('blue', 'fa-users', members, 'Active Members')}
                        ${this.statCard('blue', 'fa-calendar-check', upcoming, 'Events Next 7 Days')}
                        ${this.statCard('blue', 'fa-hourglass-half', pending, 'Pending Approvals')}
                        ${this.statCard('blue', 'fa-folder-tree', month, 'Projects This Month')}
                    </div>

                    <div class="admin-panel mb-8">
                        <div class="admin-panel-header">
                            <h3 class="admin-panel-title"><i class="fa-solid fa-bolt-lightning"></i> Quick Actions</h3>
                        </div>
                        <div class="admin-panel-body">
                            <div class="quick-actions-grid">
                                ${this.isExecutive(user.role) ? `
                                    ${this.quickAction('fa-plus-circle', 'New Project', 'events')}
                                    ${this.quickAction('fa-people-group', 'Schedule Meeting', 'meetings')}
                                    ${this.quickAction('fa-paper-plane', 'Broadcast Mail', 'emails')}
                                    ${this.quickAction('fa-file-lines', 'Report Center', 'reports')}
                                    ${this.quickAction('fa-user-plus', 'Applications', 'applications')}
                                    ${this.quickAction('fa-wallet', 'Treasury', 'treasury')}
                                    ${this.quickAction('fa-newspaper', 'Bulletins', 'bulletins')}
                                    ${user.role === 'super_admin' ? this.quickAction('fa-sliders', 'Site Settings', 'settings') : this.quickAction('fa-droplet', 'Blood Desk', 'blood')}
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="admin-dashboard-grid">
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-wave-pulse"></i> Activity</h3><button class="btn-secondary btn-xs" onclick="AdminPanel.navigateTo('activity')">View All</button></div>
                            <div class="admin-panel-body" style="max-height:380px;overflow-y:auto;">${this.renderActivityFeed(activity)}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-chart-pie"></i> Treasury</h3><span class="badge badge-green">This Month</span></div>
                            <div class="admin-panel-body">${this.renderTreasuryWidget(treasury)}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-calendar-day"></i> Upcoming Meetings</h3></div>
                            <div class="admin-panel-body">${this.renderUpcomingMeetings(meetings)}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-cake-candles"></i> Birthdays</h3><span class="badge badge-purple">${birthdays.length}</span></div>
                            <div class="admin-panel-body">${this.renderBirthdaysList(birthdays)}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-user-plus"></i> Applications</h3>${apps > 0 ? `<span class="badge badge-yellow">${apps}</span>` : ''}</div>
                            <div class="admin-panel-body">${apps > 0 ? `<p class="text-xs text-slate-500 mb-4">${apps} pending.</p><button class="btn-primary btn-sm w-full" onclick="AdminPanel.navigateTo('applications')"><i class="fa-solid fa-eye mr-1"></i> Review</button>` : this.emptyMini('fa-circle-check', 'All reviewed')}</div>
                        </div>
                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-droplet"></i> Blood Desk</h3>${blood > 0 ? `<span class="badge badge-red">${blood}</span>` : ''}</div>
                            <div class="admin-panel-body">${blood > 0 ? `<p class="text-xs text-slate-500 mb-4">${blood} active.</p><button class="btn-primary btn-sm w-full" onclick="AdminPanel.navigateTo('blood')"><i class="fa-solid fa-eye mr-1"></i> View</button>` : this.emptyMini('fa-circle-check', 'No active requests')}</div>
                        </div>
                    </div>
                </div>
            `;
        },

        statCard(c, i, v, l) { return `<div class="admin-stat-card ${c}"><div class="admin-stat-icon ${c}"><i class="fa-solid ${i}"></i></div><div class="admin-stat-value">${v}</div><div class="admin-stat-label">${l}</div></div>`; },
        quickAction(i, l, t) { return `<button class="quick-action-btn" onclick="AdminPanel.navigateTo('${t}')"><i class="fa-solid ${i}"></i><span>${l}</span></button>`; },
        renderActivityFeed(a) { if (!a?.length) return this.emptyMini('fa-wave-pulse', 'No activity'); return `<div class="space-y-2">${a.map(x => `<div class="flex items-start gap-3 p-3 rounded-xl bg-white/20 dark:bg-slate-800/20 border border-white/10"><div class="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0"><i class="fa-solid ${this.getActionIcon(x.action)} text-brand-blue text-[10px]"></i></div><div class="flex-1 min-w-0"><p class="text-xs font-bold truncate">${this.esc(x.user_name || 'System')}</p><p class="text-[11px] text-slate-500 truncate">${x.action} ${x.entity_type || ''}</p><p class="text-[10px] text-slate-400">${this.ago(x.created_at)}</p></div></div>`).join('')}</div>`; },
        getActionIcon(a) { return ({ CREATE: 'fa-plus-circle', UPDATE: 'fa-pen-to-square', DELETE: 'fa-trash-can', APPROVE: 'fa-check-circle', PORTAL_ACCESS: 'fa-door-open', SETTINGS_UPDATE: 'fa-sliders' })[a] || 'fa-circle-dot'; },
        renderTreasuryWidget(t) { return `<div class="space-y-3"><div class="flex justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10"><span class="text-xs font-bold text-green-600"><i class="fa-solid fa-arrow-down mr-1"></i>Income</span><span class="text-sm font-black text-green-600">INR ${(t.income||0).toLocaleString()}</span></div><div class="flex justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10"><span class="text-xs font-bold text-red-600"><i class="fa-solid fa-arrow-up mr-1"></i>Expenses</span><span class="text-sm font-black text-red-600">INR ${(t.expense||0).toLocaleString()}</span></div><div class="flex justify-between p-4 rounded-xl bg-brand-blue/5 border-2 border-brand-blue/20"><span class="text-xs font-black text-brand-blue"><i class="fa-solid fa-scale-balanced mr-1"></i>Balance</span><span class="text-lg font-black text-brand-blue">INR ${(t.balance||0).toLocaleString()}</span></div></div>`; },
        renderUpcomingMeetings(m) { if (!m?.length) return this.emptyMini('fa-calendar-check', 'None scheduled'); return `<div class="space-y-2">${m.map(x => `<div class="flex items-center gap-3 p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/10"><div class="w-10 h-10 rounded-lg bg-brand-blue text-white flex items-center justify-center flex-shrink-0 flex-col"><span class="text-[8px] font-bold">${new Date(x.date).toLocaleDateString('en',{month:'short'})}</span><span class="text-sm font-black">${new Date(x.date).getDate()}</span></div><div class="flex-1 min-w-0"><p class="text-xs font-bold truncate">${this.esc(x.meeting_name)}</p><p class="text-[10px] text-slate-400">${x.start_time||'TBD'}</p></div></div>`).join('')}</div>`; },
        renderBirthdaysList(b) { if (!b?.length) return this.emptyMini('fa-cake-candles', 'None today'); return `<div class="space-y-2">${b.map(x => `<div class="flex items-center gap-3 p-2.5 rounded-xl bg-brand-blue/5 border border-brand-blue/10">${x.photo_url ? `<img src="${x.photo_url}" class="w-10 h-10 rounded-full object-cover">` : `<div class="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-cake-candles text-brand-blue"></i></div>`}<div class="flex-1 min-w-0"><p class="text-xs font-bold truncate">${this.esc(x.full_name)}</p><p class="text-[10px] text-slate-400">Birthday Today</p></div></div>`).join('')}</div>`; },
        emptyMini(i, t, c='') { return `<div class="text-center py-6"><i class="fa-solid ${i} text-2xl ${c || 'text-slate-300 dark:text-slate-600'} mb-2 block"></i><p class="text-[11px] text-slate-400">${t}</p></div>`; },

        // Super Admin is a system account, not a club member, so it is never counted.
        async getClubMemberCount() { try { const { count } = await window.DB_ADMIN.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true).neq('role', 'super_admin'); return count || 0; } catch (e) { return 0; } },
        async dbCount(table, filters = {}) { try { let q = window.DB_ADMIN.from(table).select('id', { count: 'exact', head: true }); Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); }); const { count } = await q; return count || 0; } catch (e) { return 0; } },
        async getUpcomingEventsCount() { try { const today = new Date().toISOString().split('T')[0]; const week = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]; const { count } = await window.DB_ADMIN.from('events').select('id', { count: 'exact', head: true }).gte('date', today).lte('date', week).eq('status', 'approved'); return count || 0; } catch (e) { return 0; } },
        async getMonthProjectCount() { try { const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]; const { count } = await window.DB_ADMIN.from('events').select('id', { count: 'exact', head: true }).gte('date', first); return count || 0; } catch (e) { return 0; } },
        async getTreasurySummary() { try { const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]; const { data } = await window.DB_ADMIN.from('treasury').select('income, expense').gte('transaction_date', first); const income = (data || []).reduce((s, t) => s + parseFloat(t.income || 0), 0); const expense = (data || []).reduce((s, t) => s + parseFloat(t.expense || 0), 0); return { income, expense, balance: income - expense }; } catch (e) { return { income: 0, expense: 0, balance: 0 }; } },
        async getRecentActivity(limit = 10) { try { const { data } = await window.DB_ADMIN.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit); return data || []; } catch (e) { return []; } },
        async getTodayBirthdays() { try { const today = new Date(); const m = today.getMonth() + 1, d = today.getDate(); const { data } = await window.DB_ADMIN.from('users').select('full_name, date_of_birth, photo_url').eq('is_active', true).neq('role', 'super_admin').not('date_of_birth', 'is', null); return (data || []).filter(u => { const dob = new Date(u.date_of_birth); return dob.getMonth() + 1 === m && dob.getDate() === d; }); } catch (e) { return []; } },
        async getUpcomingMeetings(limit = 3) { try { const today = new Date().toISOString().split('T')[0]; const { data } = await window.DB_ADMIN.from('meetings').select('id, meeting_name, date, start_time, venue').gte('date', today).order('date', { ascending: true }).limit(limit); return data || []; } catch (e) { return []; } },
        async logActivity(action, entityType, entityId, metadata = {}) { const u = window.AuthManager?.currentUser; if (!u || !window.AuthManager.logActivity) return; await window.AuthManager.logActivity(u.id, action, entityType, entityId, metadata); },

        createModal({ title, body, footer, size = 'medium', icon = 'window-maximize' }) {
            this.closeModal();
            const sizes = { small: 'max-w-md', medium: 'max-w-2xl', wide: 'max-w-4xl', full: 'max-w-6xl' };
            const modal = document.createElement('div');
            modal.id = 'admin-dynamic-modal';
            modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="absolute inset-0 bg-black/40 backdrop-blur-md" onclick="AdminPanel.closeModal()"></div>
                <div class="relative ${sizes[size]} w-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/30 dark:border-white/10">
                    <div class="flex items-center justify-between p-5 border-b border-slate-200/20 dark:border-white/[0.06]">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center"><i class="fa-solid fa-${icon} text-brand-blue"></i></div>
                            <h3 class="text-base font-extrabold text-slate-800 dark:text-slate-100">${title}</h3>
                        </div>
                        <button onclick="AdminPanel.closeModal()" class="w-8 h-8 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div id="admin-modal-body" class="flex-1 overflow-y-auto p-5">${body}</div>
                    ${footer ? `<div class="flex items-center justify-end gap-2 p-5 border-t border-slate-200/20 dark:border-white/[0.06] flex-wrap">${footer}</div>` : ''}
                </div>
            `;
            document.body.appendChild(modal);
            this.activeModal = modal;
        },

        closeModal() {
            if (this.activeModal) { this.activeModal.remove(); this.activeModal = null; }
            document.getElementById('admin-dynamic-modal')?.remove();
        },

        renderLoader() { return `<div class="p-6"><div class="flex items-center justify-center py-20"><div class="text-center"><div class="h-[3px] w-56 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mx-auto"><div class="h-full bg-gradient-to-r from-brand-blue via-brand-purple to-cyan-500 rounded-full animate-pulse" style="width:60%"></div></div><p class="text-xs text-slate-400 mt-4">Loading...</p></div></div></div>`; },
        renderError(msg) { return `<div class="p-6"><div class="admin-panel"><div class="admin-panel-body"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation empty-state-icon text-red-500"></i><h4 class="empty-state-title">Error</h4><p class="empty-state-desc">${this.esc(msg)}</p><button class="btn-primary btn-sm mt-4" onclick="AdminPanel.loadPage('${this.currentPage}')"><i class="fa-solid fa-rotate"></i> Retry</button></div></div></div></div>`; },
        renderUnauthorized() { return `<div class="p-6"><div class="admin-panel"><div class="admin-panel-body"><div class="empty-state"><i class="fa-solid fa-lock empty-state-icon text-red-500"></i><h4 class="empty-state-title">Access Denied</h4><p class="empty-state-desc">You do not have permission to view this.</p></div></div></div></div>`; },

        esc(str) { if (window.escapeHtml) return window.escapeHtml(str); return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); },
        ago(dt) { if (!dt) return ''; if (window.timeAgo) return window.timeAgo(dt); const diff = Date.now() - new Date(dt).getTime(); const mins = Math.floor(diff / 60000); if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return new Date(dt).toLocaleDateString(); },
        fmtDate(dt) { if (!dt) return 'N/A'; if (window.formatDate) return window.formatDate(dt); return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); },
        fmtTime(dt) { if (!dt) return 'N/A'; if (window.formatTime) return window.formatTime(dt); return dt; },

        // ---- Helpers that events.js / treasury.js / reports.js call but were never defined ----
        // Local-time YYYY-MM-DD (toISOString() would shift the date for IST users late at night)
        ymd(d) {
            const x = d ? new Date(d) : new Date();
            return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
        },
        notify(type, msg, title) {
            const t = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
            if (window.AppToast && typeof window.AppToast[t] === 'function') window.AppToast[t](msg, title);
            else console[t === 'error' ? 'error' : 'log'](`[${t}] ${msg}`);
        }
    };

    // =========================================================================
    // BUILT-IN MODULES
    // =========================================================================
    AdminPanel.modules = {
        // ==========================================
        // PROJECTS / EVENTS MODULE
        // ==========================================
        events: {
            async render(workspace) {
                try {
                    const { data: events } = await window.DB_ADMIN.from('events').select('*').order('date', { ascending: false }).limit(50);
                    workspace.innerHTML = `
                        <div class="p-6 lg:p-10">
                            <div class="admin-page-header">
                                <div>
                                    <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Projects</span></div>
                                    <h1 class="admin-page-title">Projects Registry</h1>
                                    <p class="admin-page-subtitle">Create, manage, and generate reports for all club projects.</p>
                                </div>
                                <button class="btn-primary" onclick="AdminPanel.modules.events.openForm()">
                                    <i class="fa-solid fa-plus mr-1.5"></i> Add New Project
                                </button>
                            </div>
                            <div class="admin-panel">
                                <div class="admin-panel-body p-0">
                                    <div class="overflow-x-auto">
                                        <table class="admin-data-table">
                                            <thead><tr><th>Project Name</th><th>Date</th><th>Avenue</th><th>Type</th><th>Status</th><th>Report</th><th>Actions</th></tr></thead>
                                            <tbody>
                                                ${(!events || events.length === 0) ? '<tr><td colspan="7" class="text-center py-12 text-slate-400">No projects found. Click "Add New Project" to create one.</td></tr>' : events.map(e => `
                                                    <tr>
                                                        <td class="text-xs font-bold">${AdminPanel.esc(e.event_name)}</td>
                                                        <td class="text-xs">${AdminPanel.fmtDate(e.date)}</td>
                                                        <td class="text-xs capitalize">${(e.avenue_slug || '').replace(/_/g, ' ')}</td>
                                                        <td>${e.is_dpp ? '<span class="badge badge-yellow">DPP</span>' : '<span class="badge badge-blue">Avenue</span>'}</td>
                                                        <td><span class="status-badge ${e.status}">${e.status}</span></td>
                                                        <td>${e.report_submitted ? '<span class="text-green-500 text-xs font-bold"><i class="fa-solid fa-check mr-1"></i>Submitted</span>' : '<span class="text-slate-400 text-xs">Draft</span>'}</td>
                                                        <td>
                                                            <div class="flex gap-1">
                                                                <button class="btn-secondary btn-xs" onclick="AdminPanel.modules.events.openForm('${e.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                                                                <button class="btn-primary btn-xs" onclick="window.Reports?.openReportForm ? window.Reports.openReportForm('${e.id}') : window.AppToast?.info('Load reports.js for full report wizard')" title="Report"><i class="fa-solid fa-file-pen"></i></button>
                                                                <button class="btn-danger btn-xs" onclick="AdminPanel.modules.events.deleteEvent('${e.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } catch (err) {
                    workspace.innerHTML = AdminPanel.renderError(err.message);
                }
            },

            async openForm(id) {
                let existing = null;
                if (id) {
                    const { data } = await window.DB_ADMIN.from('events').select('*').eq('id', id).single();
                    existing = data;
                }
                const today = AdminPanel.ymd();

                // Load group options from settings
                let groupOptions = ['Group 1','Group 2','Group 3','Group 4','Group 5','Group 6'];
                try {
                    const { data: gSetting } = await window.DB_ADMIN.from('system_settings').select('value').eq('key', 'group_id_options').single();
                    if (gSetting?.value) groupOptions = gSetting.value.split(',').map(s => s.trim());
                } catch (e) {}

                AdminPanel.createModal({
                    title: existing ? 'Edit Project' : 'Add New Project',
                    size: 'wide',
                    icon: 'calendar-days',
                    body: `
                        <form id="event-form" onsubmit="return false;" class="space-y-5">
                            <div class="admin-form-grid">
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Project Name <span class="required">*</span></label>
                                    <input type="text" name="event_name" required class="admin-form-input" value="${existing?.event_name || ''}" placeholder="e.g., Tree Plantation Drive">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Date <span class="required">*</span></label>
                                    <input type="date" name="date" required class="admin-form-input" value="${existing?.date || today}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Avenue <span class="required">*</span></label>
                                    <select name="avenue_slug" required class="admin-form-input admin-form-select">
                                        <option value="">Select Avenue</option>
                                        <option value="club_service" ${existing?.avenue_slug === 'club_service' ? 'selected' : ''}>Club Service</option>
                                        <option value="community_service" ${existing?.avenue_slug === 'community_service' ? 'selected' : ''}>Community Service</option>
                                        <option value="professional_service" ${existing?.avenue_slug === 'professional_service' ? 'selected' : ''}>Professional Service</option>
                                        <option value="international_service" ${existing?.avenue_slug === 'international_service' ? 'selected' : ''}>International Service</option>
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Group</label>
                                    <select name="group_number" class="admin-form-input admin-form-select">
                                        ${groupOptions.map(g => `<option value="${g}" ${existing?.group_number === g ? 'selected' : ''}>${g}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Start Time</label>
                                    <input type="time" name="start_time" class="admin-form-input" value="${existing?.start_time || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">End Time</label>
                                    <input type="time" name="end_time" class="admin-form-input" value="${existing?.end_time || ''}">
                                </div>
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Venue</label>
                                    <input type="text" name="venue" class="admin-form-input" value="${existing?.venue || ''}" placeholder="Project location">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Project Chair</label>
                                    <input type="text" name="event_chair" class="admin-form-input" value="${existing?.event_chair || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Event Secretary</label>
                                    <input type="text" name="event_secretary" class="admin-form-input" value="${existing?.event_secretary || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Proposed By</label>
                                    <input type="text" name="event_proposed_by" class="admin-form-input" value="${existing?.event_proposed_by || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Seconded By</label>
                                    <input type="text" name="event_seconded_by" class="admin-form-input" value="${existing?.event_seconded_by || ''}">
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Collaboration Type</label>
                                    <select name="collaboration_type" class="admin-form-input admin-form-select">
                                        <option value="none" ${existing?.collaboration_type === 'none' ? 'selected' : ''}>None</option>
                                        <option value="rotaract" ${existing?.collaboration_type === 'rotaract' ? 'selected' : ''}>Rotaract</option>
                                        <option value="interact" ${existing?.collaboration_type === 'interact' ? 'selected' : ''}>Interact</option>
                                        <option value="rotary" ${existing?.collaboration_type === 'rotary' ? 'selected' : ''}>Rotary</option>
                                        <option value="ngo" ${existing?.collaboration_type === 'ngo' ? 'selected' : ''}>NGO</option>
                                        <option value="others" ${existing?.collaboration_type === 'others' ? 'selected' : ''}>Others</option>
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Collaborator Name</label>
                                    <input type="text" name="collaborator_name" class="admin-form-input" value="${existing?.collaborator_name || ''}">
                                </div>
                                <div class="admin-form-group full-width">
                                    <label class="admin-form-label">Description</label>
                                    <textarea name="description" rows="3" class="admin-form-input admin-form-textarea" placeholder="Brief description of the project">${existing?.description || ''}</textarea>
                                </div>
                                <div class="admin-form-group">
                                    <label class="admin-form-label">Status</label>
                                    <select name="status" class="admin-form-input admin-form-select">
                                        <option value="draft" ${existing?.status === 'draft' ? 'selected' : ''}>Draft</option>
                                        <option value="pending_approval" ${existing?.status === 'pending_approval' ? 'selected' : ''}>Pending Approval</option>
                                        <option value="approved" ${(!existing || existing?.status === 'approved') ? 'selected' : ''}>Approved</option>
                                        <option value="completed" ${existing?.status === 'completed' ? 'selected' : ''}>Completed</option>
                                        <option value="cancelled" ${existing?.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                </div>
                                <div class="admin-form-group">
                                    <label class="flex items-center gap-3 cursor-pointer mt-2">
                                        <input type="checkbox" name="is_dpp" class="w-4 h-4 accent-yellow-500" ${existing?.is_dpp ? 'checked' : ''}>
                                        <span class="text-xs font-bold">District Priority Project (DPP)</span>
                                    </label>
                                </div>
                            </div>
                        </form>
                    `,
                    footer: `
                        <button class="btn-secondary" onclick="AdminPanel.closeModal()">Cancel</button>
                        <button class="btn-primary" onclick="AdminPanel.modules.events.saveEvent('${id || ''}')">
                            <i class="fa-solid fa-save mr-1"></i> ${existing ? 'Update Project' : 'Create Project'}
                        </button>
                    `
                });
            },

            async saveEvent(id) {
                const form = document.getElementById('event-form');
                if (!form) return;
                const fd = new FormData(form);
                const payload = {
                    event_name: fd.get('event_name'),
                    date: fd.get('date'),
                    avenue_slug: fd.get('avenue_slug'),
                    group_number: fd.get('group_number') || null,
                    start_time: fd.get('start_time') || null,
                    end_time: fd.get('end_time') || null,
                    venue: fd.get('venue') || null,
                    event_chair: fd.get('event_chair') || null,
                    event_secretary: fd.get('event_secretary') || null,
                    event_proposed_by: fd.get('event_proposed_by') || null,
                    event_seconded_by: fd.get('event_seconded_by') || null,
                    collaboration_type: fd.get('collaboration_type') || 'none',
                    collaborator_name: fd.get('collaborator_name') || null,
                    description: fd.get('description') || null,
                    status: fd.get('status') || 'approved',
                    is_dpp: fd.get('is_dpp') === 'on'
                };

                if (!payload.event_name || !payload.date || !payload.avenue_slug) {
                    window.AppToast?.warning('Project name, date, and avenue are required.');
                    return;
                }

                try {
                    if (id) {
                        await window.DB_ADMIN.from('events').update(payload).eq('id', id);
                        window.AppToast?.success('Project updated!');
                    } else {
                        payload.created_by = window.AuthManager?.currentUser?.id;
                        await window.DB_ADMIN.from('events').insert(payload);
                        window.AppToast?.success('Project created!');
                    }
                    AdminPanel.closeModal();
                    await this.render(AdminPanel.workspace);
                } catch (e) {
                    window.AppToast?.error('Save failed: ' + e.message);
                }
            },

            async deleteEvent(id) {
                if (!confirm('Permanently delete this project? This cannot be undone.')) return;
                try {
                    await window.DB_ADMIN.from('events').delete().eq('id', id);
                    window.AppToast?.success('Project deleted.');
                    await this.render(AdminPanel.workspace);
                } catch (e) {
                    window.AppToast?.error('Delete failed: ' + e.message);
                }
            }
        },

        // ==========================================
        // REPORTS CENTER (unchanged — keeping yours)
        // ==========================================
        reports: {
            async render(workspace) {
                if (!AdminPanel.isExecutive(window.AuthManager?.currentUser?.role)) {
                    workspace.innerHTML = AdminPanel.renderUnauthorized();
                    return;
                }
                const { data: events } = await window.DB_ADMIN.from('events').select('id, event_name, date, avenue_slug, is_dpp, status, report_submitted').order('date', { ascending: false }).limit(50);

                workspace.innerHTML = `
                    <div class="p-6 lg:p-10">
                        <div class="admin-page-header">
                            <div>
                                <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Reports Center</span></div>
                                <h1 class="admin-page-title">Report Generation Center</h1>
                                <p class="admin-page-subtitle">Select a project, generate its report, and download as DOCX.</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                            <div class="admin-panel cursor-pointer hover-lift" onclick="AdminPanel.modules.reports.showProjectList('avenue')">
                                <div class="admin-panel-body text-center py-8">
                                    <div class="w-16 h-16 rounded-2xl ap-ico-tile mx-auto mb-4"><i class="fa-solid fa-rocket text-2xl"></i></div>
                                    <h4 class="text-sm font-black mb-1">Avenue Project Report</h4>
                                    <p class="text-[11px] text-slate-500 mb-4">Generate report for a specific avenue project</p>
                                    <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-file-pdf mr-1"></i> Select Project</button>
                                </div>
                            </div>
                            <div class="admin-panel cursor-pointer hover-lift" onclick="AdminPanel.modules.reports.showProjectList('dpp')">
                                <div class="admin-panel-body text-center py-8">
                                    <div class="w-16 h-16 rounded-2xl ap-ico-tile mx-auto mb-4"><i class="fa-solid fa-star text-2xl"></i></div>
                                    <h4 class="text-sm font-black mb-1">DPP Report</h4>
                                    <p class="text-[11px] text-slate-500 mb-4">Generate District Priority Project report</p>
                                    <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-star mr-1"></i> Select DPP</button>
                                </div>
                            </div>
                            <div class="admin-panel cursor-pointer hover-lift" onclick="AdminPanel.navigateTo('meetings')">
                                <div class="admin-panel-body text-center py-8">
                                    <div class="w-16 h-16 rounded-2xl ap-ico-tile mx-auto mb-4"><i class="fa-solid fa-file-pen text-2xl"></i></div>
                                    <h4 class="text-sm font-black mb-1">Meeting Minutes</h4>
                                    <p class="text-[11px] text-slate-500 mb-4">Generate minutes and attendance sheets</p>
                                    <button class="btn-primary btn-sm w-full"><i class="fa-solid fa-arrow-right mr-1"></i> Go to Meetings</button>
                                </div>
                            </div>
                        </div>

                        <div class="admin-panel">
                            <div class="admin-panel-header"><h3 class="admin-panel-title"><i class="fa-solid fa-list-check"></i> All Projects — Report Status</h3></div>
                            <div class="admin-panel-body p-0">
                                <div class="overflow-x-auto">
                                    <table class="admin-data-table">
                                        <thead><tr><th>Project</th><th>Date</th><th>Avenue</th><th>Type</th><th>Report Status</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            ${(!events || events.length === 0) ? '<tr><td colspan="6" class="text-center py-10 text-slate-400">No projects found.</td></tr>' : events.map(e => `
                                                <tr>
                                                    <td class="text-xs font-bold">${AdminPanel.esc(e.event_name)}</td>
                                                    <td class="text-xs">${AdminPanel.fmtDate(e.date)}</td>
                                                    <td class="text-xs capitalize">${(e.avenue_slug || '').replace(/_/g, ' ')}</td>
                                                    <td>${e.is_dpp ? '<span class="badge badge-yellow">DPP</span>' : '<span class="badge badge-blue">Avenue</span>'}</td>
                                                    <td>${e.report_submitted ? '<span class="text-green-500 text-xs font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Submitted</span>' : '<span class="text-slate-400 text-xs"><i class="fa-regular fa-circle mr-1"></i>Not Started</span>'}</td>
                                                    <td>
                                                        <button class="btn-primary btn-xs" onclick="window.Reports?.openReportForm ? window.Reports.openReportForm('${e.id}') : window.AppToast?.info('Load reports.js for full wizard')">
                                                            <i class="fa-solid fa-file-pen mr-1"></i> Write Report
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },

            async showProjectList(type) {
                const { data } = await window.DB_ADMIN.from('events').select('id, event_name, date, is_dpp, avenue_slug').order('date', { ascending: false }).limit(30);
                const filtered = type === 'dpp' ? (data || []).filter(e => e.is_dpp) : (data || []).filter(e => !e.is_dpp);
                AdminPanel.createModal({
                    title: type === 'dpp' ? 'Select DPP Project' : 'Select Avenue Project',
                    size: 'medium',
                    icon: type === 'dpp' ? 'star' : 'rocket',
                    body: `
                        <div class="space-y-2 max-h-96 overflow-y-auto">
                            ${filtered.length === 0 ? '<p class="text-xs text-slate-400 text-center py-6">No projects found for this category.</p>' : filtered.map(e => `
                                <button class="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.08] hover:border-brand-blue hover:bg-brand-blue/5 transition text-left" onclick="AdminPanel.closeModal(); window.Reports?.openReportForm ? window.Reports.openReportForm('${e.id}') : window.AppToast?.info('Load reports.js for full wizard');">
                                    <div class="w-10 h-10 rounded-xl ap-ico-tile flex-shrink-0">
                                        <i class="fa-solid ${e.is_dpp ? 'fa-star' : 'fa-rocket'}"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm font-bold truncate">${AdminPanel.esc(e.event_name)}</p>
                                        <p class="text-[11px] text-slate-400">${AdminPanel.fmtDate(e.date)} &bull; ${(e.avenue_slug || '').replace(/_/g, ' ')}</p>
                                    </div>
                                    <i class="fa-solid fa-arrow-right text-brand-blue"></i>
                                </button>
                            `).join('')}
                        </div>
                    `
                });
            }
        },

        // ==========================================
        // BULLETINS MODULE
        // ==========================================
        chat: {
            async render(workspace) {
                try { await ChatApp.render(workspace); }
                catch (e) { console.error('[chat] render failed:', e); workspace.innerHTML = AdminPanel.renderError('Team Chat could not start: ' + (e && e.message ? e.message : e)); }
            }
        },

        bulletins: {
            async render(workspace) {
                try {
                    const { data: bulletins } = await window.DB_ADMIN.from('bulletins').select('*').order('created_at', { ascending: false });
                    workspace.innerHTML = `
                        <div class="p-6 lg:p-10">
                            <div class="admin-page-header">
                                <div>
                                    <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Bulletins</span></div>
                                    <h1 class="admin-page-title">Club Bulletin Publications</h1>
                                </div>
                                <button class="btn-primary" onclick="AdminPanel.modules.bulletins.openForm()"><i class="fa-solid fa-plus mr-1.5"></i> New Bulletin</button>
                            </div>
                            <div class="admin-panel">
                                <div class="admin-panel-body">
                                    ${(!bulletins || bulletins.length === 0) ? '<div class="empty-state py-12"><i class="fa-solid fa-newspaper empty-state-icon"></i><p class="empty-state-desc">No bulletins yet.</p></div>' : `
                                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                            ${bulletins.map(b => `
                                                <div class="admin-panel overflow-hidden flex flex-col justify-between">
                                                    <div class="h-44 bg-slate-900"><img src="${b.cover_image_url || 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png'}" class="w-full h-full object-cover"></div>
                                                    <div class="p-5 space-y-2">
                                                        <span class="text-[9px] font-black uppercase text-brand-blue">${b.edition || 'Edition'}</span>
                                                        <h4 class="text-sm font-bold truncate">${AdminPanel.esc(b.bulletin_name)}</h4>
                                                        <div class="flex gap-2 pt-2">
                                                            <button class="btn-secondary btn-xs flex-1" onclick="AdminPanel.modules.bulletins.openForm('${b.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                                                            <button class="btn-danger btn-xs" onclick="AdminPanel.modules.bulletins.deleteBulletin('${b.id}')"><i class="fa-solid fa-trash"></i></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;
                } catch (e) { workspace.innerHTML = AdminPanel.renderError(e.message); }
            },

            async openForm(id) {
                let existing = null;
                if (id) { const { data } = await window.DB_ADMIN.from('bulletins').select('*').eq('id', id).single(); existing = data; }
                AdminPanel.createModal({
                    title: existing ? 'Edit Bulletin' : 'New Bulletin', size: 'medium', icon: 'newspaper',
                    body: `<form id="bulletin-form" onsubmit="return false;" class="space-y-4">
                        <div class="admin-form-group"><label class="admin-form-label">Title <span class="required">*</span></label><input type="text" name="bulletin_name" required class="admin-form-input" value="${existing?.bulletin_name || ''}"></div>
                        <div class="admin-form-grid">
                            <div class="admin-form-group"><label class="admin-form-label">Edition</label><input type="text" name="edition" class="admin-form-input" value="${existing?.edition || ''}"></div>
                            <div class="admin-form-group"><label class="admin-form-label">Month</label><input type="text" name="month" class="admin-form-input" value="${existing?.month || ''}"></div>
                        </div>
                        <div class="admin-form-group"><label class="admin-form-label">Description</label><textarea name="description" rows="2" class="admin-form-input admin-form-textarea">${existing?.description || ''}</textarea></div>
                        <div class="admin-form-group"><label class="admin-form-label">Drive Link</label><input type="url" name="drive_link" class="admin-form-input" value="${existing?.drive_link || ''}"></div>
                        <div class="admin-form-group"><label class="admin-form-label">Cover Image URL</label><input type="url" name="cover_image_url" class="admin-form-input" value="${existing?.cover_image_url || ''}"></div>
                    </form>`,
                    footer: `<button class="btn-secondary" onclick="AdminPanel.closeModal()">Cancel</button><button class="btn-primary" onclick="AdminPanel.modules.bulletins.save('${id || ''}')"><i class="fa-solid fa-save mr-1"></i> Save</button>`
                });
            },

            async save(id) {
                const form = document.getElementById('bulletin-form'); if (!form) return;
                const fd = new FormData(form);
                const payload = { bulletin_name: fd.get('bulletin_name'), edition: fd.get('edition'), month: fd.get('month'), description: fd.get('description'), drive_link: fd.get('drive_link'), cover_image_url: fd.get('cover_image_url') };
                try {
                    if (id) await window.DB_ADMIN.from('bulletins').update(payload).eq('id', id);
                    else await window.DB_ADMIN.from('bulletins').insert(payload);
                    window.AppToast?.success('Saved!'); AdminPanel.closeModal(); await this.render(AdminPanel.workspace);
                } catch (e) { window.AppToast?.error('Failed: ' + e.message); }
            },

            async deleteBulletin(id) {
                if (!confirm('Delete?')) return;
                try { await window.DB_ADMIN.from('bulletins').delete().eq('id', id); window.AppToast?.success('Deleted'); await this.render(AdminPanel.workspace); }
                catch (e) { window.AppToast?.error('Failed'); }
            }
        },

        // ==========================================
        // ULTRA-POWERFUL SITE SETTINGS MODULE
        // Comprehensive Super Admin Control Panel
        // Every single aspect of the website editable
        // ==========================================
        settings: {
            activeTab: 'identity',
            settingsCache: {},

            async render(workspace) {
                const userRole = window.AuthManager?.currentUser?.role;
                if (userRole !== 'super_admin' && userRole !== 'advisor') {
                    workspace.innerHTML = AdminPanel.renderUnauthorized();
                    return;
                }

                try {
                    const { data } = await window.DB_ADMIN.from('system_settings').select('*');
                    const settings = {};
                    (data || []).forEach(s => { settings[s.key] = s.value; });
                    this.settingsCache = settings;

                    workspace.innerHTML = `
                        <div class="p-6 lg:p-10">
                            <div class="admin-page-header">
                                <div>
                                    <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Site Settings</span></div>
                                    <h1 class="admin-page-title">Site Control Center</h1>
                                    <p class="admin-page-subtitle">Super Admin exclusive — manage every single aspect of the website.</p>
                                </div>
                                <div class="flex gap-2">
                                    <button class="btn-secondary btn-sm" onclick="AdminPanel.modules.settings.exportSettings()"><i class="fa-solid fa-download mr-1"></i> Export</button>
                                    <button class="btn-primary btn-sm" onclick="AdminPanel.modules.settings.importSettings()"><i class="fa-solid fa-upload mr-1"></i> Import</button>
                                </div>
                            </div>

                            <!-- Settings Tabs -->
                            <div class="settings-tabs" role="tablist">
                                ${this.renderTabButton('identity', 'fa-id-card', 'Club Identity')}
                                ${this.renderTabButton('stats', 'fa-chart-line', 'Live Impact Stats')}
                                ${this.renderTabButton('branding', 'fa-palette', 'Branding & Logos')}
                                ${this.renderTabButton('reports', 'fa-file-contract', 'Report Templates')}
                                ${this.renderTabButton('contact', 'fa-address-book', 'Contact & Social')}
                                ${this.renderTabButton('automation', 'fa-robot', 'Email & Automation')}
                                ${this.renderTabButton('access', 'fa-key', 'Access & Roles')}
                                ${this.renderTabButton('officers', 'fa-user-tie', 'Officer Signatures')}
                                ${this.renderTabButton('website', 'fa-globe', 'Website Content')}
                                ${this.renderTabButton('integrations', 'fa-plug', 'Integrations & APIs')}
                                ${this.renderTabButton('advanced', 'fa-code', 'Advanced / Raw')}
                                ${userRole === 'super_admin' ? this.renderTabButton('reset', 'fa-triangle-exclamation', 'Reset Data') : ''}
                            </div>

                            <div id="settings-tab-content"></div>
                        </div>
                    `;

                    await this.renderActiveTab();
                } catch (e) {
                    workspace.innerHTML = AdminPanel.renderError(e.message);
                }
            },

            renderTabButton(id, icon, label) {
                const active = this.activeTab === id;
                return `<button class="settings-tab-btn ${active ? 'active' : ''}" role="tab" data-tab="${id}" onclick="AdminPanel.modules.settings.switchTab('${id}')"><i class="fa-solid ${icon}"></i>${label}</button>`;
            },

            async switchTab(tabId) {
                this.activeTab = tabId;
                document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
                await this.renderActiveTab();
            },

            async renderActiveTab() {
                const container = document.getElementById('settings-tab-content');
                if (!container) return;
                const tabs = {
                    identity: () => this.renderIdentityTab(),
                    stats: () => this.renderStatsTab(),
                    branding: () => this.renderBrandingTab(),
                    reports: () => this.renderReportsTab(),
                    contact: () => this.renderContactTab(),
                    automation: () => this.renderAutomationTab(),
                    access: () => this.renderAccessTab(),
                    officers: () => this.renderOfficersTab(),
                    website: () => this.renderWebsiteTab(),
                    integrations: () => this.renderIntegrationsTab(),
                    advanced: () => this.renderAdvancedTab(),
                    reset: () => this.renderResetTab()
                };
                const tabId = this.activeTab;
                let html = tabs[tabId] ? tabs[tabId]() : '<p class="text-xs text-slate-400">Loading...</p>';
                if (html && typeof html.then === 'function') html = await html;   // async tabs (Advanced)
                if (this.activeTab !== tabId) return;                              // user switched tab meanwhile
                container.innerHTML = html;
                if (tabId === 'stats') this.refreshStatsPreview();
            },

            getValue(key, def = '') {
                return this.settingsCache[key] !== undefined ? this.settingsCache[key] : def;
            },

            // =========================================
            // TAB 1: CLUB IDENTITY
            // =========================================
            renderIdentityTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-id-card text-brand-blue mr-2"></i>Club Identity</h3><p class="text-[11px] text-slate-500 mt-1">Legally registered club identification details</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('identity', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="settings-form-identity">
                            ${this.inputField('club_name', 'Club Name', this.getValue('club_name', 'Rotaract Club of Coimbatore Unity'), 'Full official name', 'text', true)}
                            ${this.inputField('sponsor_club', 'Sponsor Club Name', this.getValue('sponsor_club', 'Family of Rotary Club of Coimbatore East'), 'Family of Rotary Club...', 'text', true)}
                            ${this.inputField('club_id', 'Club ID', this.getValue('club_id', '91594'), 'RI assigned Club ID', 'text')}
                            ${this.inputField('ri_district', 'RI District', this.getValue('ri_district', '3206'), 'District number only', 'text')}
                            ${this.inputField('district_region', 'District Coverage Region', this.getValue('district_region', 'Coimbatore | Palakkad'), 'City scope')}
                            ${this.inputField('charter_date', 'Charter Date', this.getValue('charter_date', '21.4.2014'), 'DD.MM.YYYY format', 'text')}
                            ${this.inputField('rotary_year', 'Current Rotary Year', this.getValue('rotary_year', '2026-27'), 'YYYY-YY')}
                            ${this.inputField('group_id_options', 'Group ID Options (comma separated)', this.getValue('group_id_options', 'Group 1,Group 2,Group 3,Group 4,Group 5,Group 6'), 'Used in event dropdowns', 'text')}
                            ${this.textareaField('club_tagline', 'Club Tagline / Motto', this.getValue('club_tagline', 'Service Above Self'), 'Short motto', 2)}
                            ${this.textareaField('club_description', 'Club Description', this.getValue('club_description', ''), 'Short description used across the website', 3)}
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 2: BRANDING & LOGOS
            // =========================================
            renderBrandingTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-palette text-brand-blue mr-2"></i>Branding & Logos</h3><p class="text-[11px] text-slate-500 mt-1">Logo URLs, dimensions and brand colors</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('branding', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>

                        <div class="mb-6">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-image text-brand-blue mr-1"></i>Primary Website Logos</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-5" id="settings-form-branding">
                                <div>
                                    <label class="settings-label">Colour Logo URL</label>
                                    <input type="url" class="settings-input" name="logo_colour" value="${this.getValue('logo_colour', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png')}">
                                    <div class="logo-preview-box mt-2"><img src="${this.getValue('logo_colour', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501797/unity_standard_colour_mkz1k7.png')}" onerror="this.style.display='none'"></div>
                                </div>
                                <div>
                                    <label class="settings-label">White Logo URL</label>
                                    <input type="url" class="settings-input" name="logo_white" value="${this.getValue('logo_white', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png')}">
                                    <div class="logo-preview-box mt-2" style="background:#1a1a1a"><img src="${this.getValue('logo_white', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_white_bzcxtn.png')}" onerror="this.style.display='none'"></div>
                                </div>
                                <div>
                                    <label class="settings-label">Black Logo URL</label>
                                    <input type="url" class="settings-input" name="logo_black" value="${this.getValue('logo_black', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_black_jwjihq.png')}">
                                    <div class="logo-preview-box mt-2"><img src="${this.getValue('logo_black', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1783501798/unity_standard_black_jwjihq.png')}" onerror="this.style.display='none'"></div>
                                </div>
                            </div>
                        </div>

                        <div class="mb-6 p-4 rounded-xl ap-tint-box">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-file-image text-brand-blue mr-1"></i>Avenue Report Logo Strip (used in Reports, Minutes, Agenda, Attendance)</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div class="md:col-span-3">
                                    <label class="settings-label">Avenue Logo Strip URL</label>
                                    <input type="url" class="settings-input" name="logo_strip_avenue" value="${this.getValue('logo_strip_avenue', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png')}">
                                    <div class="logo-preview-box mt-2"><img src="${this.getValue('logo_strip_avenue', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1786728607/unity_26-27_colourAsset_6_2x-8_nxax48.png')}" onerror="this.style.display='none'"></div>
                                </div>
                                <div><label class="settings-label">Width (inches)</label><input type="text" class="settings-input" name="logo_strip_avenue_width" value="${this.getValue('logo_strip_avenue_width', '4.63in')}"><p class="settings-hint">Default: 4.63in</p></div>
                                <div><label class="settings-label">Height (inches)</label><input type="text" class="settings-input" name="logo_strip_avenue_height" value="${this.getValue('logo_strip_avenue_height', '0.43in')}"><p class="settings-hint">Default: 0.43in</p></div>
                                <div><label class="settings-label">Alignment</label><select class="settings-input" name="logo_strip_avenue_align"><option value="center" ${this.getValue('logo_strip_avenue_align', 'center') === 'center' ? 'selected' : ''}>Center</option><option value="left" ${this.getValue('logo_strip_avenue_align') === 'left' ? 'selected' : ''}>Left</option><option value="right" ${this.getValue('logo_strip_avenue_align') === 'right' ? 'selected' : ''}>Right</option></select></div>
                            </div>
                        </div>

                        <div class="mb-6 p-4 rounded-xl ap-tint-box">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-star text-brand-blue mr-1"></i>DPP Report Logo Strip</h4>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div class="md:col-span-3">
                                    <label class="settings-label">DPP Logo Strip URL</label>
                                    <input type="url" class="settings-input" name="logo_strip_dpp" value="${this.getValue('logo_strip_dpp', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1787012147/Unity_DPP_ColourAsset_9_2x-8_q0qi81.png')}">
                                    <div class="logo-preview-box mt-2"><img src="${this.getValue('logo_strip_dpp', 'https://res.cloudinary.com/duoy1cje9/image/upload/v1787012147/Unity_DPP_ColourAsset_9_2x-8_q0qi81.png')}" onerror="this.style.display='none'"></div>
                                </div>
                                <div><label class="settings-label">Width (inches)</label><input type="text" class="settings-input" name="logo_strip_dpp_width" value="${this.getValue('logo_strip_dpp_width', '5.55in')}"><p class="settings-hint">Default: 5.55in</p></div>
                                <div><label class="settings-label">Height (inches)</label><input type="text" class="settings-input" name="logo_strip_dpp_height" value="${this.getValue('logo_strip_dpp_height', '0.42in')}"><p class="settings-hint">Default: 0.42in</p></div>
                                <div><label class="settings-label">Alignment</label><select class="settings-input" name="logo_strip_dpp_align"><option value="center" ${this.getValue('logo_strip_dpp_align', 'center') === 'center' ? 'selected' : ''}>Center</option><option value="left" ${this.getValue('logo_strip_dpp_align') === 'left' ? 'selected' : ''}>Left</option><option value="right" ${this.getValue('logo_strip_dpp_align') === 'right' ? 'selected' : ''}>Right</option></select></div>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-swatchbook text-brand-blue mr-1"></i>Brand Color Palette</h4>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                ${this.colorField('color_primary', 'Primary (Blue)', this.getValue('color_primary', '#1a73e8'))}
                                ${this.colorField('color_secondary', 'Secondary (Purple)', this.getValue('color_secondary', '#7c3aed'))}
                                ${this.colorField('color_accent', 'Accent (Cyan)', this.getValue('color_accent', '#06b6d4'))}
                                ${this.colorField('color_dark', 'Dark Mode BG', this.getValue('color_dark', '#050a18'))}
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 3: REPORT TEMPLATES
            // =========================================
            renderReportsTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-file-contract text-brand-blue mr-2"></i>Report & Document Templates</h3><p class="text-[11px] text-slate-500 mt-1">Font sizes, headings, labels used in generated DOCX reports</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('reports', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="settings-form-reports">
                            ${this.inputField('report_club_name_fontsize', 'Club Name Font Size (pt)', this.getValue('report_club_name_fontsize', '20'), 'Default: 20pt', 'number')}
                            ${this.inputField('report_sponsor_fontsize', 'Sponsor Club Font Size (pt)', this.getValue('report_sponsor_fontsize', '14'), 'Default: 14pt', 'number')}
                            ${this.inputField('report_meta_fontsize', 'Metadata Font Size (pt)', this.getValue('report_meta_fontsize', '12'), 'Club ID line, Default: 12pt', 'number')}
                            ${this.inputField('report_body_fontsize', 'Body Content Font Size (pt)', this.getValue('report_body_fontsize', '11'), 'Default: 11pt', 'number')}
                            ${this.inputField('report_font_family', 'Report Font Family', this.getValue('report_font_family', 'Poppins'), 'Font used in DOCX')}
                            ${this.inputField('report_page_size', 'Page Size', this.getValue('report_page_size', 'A4'), 'A4 / Letter')}
                            ${this.inputField('report_page_margin', 'Page Margin (inches)', this.getValue('report_page_margin', '1.0'), 'Default: 1.0in', 'text')}
                            ${this.inputField('monthly_report_heading', 'Monthly Report Front Page Heading Pattern', this.getValue('monthly_report_heading', 'Monthly Report of {MONTH}'), 'Use {MONTH} placeholder')}
                            ${this.textareaField('report_footer_text', 'Report Footer Text', this.getValue('report_footer_text', ''), 'Optional footer added to every report', 3)}
                        </div>

                        <div class="mt-6 p-4 rounded-xl ap-tint-box">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-clock text-brand-blue mr-1"></i>Meeting Minutes Templates</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${this.inputField('minutes_time_column_width', 'Minutes Time Column Width (%)', this.getValue('minutes_time_column_width', '25'), 'Default: 25%', 'number')}
                                ${this.inputField('minutes_heading_column_width', 'Minutes Heading Column Width (%)', this.getValue('minutes_heading_column_width', '75'), 'Default: 75%', 'number')}
                                ${this.textareaField('attendance_form_description', 'Attendance Form Description Template', this.getValue('attendance_form_description', 'Attendance for {MEETING_NAME} held on {DATE} at {VENUE}'), 'Use {MEETING_NAME}, {DATE}, {VENUE}', 3)}
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 4: CONTACT & SOCIAL
            // =========================================
            renderContactTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-address-book text-brand-blue mr-2"></i>Contact & Social Media</h3><p class="text-[11px] text-slate-500 mt-1">Public contact info, addresses, maps and social links</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('contact', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="settings-form-contact">
                            ${this.inputField('contact_email', 'Primary Club Email', this.getValue('contact_email', 'rc.cbeunity@gmail.com'), 'Shown publicly', 'email')}
                            ${this.inputField('contact_phone', 'Primary Contact Phone', this.getValue('contact_phone', ''), 'Optional, publicly shown', 'tel')}
                            ${this.inputField('contact_address', 'Address (City, State)', this.getValue('contact_address', 'Coimbatore, Tamil Nadu'), 'Shown in footer')}
                            ${this.inputField('contact_country', 'Country', this.getValue('contact_country', 'India'), '')}
                            ${this.textareaField('map_embed_url', 'Google Map Embed URL', this.getValue('map_embed_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15665.467472061262!2d76.95357835!3d11.0120227!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba859af2f973901%3A0xa7df13d55d172206!2sCoimbatore%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1700000000000'), 'Google Maps iframe src URL', 3)}
                            ${this.inputField('social_instagram', 'Instagram Handle', this.getValue('social_instagram', 'rotaractunity'), 'Without @ sign')}
                            ${this.inputField('social_facebook', 'Facebook Handle', this.getValue('social_facebook', ''), 'Page name/handle')}
                            ${this.inputField('social_linkedin', 'LinkedIn Handle', this.getValue('social_linkedin', ''), 'Company page handle')}
                            ${this.inputField('social_youtube', 'YouTube Channel', this.getValue('social_youtube', ''), 'Channel URL')}
                            ${this.inputField('social_twitter', 'X / Twitter Handle', this.getValue('social_twitter', ''), 'Without @ sign')}
                        </div>

                        <div class="mt-6 p-4 rounded-xl ap-tint-box">
                            <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-droplet text-brand-blue mr-1"></i>Blood Desk Emergency Contacts</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${this.inputField('blood_desk_phone_1', 'Primary Emergency WhatsApp Number', this.getValue('blood_desk_phone_1', '9789903206'), '10 digits only, no +91', 'tel')}
                                ${this.inputField('blood_desk_phone_2', 'Secondary Emergency WhatsApp Number', this.getValue('blood_desk_phone_2', '9789953206'), '10 digits only, no +91', 'tel')}
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 5: EMAIL & AUTOMATION
            // =========================================
            renderAutomationTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-robot text-brand-blue mr-2"></i>Email & Automation</h3><p class="text-[11px] text-slate-500 mt-1">Mail groups, auto-trigger settings, and notification preferences</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('automation', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="space-y-5" id="settings-form-automation">
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-envelope text-brand-blue mr-1"></i>Mailing Groups (hidden from public view)</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.inputField('mail_group_members', 'All Members Group Email', this.getValue('mail_group_members', 'rotaractunity@googlegroups.com'), 'Hidden; used by system to send mails', 'email')}
                                    ${this.inputField('mail_group_board', 'Board Members Group Email', this.getValue('mail_group_board', 'eternals26-27@googlegroups.com'), 'Hidden; used for board communications', 'email')}
                                    ${this.inputField('mail_sender_name', 'Sender Display Name', this.getValue('mail_sender_name', 'Rotaract Club of Coimbatore Unity'), 'Name shown in emails')}
                                    ${this.inputField('mail_sender_address', 'From Email Address', this.getValue('mail_sender_address', 'rc.cbeunity@gmail.com'), 'From address', 'email')}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-wand-magic-sparkles text-brand-blue mr-1"></i>Automation Triggers</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.toggleField('auto_birthday_wishes', 'Birthday Wishes Auto-Trigger', this.getValue('auto_birthday_wishes', 'true'))}
                                    ${this.toggleField('auto_project_approval_mail', 'Project Approval Member Alert', this.getValue('auto_project_approval_mail', 'true'))}
                                    ${this.toggleField('auto_meeting_invite', 'Meeting Invitation Auto-Send', this.getValue('auto_meeting_invite', 'true'))}
                                    ${this.toggleField('auto_meeting_attendance', 'Meeting Attendance Form Auto-Send', this.getValue('auto_meeting_attendance', 'true'))}
                                    ${this.toggleField('auto_monthly_treasury', 'Monthly Treasury Statement Auto-Send', this.getValue('auto_monthly_treasury', 'true'))}
                                    ${this.toggleField('auto_minutes_distribution', 'Minutes Auto-Distribute After Approval', this.getValue('auto_minutes_distribution', 'true'))}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-message text-brand-blue mr-1"></i>Default Message Templates</h4>
                                <div class="grid grid-cols-1 gap-4">
                                    ${this.textareaField('template_birthday', 'Birthday Wish Template', this.getValue('template_birthday', 'Dear {NAME}, wishing you a happy birthday from Rotaract Club of Coimbatore Unity!'), 'Use {NAME} placeholder', 2)}
                                    ${this.textareaField('template_meeting_invite', 'Meeting Invite Template', this.getValue('template_meeting_invite', 'You are cordially invited to {MEETING_NAME} on {DATE} at {TIME}, Venue: {VENUE}.'), 'Use {MEETING_NAME}, {DATE}, {TIME}, {VENUE}', 3)}
                                    ${this.textareaField('template_project_announce', 'Project Announcement Template', this.getValue('template_project_announce', 'A new project has been approved: {PROJECT_NAME} on {DATE} at {VENUE}. All members are requested to actively participate.'), 'Use {PROJECT_NAME}, {DATE}, {VENUE}', 3)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 6: ACCESS & ROLES
            // =========================================
            renderAccessTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-key text-brand-blue mr-2"></i>Access Levels & Role Permissions</h3><p class="text-[11px] text-slate-500 mt-1">Define what each role can do (used across the admin panel)</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.navigateTo('users')"><i class="fa-solid fa-user-shield mr-1"></i>Manage Admin Users</button>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-xs">
                                <thead>
                                    <tr class="border-b border-slate-200/40 dark:border-white/[0.08]">
                                        <th class="py-3 px-3 text-left font-black uppercase tracking-wider text-slate-500">Role Name</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Projects</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Meetings</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Treasury</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Members</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Reports</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Approve</th>
                                        <th class="py-3 px-3 text-center font-black uppercase tracking-wider text-slate-500">Settings</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-200/30 dark:divide-white/[0.04]">
                                    ${this.rolePermRow('Super Admin', ['full', 'full', 'full', 'full', 'full', 'yes', 'full'])}
                                    ${this.rolePermRow('Advisor', ['full', 'full', 'full', 'full', 'full', 'yes', 'full'])}
                                    ${this.rolePermRow('President', ['full', 'full', 'view', 'full', 'full', 'yes', 'limited'])}
                                    ${this.rolePermRow('Immediate Past President', ['full', 'full', 'view', 'full', 'full', 'yes', 'none'])}
                                    ${this.rolePermRow('Vice President', ['edit', 'edit', 'view', 'view', 'full', 'yes', 'none'])}
                                    ${this.rolePermRow('Secretary (Admin)', ['full', 'full', 'view', 'full', 'full', 'yes', 'none'])}
                                    ${this.rolePermRow('Secretary (Comm)', ['full', 'full', 'view', 'full', 'full', 'yes', 'none'])}
                                    ${this.rolePermRow('Treasurer', ['view', 'view', 'full', 'view', 'view', 'no', 'none'])}
                                    ${this.rolePermRow('Avenue Director', ['own-avenue', 'view', 'none', 'view', 'own-avenue', 'no', 'none'])}
                                    ${this.rolePermRow('Avenue Chair', ['own-avenue', 'view', 'none', 'view', 'own-avenue', 'no', 'none'])}
                                    ${this.rolePermRow('DPP Chair', ['dpp-only', 'view', 'none', 'view', 'dpp-only', 'no', 'none'])}
                                    ${this.rolePermRow('Member', ['view', 'view', 'none', 'view', 'view', 'no', 'none'])}
                                </tbody>
                            </table>
                        </div>

                        <div class="mt-6 p-4 rounded-xl ap-tint-box">
                            <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                <i class="fa-solid fa-circle-info text-amber-500 mr-1"></i>
                                These permissions govern what each role sees in the admin panel. To add or remove individual admin users, use the <strong>Admin Users</strong> section. Role definitions themselves (which role a user is assigned) are managed per-user in Admin Users.
                            </p>
                        </div>
                    </div>
                `;
            },

            rolePermRow(name, perms) {
                const map = { full: '<i class="fa-solid fa-circle-check text-green-500"></i>', edit: '<span class="text-[9px] font-bold text-blue-500">EDIT</span>', view: '<span class="text-[9px] font-bold text-slate-400">VIEW</span>', 'own-avenue': '<span class="text-[9px] font-bold text-purple-500">AVENUE</span>', 'dpp-only': '<span class="text-[9px] font-bold text-yellow-500">DPP</span>', yes: '<i class="fa-solid fa-circle-check text-green-500"></i>', no: '<i class="fa-solid fa-circle-xmark text-red-400"></i>', limited: '<span class="text-[9px] font-bold text-orange-500">LIMIT</span>', none: '<i class="fa-solid fa-minus text-slate-300"></i>' };
                return `<tr><td class="py-2.5 px-3 text-xs font-bold">${name}</td>${perms.map(p => `<td class="py-2.5 px-3 text-center">${map[p] || p}</td>`).join('')}</tr>`;
            },

            // =========================================
            // TAB 7: OFFICER SIGNATURES
            // =========================================
            renderOfficersTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-user-tie text-brand-blue mr-2"></i>Officer Signature Block (Reports & Minutes)</h3><p class="text-[11px] text-slate-500 mt-1">Names shown in signature lines of generated documents</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('officers', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-5" id="settings-form-officers">
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-[11px] font-black uppercase text-blue-600 mb-3">Left Signature</h4>
                                ${this.inputField('officer_sec_admin_name', 'Name', this.getValue('officer_sec_admin_name', ''), 'e.g., Rtr. John Doe')}
                                ${this.inputField('officer_sec_admin_portfolio', 'Portfolio', this.getValue('officer_sec_admin_portfolio', 'Secretary (Administration)'), '')}
                            </div>
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-[11px] font-black uppercase text-purple-600 mb-3">Center Signature</h4>
                                ${this.inputField('officer_president_name', 'Name', this.getValue('officer_president_name', ''), 'e.g., Rtr. Jane Smith')}
                                ${this.inputField('officer_president_portfolio', 'Portfolio', this.getValue('officer_president_portfolio', 'President'), '')}
                            </div>
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-[11px] font-black uppercase text-cyan-600 mb-3">Right Signature</h4>
                                ${this.inputField('officer_sec_comm_name', 'Name', this.getValue('officer_sec_comm_name', ''), 'e.g., Rtr. Bob Lee')}
                                ${this.inputField('officer_sec_comm_portfolio', 'Portfolio', this.getValue('officer_sec_comm_portfolio', 'Secretary (Communication)'), '')}
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 8: WEBSITE CONTENT
            // =========================================
            renderWebsiteTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-globe text-brand-blue mr-2"></i>Website Content & Messaging</h3><p class="text-[11px] text-slate-500 mt-1">Hero text, taglines, section headings</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('website', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="settings-form-website">
                            ${this.textareaField('hero_heading', 'Hero Heading', this.getValue('hero_heading', 'Rotaract Club of Coimbatore Unity'), '', 2)}
                            ${this.textareaField('hero_tagline', 'Hero Tagline / Subheading', this.getValue('hero_tagline', 'Building transformative youth leadership, sustainable community impact, and meaningful professional connections.'), '', 3)}
                            ${this.inputField('cta_primary_label', 'Primary CTA Button Label', this.getValue('cta_primary_label', 'Join Our Movement'))}
                            ${this.inputField('cta_secondary_label', 'Secondary CTA Button Label', this.getValue('cta_secondary_label', 'Explore Projects'))}
                            ${this.textareaField('about_section_text', 'About / Benefits Section Intro', this.getValue('about_section_text', 'Rotaract empowers youth to build professional capabilities, grow dynamic leadership networks, support humanitarian activities, and make lifelong connections.'), '', 3)}
                            ${this.inputField('footer_copyright', 'Footer Copyright Line', this.getValue('footer_copyright', '2026-27 Rotaract Club of Coimbatore Unity. All rights reserved.'))}
                            ${this.toggleField('show_games_section', 'Show Games Portal in Navigation', this.getValue('show_games_section', 'true'))}
                            ${this.toggleField('show_blood_section', 'Show Blood Desk Section', this.getValue('show_blood_section', 'true'))}
                            ${this.toggleField('show_chatbot', 'Show AI Chatbot Floating Button', this.getValue('show_chatbot', 'true'))}
                            ${this.toggleField('enable_membership_apps', 'Accept New Membership Applications', this.getValue('enable_membership_apps', 'true'))}
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB: LIVE IMPACT STATS (landing page hero card)
            // Each number is auto-calculated from live data. The admin can add an
            // adjustment (e.g. work done before the portal existed) or switch a
            // number to a fixed manual value. Super Admin is never counted as a member.
            // =========================================
            _statsAuto: {},

            statDefs() {
                return (window.UnityStats && window.UnityStats.defs) || [
                    { key: 'total_members', label: 'Active Members' },
                    { key: 'projects_completed', label: 'Projects Done' },
                    { key: 'service_hours', label: 'Service Hours' },
                    { key: 'beneficiaries', label: 'Lives Impacted' }
                ];
            },

            renderStatsTab() {
                const meta = {
                    total_members:      { icon: 'fa-users',       tint: 'text-brand-blue',   hint: 'Auto = active club members. The Super Admin is a system account and is never counted.' },
                    projects_completed: { icon: 'fa-folder-open', tint: 'text-brand-purple', hint: 'Auto = projects whose status is "completed".' },
                    service_hours:      { icon: 'fa-clock',       tint: 'text-green-500',    hint: 'Auto = total Service Hours entered in the reports of completed projects.' },
                    beneficiaries:      { icon: 'fa-heart',       tint: 'text-red-500',      hint: 'Auto = total Beneficiaries entered in the reports of completed projects.' }
                };
                const cards = this.statDefs().map(d => {
                    const k = d.key;
                    const m = meta[k] || { icon: 'fa-chart-line', tint: 'text-brand-blue', hint: '' };
                    const mode = this.getValue('stat_' + k + '_mode', 'auto') === 'manual' ? 'manual' : 'auto';
                    return `
                        <div class="p-4 rounded-xl ap-tint-box">
                            <div class="flex items-center justify-between mb-3 gap-3">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider"><i class="fa-solid ${m.icon} ${m.tint} mr-1"></i>${d.label}</h4>
                                <div class="text-right">
                                    <p class="text-[9px] uppercase font-bold text-slate-400">Shown on site</p>
                                    <p class="text-lg font-black" data-stat-final="${k}">...</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label class="settings-label">Mode</label>
                                    <select name="stat_${k}_mode" class="settings-input" onchange="AdminPanel.modules.settings.updateStatsPreview()">
                                        <option value="auto" ${mode === 'auto' ? 'selected' : ''}>Auto-calculate</option>
                                        <option value="manual" ${mode === 'manual' ? 'selected' : ''}>Manual value</option>
                                    </select>
                                    <p class="settings-hint">Calculated now: <strong data-stat-auto="${k}">...</strong></p>
                                </div>
                                <div>
                                    <label class="settings-label">Add to calculated</label>
                                    <input type="number" step="1" name="stat_${k}_offset" class="settings-input" value="${AdminPanel.esc(this.getValue('stat_' + k + '_offset', '0'))}" oninput="AdminPanel.modules.settings.updateStatsPreview()">
                                    <p class="settings-hint">Auto mode only. For work done before the portal. Can be negative.</p>
                                </div>
                                <div>
                                    <label class="settings-label">Manual value</label>
                                    <input type="number" min="0" step="1" name="stat_${k}_manual" class="settings-input" value="${AdminPanel.esc(this.getValue('stat_' + k + '_manual', ''))}" oninput="AdminPanel.modules.settings.updateStatsPreview()">
                                    <p class="settings-hint">Manual mode only. Replaces the calculated number.</p>
                                </div>
                            </div>
                            <p class="settings-hint mt-3">${m.hint}</p>
                        </div>`;
                }).join('');

                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div>
                                <h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-chart-line text-brand-blue mr-2"></i>Live Impact Stats</h3>
                                <p class="text-[11px] text-slate-500 mt-1">Numbers in the "Live Impact" card on the landing page. <span id="stats-calc-note"></span></p>
                            </div>
                            <div class="flex gap-2">
                                <button class="btn-secondary btn-sm" onclick="AdminPanel.modules.settings.refreshStatsPreview()"><i class="fa-solid fa-rotate mr-1"></i>Recalculate</button>
                                <button class="btn-secondary btn-sm" onclick="AdminPanel.modules.settings.resetStatsForm()"><i class="fa-solid fa-rotate-left mr-1"></i>Reset to Auto</button>
                                <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('stats', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                            </div>
                        </div>
                        <div class="space-y-4" id="settings-form-stats">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${cards}</div>
                            <div class="p-4 rounded-xl ap-tint-box">
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label class="settings-label">Text after each number</label>
                                        <input type="text" name="stats_suffix" maxlength="4" class="settings-input" value="${AdminPanel.esc(this.getValue('stats_suffix', '+'))}" oninput="AdminPanel.modules.settings.updateStatsPreview()">
                                        <p class="settings-hint">Default "+". Leave empty to show plain numbers.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },

            async refreshStatsPreview() {
                const note = document.getElementById('stats-calc-note');
                if (!window.UnityStats) {
                    if (note) note.textContent = 'Statistics engine (app.js) is not loaded.';
                    return;
                }
                if (note) note.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Calculating...';
                try {
                    const { values, failed } = await window.UnityStats.calculate();
                    this._statsAuto = values;
                    if (note) note.textContent = failed.length
                        ? 'Could not calculate: ' + failed.join(', ') + '. Check table permissions.'
                        : 'Calculated just now from live data.';
                } catch (e) {
                    if (note) note.textContent = 'Calculation failed: ' + e.message;
                }
                this.updateStatsPreview();
            },

            updateStatsPreview() {
                const scope = document.getElementById('settings-form-stats');
                if (!scope || !window.UnityStats) return;
                const cfg = {};
                scope.querySelectorAll('[name]').forEach(i => { cfg[i.getAttribute('name')] = i.value; });
                const suffix = cfg.stats_suffix !== undefined ? cfg.stats_suffix : '+';
                const finals = window.UnityStats.resolve(this._statsAuto || {}, cfg);
                this.statDefs().forEach(d => {
                    const k = d.key;
                    const a = scope.querySelector('[data-stat-auto="' + k + '"]');
                    const f = scope.querySelector('[data-stat-final="' + k + '"]');
                    const hasAuto = this._statsAuto && this._statsAuto[k] !== undefined;
                    if (a) a.textContent = hasAuto ? Number(this._statsAuto[k]).toLocaleString() : '-';
                    if (f) f.textContent = Number(finals[k]).toLocaleString() + suffix;
                    const manual = cfg['stat_' + k + '_mode'] === 'manual';
                    const off = scope.querySelector('[name="stat_' + k + '_offset"]');
                    const man = scope.querySelector('[name="stat_' + k + '_manual"]');
                    if (off) { off.disabled = manual; off.style.opacity = manual ? '0.5' : ''; }
                    if (man) { man.disabled = !manual; man.style.opacity = manual ? '' : '0.5'; }
                });
            },

            resetStatsForm() {
                const scope = document.getElementById('settings-form-stats');
                if (!scope) return;
                scope.querySelectorAll('select[name$="_mode"]').forEach(s => { s.value = 'auto'; });
                scope.querySelectorAll('input[name$="_offset"]').forEach(i => { i.value = '0'; });
                scope.querySelectorAll('input[name$="_manual"]').forEach(i => { i.value = ''; });
                this.updateStatsPreview();
                window.AppToast?.info('Reset in the form. Click Save All to apply.');
            },

            // =========================================
            // TAB 9: INTEGRATIONS & APIs
            // =========================================
            renderIntegrationsTab() {
                return `
                    <div class="settings-section-card">
                        <div class="section-sticky-header">
                            <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-plug text-brand-blue mr-2"></i>Third-Party Integrations</h3><p class="text-[11px] text-slate-500 mt-1">API keys and external service configurations</p></div>
                            <button class="btn-primary btn-sm save-pulse-btn" onclick="AdminPanel.modules.settings.saveTab('integrations', this)"><i class="fa-solid fa-save mr-1"></i>Save All</button>
                        </div>

                        <div class="space-y-4" id="settings-form-integrations">
                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-image text-brand-blue mr-1"></i>Cloudinary (Image Hosting)</h4>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    ${this.inputField('cloudinary_cloud_name', 'Cloud Name', this.getValue('cloudinary_cloud_name', 'duoy1cje9'), 'Public cloud identifier')}
                                    ${this.inputField('cloudinary_api_key', 'API Key', this.getValue('cloudinary_api_key', ''), 'Keep secure')}
                                    ${this.inputField('cloudinary_upload_preset', 'Upload Preset', this.getValue('cloudinary_upload_preset', ''), 'Unsigned upload preset')}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-robot text-brand-blue mr-1"></i>AI Chatbot (OpenRouter)</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.inputField('openrouter_api_key', 'OpenRouter API Key', this.getValue('openrouter_api_key', ''), 'Keep highly secure', 'password')}
                                    ${this.inputField('openrouter_model', 'Preferred Model', this.getValue('openrouter_model', 'openai/gpt-4o'), 'e.g., openai/gpt-4o')}
                                    ${this.textareaField('chatbot_system_prompt', 'Chatbot System Prompt', this.getValue('chatbot_system_prompt', 'You are the AI Assistant for Rotaract Club of Coimbatore Unity. You know about Rotary, Rotaract, District 3206, RSAMDIO, End Polio, and general knowledge. Reply concisely and professionally without emojis.'), '', 4)}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl ap-tint-box">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-solid fa-database text-brand-blue mr-1"></i>Supabase Backend</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.inputField('supabase_url', 'Supabase Project URL', this.getValue('supabase_url', ''), 'Read-only; configure in config file')}
                                    ${this.inputField('supabase_bucket_events', 'Events/Posters Bucket Name', this.getValue('supabase_bucket_events', 'events'), 'Default: events (50MB limit)')}
                                    ${this.inputField('supabase_bucket_reports', 'Reports Bucket Name', this.getValue('supabase_bucket_reports', 'reports'), 'Default: reports (50MB limit)')}
                                    ${this.inputField('supabase_bucket_bulletins', 'Bulletins Bucket Name', this.getValue('supabase_bucket_bulletins', 'bulletins'), 'Default: bulletins')}
                                </div>
                            </div>

                            <div class="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15">
                                <h4 class="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3"><i class="fa-brands fa-whatsapp text-rose-500 mr-1"></i>WhatsApp Blood Desk Alerts</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    ${this.inputField('whatsapp_country_code', 'Country Code', this.getValue('whatsapp_country_code', '+91'), 'Prefix for all WhatsApp sends')}
                                    ${this.toggleField('whatsapp_enabled', 'Enable WhatsApp Trigger', this.getValue('whatsapp_enabled', 'true'))}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },

            // =========================================
            // TAB 11: RESET DATA  (Super Admin only)
            //   Wipes working data, never touches Site Settings.
            // =========================================
            RESET_GROUPS: [
                { id: 'events',   icon: 'fa-calendar-days', label: 'Projects & events', desc: 'All projects, approvals, reports and event photos.', tables: ['event_photos', 'events'] },
                { id: 'meetings', icon: 'fa-people-group',  label: 'Meetings', desc: 'All meetings and attendance records.', tables: ['meeting_attendance', 'meetings'] },
                { id: 'treasury', icon: 'fa-wallet',        label: 'Treasury', desc: 'Every income / expense transaction.', tables: ['treasury'] },
                { id: 'people',   icon: 'fa-users',         label: 'Members & admin-added people', desc: 'Every user added by an admin (the Super Admin account is always kept), membership applications, trainers, past presidents / secretaries.', tables: ['membership_applications', 'club_trainers', 'past_presidents', 'past_secretaries', 'users'] },
                { id: 'content',  icon: 'fa-newspaper',     label: 'Admin-added content', desc: 'Bulletins, blood requests and joining benefits.', tables: ['bulletins', 'blood_requests', 'joining_benefits'] },
                { id: 'logs',     icon: 'fa-clock-rotate-left', label: 'Logs & queues', desc: 'Email log / queue, activity log, upload log, resource monitor.', tables: ['email_queue', 'email_log', 'activity_log', 'upload_log', 'resource_monitor'] }
            ],
            RESET_KEPT: ['system_settings', 'website_sections', 'club_year_config', 'club_statistics', 'storage_providers', 'chatbot_knowledge', 'avenues'],

            renderResetTab() {
                if (window.AuthManager?.currentUser?.role !== 'super_admin') return AdminPanel.renderUnauthorized();
                const groups = this.RESET_GROUPS.map(g => `
                    <label class="reset-group">
                        <input type="checkbox" class="reset-check" value="${g.id}" checked>
                        <span class="reset-ico"><i class="fa-solid ${g.icon}"></i></span>
                        <span class="reset-txt"><b>${g.label}</b><small>${g.desc}</small></span>
                    </label>`).join('');
                return `
                    <div class="settings-section-card reset-zone">
                        <div class="section-sticky-header">
                            <div>
                                <h3 class="text-sm font-black text-red-600"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Reset Data — Danger Zone</h3>
                                <p class="text-[11px] text-slate-500 mt-1">Permanently erases the data below and returns the portal to a clean start. <b>Site Settings are never touched.</b> This cannot be undone.</p>
                            </div>
                        </div>
                        <div class="reset-grid">${groups}</div>
                        <div class="reset-kept">
                            <i class="fa-solid fa-shield-halved"></i>
                            <span><b>Always kept:</b> site settings (identity, branding, contact, automation, access, officers, website, integrations, live-impact stats), website sections, club year configuration, storage providers, chatbot knowledge, avenues and your Super Admin account.</span>
                        </div>
                        <div class="reset-confirm">
                            <label class="text-[11px] font-bold text-slate-600 dark:text-slate-300">Type <code>RESET</code> to unlock the button</label>
                            <input id="reset-confirm-input" class="settings-input" autocomplete="off" placeholder="RESET" oninput="AdminPanel.modules.settings.onResetInput(this)">
                            <button id="reset-run-btn" class="btn-danger" disabled onclick="AdminPanel.modules.settings.runReset(this)"><i class="fa-solid fa-trash-can mr-1"></i> Erase selected data</button>
                        </div>
                        <div id="reset-report" class="reset-report"></div>
                    </div>`;
            },

            onResetInput(input) {
                const btn = document.getElementById('reset-run-btn');
                if (btn) btn.disabled = String(input.value).trim() !== 'RESET';
            },

            async wipeTable(table) {
                const db = window.DB_ADMIN;
                // Delete every row. Try the usual primary keys in turn so tables with no "id" column still clear.
                const filters = [q => q.not('id', 'is', null), q => q.not('created_at', 'is', null), q => q.not('key', 'is', null)];
                let lastErr = null;
                for (const f of filters) {
                    let q = db.from(table).delete({ count: 'exact' });
                    if (table === 'users') q = q.neq('role', 'super_admin');
                    const { error, count } = await f(q);
                    if (!error) return { ok: true, count: count ?? 0 };
                    lastErr = error;
                    if (!/column|does not exist|42703|PGRST204/i.test((error.message || '') + (error.code || ''))) break;
                }
                // A table that doesn't exist yet is not a failure.
                if (lastErr && /does not exist|42P01|PGRST205|schema cache/i.test((lastErr.message || '') + (lastErr.code || ''))) return { ok: true, count: 0, missing: true };
                return { ok: false, error: lastErr?.message || 'unknown error' };
            },

            async runReset(btn) {
                const user = window.AuthManager?.currentUser;
                if (!user || user.role !== 'super_admin') { window.AppToast?.error('Only the Super Admin can reset data.'); return; }
                const input = document.getElementById('reset-confirm-input');
                if (!input || input.value.trim() !== 'RESET') return;
                const chosen = [...document.querySelectorAll('.reset-check:checked')].map(c => c.value);
                if (!chosen.length) { window.AppToast?.warning('Select at least one data group.'); return; }
                const names = this.RESET_GROUPS.filter(g => chosen.includes(g.id)).map(g => g.label).join(', ');
                if (!confirm('LAST WARNING\n\nErase: ' + names + '\n\nThis permanently deletes the data and cannot be undone. Continue?')) return;

                btn.disabled = true;
                const report = document.getElementById('reset-report');
                const lines = [];
                const paint = () => { if (report) report.innerHTML = lines.join(''); };
                let failures = 0;
                const done = {};
                for (const g of this.RESET_GROUPS.filter(x => chosen.includes(x.id))) {
                    for (const t of g.tables) {
                        lines.push(`<div class="reset-line"><i class="fa-solid fa-spinner fa-spin"></i> Clearing <b>${t}</b>…</div>`); paint();
                        const r = await this.wipeTable(t);
                        lines.pop();
                        if (r.ok) { done[t] = r.count; lines.push(`<div class="reset-line ok"><i class="fa-solid fa-circle-check"></i> <b>${t}</b> — ${r.missing ? 'table not found (skipped)' : r.count + ' row(s) removed'}</div>`); }
                        else { failures++; lines.push(`<div class="reset-line bad"><i class="fa-solid fa-circle-xmark"></i> <b>${t}</b> — ${AdminPanel.esc(r.error)}</div>`); }
                        paint();
                    }
                }
                // Local copies (treasury cache, game scores etc.) — site-setting caches are kept.
                try {
                    const keep = /settings|theme|dark|session|auth|player_name/i;
                    Object.keys(localStorage).filter(k => k.startsWith('unity_') && !keep.test(k)).forEach(k => localStorage.removeItem(k));
                } catch (e) { /* silent */ }
                try { window.UnityStats?.invalidate?.(); } catch (e) { /* silent */ }

                // One audit entry so the reset itself is traceable.
                try { await AdminPanel.logActivity('DATA_RESET', 'system', null, { groups: chosen, rows: done, failures }); } catch (e) { /* silent */ }

                lines.push(failures
                    ? `<div class="reset-line bad"><b>Finished with ${failures} problem(s).</b> Check that your Supabase policy allows deleting from the tables above, then run it again.</div>`
                    : `<div class="reset-line ok"><b>Reset complete.</b> Site settings were left untouched. Reloading the portal…</div>`);
                paint();
                window.AppToast?.[failures ? 'warning' : 'success'](failures ? 'Reset finished with errors.' : 'All selected data erased.');
                input.value = '';
                if (!failures) setTimeout(() => location.reload(), 2200); else btn.disabled = false;
            },

            // =========================================
            // TAB 10: ADVANCED / RAW SETTINGS
            // =========================================
            async renderAdvancedTab() {
                // Load full raw dump
                try {
                    const { data } = await window.DB_ADMIN.from('system_settings').select('*').order('key');
                    const rows = (data || []).map(s => `
                        <tr>
                            <td class="py-2 px-3 text-[11px] font-mono font-bold text-brand-blue">${AdminPanel.esc(s.key)}</td>
                            <td class="py-2 px-3"><input type="text" class="settings-input text-[11px]" value="${AdminPanel.esc(s.value || '')}" onchange="AdminPanel.modules.settings.saveSingleKey('${s.key}', this.value)"></td>
                            <td class="py-2 px-3 text-[10px] text-slate-500">${AdminPanel.esc(s.description || '')}</td>
                            <td class="py-2 px-3 text-center"><button class="btn-danger btn-xs" onclick="AdminPanel.modules.settings.deleteKey('${s.key}')"><i class="fa-solid fa-trash"></i></button></td>
                        </tr>
                    `).join('');

                    return `
                        <div class="settings-section-card">
                            <div class="section-sticky-header">
                                <div><h3 class="text-sm font-black text-slate-800 dark:text-slate-100"><i class="fa-solid fa-code text-brand-blue mr-2"></i>Advanced — Raw Database Keys</h3><p class="text-[11px] text-slate-500 mt-1">Direct database access to every setting (use with caution)</p></div>
                                <button class="btn-primary btn-sm" onclick="AdminPanel.modules.settings.addNewKey()"><i class="fa-solid fa-plus mr-1"></i>Add New Key</button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead><tr class="border-b border-slate-200/40 dark:border-white/[0.08]"><th class="py-3 px-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Key</th><th class="py-3 px-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Value</th><th class="py-3 px-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">Description</th><th class="py-3 px-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">Action</th></tr></thead>
                                    <tbody class="divide-y divide-slate-200/30 dark:divide-white/[0.04]">${rows || '<tr><td colspan="4" class="py-6 text-center text-xs text-slate-400">No settings in database.</td></tr>'}</tbody>
                                </table>
                            </div>
                        </div>
                    `;
                } catch (e) {
                    return `<div class="settings-section-card text-xs text-red-500">Load failed: ${AdminPanel.esc(e.message)}</div>`;
                }
            },

            // =========================================
            // HELPER FIELD RENDERERS
            // =========================================
            inputField(name, label, value, hint = '', type = 'text', required = false) {
                return `
                    <div>
                        <label class="settings-label">${label} ${required ? '<span class="text-red-500">*</span>' : ''}</label>
                        <input type="${type}" name="${name}" class="settings-input" value="${AdminPanel.esc(value)}" ${required ? 'required' : ''}>
                        ${hint ? `<p class="settings-hint">${hint}</p>` : ''}
                    </div>
                `;
            },

            textareaField(name, label, value, hint = '', rows = 3) {
                return `
                    <div class="md:col-span-2">
                        <label class="settings-label">${label}</label>
                        <textarea name="${name}" rows="${rows}" class="settings-input" style="resize:vertical;">${AdminPanel.esc(value)}</textarea>
                        ${hint ? `<p class="settings-hint">${hint}</p>` : ''}
                    </div>
                `;
            },

            colorField(name, label, value) {
                const v = AdminPanel.esc(value);
                return `
                    <div>
                        <label class="settings-label">${label}</label>
                        <div class="flex items-center gap-2">
                            <input type="color" name="${name}" value="${v}" class="color-swatch" style="background:${v}" oninput="this.style.background=this.value;this.nextElementSibling.value=this.value">
                            <input type="text" name="${name}__hex" class="settings-input text-[11px] font-mono" value="${v}" oninput="if(/^#[0-9a-fA-F]{6}$/.test(this.value)){this.previousElementSibling.value=this.value;this.previousElementSibling.style.background=this.value;}">
                        </div>
                    </div>
                `;
            },

            toggleField(name, label, value) {
                const checked = (value === 'true' || value === true);
                return `
                    <div class="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-slate-800/30 border border-slate-200/40 dark:border-white/[0.06]">
                        <label class="text-xs font-bold">${label}</label>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="${name}" ${checked ? 'checked' : ''} class="sr-only peer">
                            <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                        </label>
                    </div>
                `;
            },

            // =========================================
            // SAVE OPERATIONS
            // =========================================
            // system_settings.category is NOT NULL, so every upsert must carry it.
            // Existing rows keep their category/data_type; new keys get the tab name.
            async buildRows(items, defaultCategory) {
                const { data: existing, error } = await window.DB_ADMIN
                    .from('system_settings').select('key, category, data_type');
                if (error) throw error;
                const have = new Map((existing || []).map(r => [r.key, r]));
                const now = new Date().toISOString();
                return items.map(it => {
                    const prev = have.get(it.key);
                    return {
                        key: it.key,
                        value: it.value,
                        category: (prev && prev.category) || it.category || defaultCategory || 'general',
                        data_type: (prev && prev.data_type) || it.data_type || 'text',
                        updated_at: now
                    };
                });
            },

            async saveTab(tabId, btn) {
                // Guaranteed feedback - never rely on AppToast being present.
                const say = (type, msg) => {
                    const t = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
                    if (window.AppToast && typeof window.AppToast[t] === 'function') { window.AppToast[t](msg); return; }
                    console[t === 'error' ? 'error' : 'log']('[settings:' + t + '] ' + msg);
                    let host = document.getElementById('settings-toast-host');
                    if (!host) {
                        host = document.createElement('div');
                        host.id = 'settings-toast-host';
                        host.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:100000;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
                        document.body.appendChild(host);
                    }
                    const box = document.createElement('div');
                    const color = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#2563eb' }[t];
                    box.style.cssText = 'background:' + color + ';color:#fff;padding:10px 14px;border-radius:10px;font-size:12px;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,.25);max-width:340px;';
                    box.textContent = msg;
                    host.appendChild(box);
                    setTimeout(() => box.remove(), 3400);
                };

                if (this._saving) return;                       // ignore double-clicks
                const scope = document.getElementById('settings-tab-content') || document.getElementById('settings-form-' + tabId);
                if (!scope) { say('warning', 'Settings form not found.'); return; }
                if (!window.DB_ADMIN) { say('error', 'Database client (DB_ADMIN) is not available.'); return; }

                // Collect every field in the active tab.
                const map = new Map();
                const boolKeys = new Set();
                scope.querySelectorAll('input[name], textarea[name], select[name]').forEach(input => {
                    const name = input.getAttribute('name');
                    if (!name) return;
                    if (name.endsWith('__hex')) {               // colour helper twin: feed the swatch key
                        const base = name.slice(0, -5);
                        const swatch = scope.querySelector('input[type="color"][name="' + base + '"]');
                        if (swatch) {
                            const hex = String(input.value).trim();
                            map.set(base, /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : swatch.value);
                        }
                        return;
                    }
                    if (input.type === 'checkbox') { map.set(name, input.checked ? 'true' : 'false'); boolKeys.add(name); return; }
                    if (input.type === 'radio') { if (input.checked) map.set(name, input.value); return; }
                    if (!map.has(name)) map.set(name, String(input.value));
                });

                const payload = [...map.entries()].map(([key, value]) => ({ key, value, data_type: boolKeys.has(key) ? 'boolean' : 'text' }));
                if (!payload.length) { say('warning', 'Nothing to save in this tab.'); return; }

                if (tabId === 'stats') {
                    const bad = this.statDefs().find(d => map.get('stat_' + d.key + '_mode') === 'manual' && !(parseFloat(map.get('stat_' + d.key + '_manual')) >= 0));
                    if (bad) { say('warning', 'Enter a manual value for "' + bad.label + '" or switch it back to Auto-calculate.'); return; }
                }

                // Loading state on the clicked button.
                this._saving = true;
                const originalHtml = btn ? btn.innerHTML : '';
                if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Saving...'; }

                try {
                    // One batched upsert; .select() lets us confirm rows were really written
                    // (row-level-security can otherwise fail silently).
                    const rows = await this.buildRows(payload, tabId);
                    const { data: written, error } = await window.DB_ADMIN
                        .from('system_settings')
                        .upsert(rows, { onConflict: 'key' })
                        .select('key');
                    if (error) throw error;
                    if (!written || written.length === 0) {
                        throw new Error('Database accepted the request but saved 0 rows. Check the table permissions for system_settings.');
                    }

                    // Refresh local cache from the database.
                    const { data } = await window.DB_ADMIN.from('system_settings').select('*');
                    this.settingsCache = {};
                    (data || []).forEach(s => { this.settingsCache[s.key] = s.value; });

                    say('success', written.length + ' settings saved.');
                    try { window.UnityStats?.invalidate?.(); window.AppCache?.remove?.('site_settings'); await window.SiteConfig?.refresh?.(); window.SiteConfig?.notify?.(); } catch (e) {}
                    if (tabId === 'stats') this.updateStatsPreview();
                    try { AdminPanel.logActivity('SETTINGS_UPDATE', 'settings', null, { tab: tabId, count: written.length }); } catch (e) {}
                    if (['identity', 'branding', 'website', 'contact', 'stats', 'officers', 'integrations'].includes(tabId)) say('info', 'Applied to the live site.');
                } catch (e) {
                    console.error('[settings] save failed:', e);
                    say('error', 'Save failed: ' + (e && e.message ? e.message : e));
                } finally {
                    this._saving = false;
                    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
                }
            },

            async saveSingleKey(key, value) {
                try {
                    const rows = await this.buildRows([{ key, value: String(value) }], 'general');
                    const { error } = await window.DB_ADMIN.from('system_settings').upsert(rows, { onConflict: 'key' });
                    if (error) throw error;
                    window.AppToast?.success(`${key} saved.`);
                    try { window.AppCache?.remove?.('site_settings'); await window.SiteConfig?.refresh?.(); window.SiteConfig?.notify?.(); } catch (e) {}
                    AdminPanel.logActivity('SETTINGS_UPDATE', 'settings', null, { key });
                } catch (e) {
                    window.AppToast?.error('Save failed: ' + e.message);
                }
            },

            async deleteKey(key) {
                if (!confirm(`Delete the setting "${key}"? This may break site functionality.`)) return;
                try {
                    const { error: delErr } = await window.DB_ADMIN.from('system_settings').delete().eq('key', key);
                    if (delErr) throw delErr;
                    window.AppToast?.success('Deleted.');
                    try { window.AppCache?.remove?.('site_settings'); await window.SiteConfig?.refresh?.(); window.SiteConfig?.notify?.(); } catch (e) {}
                    await this.render(AdminPanel.workspace);
                } catch (e) { window.AppToast?.error('Delete failed'); }
            },

            addNewKey() {
                AdminPanel.createModal({
                    title: 'Add New Setting Key',
                    size: 'small',
                    icon: 'plus',
                    body: `
                        <form id="new-key-form" onsubmit="return false;" class="space-y-4">
                            <div><label class="settings-label">Key Name <span class="text-red-500">*</span></label><input type="text" name="key" required class="settings-input" placeholder="e.g., my_custom_key"><p class="settings-hint">Use snake_case, lowercase. No spaces.</p></div>
                            <div><label class="settings-label">Value</label><textarea name="value" rows="3" class="settings-input"></textarea></div>
                            <div><label class="settings-label">Description</label><input type="text" name="description" class="settings-input" placeholder="What is this setting for?"></div>
                        </form>
                    `,
                    footer: `
                        <button class="btn-secondary" onclick="AdminPanel.closeModal()">Cancel</button>
                        <button class="btn-primary" onclick="AdminPanel.modules.settings.saveNewKey()"><i class="fa-solid fa-save mr-1"></i>Create</button>
                    `
                });
            },

            async saveNewKey() {
                const form = document.getElementById('new-key-form');
                if (!form) return;
                const fd = new FormData(form);
                const key = fd.get('key')?.trim();
                if (!key) { window.AppToast?.warning('Key required'); return; }
                try {
                    const { error: insErr } = await window.DB_ADMIN.from('system_settings').insert({ key, value: fd.get('value') || '', description: fd.get('description') || '', category: 'custom', data_type: 'text' });
                    if (insErr) throw insErr;
                    window.AppToast?.success('Setting created.');
                    try { await window.SiteConfig?.refresh?.(); window.SiteConfig?.notify?.(); } catch (e) {}
                    AdminPanel.closeModal();
                    await this.render(AdminPanel.workspace);
                } catch (e) { window.AppToast?.error('Failed: ' + e.message); }
            },

            // =========================================
            // IMPORT / EXPORT
            // =========================================
            async exportSettings() {
                try {
                    const { data } = await window.DB_ADMIN.from('system_settings').select('*').order('key');
                    const json = JSON.stringify(data, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `unity_settings_backup_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    window.AppToast?.success('Settings exported.');
                } catch (e) { window.AppToast?.error('Export failed'); }
            },

            importSettings() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (!confirm(`Import "${file.name}"? This will overwrite existing settings with matching keys.`)) return;
                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        if (!Array.isArray(data)) throw new Error('Invalid format');
                        for (const item of data) {
                            if (!item.key) continue;
                            const rows = await this.buildRows([{ key: item.key, value: item.value || '', category: item.category, data_type: item.data_type }], 'general');
                            if (item.description) rows[0].description = item.description;
                            const { error: impErr } = await window.DB_ADMIN.from('system_settings').upsert(rows, { onConflict: 'key' });
                            if (impErr) throw impErr;
                        }
                        window.AppToast?.success(`${data.length} settings imported.`);
                        try { await window.SiteConfig?.refresh?.(); window.SiteConfig?.notify?.(); } catch (e) {}
                        await this.render(AdminPanel.workspace);
                    } catch (e) { window.AppToast?.error('Import failed: ' + e.message); }
                };
                input.click();
            }
        },

        // ==========================================
        // TREASURY MODULE
        // ==========================================
        treasury: {
            async render(workspace) {
                try {
                    const { data: txs } = await window.DB_ADMIN.from('treasury').select('*').order('transaction_date', { ascending: false }).limit(50);
                    workspace.innerHTML = `
                        <div class="p-6 lg:p-10">
                            <div class="admin-page-header">
                                <div>
                                    <div class="admin-breadcrumb"><i class="fa-solid fa-house text-brand-blue"></i> <span>/</span> <span>Treasury</span></div>
                                    <h1 class="admin-page-title">Financial Ledger</h1>
                                </div>
                            </div>
                            <div class="admin-panel">
                                <div class="admin-panel-body p-0">
                                    <div class="overflow-x-auto">
                                        <table class="admin-data-table">
                                            <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Category</th></tr></thead>
                                            <tbody>
                                                ${(!txs || txs.length === 0) ? '<tr><td colspan="5" class="text-center py-8 text-slate-400">No transactions.</td></tr>' : txs.map(t => `
                                                    <tr>
                                                        <td class="text-xs">${AdminPanel.fmtDate(t.transaction_date)}</td>
                                                        <td class="text-xs font-bold">${AdminPanel.esc(t.particular || t.description || '')}</td>
                                                        <td><span class="badge ${parseFloat(t.income) > 0 ? 'badge-green' : 'badge-red'}">${parseFloat(t.income) > 0 ? 'income' : 'expense'}</span></td>
                                                        <td class="text-xs font-black font-mono ${parseFloat(t.income) > 0 ? 'text-green-600' : 'text-red-600'}">INR ${parseFloat(parseFloat(t.income) > 0 ? t.income : t.expense || 0).toLocaleString()}</td>
                                                        <td class="text-xs text-slate-500">${AdminPanel.esc(t.category || 'General')}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } catch (e) { workspace.innerHTML = AdminPanel.renderError(e.message); }
            }
        }
    };

    window.AdminPanel = AdminPanel;

    window.addEventListener('beforeunload', () => {
        AdminPanel.realtimeSubscriptions.forEach(sub => { try { window.DB_ADMIN?.removeChannel(sub); } catch (e) {} });
    });
})();
