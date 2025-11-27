import { create } from "zustand";

export const useCallStore = create((set) => ({
  isCallModalOpen: false,
  isReceivingCall: false,
  callAccepted: false,
  callEnded: false,
  
  // Data about the incoming call
  callerName: "",
  callerId: "",
  callerSignal: null,
  callerPic: "",

  // Actions
  setIsCallModalOpen: (isOpen) => set({ isCallModalOpen: isOpen }),
  
  setIncomingCall: (data) => set({
    isReceivingCall: true,
    callerId: data.from,
    callerName: data.name,
    callerPic: data.profilePic,
    callerSignal: data.signal,
    isCallModalOpen: true, // Open modal immediately on incoming call
    callEnded: false
  }),

  acceptCallState: () => set({ callAccepted: true, isReceivingCall: false }),
  
  endCallState: () => set({
    isCallModalOpen: false,
    callAccepted: false,
    isReceivingCall: false,
    callEnded: true,
    callerSignal: null,
    callerId: "",
    callerName: "",
    callerPic: ""
  }),
}));