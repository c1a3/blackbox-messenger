import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react"; 

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Flame } from "lucide-react"; // Import Flame

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup, 
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageListRef = useRef(null); 
  const messageEndRef = useRef(null); 

  const [showDeleteOptionsFor, setShowDeleteOptionsFor] = useState(null);

  const targetId = selectedUser?._id || selectedGroup?._id;

  useEffect(() => {
    if (targetId) {
        getMessages(targetId);
        subscribeToMessages();
    } else {
        unsubscribeFromMessages();
    }
    return () => unsubscribeFromMessages();
  }, [targetId, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    scrollToBottom();
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]); 

  // --- NEW: EMIT VIEWED EVENT ---
  useEffect(() => {
      // Check if there are ephemeral messages from others that need burning
      const hasEphemeral = messages.some(
          m => m.isEphemeral && m.senderId !== authUser._id
      );

      if (hasEphemeral && socket && targetId) {
          console.log("Viewing ephemeral messages...");
          socket.emit("messagesViewed", { 
              peerId: targetId, 
              isGroup: !!selectedGroup 
          });
      }
  }, [messages, targetId, selectedGroup, authUser._id, socket]);


  const handleShowDeleteOptions = (messageId, event) => {
     event.stopPropagation(); 
     setShowDeleteOptionsFor(prev => (prev === messageId ? null : messageId));
  };

   const handleDelete = (messageId, deleteType, event) => {
    event.stopPropagation(); 
    deleteMessage(messageId, deleteType);
    setShowDeleteOptionsFor(null); 
  };

   useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeleteOptionsFor && !event.target.closest('.chat-bubble-container')) {
        setShowDeleteOptionsFor(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDeleteOptionsFor]); 


  if (!selectedUser && !selectedGroup) {
      return <div className="flex-1 flex items-center justify-center">Select a chat</div>;
  }

  if (isMessagesLoading && messages.length === 0) { 
    return (
      <div className="flex-1 flex flex-col overflow-hidden"> 
        <ChatHeader />
        <div className="flex-1 overflow-y-auto"> 
            <MessageSkeleton />
        </div>
        <MessageInput />
      </div>
    );
  }

   const visibleMessages = messages.filter(message =>
    !(message.deletedFor && message.deletedFor.includes(authUser._id))
   );

   const getSenderAvatar = (message) => {
       if (message.senderId === authUser._id) return authUser.profilePic || "/avatar.png";
       if (selectedUser) return selectedUser.profilePic || "/avatar.png";
       if (selectedGroup) {
           const member = selectedGroup.members.find(m => m._id === message.senderId);
           return member?.profilePic || "/avatar.png";
       }
       return "/avatar.png";
   }
   
   const getSenderName = (message) => {
        if (message.senderId === authUser._id) return "You";
        if (selectedGroup) {
            const member = selectedGroup.members.find(m => m._id === message.senderId);
            return member?.fullName || "Unknown";
        }
        return selectedUser?.fullName;
   }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-base-200"> 
      <ChatHeader />

      <div ref={messageListRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"> 
         {visibleMessages.length === 0 && !isMessagesLoading && (
            <div className="text-center text-gray-500 mt-10">No messages yet.</div>
         )}
         {visibleMessages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-base-content/10"> 
                <img
                   src={getSenderAvatar(message)}
                   alt="profile pic"
                   className="rounded-full"
                />
              </div>
            </div>

             {selectedGroup && message.senderId !== authUser._id && (
                 <div className="chat-header mb-1 text-xs opacity-50">
                     {getSenderName(message)}
                 </div>
             )}

             <div className="relative chat-bubble-container">
                 <div
                    className={`chat-bubble flex flex-col max-w-xs md:max-w-md ${
                        message.senderId === authUser._id
                         ? 'bg-primary text-primary-content'
                         : 'bg-base-100 text-base-content'
                        } ${message.senderId === authUser._id ? 'cursor-pointer' : ''} shadow 
                        ${message.isEphemeral ? 'border-2 border-orange-500' : ''}`} // Visual Cue
                    onClick={(e) => message.senderId === authUser._id && handleShowDeleteOptions(message._id, e)} 
                 >
                    {message.isEphemeral && (
                        <div className="flex items-center gap-1 text-xs text-orange-500 font-bold mb-1">
                            <Flame size={12} fill="currentColor" />
                            <span>Secret Message</span>
                        </div>
                    )}

                    {message.image && message.text !== "🚫 This message was deleted" && (
                        <img
                        src={message.image}
                        alt="Attachment"
                        className="w-full max-w-[180px] md:max-w-[220px] rounded-md mb-2 object-cover" 
                        />
                    )}
                    {message.text && (
                        <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p> 
                    )}
                    <div className={`text-xs mt-1 ${message.senderId === authUser._id ? 'text-primary-content/60' : 'text-base-content/60'} text-right`}>
                        {formatMessageTime(message.createdAt)}
                    </div>
                 </div>

                 {showDeleteOptionsFor === message._id && message.senderId === authUser._id && (
                     <div className={`absolute z-10 mt-1 p-1 w-32 bg-base-300 border border-base-content/20 rounded-md shadow-lg ${message.senderId === authUser._id ? 'right-0' : 'left-0'}`}>
                        <button
                            onClick={(e) => handleDelete(message._id, 'me', e)} 
                            className="block w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-base-100 rounded"
                        >
                            Delete for me
                        </button>
                        <button
                            onClick={(e) => handleDelete(message._id, 'everyone', e)} 
                            className="block w-full text-left px-3 py-1.5 text-xs text-red-700 hover:bg-base-100 rounded"
                        >
                            Delete for everyone
                        </button>
                    </div>
                 )}
            </div>
          </div>
        ))}
         <div ref={messageEndRef} style={{ height: '1px' }} />
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;