import { readFile } from 'fs/promises';
import { join } from 'path';
import Groq from "groq-sdk";
import { format } from "date-fns";
import { it } from "date-fns/locale"

type Esercizio = {
  nome: string;
  categorie: string[];
  varianti: string[];
  attrezzatura?: string[];
  tutorial?: {
    [key: string]: string;
  };
};

type Categorie = {
  parte_superiore: string[];
  braccia: string[];
  parte_inferiore: string[];
  core: string[];
  movimento: string[];
  tipo: string[];
};

type FormatoAllenamento = {
  tipo?: string;
  formato?: string;
  esempio?: string;
  formati?: string[];
};

type Video = {
  descrizione?: string;
  url?: string;
  durata?: string;
  parte?: string;
  descrizione_esercizi?: string;
  tipo?: string;
};

type Esercizi = {
  esercizi: Esercizio[];
  categorie: Categorie;
  attrezzi: string[];
  formato_allenamento: FormatoAllenamento[];
  video_stretching?: Video[];
  video_riscaldamento?: Video[];
  video_allenamento?: Video[];
  video_equilibrio?: Video[];
  video_mobilita?: Video[];
};

const GROQ_API_KEY = Bun.env.GROQ_API_KEY;
const EXERCISES_FILE_PATH = join(__dirname, './data/esercizi.json');

const groq = new Groq({ apiKey: GROQ_API_KEY });

async function generateExecise(exercises: Esercizi): Promise<string> {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `
          Sei un personal trainer esperto e capace, specializzato nell'allenamento a corpo libero.
          Il tuo compito è generare allenamenti partendo un database di esercizi in formato JSON che ti verrà allegato nel corpo di ogni richiesta.
          Oltre al database, ti verrò fornito un elenco degli ultimi 2 o 3 allenamenti recenti così che tu possa generare un allenamento equilibrato.
          `
      },
      {
        role: "user",
        content: `
          Genera un allenamento per oggi: ${format(new Date(), 'EEEE dd LLLL yyyy', { locale: it })} basato sui miei dati storici.

          DATI UTENTE:
          - Livello: intermedio
          - Durata desiderata: 60 minuti
          - Attrezzatura: ${exercises.attrezzi.join(', ')}

          DATABASE ESERCIZI:
          ${JSON.stringify(exercises)}

          ALLENAMENTI RECENTI:

          \`\`\`md
          **Allenamento 4 aprile 2025**
          ### Parte Principale
          - C1x3: 20 affondi laterali alternati, max pull up con mano dx davanti (poi sx) negativa lenta
          - C2x3: 10 diamond push up, 10 leg raise, 20 crunch laterali
          - C3x4: 20 squat, 10 bar row, 20 V crunch

          **Allenamento 14 aprile 2025**
          ### Riscaldamento
          - [10 Minuti di Riscaldamento Total Body o Mini Allenamento Per Principianti](https://www.youtube.com/watch?v=Uq86HTbUE8g&t=230s)
          
          ### Parte Principale
          - C1x4: 10 push up, 20 squat, 20 crunch, 10 dips
          - C2x3: 20 calf raise, 15 kick back gamba piegata, 10 affondi per gamba
          - C3x3: 20 bicycle crunch, 30” plank, 20 mountain climber

          **Allenamento 16 aprile 2025**
          ### Riscaldamento
          - [Esercizi Di Riscaldamento Total Body Senza Salti (7 Minuti)](https://www.youtube.com/watch?v=xWPkMyyZDzM)
          
          ### Parte Principale
          - C1x3: 20 mountain climbers, 30 bicycle crunch, 10 slanci laterali in quadrupedia
          - C2x3: 20 glute bridge, 20 squat molleggiati, 20 alzate laterali
          - C3x3: 12 push up, 15 dips
          - C4x2: 10 french press, 10 arnold press, 20 curl biceps
          \`\`\`

          Crea un allenamento completo con riscaldamento, parte principale e stretching finale. 
          Indica serie, ripetizioni e tempi di recupero per ogni esercizio usando il seguente formato Markdown:
          
          **Allenamento [data in in italiano in formato EEEE dd LLLL yyyy]**
          ### Riscaldamento
          - [Dettaglio riscaldamento]

          ### Parte Principale
          **C1x[N]**: [recupero: eventuale tempo di recupero]
          - [Esercizio 1]: [ripetizioni]
          - [Esercizio 2]: [ripetizioni]
          - [Esercizio N]: [ripetizioni]

          **C2x[N]**: [recupero: eventuale tempo di recupero]
          - [Esercizio 1]: [ripetizioni]
          - [Esercizio 2]: [ripetizioni]
          - [Esercizio N]: [ripetizioni]

          **CCx[N]**: [recupero: eventuale tempo di recupero]
          - [Esercizio N]: [ripetizioni]

          ### Stretching (5 minuti)
          - [Dettaglio stretching]
          
          Non aggiungere note o spiegazioni aggiuntive.
        `,
      },
    ],
    model: "llama-3.3-70b-versatile",
  });

  return completion.choices[0]?.message?.content || "Impossibile generare un esercizio.";
}

async function getExercises(): Promise<Esercizi> {
  const exercises = await readFile(EXERCISES_FILE_PATH, 'utf8');

  return JSON.parse(exercises);
}

async function main() {
  const exercises = await getExercises();
  const training = await generateExecise(exercises);

  console.log(training);
}

await main().catch((err) => console.error(err));
