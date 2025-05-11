import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { db } from './db/db';
import {
  type Exercise,
  type Training,
  type Equipment,
  TrainingLevel,
} from './types';
import type Groq from 'groq-sdk';

export function getExercises(): Exercise[] {
  const query = db.prepare<Exercise, {}>(`
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

export function getEquipments(): string[] {
  const query = db.query<Equipment, {}>(`
    SELECT type
    FROM equipments;
  `);

  return query.all({}).map((equipment) => equipment.type);
}

export function getLastTrainings(numberOfTraining: number = 3): Training[] {
  const query = db.prepare<Training, number>(`
    SELECT *
    FROM trainings
    ORDER BY date DESC
    LIMIT :numberOfTraining;
  `);

  return query.all(numberOfTraining);
}

export async function generateTraining(
  groq: Groq,
  model: string,
  exercises: Exercise[],
  equipments: string[],
  lastTrainings: Training[],
  level: TrainingLevel = TrainingLevel.intermedio,
  duration: number = 60,
  notes?: string,
): Promise<Training> {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `
          Sei un personal trainer esperto, specializzato nell'allenamento a corpo libero.
          Il tuo compito è generare un allenamento a corpo libero partendo da un database di esercizi in formato JSON che ti verrà allegato nel corpo di ogni richiesta.
          Oltre al database di esercizi, ti verranno forniti:
          
          - Il livello di difficoltà dell'allenamento e la durata desiderata in minuti.
          - Alcuni allenamenti recenti, così che l'allenamento generato tenga conto del pregresso dell'utente che alleni.
          - L'attrezzatura che puoi utilizzare per creare l'allenamento.
          - Opzionalmente, alcune note scritte dall'utente con richieste specifiche o preferenze riguardo all'allenamento. Se presenti, usale come base per creare l'allenamento.
        `,
      },
      {
        role: 'user',
        content: `
          Genera un allenamento per oggi: ${format(new Date(), 'EEEE dd LLLL yyyy', { locale: it })}.

          DATI UTENTE:
          - Livello: ${level}
          - Durata desiderata: ${duration} minuti
          - Note aggiuntive o preferenze: ${notes ? notes : 'Nessuna nota fornita dall utente.'}

          DATABASE ESERCIZI:
          ${JSON.stringify(exercises)}

          ATTREZZATURA:
          ${equipments.join(',')}

          ALLENAMENTI RECENTI:
          ${lastTrainings.map((training) => training.training).join('\n\n')}

          Crea un allenamento completo composto da:

          - Una fase di riscaldamento, opzionale
          - Una parte principale composta da una serie di circuiti 
          - Una fase di stretching finale, opzionale
          - Una breve descrizione dell'allenamento composta al massimo da una frase, nello stile del Sgt Hartman di Full Metal jacket, opzionale.

          Per i circuiti indica serie, ripetizioni (o tempo di esecuzione in secondi se l'esercizio non prevede ripetizioni), ed eventuali tempi di recupero per ogni esercizio.
          Ometti le parti indicate come opzionali se non sono funzionali all'allenamento.
          L'allenamento deve variare e non deve ripetere esattamente i circuiti degli allenamenti precedenti. L'allenamento dev'essere studiato per aiutarmi a migliorare le mie prestazioni sulla base degli ultimi allenamenti.
          L'allenamento deve rispettare il seguente formato Markdown:

         **Allenamento [data in in italiano in formato EEEE dd LLLL yyyy]**
          - [Riscaldamento] (opzionale) (link a un video tutorial, opzionale)
          - **C1x[N]**: [ripetizioni o tempo in secondi] [Esercizio 1], [ripetizioni o tempo in secondi] [Esercizio 2], [ripetizioni o tempo in secondi] [Esercizio N]
          - **C2x[N]**: [ripetizioni o tempo in secondi] [Esercizio 1], [ripetizioni o tempo in secondi] [Esercizio 2], [ripetizioni o tempo in secondi] [Esercizio N]
          - **CNx[N]**: [ripetizioni o tempo in secondi] [Esercizio 1], [ripetizioni o tempo in secondi] [Esercizio 2], [ripetizioni o tempo in secondi] [Esercizio N]
          - [Stretching] (opzionale)

          ### Descrizione (opzionale)
          - [Dettaglio descrizione]

          Non aggiungere note o spiegazioni aggiuntive.
        `,
      },
    ],
    model,
  });

  if (!completion.choices[0]?.message?.content) {
    throw new Error('Cannot generate a training');
  }

  return {
    date: format(new Date(), 'yyyy-MM-dd'),
    training: completion.choices[0]?.message?.content,
  };
}
