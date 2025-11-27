import { useState } from "react";
import { X, Users, Info, Video } from "lucide-react"; 
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore"; 
import GroupInfoModal from "./GroupInfoModal";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, selectedGroup, setSelectedGroup } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { setIsCallModalOpen } = useCallStore();
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  const handleClose = () => {
      if (selectedUser) setSelectedUser(null);
      if (selectedGroup) setSelectedGroup(null);
  };

  if (!selectedUser && !selectedGroup) return null;

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative flex items-center justify-center bg-base-300">
              {selectedUser ? (
                  <img 
                    src={selectedUser.profilePic || "/avatar.png"} 
                    alt={selectedUser.fullName}
                    className="object-cover w-full h-full rounded-full" 
                  />
              ) : (
                   selectedGroup?.image ? (
                       <img 
                        src={selectedGroup.image} 
                        alt={selectedGroup.name}
                        className="object-cover w-full h-full rounded-full" 
                       />
                   ) : (
                       <Users className="size-6 text-base-content/60" />
                   )
              )}
            </div>
          </div>

          <div className="cursor-pointer" onClick={() => selectedGroup && setIsGroupInfoOpen(true)}>
            <h3 className="font-medium flex items-center gap-2">
                {selectedUser ? selectedUser.fullName : selectedGroup?.name}
            </h3>
            <p className="text-sm text-base-content/70">
              {selectedUser ? (
                  onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"
              ) : (
                  `${selectedGroup?.members?.length || 0} members`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
             {/* Video Call Button */}
             {selectedUser && (
                 <button 
                    onClick={() => setIsCallModalOpen(true)} 
                    className="btn btn-ghost btn-sm btn-circle text-primary hover:bg-primary/10"
                    title="Start Video Call"
                 >
                     <Video className="size-5" />
                 </button>
             )}

             {selectedGroup && (
                 <button onClick={() => setIsGroupInfoOpen(true)} className="btn btn-ghost btn-sm btn-circle" title="Group Info">
                     <Info className="size-5" />
                 </button>
             )}
            <button onClick={handleClose} className="btn btn-ghost btn-sm btn-circle">
                <X className="size-5" />
            </button>
        </div>
      </div>

      {isGroupInfoOpen && selectedGroup && (
          <GroupInfoModal onClose={() => setIsGroupInfoOpen(false)} />
      )}
    </div>
  );
};
export default ChatHeader;