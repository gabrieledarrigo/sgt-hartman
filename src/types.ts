
export type Exercise = {
  id: number;
  name: string;
  categories: string;
  variations: string;
  equipments: string;
};

export type Equipment = {
  type: string;
};

export type Training = {
  id?: number;
  training: string;
  date: Date;
};

export type TrainingLevel = 'facile' | 'intermedio' | 'difficile';
