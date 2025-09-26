// src/main/resources/static/app.js
'use strict';

// --- DOM Elements ---
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username-input');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const currentUserDisplay = document.getElementById('current-user-display');
const contactList = document.getElementById('contacts');
const chatPlaceholder = document.getElementById('chat-placeholder');
const activeChat = document.getElementById('active-chat');
const activeContactName = document.getElementById('active-contact-name');
const messageList = document.getElementById('message-list');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// --- Application State ---
let stompClient = null;
let currentUser = null;
let activeContact = null;
let currentSubscription = null;
const mockUsers = ['Alice', 'Bob', 'Charlie'];

// --- Event Listeners ---
loginButton.addEventListener('click', login);
messageForm.addEventListener('submit', sendMessage);

/**
 * Handles the login process.
 */
function login() {
    const username = usernameInput.value.trim();
    if (mockUsers.includes(username)) {
        currentUser = username;
        loginContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        currentUserDisplay.textContent = `Logged in as ${currentUser}`;
        initChatUI();
        connect();
    } else {
        loginError.textContent = 'Invalid username. Please use Alice, Bob, or Charlie.';
    }
}

/**
 * Initializes the chat user interface by populating the contact list.
 */
function initChatUI() {
    const otherUsers = mockUsers.filter(user => user !== currentUser);
    contactList.innerHTML = ''; // Clear previous list
    otherUsers.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        li.classList.add('contact');
        li.dataset.username = user;
        li.addEventListener('click', () => switchChat(user));
        contactList.appendChild(li);
    });
}

/**
 * Connects to the WebSocket server using SockJS and STOMP.
 */
function connect() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
}

/**
 * Callback function for successful STOMP connection.
 */
function onConnected() {
    console.log('Connected to WebSocket!');
}

/**
 * Callback function for STOMP connection errors.
 */
function onError(error) {
    console.error('Could not connect to WebSocket server. Please refresh this page to try again!', error);
}

/**
 * Switches the active chat to the selected contact.
 * @param {string} contactName - The name of the contact to switch to.
 */
async function switchChat(contactName) {
    if (activeContact === contactName) return;
    
    activeContact = contactName;

    // Update UI
    document.querySelectorAll('.contact').forEach(contact => {
        contact.classList.toggle('active', contact.dataset.username === activeContact);
    });
    chatPlaceholder.classList.add('hidden');
    activeChat.classList.remove('hidden');
    activeContactName.textContent = activeContact;
    messageList.innerHTML = '';

    // Unsubscribe from the previous topic if it exists
    if (currentSubscription) {
        currentSubscription.unsubscribe();
    }

    // Fetch and display chat history
    await fetchAndDisplayHistory(currentUser, activeContact);

    // Subscribe to the new topic for real-time messages
    const topic = `/topic/chat/${getTopicName(currentUser, activeContact)}`;
    currentSubscription = stompClient.subscribe(topic, onMessageReceived);
}

/**
 * Fetches and displays the chat history between two users.
 * @param {string} user1 - The current user.
 * @param {string} user2 - The selected contact.
 */
async function fetchAndDisplayHistory(user1, user2) {
    try {
        const response = await fetch(`/api/chat/history/${user1}/${user2}`);
        if (response.ok) {
            const messages = await response.json();
            messages.forEach(msg => displayMessage(msg));
        } else {
            console.error('Failed to fetch chat history');
        }
    } catch (error) {
        console.error('Error fetching chat history:', error);
    }
}

/**
 * Handles incoming messages from the STOMP subscription.
 * @param {object} payload - The message payload from the server.
 */
function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    // Only display the message if it's for the currently active chat
    if ( (message.sender === currentUser && message.receiver === activeContact) ||
         (message.sender === activeContact && message.receiver === currentUser) ) {
        displayMessage(message);
    }
}

/**
 * Sends a chat message to the server.
 * @param {Event} event - The form submission event.
 */
function sendMessage(event) {
    event.preventDefault();
    const messageContent = messageInput.value.trim();

    if (messageContent && stompClient && activeContact) {
        const chatMessage = {
            sender: currentUser,
            receiver: activeContact,
            content: messageContent,
            timestamp: new Date().toISOString()
        };

        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        // We don't display the message here. We let the server broadcast it back
        // to ensure all clients (including this one) are in sync.
        messageInput.value = '';
    }
}

/**
 * Creates and appends a message bubble to the chat window.
 * @param {object} message - The message object to display.
 */
function displayMessage(message) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    messageBubble.textContent = message.content;

    if (message.sender === currentUser) {
        messageBubble.classList.add('sent');
    } else {
        messageBubble.classList.add('received');
    }
    
    messageList.appendChild(messageBubble);
    messageList.scrollTop = messageList.scrollHeight; // Auto-scroll to the bottom
}

/**

 * Generates a consistent, order-independent topic name for two users.
 * @param {string} user1 
 * @param {string} user2 
 * @returns {string} The sorted topic name (e.g., "Alice-Bob").
 */
function getTopicName(user1, user2) {
    return [user1, user2].sort().join('-');
}