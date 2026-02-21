import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

interface Question {
  id: number;
  text: string;
  options: string[];
  answer: string;
}

const questions: Question[] = [
  { id: 1, text: "Co jest stolicą Francji?", options: ["Paryż", "Londyn", "Berlin", "Madryt"], answer: "Paryż" },
  { id: 2, text: "Która planeta jest znana jako Czerwona Planeta?", options: ["Mars", "Wenus", "Jowisz", "Saturn"], answer: "Mars" },
  { id: 3, text: "Kto napisał 'Romeo i Julię'?", options: ["Szekspir", "Dickens", "Austen", "Tolkien"], answer: "Szekspir" },
  { id: 4, text: "Jaki jest największy ocean na Ziemi?", options: ["Spokojny", "Atlantycki", "Indyjski", "Arktyczny"], answer: "Spokojny" },
  { id: 5, text: "Jaki jest symbol złota?", options: ["Au", "Ag", "Fe", "Pb"], answer: "Au" },
  { id: 6, text: "Która góra jest najwyższa na świecie?", options: ["K2", "Mount Everest", "Mount Kilimandżaro", "Denali"], answer: "Mount Everest" },
  { id: 7, text: "Ile nóg ma pająk?", options: ["6", "8", "10", "12"], answer: "8" },
  { id: 8, text: "Jaki jest największy ssak na świecie?", options: ["Słoń", "Płetwal błękitny", "Żyrafa", "Żarłacz biały"], answer: "Płetwal błękitny" },
  { id: 9, text: "W którym roku zatonął Titanic?", options: ["1905", "1912", "1918", "1923"], answer: "1912" },
  { id: 10, text: "Który kraj jest znany jako Kraj Kwitnącej Wiśni?", options: ["Chiny", "Korea Południowa", "Japonia", "Tajlandia"], answer: "Japonia" },
  { id: 11, text: "Jaki pierwiastek chemiczny ma symbol O?", options: ["Wodór", "Tlen", "Węgiel", "Azot"], answer: "Tlen" },
  { id: 12, text: "Kto namalował Monę Lisę?", options: ["Van Gogh", "Picasso", "Da Vinci", "Rembrandt"], answer: "Da Vinci" },
  { id: 13, text: "Która rzeka jest najdłuższa na świecie?", options: ["Nil", "Amazonka", "Jangcy", "Missisipi"], answer: "Nil" },
  { id: 14, text: "W którym roku wybuchła II Wojna Światowa?", options: ["1914", "1939", "1945", "1918"], answer: "1939" },
  { id: 15, text: "Jaka waluta obowiązuje w Japonii?", options: ["Juan", "Won", "Jen", "Dolar"], answer: "Jen" },
  { id: 16, text: "Ile kontynentów jest na Ziemi?", options: ["5", "6", "7", "8"], answer: "7" },
  { id: 17, text: "Kto odkrył Amerykę w 1492 roku?", options: ["Magellan", "Vasco da Gama", "Kolumb", "Cook"], answer: "Kolumb" },
  { id: 18, text: "Który gaz dominuje w atmosferze Ziemi?", options: ["Tlen", "Azot", "Dwutlenek węgla", "Hel"], answer: "Azot" },
  { id: 19, text: "Jak nazywa się najmniejszy kontynent?", options: ["Antarktyda", "Europa", "Australia", "Ameryka Południowa"], answer: "Australia" },
  { id: 20, text: "Kto był pierwszym królem Polski?", options: ["Mieszko I", "Bolesław Chrobry", "Kazimierz Wielki", "Władysław Łokietek"], answer: "Bolesław Chrobry" },
  { id: 21, text: "Jakie jest najgłębsze jezioro na świecie?", options: ["Huron", "Wiktoria", "Bajkał", "Michigan"], answer: "Bajkał" },
  { id: 22, text: "Kto wymyślił teorię względności?", options: ["Newton", "Einstein", "Tesla", "Hawking"], answer: "Einstein" },
  { id: 23, text: "Które miasto nazywane jest Wiecznym Miastem?", options: ["Paryż", "Ateny", "Rzym", "Londyn"], answer: "Rzym" },
  { id: 24, text: "Jaki jest najtwardszy minerał występujący naturalnie?", options: ["Grafit", "Kwarc", "Diament", "Rubin"], answer: "Diament" },
  { id: 25, text: "Ile planet jest w Układzie Słonecznym?", options: ["7", "8", "9", "10"], answer: "8" },
  { id: 26, text: "Kto napisał 'Pana Tadeusza'?", options: ["Słowacki", "Mickiewicz", "Norwid", "Prus"], answer: "Mickiewicz" },
  { id: 27, text: "Który kraj ma obecnie najwięcej ludności?", options: ["Chiny", "USA", "Indie", "Rosja"], answer: "Indie" },
  { id: 28, text: "Jakie zwierzę jest symbolem Australii?", options: ["Koala", "Emu", "Kangur", "Dziobak"], answer: "Kangur" },
  { id: 29, text: "Ile serc ma ośmiornica?", options: ["1", "2", "3", "4"], answer: "3" },
  { id: 30, text: "Jaki kolor powstaje z połączenia niebieskiego i żółtego?", options: ["Fioletowy", "Zielony", "Pomarańczowy", "Brązowy"], answer: "Zielony" }
];

function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

app.get('/api/questions', (req: Request, res: Response) => {
  const randomQuestions = shuffle([...questions]).slice(0, 5);
  const clientQuestions = randomQuestions.map(({ id, text, options }) => ({ id, text, options }));
  res.json(clientQuestions);
});

app.post('/api/submit', (req: Request, res: Response) => {
  const userAnswers: Record<number, string> = req.body.answers || {};
  const answeredIds = Object.keys(userAnswers).map(Number);
  const relevantQuestions = questions.filter(q => answeredIds.includes(q.id));

  let score = 0;
  const breakdown = relevantQuestions.map(q => {
    const userAnswer = userAnswers[q.id];
    const isCorrect = userAnswer === q.answer;
    if (isCorrect) score++;
    
    return {
      id: q.id,
      text: q.text,
      userAnswer,
      correctAnswer: q.answer,
      isCorrect
    };
  });

  res.json({
    score,
    total: relevantQuestions.length,
    breakdown
  });
});

app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});

export default app;
