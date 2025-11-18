import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { X, Camera, Users, Crown } from "lucide-react";
import toast from "react-hot-toast";

const GroupInfoModal = ({ onClose }) => {
  const { selectedGroup } = useChatStore();
  const { updateGroupProfile, isUpdatingGroup } = useGroupStore();
  const { authUser } = useAuthStore();
  
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  if (!selectedGroup) return null;

  const isAdmin = selectedGroup.admin === authUser._id;

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64Image = reader.result;
        setImagePreview(base64Image);
        await updateGroupProfile(selectedGroup._id, { image: base64Image });
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Group Info</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
             {/* Group Icon & Name */}
             <div className="flex flex-col items-center gap-4 mb-6">
                <div className="relative">
                    <div className="size-24 rounded-full overflow-hidden border-4 border-base-200 flex items-center justify-center bg-base-300">
                        {imagePreview || selectedGroup.image ? (
                            <img 
                                src={imagePreview || selectedGroup.image} 
                                alt={selectedGroup.name} 
                                className="size-full object-cover"
                            />
                        ) : (
                            <Users className="size-10 text-base-content/50" />
                        )}
                    </div>
                    {isAdmin && (
                         <label 
                            htmlFor="group-avatar-upload"
                            className={`absolute bottom-0 right-0 bg-primary text-primary-content p-2 rounded-full cursor-pointer hover:bg-primary/80 transition-colors shadow-lg ${isUpdatingGroup ? 'animate-pulse pointer-events-none' : ''}`}
                         >
                             <Camera className="size-4" />
                             <input 
                                type="file" 
                                id="group-avatar-upload" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageChange}
                                ref={fileInputRef}
                             />
                         </label>
                    )}
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold">{selectedGroup.name}</h3>
                    <p className="text-sm text-base-content/60">{selectedGroup.members.length} members</p>
                </div>
             </div>

             {/* Members List */}
             <div className="space-y-4">
                 <h4 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider">Members</h4>
                 <div className="space-y-2">
                     {selectedGroup.members.map((member) => (
                         <div key={member._id} className="flex items-center gap-3 p-2 hover:bg-base-200 rounded-lg transition-colors">
                             <img 
                                src={member.profilePic || "/avatar.png"} 
                                alt={member.fullName}
                                className="size-10 rounded-full object-cover border border-base-300" 
                             />
                             <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2">
                                     <span className="font-medium truncate">{member.fullName}</span>
                                     {member._id === selectedGroup.admin && (
                                         <span className="text-yellow-500 tooltip tooltip-right" data-tip="Admin">
                                             <Crown className="size-3.5 fill-current" />
                                         </span>
                                     )}
                                     {member._id === authUser._id && (
                                         <span className="text-xs bg-base-300 px-1.5 py-0.5 rounded">You</span>
                                     )}
                                 </div>
                                 <div className="text-xs text-base-content/50 truncate">{member.email}</div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;