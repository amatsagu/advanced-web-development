// Declaration for global io object from socket.io
declare const io: any;

interface ChatMessage {
    id: string;
    username: string;
    text: string;
    timestamp: string;
}

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements references
    const loginContainer = document.getElementById('login-container') as HTMLDivElement;
    const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
    const loginError = document.getElementById('login-error') as HTMLDivElement;
    
    const messagesList = document.getElementById('messages-list') as HTMLDivElement;
    const chatForm = document.getElementById('chat-form') as HTMLFormElement;
    const messageInput = document.getElementById('message-input') as HTMLInputElement;
    const endpointDisplay = document.getElementById('endpoint-display') as HTMLDivElement;
    const currentUserDisplay = document.getElementById('current-user-display') as HTMLSpanElement;
    const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;

    let socket: any = null;
    let currentUsername = '';
    let authToken = localStorage.getItem('chat_token');

    // Helper function: update endpoint display
    const updateEndpointDisplay = (method: string, url: string) => {
        endpointDisplay.textContent = `Ostatnie żądanie: ${method} ${url}`;
    };

    // Handle login
    const handleLogin = async () => {
        const username = usernameInput.value.trim();
        if (!username) {
            loginError.textContent = 'Proszę podać nazwę użytkownika.';
            return;
        }

        loginBtn.disabled = true;
        loginError.textContent = '';

        try {
            updateEndpointDisplay('POST', '/api/login');
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Błąd logowania');
            }

            // Save token
            authToken = data.token;
            localStorage.setItem('chat_token', data.token);
            currentUsername = data.username;
            
            showChat();
        } catch (err: any) {
            loginError.textContent = err.message;
        } finally {
            loginBtn.disabled = false;
        }
    };

    loginBtn.addEventListener('click', handleLogin);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Handle logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('chat_token');
        authToken = null;
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        showLogin();
    });

    // Show chat and fetch messages
    const showChat = async () => {
        loginContainer.style.display = 'none';
        chatContainer.style.display = 'flex';
        chatContainer.style.flexDirection = 'column'; // for mobile flex fixes
        
        currentUserDisplay.textContent = `Zalogowany jako: ${currentUsername}`;
        messagesList.innerHTML = ''; // clear list

        await fetchMessages();
        connectSocket();
    };

    // Show login
    const showLogin = () => {
        loginContainer.style.display = 'block';
        chatContainer.style.display = 'none';
        usernameInput.value = '';
    };

    // Fetch message history
    const fetchMessages = async () => {
        if (!authToken) return;

        try {
            updateEndpointDisplay('GET', '/api/messages');
            const res = await fetch('/api/messages', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error('Sesja wygasła');
                }
                throw new Error('Błąd pobierania wiadomości');
            }

            const messages: ChatMessage[] = await res.json();
            messages.forEach(renderMessage);
            scrollToBottom();
        } catch (err: any) {
            console.error(err);
            alert(err.message);
            logoutBtn.click(); // Auto logout on auth error
        }
    };

    // Connect to Socket.IO
    const connectSocket = () => {
        if (socket) return;

        // Initialize Socket.IO client from default object built into HTML
        socket = io();

        socket.on('connect', () => {
            console.log('Connected to Socket.IO');
        });

        socket.on('chat message', (msg: ChatMessage) => {
            renderMessage(msg);
            scrollToBottom();
        });

        socket.on('auth error', (data: any) => {
            console.error('Socket.IO Auth Error:', data.error);
        });
    };

    // Send new message
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text || !authToken) return;

        messageInput.disabled = true;

        try {
            updateEndpointDisplay('POST', '/api/messages');
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ text })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Błąd wysyłania');
            }

            messageInput.value = '';
            // Message will come back through Socket.IO 'chat message' event
        } catch (err: any) {
            console.error(err);
            alert('Nie udało się wysłać wiadomości: ' + err.message);
        } finally {
            messageInput.disabled = false;
            messageInput.focus();
        }
    });

    // Render message in UI
    const renderMessage = (msg: ChatMessage) => {
        // Protection against double rendering
        if (document.getElementById(`msg-${msg.id}`)) return;

        const msgDiv = document.createElement('div');
        msgDiv.id = `msg-${msg.id}`;
        
        const isOwnMessage = msg.username === currentUsername;
        msgDiv.className = `message ${isOwnMessage ? 'message-own' : 'message-other'}`;

        const timeString = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = `
            <div class="message-header">${msg.username} • ${timeString}</div>
            <div class="message-bubble">${escapeHTML(msg.text)}</div>
        `;

        messagesList.appendChild(msgDiv);
    };

    const scrollToBottom = () => {
        messagesList.scrollTop = messagesList.scrollHeight;
    };

    // Simple function to escape HTML characters (XSS protection)
    const escapeHTML = (str: string) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    // State initialization
    if (authToken) {
        localStorage.removeItem('chat_token');
        authToken = null;
    }
    
    showLogin();
});