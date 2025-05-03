import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

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

const EXERCISES_FILE_PATH = join(__dirname, '../data/exercises.json');

const db = new Database('data/sgt.hartman.sqlite', {
  create: true,
  strict: true,
});

async function getExercises(): Promise<Exercises> {
  const exercises = await readFile(EXERCISES_FILE_PATH, 'utf8');

  return JSON.parse(exercises);
}

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

async function initDb(): Promise<void> {
  const exercises = await getExercises();
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
  })(exercises);
}

await initDb()
  .catch((err) => console.error(err))
  .finally(() => {
    db.close();
  });
