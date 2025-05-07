import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Training } from "./types";
import { parse } from 'date-fns';
import { it } from 'date-fns/locale';

const TRANING_REGEX = /\*\*(Allenamento [^*]+)\*\*\s*([\s\S]*?)(?=\*\*Allenamento|\s*$)/g;
const TITLE_REGEX = /(Allenamento)\s(.*)/;
const TRAINING_FILE_PATH = join(__dirname, '../data/trainings.md');

function parseDate(dateString: string): Date {
  const withDay = parse(dateString, 'EEEE dd LLLL yyyy', new Date(), {
    locale: it
  });

  if (!isNaN(withDay.getTime())) {
    return withDay;
  }

  const withoutDay = parse(dateString, 'dd LLLL yyyy', new Date(), {
    locale: it
  });

  if (!isNaN(withoutDay.getTime())) {
    return withoutDay;
  }

  return new Date();
}

async function parseTrainings(): Promise<Training[]> {
  const content = await readFile(TRAINING_FILE_PATH, 'utf-8');
  const trainings: Training[] = [];

  let match: RegExpExecArray | null = null;

  while ((match = TRANING_REGEX.exec(content)) !== null) {
    const title = match[1].trim();
    const training = match[2].trim();
    const titleMatch = title.match(TITLE_REGEX);

    // console.log(match, title, titleMatch);
    if (!titleMatch) {
      throw new Error(`Invalid title: ${title}. Specify a title in the format: **Allenamento **EEEE dd LLLL yyyy`);
    }

    const dateString = titleMatch[2];
    const date = parseDate(dateString);

    trainings.push({
      training,
      date,
    })
  }

  return trainings;
}

async function main(): Promise<void> {
  const trainings = await parseTrainings();

  console.log(trainings);
}

await main()
  .catch((err) => console.error(err))