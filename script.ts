interface Task {
    id?: number;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'done';
    created_at?: string;
    localId?: string; // For offline synchronization
    synced?: boolean;
}

const DB_NAME = 'CanvaBoardDB';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
            }
        };

        request.onsuccess = (event: any) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event: any) => {
            reject(event.target.error);
        };
    });
};

const networkStatus = document.getElementById('network-status')!;
const syncBtn = document.getElementById('sync-btn')! as HTMLButtonElement;
const addTaskForm = document.getElementById('add-task-form')! as HTMLFormElement;
const todoList = document.getElementById('todo-list')!;
const inProgressList = document.getElementById('in-progress-list')!;
const doneList = document.getElementById('done-list')!;

let isOnline = navigator.onLine;

const updateNetworkUI = () => {
    isOnline = navigator.onLine;
    if (isOnline) {
        networkStatus.innerText = 'Online';
        networkStatus.classList.remove('offline');
        networkStatus.classList.add('online');
        checkForUnsyncedTasks();
    } else {
        networkStatus.innerText = 'Offline';
        networkStatus.classList.remove('online');
        networkStatus.classList.add('offline');
        syncBtn.style.display = 'none';
    }
};

window.addEventListener('online', updateNetworkUI);
window.addEventListener('offline', updateNetworkUI);

const checkForUnsyncedTasks = async () => {
    const tasks = await getAllLocalTasks();
    const unsynced = tasks.filter(t => !t.synced);
    if (unsynced.length > 0 && isOnline) {
        syncBtn.style.display = 'block';
    } else {
        syncBtn.style.display = 'none';
    }
};

const saveLocalTask = (task: Task): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(task);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const getAllLocalTasks = (): Promise<Task[]> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const clearLocalTasks = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const removeLocalTask = (localId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(localId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const fetchAndCacheTasks = async () => {
    if (!isOnline) {
        renderTasks(await getAllLocalTasks());
        return;
    }

    try {
        const response = await fetch('/api/tasks');
        const tasks: Task[] = await response.json();
        
        // Before clearing, keep unsynced tasks
        const localTasks = await getAllLocalTasks();
        const unsynced = localTasks.filter(t => !t.synced);
        
        await clearLocalTasks();
        
        // Save synced tasks from server
        for (const task of tasks) {
            await saveLocalTask({ ...task, localId: `remote-${task.id}`, synced: true });
        }
        
        // Restore unsynced tasks
        for (const task of unsynced) {
            await saveLocalTask(task);
        }
        
        renderTasks(await getAllLocalTasks());
        checkForUnsyncedTasks();
    } catch (error) {
        console.error('Failed to fetch tasks', error);
        renderTasks(await getAllLocalTasks());
    }
};

const renderTasks = (tasks: Task[]) => {
    todoList.innerHTML = '';
    inProgressList.innerHTML = '';
    doneList.innerHTML = '';

    tasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task-card';
        if (!task.synced) taskEl.style.borderLeft = '4px solid var(--warning-color)';
        
        taskEl.innerHTML = `
            <h4>${task.title}</h4>
            <p>${task.description || ''}</p>
            <div class="task-footer">
                <button class="btn-delete" onclick="deleteTask('${task.localId}', '${task.id || ''}')">Usuń</button>
                ${task.status !== 'todo' ? `<button class="task-status-btn" onclick="updateTaskStatus('${task.localId}', '${task.id || ''}', 'todo')">Do zrobienia</button>` : ''}
                ${task.status !== 'in_progress' ? `<button class="task-status-btn" onclick="updateTaskStatus('${task.localId}', '${task.id || ''}', 'in_progress')">W trakcie</button>` : ''}
                ${task.status !== 'done' ? `<button class="task-status-btn" onclick="updateTaskStatus('${task.localId}', '${task.id || ''}', 'done')">Zrobione</button>` : ''}
            </div>
        `;

        if (task.status === 'todo') todoList.appendChild(taskEl);
        else if (task.status === 'in_progress') inProgressList.appendChild(taskEl);
        else if (task.status === 'done') doneList.appendChild(taskEl);
    });
};

addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = (document.getElementById('task-title') as HTMLInputElement).value;
    const description = (document.getElementById('task-desc') as HTMLTextAreaElement).value;
    
    const newTask: Task = {
        title,
        description,
        status: 'todo',
        localId: Date.now().toString(),
        synced: false
    };

    if (isOnline) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, status: 'todo' })
            });
            const savedTask = await response.json();
            newTask.id = savedTask.id;
            newTask.synced = true;
            newTask.localId = `remote-${savedTask.id}`;
        } catch (error) {
            console.error('Failed to save to server, saving locally', error);
        }
    }

    await saveLocalTask(newTask);
    addTaskForm.reset();
    fetchAndCacheTasks();
});

syncBtn.addEventListener('click', async () => {
    const tasks = await getAllLocalTasks();
    const unsynced = tasks.filter(t => !t.synced);
    
    syncBtn.disabled = true;
    syncBtn.innerText = 'Synchronizuję...';

    for (const task of unsynced) {
        try {
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: task.title, 
                    description: task.description, 
                    status: task.status 
                })
            });
        } catch (error) {
            console.error('Failed to sync task', task, error);
        }
    }

    await fetchAndCacheTasks();
    syncBtn.disabled = false;
    syncBtn.innerText = 'Synchronizuj';
});

(window as any).updateTaskStatus = async (localId: string, remoteId: string, newStatus: string) => {
    const tasks = await getAllLocalTasks();
    const task = tasks.find(t => t.localId === localId);
    if (!task) return;

    task.status = newStatus as any;
    
    if (isOnline && remoteId) {
        try {
            await fetch(`/api/tasks/${remoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: task.title, 
                    description: task.description, 
                    status: newStatus 
                })
            });
            task.synced = true;
        } catch (error) {
            task.synced = false;
        }
    } else {
        task.synced = false;
    }

    await saveLocalTask(task);
    fetchAndCacheTasks();
};

(window as any).deleteTask = async (localId: string, remoteId: string) => {
    if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
        if (isOnline && remoteId && !remoteId.startsWith('undefined')) {
            try {
                await fetch(`/api/tasks/${remoteId}`, { method: 'DELETE' });
            } catch (error) {
                console.error('Failed to delete from server', error);
            }
        }
        await removeLocalTask(localId);
        fetchAndCacheTasks();
    }
};

// Initial load
const start = async () => {
    await initDB();
    updateNetworkUI();
    fetchAndCacheTasks();
};

start();
