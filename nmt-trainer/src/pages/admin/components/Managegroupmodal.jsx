import { useEffect, useState } from 'react';
import Calendar from '../../../components/Calendar';
import GroupMembersList from './GroupMembersList';
import AssignmentsList from './AssignmentsList';
import SubscriptionModal from './SubscriptionModal';
import DayScheduleAdminModal from './DayScheduleAdminModal';
import AssignHomeworkModal from './AssignHomeworkModal';
import HwPreviewModal from './HwPreviewModal';
import HwMonitoringSection from './HwMonitoringSection';
import {
  fetchGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  fetchAssignments,
  deleteAssignment,
  fetchAssignmentPreviewIds,
  generateMistakesTest,
} from '../../../services/groupsService';

export default function ManageGroupModal({ groupId, groupName, onClose, onGroupsChanged }) {
  const [group, setGroup] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState(null);

  const [subscriptionTarget, setSubscriptionTarget] = useState(null); // { uid, email }
  const [dayModalDate, setDayModalDate] = useState(null);
  const [hwModalState, setHwModalState] = useState(null); // null | { prefill }
  const [previewState, setPreviewState] = useState(null); // { ids, title }
  const [monitorState, setMonitorState] = useState(null); // { assignmentId, title }
  const [generatingMistakes, setGeneratingMistakes] = useState(false);

  const loadGroup = async () => {
    const data = await fetchGroup(groupId);
    setGroup(data);
  };

  const loadAssignments = async () => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    try {
      const list = await fetchAssignments(groupId);
      setAssignments(list);
    } catch (e) {
      setAssignmentsError(e.message);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const handleAddMember = async (email) => {
    await addMemberToGroup(groupId, email);
    await loadGroup();
    onGroupsChanged();
  };

  const handleRemoveMember = async (mId, email) => {
    if (!confirm(`Видалити ${email} з класу?`)) return;
    await removeMemberFromGroup(groupId, mId, email);
    await loadGroup();
    onGroupsChanged();
  };

  const handleDeleteAssignment = async (id) => {
    if (!confirm('Ви впевнені, що хочете видалити це домашнє завдання?')) return;
    await deleteAssignment(id);
    await loadAssignments();
    if (monitorState?.assignmentId === id) setMonitorState(null);
  };

  const handlePreviewAssignment = async (id) => {
    try {
      const { ids, title } = await fetchAssignmentPreviewIds(id);
      setPreviewState({ ids, title });
    } catch (e) {
      alert('Помилка: ' + e.message);
    }
  };

  const handleGenerateMistakes = async () => {
    setGeneratingMistakes(true);
    try {
      const { testId, testTitle, count } = await generateMistakesTest(groupId);
      setHwModalState({
        prefill: {
          title: testTitle,
          testIds: [testId],
          generatedTest: { id: testId, title: testTitle },
        },
      });
      alert(`Супер! Тест згенеровано з ${count} складних питань. Він уже доданий до списку обов'язкових у модалці.`);
    } catch (e) {
      alert(e.message);
    } finally {
      setGeneratingMistakes(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[40] flex justify-center items-start p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-[3rem] p-10 shadow-2xl my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center bg-stone-50 rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500 transition-all z-10"
        >
          ✕
        </button>

        <div className="border-b border-stone-100 pb-6 mb-8">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{groupName}</h3>
          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Панель керування групою</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <GroupMembersList
            group={group}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onOpenSubscription={(uid, email) => setSubscriptionTarget({ uid, email })}
          />

          <div className="lg:col-span-8 w-full min-w-0">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Призначені комплексні ДЗ</h4>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateMistakes}
                  disabled={generatingMistakes}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm border border-rose-100 disabled:opacity-60"
                >
                  {generatingMistakes ? 'Генерація...' : '⚡ Робота над помилками'}
                </button>
                <button
                  onClick={() => setHwModalState({ prefill: null })}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md"
                >
                  + Призначити комплексне ДЗ
                </button>
              </div>
            </div>

            <AssignmentsList
              assignments={assignments}
              loading={assignmentsLoading}
              error={assignmentsError}
              onCreate={() => setHwModalState({ prefill: null })}
              onPreview={handlePreviewAssignment}
              onMonitor={(assignmentId, title) => setMonitorState({ assignmentId, title })}
              onDelete={handleDeleteAssignment}
            />

            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Календар занять</h4>
            <div className="w-full overflow-x-auto custom-scroll">
              {group && <Calendar schedule={group.schedule} onDayClick={(dateStr) => setDayModalDate(dateStr)} />}
            </div>
          </div>
        </div>

        {monitorState && (
          <HwMonitoringSection
            groupId={groupId}
            assignmentId={monitorState.assignmentId}
            hwTitle={monitorState.title}
            onClose={() => setMonitorState(null)}
          />
        )}
      </div>

      {subscriptionTarget && (
        <SubscriptionModal
          studentUid={subscriptionTarget.uid}
          studentEmail={subscriptionTarget.email}
          onClose={() => setSubscriptionTarget(null)}
        />
      )}

      {dayModalDate && group && (
        <DayScheduleAdminModal
          groupId={groupId}
          dateStr={dayModalDate}
          schedule={group.schedule}
          onScheduleChange={(updatedSchedule) => setGroup((g) => ({ ...g, schedule: updatedSchedule }))}
          onClose={() => setDayModalDate(null)}
        />
      )}

      {hwModalState && (
        <AssignHomeworkModal
          groupId={groupId}
          prefill={hwModalState.prefill}
          onClose={() => setHwModalState(null)}
          onPublished={async () => {
            setHwModalState(null);
            await loadAssignments();
          }}
        />
      )}

      {previewState && (
        <HwPreviewModal testIds={previewState.ids} headerTitle={previewState.title} onClose={() => setPreviewState(null)} />
      )}
    </div>
  );
}