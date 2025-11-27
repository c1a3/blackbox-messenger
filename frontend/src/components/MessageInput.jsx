import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Clock, Calendar, Flame, Smile } from "lucide-react"; // Added Smile
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react"; // Import Emoji Picker

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  
  // Ephemeral States
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [burnDuration, setBurnDuration] = useState(5);

  // Emoji State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
            setShowEmojiPicker(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiObject) => {
      setText((prev) => prev + emojiObject.emoji);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const maxSizeInBytes = 50 * 1024 * 1024; 
    if (file.size > maxSizeInBytes) {
        toast.error("Image file size too large (Max 50MB)");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    let sendTime = null;
    if (showScheduler && scheduleDateTime) {
      const parts = scheduleDateTime.split(/[-T:]/); 
      const localDate = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]);
      sendTime = localDate;

      if (isNaN(sendTime.getTime()) || sendTime <= new Date()) {
        toast.error("Please select a valid future date and time.");
        return;
      }
    }

    try {
      const payload = {
        text: text.trim(),
        image: imagePreview,
        isEphemeral: isEphemeral,
        ephemeralDuration: parseInt(burnDuration),
      };
      
      if (sendTime) payload.scheduledSendTime = sendTime.toISOString();

      await sendMessage(payload);

      if (sendTime) toast.success(`Message scheduled for ${sendTime.toLocaleString()}`);

      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowScheduler(false);
      setScheduleDateTime("");
      setIsEphemeral(false); 
      setShowEmojiPicker(false);

    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

   const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 1); 
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
   }

  return (
    <div className={`p-4 border-t border-base-300 relative transition-colors duration-300 ${isEphemeral ? "bg-orange-500/10" : "bg-base-100"}`}>
      
      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-20 left-4 z-50 shadow-2xl">
              <EmojiPicker onEmojiClick={handleEmojiClick} theme="auto" />
          </div>
      )}

      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-base-content/20"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-error-content
              flex items-center justify-center shadow hover:scale-110 transition-transform"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

        {showScheduler && (
            <div className="mb-3 p-3 bg-base-200 rounded-lg flex flex-col sm:flex-row items-center gap-2">
                <label htmlFor="scheduleDateTime" className="text-sm font-medium flex items-center gap-1 shrink-0">
                    <Calendar size={16}/> Schedule for:
                </label>
                <input
                    type="datetime-local"
                    id="scheduleDateTime"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    min={getMinDateTime()} 
                    className="input input-bordered input-sm w-full sm:w-auto flex-grow"
                    required
                />
                 <button type="button" onClick={() => { setShowScheduler(false); setScheduleDateTime(""); }} className="btn btn-xs btn-ghost text-error">
                    Cancel
                 </button>
            </div>
        )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-base-200 rounded-lg px-2">
          
          {/* Emoji Button */}
          <button
            type="button"
            className={`btn btn-ghost btn-sm btn-circle ${showEmojiPicker ? "text-primary" : "text-base-content/50"}`}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile size={20} />
          </button>

          <input
            type="text"
            className="flex-1 input bg-transparent focus:outline-none input-sm sm:input-md py-2"
            placeholder={isEphemeral ? `Self-destructs in ${burnDuration}s...` : "Type a message..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <button
            type="button"
            className={`btn btn-ghost btn-sm btn-circle ${imagePreview ? "text-primary" : "text-base-content/50"}`}
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
          >
            <Image size={18} />
          </button>
        </div>

         <div className="flex items-center bg-base-200 rounded-full">
             <button
                type="button"
                className={`btn btn-ghost btn-sm btn-circle ${isEphemeral ? "text-orange-500" : "text-base-content/50"}`}
                onClick={() => setIsEphemeral(!isEphemeral)}
                title="Burn after reading"
             >
                <Flame size={18} className={isEphemeral ? "fill-orange-500" : ""} />
             </button>
             
             {isEphemeral && (
                 <select 
                    value={burnDuration}
                    onChange={(e) => setBurnDuration(e.target.value)}
                    className="select select-ghost select-xs w-16 focus:outline-none text-orange-600 font-bold"
                 >
                     <option value={5}>5s</option>
                     <option value={10}>10s</option>
                     <option value={15}>15s</option>
                     <option value={30}>30s</option>
                     <option value={60}>60s</option>
                 </select>
             )}
         </div>

         <button
            type="button"
            className={`btn btn-ghost btn-sm btn-circle ${showScheduler ? "text-primary bg-primary/10" : "text-base-content/50"}`}
            onClick={() => setShowScheduler(!showScheduler)}
            title="Schedule message"
         >
            <Clock size={18} />
         </button>

        <button
          type="submit"
          className={`btn btn-sm btn-circle ${isEphemeral ? "btn-warning" : "btn-primary"}`}
          disabled={(!text.trim() && !imagePreview) || (showScheduler && !scheduleDateTime)}
          title={showScheduler ? "Schedule Send" : isEphemeral ? `Send Secret` : "Send"}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;