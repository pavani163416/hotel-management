import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Clock, Wrench, Sparkles, BedDouble, LogOut, Check } from "lucide-react";

type TaskStatus = "Pending" | "In Progress" | "Completed" | "Blocked";
type TaskType   = "Cleaning" | "Maintenance" | "Inspection" | "Turndown";

const typeIcon: Record<TaskType, React.ReactNode> = {
  Cleaning:    <Sparkles className="w-5 h-5" />,
  Maintenance: <Wrench className="w-5 h-5" />,
  Inspection:  <CheckCircle2 className="w-5 h-5" />,
  Turndown:    <BedDouble className="w-5 h-5" />,
};

export default function StaffDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const staff = JSON.parse(localStorage.getItem("luxe_staff") || "null");

  const loadTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem("luxe_staff_token");
      if (!token || !staff) {
        navigate("/staff/login");
        return;
      }
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/staff/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data.data);
    } catch {
      localStorage.removeItem("luxe_staff_token");
      navigate("/staff/login");
    } finally {
      setLoading(false);
    }
  }, [navigate, staff]);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 15000); // Auto refresh
    return () => clearInterval(interval);
  }, [loadTasks]);

  const updateStatus = async (id: string, status: TaskStatus) => {
    try {
      const token = localStorage.getItem("luxe_staff_token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/staff/tasks/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadTasks();
    } catch (err) {
      console.error("Failed to update status");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("luxe_staff_token");
    localStorage.removeItem("luxe_staff");
    navigate("/staff/login");
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-bright font-sans pb-20">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-white/5 sticky top-0 z-30 px-4 py-4 flex items-center justify-between shadow-xl">
        <div>
          <h1 className="text-xl font-bold">{staff?.hotelName}</h1>
          <p className="text-sm text-primary font-medium">Hello, {staff?.name}</p>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-muted hover:text-white transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-dim mt-2 mb-4">Your Assignments</h2>

        {tasks.length === 0 ? (
          <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10 mt-8">
            <CheckCircle2 className="w-12 h-12 text-emerald mx-auto mb-4 opacity-50" />
            <p className="text-bright font-medium">All Caught Up!</p>
            <p className="text-sm text-dim mt-1">You have no pending tasks.</p>
          </div>
        ) : tasks.map((task) => (
          <div key={task._id} className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-lg">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    task.type === "Cleaning" ? "bg-emerald/10 text-emerald" :
                    task.type === "Maintenance" ? "bg-amber/10 text-amber" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {typeIcon[task.type as TaskType] || <Sparkles className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Room {task.roomNumber.replace(/^[a-z]+-/i, "")}</h3>
                    <p className="text-sm text-dim">{task.type}</p>
                  </div>
                </div>
                {task.priority === "High" && (
                  <span className="bg-ruby/20 text-ruby px-3 py-1 text-xs font-bold uppercase rounded-lg">High</span>
                )}
              </div>

              {task.notes && (
                <div className="bg-black/20 p-3 rounded-xl mb-4">
                  <p className="text-sm text-soft italic">"{task.notes}"</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg border ${
                  task.status === "Pending" ? "bg-amber/10 text-amber border-amber/20" : "bg-sapphire/10 text-sapphire border-sapphire/20"
                }`}>
                  {task.status}
                </span>

                <div className="flex gap-2">
                  {task.status === "Pending" ? (
                    <button onClick={() => updateStatus(task._id, "In Progress")} className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors shadow-lg">
                      Start Task
                    </button>
                  ) : (
                    <button onClick={() => updateStatus(task._id, "Completed")} className="bg-emerald hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      <Check className="w-4 h-4" /> Finish
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
