import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  runTransaction,
  writeBatch,
  serverTimestamp,
  documentId,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN;

/* ------------------------------------------------------------------ */
/* Groups list                                                         */
/* ------------------------------------------------------------------ */

export async function fetchGroups() {
  const snap = await getDocs(query(collection(db, 'groups'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchGroup(groupId) {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createGroup(name, recurring) {
  await addDoc(collection(db, 'groups'), {
    groupName: name,
    members: [],
    memberEmails: [],
    schedule: {
      weeklyCount: recurring.length,
      recurring,
      exceptions: {},
    },
    createdAt: serverTimestamp(),
  });
}

export async function deleteGroup(id) {
  await deleteDoc(doc(db, 'groups', id));
}

/* ------------------------------------------------------------------ */
/* Members                                                              */
/* ------------------------------------------------------------------ */

export async function addMemberToGroup(groupId, email) {
  const normalized = email.trim().toLowerCase();
  const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', normalized)));
  if (userSnap.empty) throw new Error('Користувача з таким email не знайдено');
  const uId = userSnap.docs[0].id;
  const ref = doc(db, 'groups', groupId);

  await runTransaction(db, async (transaction) => {
    const sfDoc = await transaction.get(ref);
    const data = sfDoc.data() || {};
    const members = data.members || [];
    const emails = data.memberEmails || [];
    if (members.includes(uId)) throw new Error('Учень вже є в класі');
    members.push(uId);
    emails.push(normalized);
    transaction.update(ref, { members, memberEmails: emails });
    transaction.set(doc(db, 'users', uId), { groupId }, { merge: true });
  });
}

export async function removeMemberFromGroup(groupId, memberId, email) {
  const ref = doc(db, 'groups', groupId);
  await runTransaction(db, async (transaction) => {
    const sfDoc = await transaction.get(ref);
    const data = sfDoc.data() || {};
    const members = (data.members || []).filter((id) => id !== memberId);
    const emails = (data.memberEmails || []).filter((em) => em !== email);
    transaction.update(ref, { members, memberEmails: emails });
    transaction.set(doc(db, 'users', memberId), { groupId: null }, { merge: true });
  });
}

/* ------------------------------------------------------------------ */
/* Subscriptions ("Абонемент")                                         */
/* ------------------------------------------------------------------ */

export async function fetchSubscription(studentUid) {
  const snap = await getDoc(doc(db, 'users', studentUid));
  if (!snap.exists()) return null;
  return snap.data().subscription || null;
}

export async function saveSubscription(studentUid, { paid, attended, nextPayment, pricePerLesson }) {
  await setDoc(
    doc(db, 'users', studentUid),
    {
      subscription: {
        paid,
        attended,
        nextPayment,
        pricePerLesson,
        // Reset the flag so the "1 lesson left" reminder can fire again next cycle
        lowBalanceNotified: false,
      },
    },
    { merge: true }
  );
}

/* ------------------------------------------------------------------ */
/* Schedule / calendar                                                 */
/* ------------------------------------------------------------------ */

const UKR_MONTHS = [
  'Січня', 'Лютого', 'Березня', 'Квітня', 'Травня', 'Червня',
  'Липня', 'Серпня', 'Вересня', 'Жовтня', 'Листопада', 'Грудня',
];

export function formatUkrDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)} ${UKR_MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

// Returns the array of lessons for a given date, given a group's schedule object.
export function normalizeDayLessons(schedule, dateStr) {
  if (!schedule) return [];
  const exceptions = schedule.exceptions || {};
  const dayData = exceptions[dateStr];

  if (dayData) {
    if (Array.isArray(dayData.list)) return dayData.list.map((l) => ({ ...l }));
    if (dayData.status && dayData.status !== 'none' && dayData.status !== 'cancelled') {
      return [{ status: dayData.status, time: dayData.time || '16:00', hwTitle: dayData.hwTitle || '' }];
    }
    return [];
  }

  const dateObj = new Date(dateStr);
  let dow = dateObj.getDay();
  if (dow === 0) dow = 7;

  const recLesson = (schedule.recurring || []).find((r) => r.day === dow);
  if (recLesson) {
    return [{ status: 'scheduled', time: recLesson.time || '16:00', hwTitle: '' }];
  }
  return [];
}

// Persists the lessons array for one day and returns the updated schedule object.
export async function saveDayLessons(groupId, schedule, dateStr, lessonsArr) {
  const nextSchedule = { recurring: [], exceptions: {}, ...schedule };
  const exceptions = { ...(nextSchedule.exceptions || {}) };

  if (lessonsArr.length === 0) {
    exceptions[dateStr] = { status: 'none', list: [] };
  } else {
    exceptions[dateStr] = {
      status: lessonsArr[0].status,
      time: lessonsArr[0].time,
      hwTitle: lessonsArr.map((l) => l.hwTitle).filter(Boolean).join(' | '),
      list: lessonsArr,
    };
  }

  nextSchedule.exceptions = exceptions;
  await updateDoc(doc(db, 'groups', groupId), { schedule: nextSchedule });
  return nextSchedule;
}

// Moves a lesson from one day to another; returns the updated schedule object.
export async function transferLesson(groupId, schedule, oldDateStr, index, newDate, newTime) {
  const oldDayLessons = normalizeDayLessons(schedule, oldDateStr);
  const movingLesson = { ...oldDayLessons[index] };
  const oldTimeStr = movingLesson.time;

  movingLesson.status = 'rescheduled';
  movingLesson.hwTitle = `Перенесено на ${formatUkrDate(newDate)}`;
  oldDayLessons[index] = movingLesson;

  const newDayLessons = normalizeDayLessons(schedule, newDate);
  newDayLessons.push({ status: 'scheduled', time: newTime, hwTitle: '' });
  newDayLessons.sort((a, b) => a.time.localeCompare(b.time));

  const nextSchedule = { recurring: [], exceptions: {}, ...schedule };
  const exceptions = { ...(nextSchedule.exceptions || {}) };
  exceptions[oldDateStr] = { status: oldDayLessons[0].status, time: oldDayLessons[0].time, list: oldDayLessons };
  exceptions[newDate] = { status: newDayLessons[0].status, time: newDayLessons[0].time, list: newDayLessons };
  nextSchedule.exceptions = exceptions;

  await updateDoc(doc(db, 'groups', groupId), { schedule: nextSchedule });
  triggerWebhook(groupId, newDate, 'rescheduled', oldTimeStr, newTime);
  return nextSchedule;
}

// Fire-and-forget notification to the Telegram bot webhook about a schedule change.
export function triggerWebhook(groupId, dateStr, changeType, oldTime, newTime) {
  if (!groupId) return;
  const payload = { groupId, dateStr, oldTime, newTime, changeType };
  fetch('https://tg-hw-around.vercel.app/api/webhook?action=schedule_change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((e) => console.error('Webhook trigger failed:', e));
}

/* ------------------------------------------------------------------ */
/* Homework assignments                                                */
/* ------------------------------------------------------------------ */

export const THEORY_FILES = [
  { name: 'Кути', file: 'angles.pdf' },
  { name: 'Біквадратні рівняння', file: 'biquadratic.pdf' },
  { name: 'Чотирикутники', file: 'chotirik.pdf' },
  { name: 'Подвійні кути', file: 'double.pdf' },
  { name: 'Геометричні фігури', file: 'elementfigures.pdf' },
  { name: 'Ірраціональні вирази', file: 'irrationalexpressions.pdf' },
  { name: 'Метод інтервалів', file: 'Metodintervaliv.pdf' },
  { name: 'Модуль', file: 'module.pdf' },
  { name: 'Подільність чисел', file: 'numberdivisibility.pdf' },
  { name: 'Числа', file: 'numbers.pdf' },
  { name: 'Степені', file: 'stepeni.pdf' },
  { name: 'Тригонометрія', file: 'trigonometry.pdf' },
  { name: 'Вектори', file: 'vectors.pdf' },
];

// Splits allTests (array or object keyed by id) into the 4 buckets used by the builder UI.
export function categorizeTests(allTests) {
  const testsArray = Array.isArray(allTests) ? allTests : Object.keys(allTests || {});
  const buckets = { required: [], intermediate: [], summary: [], optional: [] };

  testsArray.forEach((testItem) => {
    const tId = typeof testItem === 'string' ? testItem : testItem.id || '';
    let tTitle = tId;
    if (typeof testItem !== 'string') {
      tTitle = testItem.title || tId;
    } else if (allTests && allTests[testItem] && allTests[testItem].title) {
      tTitle = allTests[testItem].title;
    }

    const tIdUpper = tId.toUpperCase();
    const entry = { id: tId, title: tTitle };

    if (tIdUpper.startsWith('INTERMEDIATE')) buckets.intermediate.push(entry);
    else if (tIdUpper.startsWith('SUMMARY')) buckets.summary.push(entry);
    else if (tId.toLowerCase().includes('dod') || tIdUpper.startsWith('DOD')) buckets.optional.push(entry);
    else buckets.required.push(entry);
  });

  return buckets;
}

export async function fetchAssignments(groupId) {
  const snap = await getDocs(query(collection(db, 'assignments'), where('groupId', '==', groupId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function publishHomework(groupId, { title, requiredTests, theoryFiles }) {
  await addDoc(collection(db, 'assignments'), {
    title,
    requiredTests,
    theoryFiles,
    groupId,
    createdAt: serverTimestamp(),
  });

  // Notify group members via Telegram, if they've linked a chat id.
  const groupDoc = await getDoc(doc(db, 'groups', groupId));
  if (!groupDoc.exists()) return;
  const memberUids = [...new Set(groupDoc.data().members || [])];
  if (memberUids.length === 0) return;

  const usersSnap = await getDocs(
    query(collection(db, 'users'), where(documentId(), 'in', memberUids.slice(0, 30)))
  );
  const notifications = [];
  usersSnap.forEach((userDoc) => {
    const userData = userDoc.data();
    if (userData.tgChatId) {
      notifications.push(
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userData.tgChatId,
            text: `📚 *Призначено нове домашнє завдання!*\n\n📌 *Тема:* ${title}\n📋 *Тестів до виконання:* ${requiredTests.length}\n\n👉 [Перейти в особистий кабінет](https://diagnostictestresults-9f6ac.web.app/)`,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        })
      );
    }
  });
  await Promise.all(notifications);
}

export async function deleteAssignment(id) {
  await deleteDoc(doc(db, 'assignments', id));
  const batch = writeBatch(db);
  const completedSnap = await getDocs(query(collection(db, 'completed_homeworks'), where('assignmentId', '==', id)));
  completedSnap.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function fetchAssignmentPreviewIds(assignmentId) {
  const snap = await getDoc(doc(db, 'assignments', assignmentId));
  if (!snap.exists()) throw new Error('Завдання не знайдено');
  const data = snap.data();
  const ids = [...(data.requiredTests || []), ...(data.optionalTests || []), ...(data.tests || [])];
  return { ids: [...new Set(ids)], title: data.title || data.hwTitle || 'Домашнє завдання' };
}

/* ------------------------------------------------------------------ */
/* Homework monitoring                                                 */
/* ------------------------------------------------------------------ */

export async function fetchHwMonitoring(groupId, assignmentId) {
  const groupDoc = await getDoc(doc(db, 'groups', groupId));
  const groupData = groupDoc.data();
  if (!groupData || !groupData.members || groupData.members.length === 0) {
    return [];
  }

  const assignDoc = await getDoc(doc(db, 'assignments', assignmentId));
  const assignData = assignDoc.data() || {};
  const requiredTestsList = assignData.requiredTests || assignData.tests || [];
  const totalReqTests = requiredTestsList.length;

  const rows = [];
  for (let i = 0; i < groupData.members.length; i++) {
    const mId = groupData.members[i];
    const email = groupData.memberEmails[i];

    const compSnap = await getDocs(
      query(
        collection(db, 'completed_homeworks'),
        where('assignmentId', '==', assignmentId),
        where('userId', '==', mId)
      )
    );
    const tasksSnap = await getDocs(
      query(collection(db, 'completed_tasks'), where('assignmentId', '==', assignmentId), where('userId', '==', mId))
    );

    let compCount = 0;
    const flaggedItems = [];
    tasksSnap.forEach((taskDoc) => {
      const data = taskDoc.data();
      if (requiredTestsList.includes(data.testId)) compCount++;
      if (data.flaggedQuestions && data.flaggedQuestions.length > 0) flaggedItems.push(...data.flaggedQuestions);
    });

    const percent = totalReqTests > 0 ? Math.round((compCount / totalReqTests) * 100) : 100;
    rows.push({
      email,
      percent,
      isSubmitted: !compSnap.empty,
      flaggedItems,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* "Робота над помилками" — auto-generated mistakes test                */
/* ------------------------------------------------------------------ */

export async function generateMistakesTest(groupId) {
  const groupRef = doc(db, 'groups', groupId);
  const groupDoc = await getDoc(groupRef);
  const groupData = groupDoc.data() || {};
  const members = groupData.members || [];
  const usedFlagged = groupData.usedFlaggedQuestions || [];

  if (members.length === 0) throw new Error('У цій групі ще немає учнів.');

  const chunks = [];
  for (let i = 0; i < members.length; i += 10) chunks.push(members.slice(i, i + 10));

  const allFlagged = [];
  for (const chunk of chunks) {
    const tasksSnap = await getDocs(query(collection(db, 'completed_tasks'), where('userId', 'in', chunk)));
    tasksSnap.forEach((d) => {
      const data = d.data();
      if (data.flaggedQuestions && Array.isArray(data.flaggedQuestions)) allFlagged.push(...data.flaggedQuestions);
    });
  }

  const uniqueQuestions = {};
  allFlagged.forEach((q) => {
    const qKey = q.id || q.question || q.text;
    if (!usedFlagged.includes(qKey) && !uniqueQuestions[qKey]) uniqueQuestions[qKey] = q;
  });

  const finalQuestions = Object.values(uniqueQuestions);
  if (finalQuestions.length === 0) {
    throw new Error("Учні ще не додали нових питань у 'Складні' (або ви вже використали їх усі).");
  }

  const testId = `CUSTOM_MISTAKES_${Date.now()}`;
  const testTitle = `Робота над помилками (${new Date().toLocaleDateString('uk-UA')})`;

  await setDoc(doc(db, 'custom_tests', testId), {
    id: testId,
    title: testTitle,
    questions: finalQuestions,
    groupId,
    createdAt: serverTimestamp(),
  });

  await updateDoc(groupRef, { usedFlaggedQuestions: [...usedFlagged, ...Object.keys(uniqueQuestions)] });

  return { testId, testTitle, count: finalQuestions.length };
}