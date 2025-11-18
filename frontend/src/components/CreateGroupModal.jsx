import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { X, Loader2, Check } from "lucide-react";

const CreateGroupModal = ({ onClose }) => {
  const { users } = useChatStore();
  const { createGroup, isCreatingGroup } = useGroupStore();
  
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  const toggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;

    const success = await createGroup({
      name: groupName,
      members: selectedMembers,
    });

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Create New Group</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          <form id="create-group-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Group Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="e.g., Weekend Trip"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Select Members ({selectedMembers.length})</span>
              </label>
              <div className="bg-base-200 rounded-lg p-2 max-h-60 overflow-y-auto space-y-2">
                {users.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => toggleMember(user._id)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                      selectedMembers.includes(user._id)
                        ? "bg-primary/20 hover:bg-primary/30"
                        : "hover:bg-base-300"
                    }`}
                  >
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.fullName}</p>
                    </div>
                    {selectedMembers.includes(user._id) && (
                      <Check className="size-5 text-primary" />
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                    <p className="text-center text-sm text-gray-500 py-4">No users available</p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-300 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-ghost" type="button">
            Cancel
          </button>
          <button
            type="submit"
            form="create-group-form"
            className="btn btn-primary"
            disabled={!groupName.trim() || selectedMembers.length === 0 || isCreatingGroup}
          >
            {isCreatingGroup ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Group"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;