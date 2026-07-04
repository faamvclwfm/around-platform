import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGroups, createGroup, deleteGroup } from '../../services/groupsService';
import CreateGroupModal from './components/CreateGroupModal';
import ManageGroupModal from './components/ManageGroupModal';

export function GroupsManagement() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [managingGroup, setManagingGroup] = useState(null); // { id, groupName }

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchGroups();
      setGroups(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Ви впевнені, що хочете видалити групу "${name}"?`)) return;
    try {
      await deleteGroup(id);
      loadGroups();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-10 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Мої класи</h2>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">
            Керування учнями, групами та домашніми завданнями
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            to="/"
            className="px-6 py-3.5 bg-white border border-stone-100 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-50 transition-all shadow-sm"
          >
            Головна
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg"
          >
            + Створити групу
          </button>
        </div>
      </div>

      {loading && <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Завантаження класів...</p>}
      {error && <p className="text-red-400 text-xs font-bold uppercase">Помилка: {error}</p>}
      {!loading && !error && groups.length === 0 && (
        <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Немає створених груп</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {groups.map((g) => (
          <div
            key={g.id}
            className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{g.groupName}</h3>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                Учнів у групі: {g.members ? g.members.length : 0}
              </p>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setManagingGroup({ id: g.id, groupName: g.groupName })}
                className="flex-1 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all"
              >
                Керувати
              </button>
              <button
                onClick={() => handleDelete(g.id, g.groupName)}
                className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all text-xs"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (name, recurring) => {
            await createGroup(name, recurring);
            await loadGroups();
          }}
        />
      )}

      {managingGroup && (
        <ManageGroupModal
          groupId={managingGroup.id}
          groupName={managingGroup.groupName}
          onClose={() => setManagingGroup(null)}
          onGroupsChanged={loadGroups}
        />
      )}
    </main>
  );
}