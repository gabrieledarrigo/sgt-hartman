import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

type Esercizio = {
  nome: string;
  categorie: string[];
  varianti: string[];
  attrezzatura: string[];
  tutorial?: {
    [key: string]: string;
  };
};

type Video = {
  descrizione: string;
  url: string;
  durata: string;
};

type Esercizi = {
  esercizi: Esercizio[];
  attrezzi: string[];
  video: Video[];
};

const EXERCISES_FILE_PATH = join(__dirname, '../data/esercizi.json');

const db = new Database('data/exercises.sqlite', {
  create: true,
  strict: true,
});

async function getExercises(): Promise<Esercizi> {
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
    
    CREATE TABLE IF NOT EXISTS video_tutorials (
      id INTEGER PRIMARY KEY NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      duration TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);
}

function storeExercises(exercise: Esercizio): void {
  const insert = db.query(
    `
      INSERT INTO exercises (name, categories, variations, equipments)
      VALUES (:name, :categories, :variations, :equipments);
    `,
  );

  insert.run({
    name: exercise.nome,
    categories: JSON.stringify(exercise.categorie),
    variations: JSON.stringify(exercise.varianti),
    equipments: JSON.stringify(exercise.attrezzatura || []),
  });
}

function storeVideo(video: Video): void {
  const insert = db.query(
    `
      INSERT INTO video_tutorials (description, url, duration)
      VALUES (:description, :url, :duration);
    `,
  );

  insert.run({
    description: video.descrizione,
    url: video.url,
    duration: video.durata,
  });
}

async function initDb(): Promise<void> {
  const exercises = await getExercises();
  createTables();

  db.transaction((exercises: Esercizi) => {
    for (const exercise of exercises.esercizi) {
      storeExercises(exercise);
    }

    for (const video of exercises.video) {
      storeVideo(video);
    }
  })(exercises);
}

await initDb()
  .catch((err) => console.error(err))
  .finally(() => {
    db.close();
  });
