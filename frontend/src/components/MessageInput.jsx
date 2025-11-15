import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Clock, Calendar } from "lucide-react"; // Added Clock, Calendar
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  // +++ State for scheduling +++
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  // ++++++++++++++++++++++++++++

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return; // Handle case where user cancels file selection
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
     // Check file size (e.g., limit to 4MB)
     const maxSizeInBytes = 4 * 1024 * 1024;
     if (file.size > maxSizeInBytes) {
         toast.error("Image file size should be less than 4MB");
         return;
     }


    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readDataAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Modified handleSendMessage ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    // Validate schedule time if set
    let sendTime = null;
    if (showScheduler && scheduleDateTime) {
      
      // *** FIX FOR BROWSER INCONSISTENCY ***
      // new Date("YYYY-MM-DDTHH:mm") is ambiguous.
      // We must first create a date object from the string, which Firefox
      // correctly treats as local time, and *then* get its ISO string.
      // But to be 100% safe, we parse the components.
      
      // A more robust way to parse the "datetime-local" string as local time
      const parts = scheduleDateTime.split(/[-T:]/); // [YYYY, MM, DD, HH, mm]
      // Note: Month is 0-indexed in JS Date, so subtract 1
      const localDate = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]);
      sendTime = localDate;
      // *** END FIX ***

      if (isNaN(sendTime.getTime()) || sendTime <= new Date()) {
        toast.error("Please select a valid future date and time for scheduling.");
        return;
      }
    }

    try {
      const payload = {
        text: text.trim(),
        image: imagePreview,
      };
      if (sendTime) {
        payload.scheduledSendTime = sendTime.toISOString(); // Send unambiguous ISO string
      }

      await sendMessage(payload);

        // Indicate scheduling success
        if (sendTime) {
             toast.success(`Message scheduled for ${sendTime.toLocaleString()}`);
        }

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Reset scheduler
      setShowScheduler(false);
      setScheduleDateTime("");

    } catch (error) {
      console.error("Failed to send/schedule message:", error);
      // Toast error is likely handled in the store action
    }
  };
  // --- End Modified handleSendMessage ---

  // Get minimum datetime for scheduler input (now + 1 minute)
   const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 1); // Set minimum time to 1 minute in the future
        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
   }

  return (
    <div className="p-4 border-t border-base-300 bg-base-100"> {/* Added background */}
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg border border-base-content/20"
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

       {/* Scheduler Input Area */}
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
                    min={getMinDateTime()} // Prevent scheduling in the past
                    className="input input-bordered input-sm w-full sm:w-auto flex-grow"
                    required // Make required if scheduler is shown
                />
                 <button
                    type="button"
                    onClick={() => { setShowScheduler(false); setScheduleDateTime(""); }}
                    className="btn btn-xs btn-ghost text-error"
                 >
                    Cancel
                 </button>
            </div>
        )}

      {/* Main Input Form */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        {/* Text Input and Image Button */}
        <div className="flex-1 flex items-center gap-2 bg-base-200 rounded-lg px-2"> {/* Group input/buttons */}
          <input
            type="text"
            className="flex-1 input bg-transparent focus:outline-none input-sm sm:input-md py-2" // Adjusted styling
            placeholder="Type a message..."
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
            className={`btn btn-ghost btn-sm btn-circle
                     ${imagePreview ? "text-primary" : "text-base-content/50"}`}
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
          >
            <Image size={18} />
          </button>
        </div>

          {/* Schedule Toggle Button */}
         <button
            type="button"
            className={`btn btn-ghost btn-sm btn-circle ${showScheduler ? "text-primary bg-primary/10" : "text-base-content/50"}`}
            onClick={() => setShowScheduler(!showScheduler)}
            title="Schedule message"
         >
            <Clock size={18} />
         </button>

        {/* Send Button */}
        <button
          type="submit"
          className="btn btn-primary btn-sm btn-circle" // Consistent size
          disabled={(!text.trim() && !imagePreview) || (showScheduler && !scheduleDateTime)} // Disable if scheduling but no time set
          title={showScheduler ? "Schedule Send" : "Send"}
        >
          <Send size={18} /> {/* Consistent size */}
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
