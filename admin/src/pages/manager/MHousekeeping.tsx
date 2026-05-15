import { useState } from "react";
import {
  Plus, CheckCircle2, Clock, AlertCircle, User,
  BedDouble, Sparkles, Wrench, RefreshCw, X,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import Drawer from "@/components/Drawer";

type TaskStatus = "Pending" | "In Progress" | "Completed" | "Blocked";
type TaskType   = "Cleaning" | "Maintenance" | "Inspection" | "Turndown";

type Task = {
  id: string;
  roomNumber: string;
  type: TaskType;
  assignedTo: string;
  status: TaskStatus;
  priority: "High" | "Medium" | "Low";
  notes?: string;
  createdAt: string;
  completedAt?: string;
};

const STAFF = ["Maria Santos", "James Okafor", "Priya Nair", "Carlos Reyes", "Aisha Patel", "Tom Nguyen"];
const ROOMS = ["101","102","103","201","202","203","301","302","303","401","402","501"];
const TASK_TYPES: TaskType[] = ["Cleaning", "Maintenance", "Inspection", "Turndown"];

const DEMO_TASKS: Task[] = [
  { id: "1", roomNumber: "302", type: "Maintenance", assignedTo: "Tom Nguyen",    status: "Pending",     priority: "High",   notes: "AC unit requires service", createdAt: new Date().toISOString() },
  { id: "2", roomNumber: "101", type: "Cleaning",    assignedTo: "Maria Santos",  status: "In Progress", priority: "Medium", createdAt: new Date().toISOString() },
  { id: "3", roomNumber: "205", type: "Inspection",  assignedTo: "Priya Nair",    status: "Completed",   priority: "Low",    createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
  { id: "4", roomNumber: "401", type: "Turndown",    assignedTo: "James Okafor",  status: "Pending",     priority: "Medium", createdAt: new Date().toISOString() },
  { id: "5", roomNumber: "103", type: "Cleaning",    assignedTo: "Carlos Reyes",  status: "Blocked",     priority: "High",   notes: "Guest still in room", createdAt: new Date().toISOString() },
  { id: "6", roomNumber: "501", type: "Cleaning",    assignedTo: "Aisha Patel",   status: "Completed",   priority: "Low",    createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
];

const emptyForm = { roomNumber: ROOMS[0], type: "Cleaning" as TaskType, assignedTo: STAFF[0], priority: "Medium" as Task["priority"], notes: "" };

const statusColor: Record<TaskStatus, string> = {
  "Pending":     "bg-warning-light text-warning",
  "In Progress": "bg-accent-light text-secondary",
  "Completed":   "bg-success-light text-success",
  "Blocked":     "bg-danger-light text-danger",
};

const typeIcon: Record<TaskType, React.ReactNode> = {
  Cleaning:    <Sparkles className="w-4 h-4" />,
  Maintenance: <Wrench className="w-4 h-4" />,
  Inspection:  <CheckCircle2 className="w-4 h-4" />,
  Turndown:    <BedDouble className="w-4 h-4" />,
};

export default function Housekeeping() {
  const [tasks, setTasks]       = useState<Task[]>(DEMO_TASKS);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ ...emptyForm });
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterStaff, setFilterStaff]   = useState("All");
  const [liveLog, setLiveLog]   = useState<{ id: string; msg: string; time: string }[]>([
    { id: "1", msg: "Room 501 marked as Clean by Aisha Patel", time: "5 min ago" },
    { id: "2", msg: "Room 205 inspection completed by Priya Nair", time: "12 min ago" },
    { id: "3", msg: "Room 302 maintenance task assigned to Tom Nguyen", time: "20 min ago" },
  ]);

  const filtered = tasks.filter((t) => {
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchStaff  = filterStaff  === "All" || t.assignedTo === filterStaff;
    return matchStatus && matchStaff;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: Task = {
      id:         Date.now().toString(),
      roomNumber: form.roomNumber,
      type:       form.type,
      assignedTo: form.assignedTo,
      status:     "Pending",
      priority:   form.priority,
      notes:      form.notes,
      createdAt:  new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    setLiveLog((prev) => [
      { id: Date.now().toString(), msg: `Room ${form.roomNumber} ${form.type} assigned to ${form.assignedTo}`, time: "just now" },
      ...prev.slice(0, 9),
    ]);
    setShowAdd(false);
    setForm({ ...emptyForm });
  };

  const updateStatus = (id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => t.id === id ? {
      ...t, status,
      completedAt: status === "Completed" ? new Date().toISOString() : t.completedAt,
    } : t));
    const task = tasks.find((t) => t.id === id);
    if (task) {
      setLiveLog((prev) => [
        { id: Date.now().toString(), msg: `Room ${task.roomNumber} ${task.type} → ${status} by ${task.assignedTo}`, time: "just now" },
        ...prev.slice(0, 9),
      ]);
    }
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
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors">
          <Plus className="w-4 h-4" /> Assign Task
        </button>
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
              {STAFF.map((s) => <option key={s}>{s}</option>)}
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
                    <span className="font-bold text-bright text-base">Room #{task.roomNumber}</span>
                    <span className="text-xs text-dim">· {task.type}</span>
                    {task.priority === "High" && (
                      <span className="text-[10px] font-bold text-ruby bg-ruby/10 border border-ruby/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">High</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-dim mb-2.5">
                    <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {task.assignedTo}</div>
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
                  <button onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))}
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
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent bg-white">
              {ROOMS.map((r) => <option key={r} value={r}>Room {r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Task Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent bg-white">
              {TASK_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Assign To *</label>
            <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent bg-white">
              {STAFF.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task["priority"] })}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent bg-white">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3} placeholder="Additional instructions..."
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent resize-none" />
          </div>
          <button type="submit"
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors">
            Assign Task
          </button>
        </form>
      </Drawer>
    </ManagerLayout>
  );
}
