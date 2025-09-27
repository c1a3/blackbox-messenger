// src/main/resources/static/app.js
'use strict';

// --- STATE ---
let stompClient = null;
let currentUser = null; // { sessionId, displayName }
let activeContact = null; // { sessionId, displayName }
let currentSubscription = null;
let messageStatusSubscription = null;
let historyUpdateSubscription = null;
let destructTimer = 0; // in seconds
const messageTimeouts = new Map(); // messageId -> timeoutId
let lastMessageDate = null; // --- NEW: For date separators

// --- DOM ELEMENTS ---
const authContainer = document.getElementById('auth-container');
const loginFormContainer = document.getElementById('login-form-container');
const signupFormContainer = document.getElementById('signup-form-container');
const signupSuccessContainer = document.getElementById('signup-success-container');
const authLoader = document.getElementById('auth-loader');
const chatContainer = document.getElementById('chat-container');
const chatLoader = document.getElementById('chat-loader');
const emptyChatPlaceholder = document.getElementById('empty-chat-placeholder');


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // --- MODIFIED: Check for existing session ---
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        onLoginSuccess(JSON.parse(savedUser));
    }

    // Auth Form Logic
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form').addEventListener('submit', handleSignUp);
    document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms('signup'); });
    document.getElementById('show-login').addEventListener('click', (e) => { e.preventDefault(); toggleAuthForms('login'); });
    document.getElementById('proceed-to-login-btn').addEventListener('click', () => toggleAuthForms('login'));
    document.getElementById('copy-session-id-btn').addEventListener('click', copySessionId);
    
    // Main App Logic
    document.getElementById('message-form').addEventListener('submit', sendMessage);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('delete-account-btn').addEventListener('click', deleteAccount);
    document.getElementById('logout-btn').addEventListener('click', handleLogout); // --- NEW ---
    document.getElementById('destruct-timer-btn').addEventListener('click', toggleDestructPopup);
    document.getElementById('destruct-timer-popup').addEventListener('click', setDestructTimer);
    
    // Load theme from localStorage
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
});

// --- AUTHENTICATION & SESSION ---
function toggleAuthForms(formToShow) {
    loginFormContainer.classList.add('hidden');
    signupFormContainer.classList.add('hidden');
    signupSuccessContainer.classList.add('hidden');
    
    if (formToShow === 'login') {
        loginFormContainer.classList.remove('hidden');
    } else if (formToShow === 'signup') {
        signupFormContainer.classList.remove('hidden');
    } else if (formToShow === 'success') {
        signupSuccessContainer.classList.remove('hidden');
    }
    document.getElementById('auth-error').textContent = '';
}

async function handleSignUp(event) {
    event.preventDefault();
    const displayName = document.getElementById('signup-display-name').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    
    if (!displayName || !password) {
        showAuthError("Display Name and Password are required.");
        return;
    }

    showLoader(authLoader, true);
    try {
        const response = await fetch('/api/users/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName, password })
        });
        if (response.ok) {
            const newUser = await response.json();
            showSignupSuccess(newUser.sessionId);
        } else {
            const errorMsg = await response.text();
            showAuthError(errorMsg);
        }
    } catch (error) {
        showAuthError("Could not connect to the server.");
    } finally {
        showLoader(authLoader, false);
    }
}

function showSignupSuccess(newSessionId) {
    toggleAuthForms('success');
    document.getElementById('new-session-id-display').textContent = newSessionId;
}

function copySessionId() {
    const sessionId = document.getElementById('new-session-id-display').textContent;
    navigator.clipboard.writeText(sessionId).then(() => {
        const copyBtn = document.getElementById('copy-session-id-btn');
        const originalIcon = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => { copyBtn.innerHTML = originalIcon; }, 2000);
    });
}

async function handleLogin(event) {
    event.preventDefault();
    const sessionId = document.getElementById('login-session-id').value.trim();
    const password = document.getElementById('login-password').value.trim();

    showLoader(authLoader, true);
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, password })
        });
        if (response.ok) {
            const user = await response.json();
            onLoginSuccess(user);
        } else {
            showAuthError("Invalid credentials.");
        }
    } catch (error) {
        showAuthError("Could not connect to the server.");
    } finally {
        showLoader(authLoader, false);
    }
}

