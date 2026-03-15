import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'super-secret-key-do-not-use-in-prod';
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Interface for user in token
interface JwtPayload {
    username: string;
    ip: string;
    userAgent: string;
}

// Extend Request with user object
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

// Message interface
interface ChatMessage {
    id: string;
    username: string;
    text: string;
    timestamp: string;
}

// Load messages from JSON file on server start
let messages: ChatMessage[] = [];
if (fs.existsSync(MESSAGES_FILE)) {
    try {
        const data = fs.readFileSync(MESSAGES_FILE, 'utf-8');
        messages = JSON.parse(data);
    } catch (err) {
        console.error('Error loading messages.json', err);
    }
}

// Function to save messages to JSON file
function saveMessages() {
    fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), (err) => {
        if (err) console.error('Error saving to messages.json', err);
    });
}

// --- Middlewares ---

// 1. Logger
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Parse JSON
app.use(express.json());
// Serve static files
app.use(express.static(__dirname));

// 2. Auth Middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Brak tokenu lub nieprawidłowy format' });
        return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Brak tokenu' });
        return;
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload;
        
        // Fingerprinting verification
        const currentIp = req.ip || req.socket.remoteAddress || 'unknown';
        const currentUserAgent = req.headers['user-agent'] || 'unknown';

        if (decoded.ip !== currentIp || decoded.userAgent !== currentUserAgent) {
            console.warn(`Attempt to use token from different environment (Username: ${decoded.username})`);
            res.status(403).json({ error: 'Sesja wygasła - naruszenie bezpieczeństwa' });
            return;
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
        return;
    }
};

// --- REST API Endpoints ---

// POST /login
app.post('/api/login', (req: Request, res: Response): void => {
    const { username } = req.body;
    
    if (!username || typeof username !== 'string' || username.trim() === '') {
        res.status(400).json({ error: 'Podaj poprawną nazwę użytkownika' });
        return;
    }

    // Add fingerprinting elements to token
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const payload: JwtPayload = { username: username.trim(), ip, userAgent };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '2h' });

    res.json({ token, username: payload.username });
});

// GET /messages (protected)
app.get('/api/messages', authMiddleware, (req: Request, res: Response) => {
    res.json(messages);
});

// POST /messages (protected)
app.post('/api/messages', authMiddleware, (req: Request, res: Response): void => {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
        res.status(400).json({ error: 'Wiadomość nie może być pusta' });
        return;
    }

    const username = req.user?.username || 'Unknown';
    
    const newMessage: ChatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        username,
        text: text.trim(),
        timestamp: new Date().toISOString()
    };

    messages.push(newMessage);
    saveMessages();
    
    // Broadcast message after REST API Call
    io.emit('chat message', newMessage);

    res.status(201).json(newMessage);
});

// Fallback to index.html
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Socket.IO ---
io.on('connection', (socket) => {
    console.log('New user connected via Socket.IO:', socket.id);

    socket.on('send message', (data: { token: string, text: string }) => {
        try {
            const decoded = jwt.verify(data.token, SECRET_KEY) as JwtPayload;
            
            const newMessage: ChatMessage = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                username: decoded.username,
                text: data.text.trim(),
                timestamp: new Date().toISOString()
            };

            messages.push(newMessage);
            saveMessages();
            
            io.emit('chat message', newMessage);
        } catch (err) {
            console.error('Socket.IO token auth error:', err);
            socket.emit('auth error', { error: 'Nieprawidłowy token dla wiadomości Socket.IO' });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// --- Start server ---
server.listen(PORT, () => {
    console.log(`Chat server running on http://localhost:${PORT}`);
});

export default app;