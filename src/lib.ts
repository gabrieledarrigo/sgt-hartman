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
          Sei un personal trainer esperto, specializzato in allenamenti a corpo libero.
          Il tuo compito è creare un allenamento efficace, originale e personalizzato, usando un database di esercizi fornito in formato JSON.
          Tieni presente le seguenti regole:

          - Non ripetere esattamente esercizi, combinazioni o strutture già presenti negli allenamenti recenti.
          - Usa creativamente gli esercizi e i video disponibili, nel rispetto dell'attrezzatura consentita.
          - Adatta l’allenamento al livello specificato e alla durata desiderata.
          - Se sono presenti note dell’utente, rispettale con priorità assoluta.
          - L’obiettivo è variare gli stimoli allenanti per migliorare le prestazioni generali
          - Gli allenamenti recenti ti vengono forniti come riferimento per calcolare la progressione dell’utente.

          Genera l’allenamento direttamente nel formato Markdown richiesto, senza aggiungere spiegazioni.
        `.trim(),
      },
      {
        role: 'user',
        content: `
        Genera un allenamento per oggi: ${format(new Date(), 'EEEE dd LLLL yyyy', { locale: it })}.

        DATI UTENTE:
        - Livello: ${level}
        - Durata desiderata: ${duration} minuti
        - Note aggiuntive o preferenze: ${notes ? notes : 'Nessuna nota fornita dall’utente.'}

        DATABASE ESERCIZI:
        ${JSON.stringify(exercises)}

        ATTREZZATURA DISPONIBILE:
        ${equipments.join(', ')}

        IMPORTANTE:
        Evita la ripetizione esatta di esercizi, strutture o combinazioni presenti negli allenamenti precedenti. 
        L’allenamento di oggi deve essere vario, originale e diverso. 
        Usa gli allenamenti precedenti solo per evitare sovrapposizioni. 
        Sorprendi l’utente con una combinazione efficace, dinamica e coerente con il suo livello.

        FORMATO ATTESO:
        - Una fase di riscaldamento (opzionale), eventualmente con link a un video tutorial
        - Una parte principale composta da una o più serie di circuiti (C1, C2, ...)
        - Una fase di stretching (opzionale)
        - Una breve descrizione motivazionale o ironica in stile Sgt. Hartman (opzionale)

        Ogni circuito deve includere:
        - Numero di serie
        - Ripetizioni o tempo per esercizio
        - Eventuali pause/recuperi

        L’allenamento deve essere generato nel seguente formato Markdown:

        **Allenamento [data in italiano in formato EEEE dd LLLL yyyy]**
        - [Riscaldamento] (opzionale)
        - C1x[N]: [tempo o ripetizioni] [Esercizio 1], [tempo o ripetizioni] [Esercizio 2], ...
        - C2x[N]: ...
        - CNx[N]: ...
        - [Stretching] (opzionale)

        ### Descrizione (opzionale)
        - [Frase motivazionale o ironica, massimo una frase]

        ALLENAMENTI RECENTI:
        ${lastTrainings.map((training) => training.training).join('\n\n')}
            `.trim(),
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