function onLoginSuccess(user) {
    currentUser = user;
    sessionStorage.setItem('currentUser', JSON.stringify(user)); // --- MODIFIED ---

    authContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    document.getElementById('current-user-display').textContent = currentUser.displayName;
    document.getElementById('current-user-session-id').textContent = `@${currentUser.sessionId}`;
    connectToWebSocket();
}

function handleLogout() {
    sessionStorage.clear();
    if (stompClient) {
        stompClient.disconnect();
    }
    window.location.reload();
}

function showAuthError(message) {
    document.getElementById('auth-error').textContent = message;
}

// --- WEBSOCKET CONNECTION ---
function connectToWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, (err) => console.error('WS Error:', err));
}

async function onConnected() {
    console.log('Connected via WebSocket!');
    await loadContacts();
    
    messageStatusSubscription = stompClient.subscribe(`/user/${currentUser.sessionId}/queue/status`, onStatusUpdate);
    historyUpdateSubscription = stompClient.subscribe(`/user/${currentUser.sessionId}/queue/history-update`, onHistoryUpdate);
}

// --- CHAT LOGIC ---
async function loadContacts() {
    const response = await fetch(`/api/users/contacts/${currentUser.sessionId}`);
    const contacts = await response.json();
    const contactsUl = document.getElementById('contacts');
    contactsUl.innerHTML = '';
    contacts.forEach(contact => {
        const li = document.createElement('li');
        li.classList.add('contact');
        li.dataset.sessionId = contact.sessionId;
        li.dataset.displayName = contact.displayName;
        li.innerHTML = `<div class="contact-display-name">${contact.displayName}</div>
                        <div class="contact-session-id">@${contact.sessionId}</div>`;
        li.addEventListener('click', () => switchChat(contact));
        contactsUl.appendChild(li);
    });
}

async function switchChat(contact) {
    if (activeContact?.sessionId === contact.sessionId) return;
    
    lastMessageDate = null; // --- NEW: Reset date for new chat
    activeContact = contact;
    document.querySelectorAll('.contact').forEach(c => {
        c.classList.toggle('active', c.dataset.sessionId === contact.sessionId);
    });
    
    document.getElementById('chat-placeholder').classList.add('hidden');
    document.getElementById('active-chat').classList.remove('hidden');
    document.getElementById('active-contact-name').textContent = activeContact.displayName;
    document.getElementById('message-list').innerHTML = '';
    emptyChatPlaceholder.classList.add('hidden');

    if (currentSubscription) {
        currentSubscription.unsubscribe();
    }
    
    showLoader(chatLoader, true);
    const history = await fetchHistory(currentUser.sessionId, activeContact.sessionId);
    showLoader(chatLoader, false);
    
    if (history.length === 0) {
        emptyChatPlaceholder.classList.remove('hidden');
    } else {
        history.forEach(displayMessage);
    }
    
    sendReadReceiptsForActiveChat();
    
    const chatKey = getChatKey(currentUser.sessionId, activeContact.sessionId);
    currentSubscription = stompClient.subscribe(`/topic/chat/${chatKey}`, (payload) => {
        const message = JSON.parse(payload.body);
        emptyChatPlaceholder.classList.add('hidden');
        displayMessage(message);
        sendReadReceiptsForActiveChat();
    });
}

async function fetchHistory(user1, user2) {
    const response = await fetch(`/api/chat/history/${user1}/${user2}`);
    return response.json();
}

