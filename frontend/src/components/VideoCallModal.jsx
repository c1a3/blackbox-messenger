import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";
import { useChatStore } from "../store/useChatStore";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

// STUN servers
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.qa.qq.com:3478' },
  { urls: 'stun:stun.ipv4.google.com:19302' }
];

const VideoCallModal = () => {
  const { 
    isCallModalOpen, 
    setIsCallModalOpen,
    isReceivingCall,
    callerSignal,
    callerId,
    callerName,
    callerPic,
    acceptCallState,
    endCallState,
    callAccepted,
    callEnded
  } = useCallStore();

  const { authUser, socket } = useAuthStore();
  const { selectedUser } = useChatStore();

  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("idle");
  
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const isCallInitiated = useRef(false);

  // --- Helper: Get Media Stream ---
  const getMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMyStream(stream);
      return stream;
    } catch (err) {
      console.error("Failed to get media:", err);
      toast.error("Camera access denied. Check permissions!");
      setIsCallModalOpen(false); 
      return null;
    }
  };

  // 1. Caller: Auto-start media
  useEffect(() => {
    if (isCallModalOpen && !isReceivingCall && !myStream) {
      setIsInitializing(true);
      getMediaStream().then(() => setIsInitializing(false));
    }
  }, [isCallModalOpen, isReceivingCall]);

  // 2. Cleanup
  useEffect(() => {
    return () => {
       if (myStream) {
           myStream.getTracks().forEach(track => track.stop());
       }
       if (connectionRef.current) {
           connectionRef.current.destroy();
       }
       isCallInitiated.current = false;
       setRemoteStream(null);
       setMyStream(null);
       setConnectionStatus("idle");
    };
  }, [isCallModalOpen]);

  // 3. Attach Local Video
  useEffect(() => {
    if (myStream && myVideo.current) {
        myVideo.current.srcObject = myStream;
    }
  }, [myStream]);

  // 4. Attach Remote Video
  useEffect(() => {
    if (remoteStream && userVideo.current) {
        userVideo.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 5. INITIATE CALL (Caller)
  useEffect(() => {
    if (isCallModalOpen && !isReceivingCall && !callAccepted && myStream && selectedUser && !isCallInitiated.current) {
      
      console.log("Initiating Call to:", selectedUser.fullName);
      isCallInitiated.current = true; 
      setConnectionStatus("calling");

      try {
          const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: myStream,
            config: { iceServers: ICE_SERVERS }
          });

          peer.on("signal", (data) => {
            socket.emit("callUser", {
              userToCall: selectedUser._id,
              signalData: data,
              from: authUser._id,
              name: authUser.fullName,
              profilePic: authUser.profilePic,
            });
          });

          peer.on("stream", (stream) => {
            console.log("Caller received remote stream");
            setRemoteStream(stream);
            setConnectionStatus("connected");
          });

          peer.on("error", (err) => {
              console.error("Peer Error (Caller):", err);
              // Don't close immediately on error, allows retry
          });

          socket.on("callAccepted", (signal) => {
            console.log("Call Accepted by Receiver");
            acceptCallState();
            setConnectionStatus("connecting");
            peer.signal(signal);
          });

          connectionRef.current = peer;
      } catch (err) {
          console.error("Simple Peer Crash:", err);
      }
    }
  }, [isCallModalOpen, isReceivingCall, myStream, selectedUser, callAccepted]);

  // 6. ANSWER CALL (Receiver)
  const handleAnswerCall = async () => {
    console.log("Answering Call...");
    setConnectionStatus("connecting");
    
    // User gesture media request
    const stream = await getMediaStream();
    if (!stream) return; 

    acceptCallState();
    
    try {
        const peer = new Peer({
          initiator: false,
          trickle: false,
          stream: stream,
          config: { iceServers: ICE_SERVERS }
        });

        peer.on("signal", (data) => {
            socket.emit("answerCall", { signal: data, to: callerId });
        });

        peer.on("stream", (stream) => {
          console.log("Receiver received remote stream");
          setRemoteStream(stream); 
          setConnectionStatus("connected");
        });

        peer.on("error", (err) => console.error("Peer Error (Receiver):", err));

        peer.signal(callerSignal);
        connectionRef.current = peer;
    } catch (err) {
        console.error("Simple Peer Crash (Answer):", err);
    }
  };

  // 7. End Call (Robust)
  const leaveCall = () => {
    // Calculate target BEFORE clearing state
    // If I have a callerId in store, I was the receiver. Otherwise check selectedUser (Caller)
    const targetId = callerId || selectedUser?._id;
    
    console.log("Ending call. Notifying:", targetId);

    if(targetId) {
        socket.emit("endCall", { to: targetId });
    }

    if (connectionRef.current) connectionRef.current.destroy();
    endCallState();
    
    // Force reload to clear WebRTC state completely
    window.location.reload(); 
  };

  const toggleMic = () => {
    if (myStream) {
        const track = myStream.getAudioTracks()[0];
        if (track) {
            track.enabled = !micOn;
            setMicOn(!micOn);
        }
    }
  };

  const toggleCamera = () => {
    if (myStream) {
        const track = myStream.getVideoTracks()[0];
        if (track) {
            track.enabled = !cameraOn;
            setCameraOn(!cameraOn);
        }
    }
  };

  if (!isCallModalOpen) return null;

  const showRemoteVideo = callAccepted && remoteStream && connectionStatus === "connected";
  const showConnecting = callAccepted && (!remoteStream || connectionStatus === "connecting");
  const showIncomingUI = !callAccepted && isReceivingCall;
  const showCallingUI = !callAccepted && !isReceivingCall;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-base-300 w-full max-w-4xl h-[80vh] md:h-auto md:aspect-video rounded-2xl overflow-hidden flex flex-col shadow-2xl relative border border-base-content/10">
        
        {/* Fallback Close Button (Top Right) */}
        <button 
            onClick={leaveCall} 
            className="absolute top-4 right-4 z-50 btn btn-circle btn-sm btn-ghost bg-black/20 hover:bg-black/40 text-white border-none"
        >
            <X size={20} />
        </button>

        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
            
            {/* 1. REMOTE VIDEO */}
            {showRemoteVideo && (
                <video 
                    playsInline 
                    ref={userVideo} 
                    autoPlay 
                    className="w-full h-full object-cover" 
                />
            )}

            {/* 2. CONNECTING STATE */}
            {showConnecting && (
                <div className="flex flex-col items-center gap-3 text-white/70">
                    <Loader2 className="size-12 animate-spin text-primary" />
                    <p className="text-lg font-medium">Connecting secure channel...</p>
                </div>
            )}

            {/* 3. INCOMING CALL UI */}
            {showIncomingUI && (
                <div className="text-center z-20">
                    <div className="avatar mb-6">
                        <div className="w-32 rounded-full ring ring-success ring-offset-base-100 ring-offset-2 shadow-xl animate-pulse">
                            <img src={callerPic || "/avatar.png"} alt={callerName} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">{callerName}</h3>
                    <p className="text-white/60">Incoming Video Call...</p>
                </div>
            )}

            {/* 4. OUTGOING CALL UI */}
            {showCallingUI && (
                <div className="text-center z-20">
                    <div className="avatar mb-6">
                        <div className="w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 shadow-xl">
                            <img src={selectedUser?.profilePic || "/avatar.png"} alt={selectedUser?.fullName} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">{selectedUser?.fullName}</h3>
                    <p className="text-white/60 flex items-center justify-center gap-2">
                        {isInitializing ? "Accessing Camera..." : "Calling..."}
                        {isInitializing && <Loader2 className="size-4 animate-spin" />}
                    </p>
                </div>
            )}

            {/* 5. MY LOCAL VIDEO (PIP) - Z-index ensures it stays on top of remote video */}
            {myStream && (
                <div className="absolute bottom-4 right-4 w-32 h-48 md:w-48 md:h-36 bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-white/20 z-30">
                    <video 
                        playsInline 
                        muted 
                        ref={myVideo} 
                        autoPlay 
                        className={`w-full h-full object-cover ${!cameraOn ? 'hidden' : ''} transform scale-x-[-1]`} 
                    />
                    {!cameraOn && (
                        <div className="w-full h-full flex items-center justify-center text-white/50 bg-zinc-800">
                            <VideoOff className="size-8" />
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* FOOTER CONTROLS - High Z-Index to ensure visibility */}
        <div className="h-24 bg-base-300/80 backdrop-blur flex items-center justify-center gap-6 border-t border-base-content/10 z-50 relative">
            <button onClick={toggleMic} className={`btn btn-circle btn-lg ${micOn ? 'btn-ghost bg-base-100' : 'btn-error'}`}>
                {micOn ? <Mic /> : <MicOff />}
            </button>
            
            <button onClick={toggleCamera} className={`btn btn-circle btn-lg ${cameraOn ? 'btn-ghost bg-base-100' : 'btn-error'}`}>
                {cameraOn ? <Video /> : <VideoOff />}
            </button>

            {/* ANSWER BUTTON */}
            {isReceivingCall && !callAccepted && (
                <button onClick={handleAnswerCall} className="btn btn-circle btn-lg btn-success shadow-lg hover:scale-110 transition-transform">
                    <Phone className="size-8" />
                </button>
            )}

            {/* HANG UP BUTTON */}
            <button onClick={leaveCall} className="btn btn-circle btn-lg btn-error shadow-lg hover:scale-110 transition-transform">
                <PhoneOff className="size-8" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;