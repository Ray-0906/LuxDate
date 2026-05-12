import { create } from 'zustand';

const useChatUIStore = create((set) => ({
  activeConversationGirlId: null,

  setActiveConversationGirlId: (girlId) => {
    set({ activeConversationGirlId: girlId ? String(girlId) : null });
  },
}));

export default useChatUIStore;
