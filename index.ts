import { readFile } from 'fs/promises';

type Exercise = {
  nome: string;
  varianti: string[];
}

type Video = {
  descrizione: string;
  url: string;
}

type Esercises = {
  esercizi: {
    parte_superiore: {
      petto: Exercise;
      schiena: Exercise;
      spalle: Exercise;
      braccia: {
        tricipiti: Exercise;
        bicipiti: Exercise;
      };
    };
    parte_inferiore: {
      quadricipiti: Exercise;
      femorali: Exercise;
      glutei: Exercise;
      polpacci: Exercise;
    };
    core: {
      addominali: Exercise;
      lombari: Exercise;
    };
    cardio: Exercise;
    combinati: Exercise;
    stretching_mobilita: Exercise;
  };
  video: Video;
  attrezzi: string[];
  formato_allenamento: {
    tipo?: string;
    formato?: string;
    esempio?: string;
    formati?: string[];
  }[];
}

function getExercises() {

}

