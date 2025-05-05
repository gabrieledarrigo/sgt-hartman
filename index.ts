import Groq from 'groq-sdk';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Database } from 'bun:sqlite';

type Exercise = {
  id: number;
  name: string;
  categories: string;
  variations: string;
  equipments: string;
};

type Equipment = {
  type: string;
};

type Training = {
  id: number;
  training: string;
  date: Date;
}

const GROQ_API_KEY = Bun.env.GROQ_API_KEY;

const groq = new Groq({ apiKey: GROQ_API_KEY });
const db = new Database('data/sgt.hartman.sqlite', {
  create: true,
  strict: true,
});

async function generateTraining(
  exercises: Exercise[],
  equipments: string[],
  lastTrainings: Training[],
): Promise<string> {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `
          Sei un personal trainer esperto e capace, specializzato nell'allenamento a corpo libero.
          Il tuo compito è generare allenamenti partendo un database di esercizi in formato JSON che ti verrà allegato nel corpo di ogni richiesta.
          Oltre al database, ti verrò fornito un elenco degli ultimi 2 o 3 allenamenti recenti così che tu possa generare un allenamento equilibrato.
          `,
      },
      {
        role: 'user',
        content: `
          Genera un allenamento per oggi: ${format(new Date(), 'EEEE dd LLLL yyyy', { locale: it })} basato sui miei dati storici.

          DATI UTENTE:
          - Livello: intermedio
          - Durata desiderata: 60 minuti

          DATABASE ESERCIZI:
          ${JSON.stringify(exercises)}

          ATTREZZATURA:
          ${equipments.join(',')}

          ALLENAMENTI RECENTI:
          ${lastTrainings.map(training => training.training).join('\n\n')}

          Crea un allenamento completo con riscaldamento, parte principale e stretching finale. 
          Indica serie, ripetizioni e tempi di recupero per ogni esercizio usando il seguente formato Markdown:

          **Allenamento [data in in italiano in formato EEEE dd LLLL yyyy]**
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

          Non aggiungere note o spiegazioni aggiuntive.
        `,
      },
    ],
    model: 'llama-3.3-70b-versatile',
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

function getLastTrainings(): Training[] {
  const query = db.query<Training, {}>(`
    SELECT *
    FROM trainings
    ORDER BY date DESC
    LIMIT 3
  `);

  return query.all({});
}

async function main() {
  const exercises = getExercises();
  const equipments = getEquipments();
  const lastTrainings = getLastTrainings();
  const training = await generateTraining(exercises, equipments, lastTrainings);

  console.log(training);
}

await main()
  .catch((err) => console.error(err))
  .finally(() => {
    db.close(true)
  });
