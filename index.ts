import { readFile } from 'fs/promises';
import { join } from 'path';

type Esercizio = {
  nome: string;
  categorie: string[];
  varianti: string[];
  attrezzatura?: string[];
  tutorial?: {
    [key: string]: string;
  };
}

type Categorie = {
  parte_superiore: string[];
  braccia: string[];
  parte_inferiore: string[];
  core: string[];
  movimento: string[];
  tipo: string[];
}

type FormatoAllenamento = {
  tipo?: string;
  formato?: string;
  esempio?: string;
  formati?: string[];
}

type Video = {
  descrizione?: string;
  url?: string;
  durata?: string;
  parte?: string;
  descrizione_esercizi?: string;
  tipo?: string;
}

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
}

const EXERCISES_FILE_PATH = join(__dirname, './data/esercizi.json');

async function getExercises(): Promise<Esercizi> {
  const exercises = await readFile(EXERCISES_FILE_PATH, 'utf8');

  return JSON.parse(exercises);
}

async function main() {
  const exercises = await getExercises();

  console.log(exercises);
}

await main()
  .catch(err => console.error(err));
