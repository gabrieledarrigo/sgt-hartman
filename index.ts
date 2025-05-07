import Groq from 'groq-sdk';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Database } from 'bun:sqlite';
import type { Exercise, Training, TrainingLevel, Equipment } from './src/types';

const GROQ_API_KEY = Bun.env.GROQ_API_KEY;
const LLM_MODEL = Bun.env.LLM_MODEL;

const groq = new Groq({ apiKey: GROQ_API_KEY });
const db = new Database('data/sgt.hartman.sqlite', {
  create: true,
  strict: true,
});

async function generateTraining(
  exercises: Exercise[],
  equipments: string[],
  lastTrainings: Training[],
  trainingLevel: TrainingLevel = 'intermedio',
  desiredDuration: number = 60,
  notes?: string,
): Promise<string> {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `
          Sei un personal trainer esperto, specializzato nell'allenamento a corpo libero.
          Il tuo compito è generare un allenamento a corpo libero partendo da un database di esercizi in formato JSON che ti verrà allegato nel corpo di ogni richiesta.
          Oltre al database di esercizi, ti verranno forniti:
          
          - Il livello di difficoltà dell'allenamento e la durata desiderata in minuti
          - Un elenco degli ultimi 2 o 3 allenamenti recenti così l'allenamento generato tenga conto del pregresso dell'utente che alleni.
          - L'attrezzatura che puoi utilizzare per creare l'allenamento
          - Alcune note fornite dall'utente con richieste specifiche riguardo all'allenamento
        `,
      },
      {
        role: 'user',
        content: `
          Genera un allenamento per oggi: ${format(new Date(), 'EEEE dd LLLL yyyy', { locale: it })} basato sui miei dati storici.

          DATI UTENTE:
          - Livello: ${trainingLevel}
          - Durata desiderata: ${desiredDuration} minuti
          - Note aggiuntive: ${notes ? notes : 'Nessuna nota fornita dall utente.'}

          DATABASE ESERCIZI:
          ${JSON.stringify(exercises)}

          ATTREZZATURA:
          ${equipments.join(',')}

          ALLENAMENTI RECENTI:
          ${lastTrainings.map(training => training.training).join('\n\n')}

          Crea un allenamento completo composto da:
          
          - Una fase di riscaldamento, opzionale
          - Una parte principale composta da una serie di circuiti 
          - Una fase di stretching finale, opzionale
          - Una breve descrizione dell'allenamento composta al massimo da una frase.

          Per i circuiti indica serie, ripetizioni (o tempo in secondi per esercizi che non prevedono ripetizioni, come i Jumping Jack), e tempi di recupero per ogni esercizio.
          Se lo ritieni opportuno, ometti le parti indicate come opzionali.
          L'allenamento deve rispettare il seguente formato Markdown:

          **Allenamento [data in in italiano in formato EEEE dd LLLL yyyy]** (durata in minuti stimata)
          - [Riscaldamento] (opzionale) (link a un video tutorial, opzionale)

          **C1x[N]**: [recupero:  opzionale: tempo di recupero in secondi]
          - [Esercizio 1]: [ripetizioni o tempo in secondi]
          - [Esercizio 2]: [ripetizioni o tempo in secondi]
          - [Esercizio N]: [ripetizioni o tempo in secondi]

          **C2x[N]**: [recupero, opzionale: tempo di recupero in secondi]
          - [Esercizio 1]: [ripetizioni o tempo in secondi]
          - [Esercizio 2]: [ripetizioni o tempo in secondi]
          - [Esercizio N]: [ripetizioni o tempo in secondi]

          **CCx[N]**: [recupero: opzionale: tempo di recupero in secondi]
          - [Esercizio N]: [ripetizioni o tempo in secondi]

          ### Stretching (opzionale)
          - [Dettaglio stretching]

          ### Descrizione (opzionale)
          - [Dettaglio descrizione]

          Non aggiungere note o spiegazioni aggiuntive.
        `,
      },
    ],
    model: LLM_MODEL,
  });

  return (
    completion.choices[0]?.message?.content ||
    'Impossibile generare un esercizio.'
  );
}

function getExercises(): Exercise[] {
  const query = db.query<Exercise, {}>(`
    SELECT id, name, categories, variations, equipments
    FROM exercises;
  `);

  return query.all({}).map((exercise) => ({
    ...exercise,
    categories: JSON.parse(exercise.categories),
    variations: JSON.parse(exercise.variations),
    equipments: JSON.parse(exercise.equipments),
  }));
}

function getEquipments(): string[] {
  const query = db.query<Equipment, {}>(`
    SELECT type
    FROM equipments;
  `);

  return query.all({}).map((equipment) => equipment.type);
}

function getLastTrainings(numberOfTraining: number = 3): Training[] {
  const query = db.query<Training, number>(`
    SELECT *
    FROM trainings
    ORDER BY date DESC
    LIMIT :numberOfTraining;
  `);

  return query.all(numberOfTraining);
}

async function main() {
  const exercises = getExercises();
  const equipments = getEquipments();
  const lastTrainings = getLastTrainings(5);
  const training = await generateTraining(exercises, equipments, lastTrainings);

  console.log(training);
}

await main()
  .catch((err) => console.error(err))
  .finally(() => {
    db.close(true)
  });
