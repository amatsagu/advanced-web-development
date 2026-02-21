interface Question {
    id: number;
    text: string;
    options: string[];
}

interface BreakdownItem {
    id: number;
    text: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
}

interface SubmitResponse {
    score: number;
    total: number;
    breakdown: BreakdownItem[];
}

const quizContainer = document.getElementById('quiz-container')!;
const questionsList = document.getElementById('questions-list')!;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const timerDisplay = document.getElementById('timer')!;
const resultsContainer = document.getElementById('results')!;
const scoreDisplay = document.getElementById('score-display')!;
const timeTakenDisplay = document.getElementById('time-taken-display')!;
const breakdownDiv = document.getElementById('breakdown')!;

const INITIAL_TIME = 120;
let questions: Question[] = [];
let userAnswers: Record<number, string> = {};
let timeLeft = INITIAL_TIME;
let timerInterval: any;

async function initQuiz() {
    try {
        const response = await fetch('/api/questions');
        questions = await response.json();
        renderQuestions();
        startTimer();
    } catch (error) {
        questionsList.innerHTML = 'Błąd podczas ładowania pytań. Spróbuj ponownie później.';
        console.error('Error fetching questions:', error);
    }
}

function renderQuestions() {
    questionsList.innerHTML = '';
    questions.forEach((q, index) => {
        const qDiv = document.createElement('div');
        qDiv.classList.add('question');
        qDiv.id = `q-${q.id}`;
        
        const qText = document.createElement('div');
        qText.classList.add('question-text');
        qText.textContent = `${index + 1}. ${q.text}`;
        
        const optionsDiv = document.createElement('div');
        optionsDiv.classList.add('options');
        
        q.options.forEach(option => {
            const btn = document.createElement('button');
            btn.classList.add('option');
            btn.textContent = option;
            btn.dataset.questionId = q.id.toString();
            btn.dataset.optionValue = option;
            btn.onclick = () => selectOption(q.id, option, btn);
            optionsDiv.appendChild(btn);
        });
        
        qDiv.appendChild(qText);
        qDiv.appendChild(optionsDiv);
        questionsList.appendChild(qDiv);
    });
}

function selectOption(questionId: number, value: string, element: HTMLButtonElement) {
    userAnswers[questionId] = value;
    const options = document.querySelectorAll(`[data-question-id="${questionId}"]`);
    options.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
}

function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert('Czas minął!');
            submitQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `Pozostały czas: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function submitQuiz() {
    clearInterval(timerInterval);
    const unanswered = questions.filter(q => !userAnswers[q.id]);
    if (unanswered.length > 0 && timeLeft > 0) {
        if (!confirm(`Masz ${unanswered.length} nieodpowiedzialnych pytań. Czy na pewno chcesz wysłać quiz?`)) {
            startTimer();
            return;
        }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wysyłanie...';

    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: userAnswers })
        });
        
        const result: SubmitResponse = await response.json();
        displayResults(result);
    } catch (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Wyślij Quiz';
        alert('Wystąpił błąd podczas wysyłania quizu.');
        console.error('Error submitting quiz:', error);
    }
}

function displayResults(result: SubmitResponse) {
    quizContainer.style.display = 'none';
    resultsContainer.style.display = 'block';
    
    scoreDisplay.textContent = `Twój wynik to ${result.score} z ${result.total}`;
    
    const elapsedSeconds = INITIAL_TIME - timeLeft;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timeTakenDisplay.textContent = `Czas ukończenia: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    breakdownDiv.innerHTML = '';
    result.breakdown.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('result-item');
        const statusClass = item.isCorrect ? 'correct' : 'incorrect';
        const statusText = item.isCorrect ? 'Poprawnie' : 'Błędnie';
        
        itemDiv.innerHTML = `
            <div class="status ${statusClass}">${statusText}</div>
            <div class="result-question-text">${item.text}</div>
            <div class="result-answer-info">Twoja odpowiedź: <span class="${statusClass}">${item.userAnswer || 'Brak odpowiedzi'}</span></div>
            ${!item.isCorrect ? `<div class="result-answer-info">Poprawna odpowiedź: <span class="correct">${item.correctAnswer}</span></div>` : ''}
        `;
        breakdownDiv.appendChild(itemDiv);
    });
}

submitBtn.onclick = submitQuiz;
initQuiz();
