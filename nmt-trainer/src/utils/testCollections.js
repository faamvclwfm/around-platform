// Список Firestore-колекцій з результатами тестів по предметах.
// 1:1 перенесено з personalCabinetscript.js (mathCollections/engCollections/...).

const genRange = (prefix, start, end, suffix = '') =>
  Array.from({ length: end - start + 1 }, (_, i) => `${prefix}${start + i}${suffix}`);

export const mathCollections = [
  'results_mathQuizDiagnosticNEW',
  'results_test_completed',
  ...genRange('results_HOMEWORKTHEME', 1, 6),
  ...genRange('results_HOMEWORKTHEME', 9, 10),
  ...genRange('results_HOMEWORKTHEME', 12, 103),
  'results_KLACALKATHEME12',
  ...genRange('results_KLACALKATHEME', 17, 20),
  ...genRange('results_LESSON', 19, 38, 'THEME'),
  ...genRange('results_SUMMARYTEST', 1, 2),
  ...genRange('results_PRACTICE', 1, 7),
  'results_mistakes_math'
];

export const engCollections = [
  ...genRange('results_ENGLISHWORDSQUIZ', 1, 40),
  ...genRange('results_INTERMEDIATETEST', 1, 2),
  ...genRange('results_NMTTEST', 1, 5),
  'results_mistakes_eng'
];

export const histCollections = [...genRange('results_HISTORYTEST', 1, 30), 'results_mistakes_hist'];

export const ukrCollections = [...genRange('results_UKRAINIAN', 1, 40), 'results_mistakes_ukr'];

export const chineseCollections = [...genRange('results_CHINESE', 1, 21), 'results_mistakes_chinese'];

export const COLLECTION_CATEGORY = {};
mathCollections.forEach((c) => {
  COLLECTION_CATEGORY[c] = 'math';
});
engCollections.forEach((c) => {
  COLLECTION_CATEGORY[c] = 'eng';
});
histCollections.forEach((c) => {
  COLLECTION_CATEGORY[c] = 'hist';
});
ukrCollections.forEach((c) => {
  COLLECTION_CATEGORY[c] = 'ukr';
});
chineseCollections.forEach((c) => {
  COLLECTION_CATEGORY[c] = 'chinese';
});

export const ALL_TESTS = [
  ...mathCollections,
  ...engCollections,
  ...histCollections,
  ...ukrCollections,
  ...chineseCollections
];

export const SUBJECT_META = {
  math: { label: 'Математика', color: 'indigo', icon: '📐' },
  eng: { label: 'Англійська мова', color: 'orange', icon: '🇬🇧' },
  hist: { label: 'Історія України', color: 'rose', icon: '📜' },
  ukr: { label: 'Українська мова', color: 'yellow', icon: '🇺🇦' },
  chinese: { label: 'Китайська мова', color: 'emerald', icon: '🇨🇳' }
};

// Визначення категорії тесту, що прийшов зі "спільної" колекції results_test_completed
export function resolveCategory(collectionName, data, fallback) {
  if (collectionName !== 'results_test_completed') return fallback;

  if (data.subject && ['math', 'eng', 'hist', 'ukr', 'chinese'].includes(data.subject)) {
    return data.subject;
  }
  if (data.testName) {
    const name = data.testName.toLowerCase();
    if (name.includes('англ') || name.includes('english') || name.includes('words')) return 'eng';
    if (name.includes('істор') || name.includes('hist')) return 'hist';
    if (name.includes('укр') || name.includes('ukr')) return 'ukr';
    if (name.includes('китай') || name.includes('chinese')) return 'chinese';
    if (name.includes('математ') || name.includes('math')) return 'math';
  }
  return fallback;
}