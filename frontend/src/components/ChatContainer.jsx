import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react"; // Import useState

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
// Removed Trash icon import as it's not used directly in this refined version
// Consider using a library like Headless UI for a more robust dropdown/menu

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage, // Import deleteMessage action
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageListRef = useRef(null); // Ref for the scrollable message list area
  const messageEndRef = useRef(null); // Ref for the bottom marker

  // State to manage which message's delete options are shown (using ID)
  const [showDeleteOptionsFor, setShowDeleteOptionsFor] = useState(null);

  useEffect(() => {
    // Subscribe and fetch messages when a user is selected
    if (selectedUser?._id) {
        getMessages(selectedUser._id);
        subscribeToMessages();
    } else {
        // Clear listeners if no user is selected
        unsubscribeFromMessages();
    }

    // Cleanup listeners when component unmounts or selected user changes
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id]); // Rerun effect if selectedUser._id changes

  useEffect(() => {
    // Scroll logic: Scroll to bottom when messages change
    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Scroll immediately and after a short delay to handle potential rendering delays
    scrollToBottom();
    const timer = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timer);
  }, [messages]); // Rerun effect when messages array changes


  const handleShowDeleteOptions = (messageId, event) => {
     event.stopPropagation(); // Prevent triggering clicks on underlying elements
     // Toggle visibility of delete options for the clicked message
     setShowDeleteOptionsFor(prev => (prev === messageId ? null : messageId));
  };

   const handleDelete = (messageId, deleteType, event) => {
    event.stopPropagation(); // Prevent event bubbling
    deleteMessage(messageId, deleteType);
    setShowDeleteOptionsFor(null); // Hide options after triggering delete
  };

  // Close delete options if clicking outside
   useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the message bubbles or delete options
      // This is a simplified check; more robust checks might be needed
      if (showDeleteOptionsFor && !event.target.closest('.chat-bubble-container')) {
        setShowDeleteOptionsFor(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDeleteOptionsFor]); // Only add/remove listener when showDeleteOptionsFor changes


  if (!selectedUser) {
      // You might want to render the <NoChatSelected /> component here instead
      return <div className="flex-1 flex items-center justify-center">Select a chat</div>;
  }

  // Handle loading state
  if (isMessagesLoading && messages.length === 0) { // Show skeleton only on initial load
    return (
      <div className="flex-1 flex flex-col overflow-hidden"> {/* Use overflow-hidden */}
        <ChatHeader />
        <div className="flex-1 overflow-y-auto"> {/* Scrollable skeleton area */}
            <MessageSkeleton />
        </div>
        <MessageInput />
      </div>
    );
  }

   // Filter messages: exclude those marked as deleted for the current user
   const visibleMessages = messages.filter(message =>
    !(message.deletedFor && message.deletedFor.includes(authUser._id))
   );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-base-200"> {/* Use overflow-hidden */}
      <ChatHeader />

        {/* Message List Area */}
      <div ref={messageListRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"> {/* Add custom-scrollbar class if needed */}
         {visibleMessages.length === 0 && !isMessagesLoading && (
            <div className="text-center text-gray-500 mt-10">No messages yet.</div>
         )}
         {visibleMessages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-base-content/10"> {/* Slightly smaller avatar on mobile */}
                <img
                   src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                  className="rounded-full"
                />
              </div>
            </div>
             {/* Container for bubble and options */}
             <div className="relative chat-bubble-container">
                {/* Message Bubble */}
                 <div
                    className={`chat-bubble flex flex-col max-w-xs md:max-w-md ${
                        message.senderId === authUser._id
                         ? 'bg-primary text-primary-content'
                         : 'bg-base-100 text-base-content'
                        } ${message.senderId === authUser._id ? 'cursor-pointer' : ''} shadow`} // Add shadow, conditional cursor
                    onClick={(e) => message.senderId === authUser._id && handleShowDeleteOptions(message._id, e)} // Pass event
                 >
                    {/* Render Image if not deleted for everyone */}
                    {message.image && message.text !== "🚫 This message was deleted" && (
                        <img
                        src={message.image}
                        alt="Attachment"
                        className="w-full max-w-[180px] md:max-w-[220px] rounded-md mb-2 object-cover" // Responsive max-width
                        />
                    )}
                    {/* Render Text */}
                    {message.text && (
                        <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p> // Allows line breaks, breaks long words
                    )}
                    {/* Timestamp */}
                    <div className={`text-xs mt-1 ${message.senderId === authUser._id ? 'text-primary-content/60' : 'text-base-content/60'} text-right`}>
                        {formatMessageTime(message.createdAt)}
                    </div>
                 </div>

                 {/* Delete Options Popover */}
                 {showDeleteOptionsFor === message._id && message.senderId === authUser._id && (
                     <div className={`absolute z-10 mt-1 p-1 w-32 bg-base-300 border border-base-content/20 rounded-md shadow-lg ${message.senderId === authUser._id ? 'right-0' : 'left-0'}`}>
                        <button
                            onClick={(e) => handleDelete(message._id, 'me', e)} // Pass event
                            className="block w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-base-100 rounded"
                        >
                            Delete for me
                        </button>
                        {/* Optionally add time limit logic here */}
                        <button
                            onClick={(e) => handleDelete(message._id, 'everyone', e)} // Pass event
                            className="block w-full text-left px-3 py-1.5 text-xs text-red-700 hover:bg-base-100 rounded"
                        >
                            Delete for everyone
                        </button>
                    </div>
                 )}
            </div>
          </div>
        ))}
         {/* Invisible element to mark the end for scrolling */}
         <div ref={messageEndRef} style={{ height: '1px' }} />
      </div>

        {/* Message Input Area */}
      <MessageInput />
    </div>
  );
};
export default ChatContainer;