import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
// import Footer from "../components/Footer";

const HomePage = () => {
  // Destructure selectedGroup as well
  const { selectedUser, selectedGroup } = useChatStore();

  return (
    <>
      <div className="h-screen bg-base-200">
        <div className="flex items-center justify-center pt-20 px-4">
          <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
            <div className="flex h-full rounded-lg overflow-hidden">
              <Sidebar />

              {/* Update logic: Show ChatContainer if EITHER a user OR a group is selected */}
              {!selectedUser && !selectedGroup ? <NoChatSelected /> : <ChatContainer />}
            </div>
          </div>
        </div>
      </div>
      {/* <Footer /> */}
    </>
  );
};
export default HomePage;