import Groq from 'groq-sdk';
import { program } from 'commander';
import { db } from './db/db';
import {
  getExercises,
  getEquipments,
  getLastTrainings,
  generateTraining,
} from './lib';
import { TrainingLevel, type Training } from './types';

const GROQ_API_KEY = Bun.env.GROQ_API_KEY;
const LLM_MODEL = Bun.env.LLM_MODEL;

const groq = new Groq({ apiKey: GROQ_API_KEY });

function validateLevel(level: string): TrainingLevel {
  const levels = Object.values(TrainingLevel);

  if (!levels.includes(level as TrainingLevel)) {
    throw new Error(
      `Livello di allenamento non valido!. Scegli fra: ${levels.join(', ')}`,
    );
  }

  return level as TrainingLevel;
}

function validateDuration(duration: string): number {
  const parsed = parseInt(duration);

  if (isNaN(parsed) || parsed < 10 || parsed > 120) {
    throw new Error(
      'Specifica una durata in minuti compresa fra 10 e 120 minuti!',
    );
  }

  return parsed;
}

program
  .name('sgt-hartman')
  .description('Generatore di allenamenti a corpo libero personalizzati')
  .version('0.1.0')
  .option('-l, --livello <livello>', 'Livello di allenamento:', validateLevel)
  .option(
    '-d, --durata <minuti>',
    "Durata dell'allenamento in minuti:",
    validateDuration,
  )
  .option(
    '-n, --notes <text>',
    "Note aggiuntive per personalizzare l'allenamento",
  )
  .parse(process.argv);

const options = program.opts<{
  level?: TrainingLevel;
  duration?: number;
  notes?: string;
}>();

async function main(): Promise<Training> {
  const exercises = getExercises();
  const equipments = getEquipments();
  const lastTrainings = getLastTrainings();
  const training = await generateTraining(
    groq,
    LLM_MODEL,
    exercises,
    equipments,
    lastTrainings,
    options.level,
    options.duration,
    options.notes,
  );

  return training;
}

await main()
  .then((training) => console.log(training.training))
  .catch((err) => console.error(err))
  .finally(() => {
    db.close(true);
  });
