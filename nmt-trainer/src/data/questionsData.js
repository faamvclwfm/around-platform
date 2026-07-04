import { mathHomework } from './questions/mathHomework';
import { mathLessons } from './questions/mathLessons';
import { englishWords } from './questions/englishWords';

export const allTests = {
  ...mathHomework,
  ...mathLessons,
  ...englishWords
};