function sendMessage(event) {
    event.preventDefault();
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();

    if (content && stompClient && activeContact) {
        const chatMessage = {
            senderId: currentUser.sessionId,
            receiverId: activeContact.sessionId,
            senderDisplayName: currentUser.displayName,
            content: content,
            destructTime: destructTimer > 0 ? new Date(Date.now() + destructTimer * 1000).toISOString() : null
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
        
        destructTimer = 0;
        document.getElementById('destruct-timer-btn').classList.remove('active');
    }
}

// --- MESSAGE DISPLAY & STATUS (MODIFIED for Date Separator) ---
function displayMessage(message) {
    const messageList = document.getElementById('message-list');
    
    if (document.querySelector(`[data-message-id="${message.messageId}"]`)) return;

    // --- NEW: Date Separator Logic ---
    const messageDate = new Date(message.timestamp);
    const messageDateString = messageDate.toDateString();
    
    if (messageDateString !== lastMessageDate) {
        const dateSeparator = document.createElement('div');
        dateSeparator.classList.add('date-separator');
        dateSeparator.textContent = getFormattedDate(messageDate);
        messageList.appendChild(dateSeparator);
        lastMessageDate = messageDateString;
    }

    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.dataset.messageId = message.messageId;
    
    const isSent = message.senderId === currentUser.sessionId;
    bubble.classList.add(isSent ? 'sent' : 'received');

    const formattedTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.innerHTML = `
        <div class="content">${message.content}</div>
        <div class="message-meta">
            <span>${formattedTime}</span>
            ${isSent ? `<span class="status-icon" data-status="${message.status}">${getStatusIcon(message.status)}</span>` : ''}
        </div>
    `;
    messageList.appendChild(bubble);
    messageList.scrollTop = messageList.scrollHeight;
    
    if (message.destructTime) {
        const delay = new Date(message.destructTime).getTime() - Date.now();
        if (delay > 0) {
            const timeoutId = setTimeout(() => { bubble.remove(); }, delay);
            messageTimeouts.set(message.messageId, timeoutId);
        }
    }
}

function getStatusIcon(status) {
    if (status === 'READ') return '<i class="fa-solid fa-check-double read"></i>';
    if (status === 'DELIVERED') return '<i class="fa-solid fa-check-double"></i>';
    return '<i class="fa-solid fa-check"></i>';
}

function onStatusUpdate(payload) {
    const update = JSON.parse(payload.body);
    const messageElement = document.querySelector(`[data-message-id="${update.messageId}"]`);
    if (messageElement) {
        const statusIconEl = messageElement.querySelector('.status-icon');
        statusIconEl.innerHTML = getStatusIcon(update.status);
    }
}

function sendReadReceiptsForActiveChat() {
    if (!activeContact) return;
    
    const chatKey = getChatKey(currentUser.sessionId, activeContact.sessionId);
    document.querySelectorAll('.message-bubble.received').forEach(bubble => {
        const messageId = bubble.dataset.messageId;
        stompClient.send("/app/chat.readReceipt", {}, JSON.stringify({
            messageId: messageId,
            chatKey: chatKey,
            status: 'READ'
        }));
    });
}

async function onHistoryUpdate(payload) {
    const updatedChatKey = payload.body;
    const currentChatKey = getChatKey(currentUser.sessionId, activeContact?.sessionId);
    
    if(updatedChatKey === currentChatKey) {
        document.getElementById('message-list').innerHTML = '';
        lastMessageDate = null; // Reset for refresh
        const history = await fetchHistory(currentUser.sessionId, activeContact.sessionId);
        history.forEach(displayMessage);
    }
}

// --- UTILITY & SETTINGS ---
function getChatKey(user1, user2) {
    return [user1, user2].sort().join('-');
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

async function deleteAccount() {
    if(confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
        await fetch(`/api/users/${currentUser.sessionId}`, { method: 'DELETE' });
        handleLogout();
    }
}

function toggleDestructPopup() {
    document.getElementById('destruct-timer-popup').classList.toggle('hidden');
}

function setDestructTimer(event) {
    if(event.target.tagName === 'BUTTON') {
        destructTimer = parseInt(event.target.dataset.time);
        document.getElementById('destruct-timer-popup').classList.add('hidden');
        document.getElementById('destruct-timer-btn').classList.toggle('active', destructTimer > 0);
    }
}

// --- NEW: Helper Functions ---
function showLoader(loaderElement, show) {
    loaderElement.classList.toggle('hidden', !show);
}

function getFormattedDate(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return date.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
}