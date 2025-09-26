// src/main/resources/static/app.js
'use strict';

// --- STATE ---
let stompClient = null;
let currentUser = null;
let activeContact = null;
let currentSubscription = null;
let messageStatusSubscription = null;
let historyUpdateSubscription = null;
let destructTimer = 0; // in seconds
const messageTimeouts = new Map();

// --- DOM ELEMENTS ---
const authContainer = document.getElementById('auth-container');
const loginFormContainer = document.getElementById('login-form-container');
const signupFormContainer = document.getElementById('signup-form-container');
const signupSuccessContainer = document.getElementById('signup-success-container');
const chatContainer = document.getElementById('chat-container');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
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
    document.getElementById('destruct-timer-btn').addEventListener('click', toggleDestructPopup);
    document.getElementById('destruct-timer-popup').addEventListener('click', setDestructTimer);

    // Load theme from localStorage
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
});

// --- AUTHENTICATION ---
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

// ... (The rest of the app.js file, including handleLogin, onLoginSuccess, connectToWebSocket, chat logic, etc., remains exactly the same as the previous complete response)