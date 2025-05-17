import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { parse, format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Training } from '../types';
import { db } from './db';

type Exercise = {
  name: string;
  categories: string[];
  variants: string[];
  equipments: string[];
  video?: {
    [key: string]: string;
  };
};

type Video = {
  description: string;
  url: string;
  duration: string;
};

type Exercises = {
  exercises: Exercise[];
  equipments: string[];
  video: Video[];
};

const EXERCISES_FILE_PATH = join(__dirname, '../../data/exercises.json');
const TRAINING_FILE_PATH = join(__dirname, '../../data/trainings.md');

/**
 * Reads and parses the exercises data from the JSON file
 * @returns {Promise<Exercises>} A promise that resolves to the exercises data
 */
async function getExercises(): Promise<Exercises> {
  const exercises = await readFile(EXERCISES_FILE_PATH, 'utf8');

  return JSON.parse(exercises);
}

/**
 * Parses an Italian date string into a Date object
 * @param {string} dateString - The date string to parse in Italian format
 * @returns {Date} The parsed date or current date if parsing fails
 */
function parseDate(dateString: string): Date {
  const withDay = parse(dateString, 'EEEE dd LLLL yyyy', new Date(), {
    locale: it,
  });

  if (!isNaN(withDay.getTime())) {
    return withDay;
  }

  const withoutDay = parse(dateString, 'dd LLLL yyyy', new Date(), {
    locale: it,
  });

  if (!isNaN(withoutDay.getTime())) {
    return withoutDay;
  }

  return new Date();
}

/**
 * Extracts training data from markdown file
 * @returns {Promise<Training[]>} A promise that resolves to an array of training objects
 */
export async function getTrainings(): Promise<Training[]> {
  const TRANING_REGEX =
    /\*\*(Allenamento [^*]+)\*\*\s*([\s\S]*?)(?=\*\*Allenamento|\s*$)/g;
  const TITLE_REGEX = /(Allenamento)\s([\w\dàèéìòóù\s]*)/;

  const content = await readFile(TRAINING_FILE_PATH, 'utf-8');
  const trainings: Training[] = [];

  let match: RegExpExecArray | null = null;

  while ((match = TRANING_REGEX.exec(content)) !== null) {
    const title = match[1].trim();
    const training = match[2].trim();
    const titleMatch = title.match(TITLE_REGEX);

    if (!titleMatch) {
      throw new Error(
        `Invalid title: ${title}. Specify a title in the format: **Allenamento **EEEE dd LLLL yyyy`,
      );
    }

    const dateString = titleMatch[2];
    const date = parseDate(dateString);

    trainings.push({
      training: `${title}\n${training}`,
      date: format(date, 'yyyy-MM-dd'),
    });
  }

  return trainings;
}

/**
 * Creates database tables if they don't exist
 */
function createTables(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        categories TEXT NOT NULL,
        variations TEXT NOT NULL,
        equipments TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      duration INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS equipments (
      id INTEGER PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trainings (
      id INTEGER PRIMARY KEY NOT NULL,
      training TEXT NOT NULL,
      date TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);
}

/**
 * Inserts an exercise into the database
 * @param {Exercise} exercise - The exercise object to store
 */
function storeExercises(exercise: Exercise): void {
  const insert = db.prepare(
    `
      INSERT INTO exercises (name, categories, variations, equipments)
      VALUES (:name, :categories, :variations, :equipments);
    `,
  );

  insert.run({
    name: exercise.name,
    categories: JSON.stringify(exercise.categories),
    variations: JSON.stringify(exercise.variants),
    equipments: JSON.stringify(exercise.equipments || []),
  });
}

/**
 * Inserts a video into the database
 * @param {Video} video - The video object to store
 */
function storeVideo(video: Video): void {
  const insert = db.prepare(
    `
      INSERT INTO videos (description, url, duration)
      VALUES (:description, :url, :duration);
    `,
  );

  insert.run({
    description: video.description,
    url: video.url,
    duration: video.duration,
  });
}

/**
 * Inserts an equipment type into the database
 * @param {string} type - The equipment type to store
 */
function storeEquipments(type: string): void {
  const insert = db.prepare(
    `
      INSERT INTO equipments (type)
      VALUES (:type);
    `,
  );

  insert.run({
    type,
  });
}

/**
 * Inserts a training into the database
 * @param {Training} training - The training object to store
 */
function storeTraining(training: Training): void {
  const insert = db.prepare(
    `
      INSERT INTO trainings (training, date)
      VALUES (:training, :date);
    `,
  );

  insert.run({
    training: training.training,
    date: training.date,
  });
}

/**
 * Initializes the database by loading data from files and storing it in the database
 * @returns {Promise<void>} A promise that resolves when initialization is complete
 */
async function initDb(): Promise<void> {
  const exercises = await getExercises();
  const trainings = await getTrainings();
  createTables();

  db.transaction((exercises: Exercises) => {
    for (const exercise of exercises.exercises) {
      storeExercises(exercise);
    }

    for (const video of exercises.video) {
      storeVideo(video);
    }

    for (const equipment of exercises.equipments) {
      storeEquipments(equipment);
    }

    for (const training of trainings) {
      storeTraining(training);
    }
  })(exercises);
}

await initDb()
  .catch((err) => console.error(err))
  .finally(() => {
    db.close();
  });
