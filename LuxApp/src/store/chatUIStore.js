import { create } from 'zustand';

const useChatUIStore = create((set) => ({
  activeConversationGirlId: null,
  activeCallGirlId: null,

  setActiveConversationGirlId: (girlId) => {
    set({ activeConversationGirlId: girlId ? String(girlId) : null });
  },

  setActiveCallGirlId: (girlId) => {
    set({ activeCallGirlId: girlId ? String(girlId) : null });
  },
}));

export default useChatUIStore;
