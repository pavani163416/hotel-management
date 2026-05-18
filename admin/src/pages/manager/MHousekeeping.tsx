import { useEffect, useState, useCallback } from "react";
import {
  Plus, CheckCircle2, Clock, AlertCircle, User,
  BedDouble, Sparkles, Wrench, RefreshCw, X, Users,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import Drawer from "@/components/Drawer";
import { 
  getManagerRooms, updateManagerRoom,
  getManagerStaff, createManagerStaff, deleteManagerStaff,
  getManagerTasks, createManagerTask, updateManagerTask
} from "@/services/api";

type TaskStatus = "Pending" | "In Progress" | "Completed" | "Blocked";
type TaskType   = "Cleaning" | "Maintenance" | "Inspection" | "Turndown";

type Task = {
  id: string;
  _id?: string;
  roomNumber: string;
  type: TaskType;
  assignedTo: any;
  status: TaskStatus;
  priority: "High" | "Medium" | "Low";
  notes?: string;
  createdAt: string;
  completedAt?: string;
};

const TASK_TYPES: TaskType[] = ["Cleaning", "Maintenance", "Inspection", "Turndown"];

const typeIcon: Record<TaskType, React.ReactNode> = {
  Cleaning:    <Sparkles className="w-4 h-4" />,
  Maintenance: <Wrench className="w-4 h-4" />,
  Inspection:  <CheckCircle2 className="w-4 h-4" />,
  Turndown:    <BedDouble className="w-4 h-4" />,
};

export default function Housekeeping() {
  const [rooms, setRooms]       = useState<any[]>([]);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  
  const [showAdd, setShowAdd]   = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  
  const [form, setForm]         = useState({
    roomNumber: "",
    type: "Cleaning" as TaskType,
    assignedTo: "",
    priority: "Medium" as Task["priority"],
    notes: ""
  });
  
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterStaff, setFilterStaff]   = useState("All");
  const [liveLog, setLiveLog]   = useState<{ id: string; msg: string; time: string }[]>([
    { id: "1", msg: "Room 501 marked as Clean by Aisha Patel", time: "5 min ago" },
    { id: "2", msg: "Room 205 inspection completed by Priya Nair", time: "12 min ago" },
    { id: "3", msg: "Room 302 maintenance task assigned to Tom Nguyen", time: "20 min ago" },
  ]);

  const adminData = JSON.parse(localStorage.getItem("luxe_admin") || "{}");
  const hotelId = adminData.assignedHotelId || "default";
  const localStorageKey = `luxe_housekeeping_tasks_${hotelId}`;
  const staffKey = `luxe_housekeeping_staff_${hotelId}`;

  const loadData = useCallback(async () => {
    try {
      const [roomsRes, staffRes, tasksRes] = await Promise.all([
        getManagerRooms(),
        getManagerStaff(),
        getManagerTasks()
      ]);

      const roomsList = roomsRes?.data || [];
      const staffData = staffRes?.data || [];
      const tasksData = tasksRes?.data || [];

      setRooms(roomsList);
      setStaffList(staffData);
      setTasks(tasksData.map((t: any) => ({ ...t, id: t._id })));

      if (roomsList.length > 0 && !form.roomNumber) {
        setForm((f) => ({
          ...f,
          roomNumber: roomsList[0].roomNumber,
          assignedTo: staffData.length > 0 ? staffData[0]._id : ""
        }));
      }
    } catch {
      setRooms([]);
      setStaffList([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [form.roomNumber]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = tasks.filter((t) => {
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchStaff  = filterStaff  === "All" || t.assignedTo?.name === filterStaff || t.assignedTo === filterStaff;
    return matchStatus && matchStaff;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoomNumber = form.roomNumber || (rooms[0]?.roomNumber || "");
    const targetAssignedTo = form.assignedTo || (staffList[0]?._id || "");
    
    try {
      const res: any = await createManagerTask({
        roomNumber: targetRoomNumber,
        type: form.type,
        assignedTo: targetAssignedTo,
        priority: form.priority,
        notes: form.notes
      });
      
      const createdTask = res.data;
      const staffMember = staffList.find(s => s._id === targetAssignedTo);
      const newTask = { ...createdTask, id: createdTask._id, assignedTo: staffMember || targetAssignedTo };
      
      setTasks([newTask, ...tasks]);
      setLiveLog((prev) => [
        { id: Date.now().toString(), msg: `Room #${targetRoomNumber.replace(/^[a-z]+-/i, "")} ${form.type} assigned to ${staffMember?.name || "Unassigned"}`, time: "just now" },
        ...prev.slice(0, 9),
      ]);
      setShowAdd(false);
      setForm({
        roomNumber: rooms[0]?.roomNumber || "",
        type: "Cleaning" as TaskType,
        assignedTo: staffList[0]?._id || "",
        priority: "Medium" as Task["priority"],
        notes: ""
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    const cleanName = newStaffName.trim();
    if (staffList.some(s => s.name === cleanName)) return;
    
    try {
      const res: any = await createManagerStaff({ name: cleanName });
      setStaffList([...staffList, res.data]);
      setNewStaffName("");
      setLiveLog((prev) => [
        { id: Date.now().toString(), msg: `New housekeeper "${cleanName}" added. PIN: ${res.data.pin}`, time: "just now" },
        ...prev.slice(0, 9),
      ]);
    } catch (err) { console.error(err); }
  };

  const handleRemoveStaff = async (idToRemove: string, name: string) => {
    try {
      await deleteManagerStaff(idToRemove);
      setStaffList(staffList.filter((s) => s._id !== idToRemove));
      setLiveLog((prev) => [
        { id: Date.now().toString(), msg: `Housekeeper "${name}" removed.`, time: "just now" },
        ...prev.slice(0, 9),
      ]);
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id: string, status: TaskStatus) => {
    try {
      await updateManagerTask(id, { status });
      const updated = tasks.map((t) => t.id === id ? {
        ...t, status,
        completedAt: status === "Completed" ? new Date().toISOString() : t.completedAt,
      } : t);
      setTasks(updated);

      const task = updated.find((t) => t.id === id);
      if (task) {
        setLiveLog((prev) => [
          { id: Date.now().toString(), msg: `Room #${task.roomNumber.replace(/^[a-z]+-/i, "")} ${task.type} → ${status} by ${task.assignedTo?.name || "System"}`, time: "just now" },
          ...prev.slice(0, 9),
        ]);
      }
    } catch (err) { console.error(err); }
  };

  const counts = {
    pending:    tasks.filter((t) => t.status === "Pending").length,
    inProgress: tasks.filter((t) => t.status === "In Progress").length,
    completed:  tasks.filter((t) => t.status === "Completed").length,
    blocked:    tasks.filter((t) => t.status === "Blocked").length,
  };

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright">Housekeeping</h1>
          <p className="text-sm text-dim mt-0.5">Staff tasks & room status management</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowStaffModal(true)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-bright px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">
            <Users className="w-4 h-4 text-gold" /> Manage Staff
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors">
            <Plus className="w-4 h-4" /> Assign Task
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending",     count: counts.pending,    color: "rgba(245,158,11,0.1)", text: "text-amber",    icon: <Clock className="w-5 h-5 text-amber" /> },
          { id: "progress", label: "In Progress", count: counts.inProgress, color: "rgba(59,130,246,0.1)", text: "text-sapphire", icon: <RefreshCw className="w-5 h-5 text-sapphire" /> },
          { label: "Completed",   count: counts.completed,  color: "rgba(16,185,129,0.1)", text: "text-emerald",  icon: <CheckCircle2 className="w-5 h-5 text-emerald" /> },
          { label: "Blocked",     count: counts.blocked,    color: "rgba(225,29,72,0.1)",  text: "text-ruby",     icon: <AlertCircle className="w-5 h-5 text-ruby" /> },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-2xl p-5 flex items-center gap-4 hover:shadow-2xl transition-all">
            <div className={`w-10 h-10 rounded-xl grid place-items-center`} style={{ background: item.color }}>{item.icon}</div>
            <div>
              <p className="text-2xl font-bold text-bright">{item.count}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-dim">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Task Board */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Filters */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="glass-select rounded-xl px-3 py-2 text-sm outline-none">
              <option value="All">All Status</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Blocked</option>
            </select>
            <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}
              className="glass-select rounded-xl px-3 py-2 text-sm outline-none">
              <option value="All">All Staff</option>
              {staffList.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <div className="p-16 text-center text-sm text-dim">No tasks found</div>
            ) : filtered.map((task) => (
              <div key={task.id} className="flex items-start gap-4 px-5 py-5 hover:bg-white/5 transition-colors group">
                {/* Type icon */}
                <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 mt-0.5 ${
                  task.type === "Maintenance" ? "bg-amber/10 text-amber border border-amber/20" :
                  task.type === "Cleaning"    ? "bg-emerald/10 text-emerald border border-emerald/20" :
                  task.type === "Inspection"  ? "bg-sapphire/10 text-sapphire border border-sapphire/20" :
                  "bg-white/5 text-dim border border-white/10"
                }`}>
                  {typeIcon[task.type]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-bright text-base">Room #{task.roomNumber.replace(/^[a-z]+-/i, "")}</span>
                    <span className="text-xs text-dim">· {task.type}</span>
                    {task.priority === "High" && (
                      <span className="text-[10px] font-bold text-ruby bg-ruby/10 border border-ruby/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">High</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-dim mb-2.5">
                    <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {task.assignedTo?.name || "Unassigned"}</div>
                    {task.completedAt && (
                      <span>· Done {new Date(task.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                  {task.notes && <p className="text-xs text-soft italic bg-white/5 p-2 rounded-lg border border-white/5">{task.notes}</p>}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                    task.status === "Pending"     ? "bg-amber/10 text-amber border-amber/20" :
                    task.status === "In Progress" ? "bg-sapphire/10 text-sapphire border-sapphire/20" :
                    task.status === "Completed"   ? "bg-emerald/10 text-emerald border-emerald/20" :
                    "bg-ruby/10 text-ruby border-ruby/20"
                  }`}>
                    {task.status}
                  </span>
                  {/* Quick status actions */}
                  {task.status === "Pending" && (
                    <button onClick={() => updateStatus(task.id, "In Progress")}
                      className="text-xs text-gold font-bold hover:underline whitespace-nowrap">Start</button>
                  )}
                  {task.status === "In Progress" && (
                    <button onClick={() => updateStatus(task.id, "Completed")}
                      className="text-xs text-emerald font-bold hover:underline whitespace-nowrap">Done</button>
                  )}
                  <button onClick={() => {
                    const updated = tasks.filter((t) => t.id !== task.id);
                    setTasks(updated);
                    localStorage.setItem(localStorageKey, JSON.stringify(updated));
                  }}
                    className="text-dim hover:text-ruby transition-all opacity-0 group-hover:opacity-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass-card rounded-2xl flex flex-col">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2.5">
            <div className="w-2 h-2 bg-emerald rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h3 className="font-semibold text-bright">Live Activity</h3>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/5">
            {liveLog.map((entry) => (
              <div key={entry.id} className="px-5 py-4 hover:bg-white/5 transition-colors">
                <p className="text-sm text-soft leading-relaxed">{entry.msg}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-dim mt-2">{entry.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assign Task Drawer */}
      <Drawer isOpen={showAdd} onClose={() => setShowAdd(false)} title="Assign Housekeeping Task" width="w-[420px]">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Room *</label>
            <select value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
              className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright">
              {rooms.map((r: any) => (
                <option key={r._id} value={r.roomNumber} className="bg-neutral-900 text-bright">
                  Room {r.roomNumber.replace(/^[a-z]+-/i, "")} ({r.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Task Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })}
              className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright">
              {TASK_TYPES.map((t) => <option key={t} className="bg-neutral-900 text-bright">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Assign To *</label>
            <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright">
              {staffList.map((s) => <option key={s._id} value={s._id} className="bg-neutral-900 text-bright">{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task["priority"] })}
              className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright">
              <option className="bg-neutral-900 text-bright">High</option>
              <option className="bg-neutral-900 text-bright">Medium</option>
              <option className="bg-neutral-900 text-bright">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3} placeholder="Additional instructions..."
              className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright resize-none" />
          </div>
          <button type="submit"
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors">
            Assign Task
          </button>
        </form>
      </Drawer>

      {/* Manage Staff Drawer */}
      <Drawer isOpen={showStaffModal} onClose={() => setShowStaffModal(false)} title="Manage Housekeeping Staff" width="w-[420px]">
        <div className="space-y-5">
          {/* Add Staff Form */}
          <form onSubmit={handleAddStaff} className="flex gap-2">
            <input
              type="text"
              placeholder="New Housekeeper Name..."
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              className="flex-1 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright"
              required
            />
            <button type="submit" className="bg-gold text-dark px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gold/90 transition-all flex items-center gap-1 shrink-0">
              <Plus className="w-4.5 h-4.5" /> Add
            </button>
          </form>

          {/* Staff List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Active Housekeepers Directory</label>
            {staffList.length === 0 ? (
              <p className="text-xs text-dim text-center py-6">No housekeepers added yet.</p>
            ) : staffList.map((s) => (
              <div key={s} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 grid place-items-center"><User className="w-4 h-4 text-gold" /></div>
                  <span className="text-sm font-medium text-bright">{s}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStaff(s)}
                  className="text-dim hover:text-ruby p-1.5 rounded-lg hover:bg-white/5 transition-all"
                  title="Remove Housekeeper"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Drawer>
    </ManagerLayout>
  );
}
