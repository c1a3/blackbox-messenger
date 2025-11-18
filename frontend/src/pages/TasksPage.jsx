import { useState } from "react";
import { useTaskStore } from "../store/useTaskStore";
import { CheckSquare, Plus, Trash2, Circle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const TasksPage = () => {
  const [newTask, setNewTask] = useState("");
  const { tasks, addTask, removeTask, toggleTask } = useTaskStore();

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    addTask(newTask.trim());
    setNewTask("");
    toast.success("Task added successfully");
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Tasks</h1>
            <p className="mt-2 text-base-content/70">Manage your personal tasks</p>
          </div>

          {/* Add Task Form */}
          <form onSubmit={handleAddTask} className="flex items-center gap-2">
            <input
              type="text"
              className="input input-bordered w-full focus:outline-none"
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary btn-square"
              disabled={!newTask.trim()}
            >
              <Plus className="size-6" />
            </button>
          </form>

          {/* Tasks List */}
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-10 text-base-content/50 bg-base-200/50 rounded-lg border border-dashed border-base-content/20">
                <CheckSquare className="size-12 mx-auto mb-3 opacity-20" />
                <p>No tasks yet. Add one to get started!</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`
                    group flex items-center justify-between p-3 rounded-lg transition-all duration-200
                    ${task.completed ? "bg-base-200/50" : "bg-base-200"}
                  `}
                >
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`
                        flex-shrink-0 transition-colors duration-200
                        ${task.completed ? "text-primary" : "text-base-content/40 hover:text-primary"}
                      `}
                    >
                      {task.completed ? (
                        <CheckCircle className="size-6" />
                      ) : (
                        <Circle className="size-6" />
                      )}
                    </button>
                    <span
                      className={`truncate transition-all duration-200 ${
                        task.completed
                          ? "line-through text-base-content/50"
                          : "text-base-content"
                      }`}
                    >
                      {task.text}
                    </span>
                  </div>

                  <button
                    onClick={() => removeTask(task.id)}
                    className="btn btn-ghost btn-xs btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete task"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {/* Stats Footer */}
          {tasks.length > 0 && (
             <div className="text-xs text-center text-base-content/50 pt-4 border-t border-base-content/10">
                {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;