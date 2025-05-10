import Groq from 'groq-sdk';
import { db } from './db/db';
import {
  getExercises,
  getEquipments,
  getLastTrainings,
  generateTraining,
} from './lib';
import type { Training } from './types';

const GROQ_API_KEY = Bun.env.GROQ_API_KEY;
const LLM_MODEL = Bun.env.LLM_MODEL;

const groq = new Groq({ apiKey: GROQ_API_KEY });

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
  );

  return training;
}

await main()
  .then((training) => console.log(training.training))
  .catch((err) => console.error(err))
  .finally(() => {
    db.close(true);
  });
