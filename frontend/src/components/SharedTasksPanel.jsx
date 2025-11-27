import { useEffect, useState } from "react";
import { useSharedTaskStore } from "../store/useSharedTaskStore";
import { useChatStore } from "../store/useChatStore";
import { CheckCircle, Circle, Plus, X, CheckSquare, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const SharedTasksPanel = () => {
  const { tasks, addTask, toggleTask, isTasksLoading, closePanel, getSharedTasks, subscribeToTaskUpdates, unsubscribeFromTaskUpdates } = useSharedTaskStore();
  const { selectedUser, selectedGroup } = useChatStore();
  const { authUser } = useAuthStore();
  
  const [newTaskText, setNewTaskText] = useState("");

  const targetId = selectedGroup ? selectedGroup._id : selectedUser?._id;
  const isGroup = !!selectedGroup;

  useEffect(() => {
      if(targetId) {
          getSharedTasks(targetId, isGroup);
          subscribeToTaskUpdates();
      }
      return () => unsubscribeFromTaskUpdates();
  }, [targetId, isGroup]);

  const handleSubmit = (e) => {
      e.preventDefault();
      if(!newTaskText.trim()) return;
      addTask(newTaskText, targetId, isGroup);
      setNewTaskText("");
  };

  return (
    <div className="h-full w-72 bg-base-200 border-l border-base-300 flex flex-col shadow-xl z-20">
      {/* Header */}
      <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-100">
        <div className="flex items-center gap-2 font-semibold">
            <CheckSquare className="size-5 text-primary" />
            <span>Shared Tasks</span>
        </div>
        <button onClick={closePanel} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-4" />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isTasksLoading ? (
            <div className="flex justify-center py-4"><span className="loading loading-spinner"></span></div>
        ) : tasks.length === 0 ? (
            <div className="text-center text-base-content/40 py-8 text-sm">
                No tasks yet. <br/>Create one to collaborate!
            </div>
        ) : (
            tasks.map((task) => (
                <div key={task._id} className={`card bg-base-100 shadow-sm border border-base-300 ${task.isCompleted ? 'opacity-60' : ''}`}>
                    <div className="p-3 flex items-start gap-3">
                        <button 
                            onClick={() => toggleTask(task._id)}
                            className={`mt-0.5 transition-colors ${task.isCompleted ? 'text-success' : 'text-base-content/30 hover:text-primary'}`}
                        >
                            {task.isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm ${task.isCompleted ? 'line-through text-base-content/50' : ''}`}>{task.text}</p>
                            
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-base-content/40">
                                    by {task.createdBy?._id === authUser._id ? "You" : task.createdBy?.fullName}
                                </span>
                                {task.isCompleted && (
                                    <div className="flex items-center gap-1 text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded">
                                        <CheckCircle size={10} />
                                        <span>{task.completedBy?._id === authUser._id ? "You" : task.completedBy?.fullName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-base-100 border-t border-base-300">
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
                type="text" 
                className="input input-bordered input-sm flex-1 text-sm" 
                placeholder="Add new task..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm btn-square" disabled={!newTaskText.trim()}>
                <Plus size={18} />
            </button>
        </form>
      </div>
    </div>
  );
};

export default SharedTasksPanel;