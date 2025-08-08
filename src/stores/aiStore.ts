import { create } from 'zustand';
import { Message, Conversation, AIResponse, ConversationContext, AIError } from '../types/ai';
import { aiService } from '../services/aiService';

interface AIState {
  // 当前对话状态
  currentConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: AIError | null;
  
  // 对话列表
  conversations: Conversation[];
  isLoadingConversations: boolean;
  
  // AI配置
  context: ConversationContext;
  
  // 输入状态
  inputValue: string;
  
  // 操作方法
  setInputValue: (value: string) => void;
  sendMessage: (message: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadConversationHistory: (conversationId: string) => Promise<void>;
  createNewConversation: () => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  setContext: (context: Partial<ConversationContext>) => void;
  clearError: () => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  // 初始状态
  currentConversationId: null,
  messages: [],
  isLoading: false,
  error: null,
  conversations: [],
  isLoadingConversations: false,
  context: {
    connectionId: '',
  },
  inputValue: '',
  
  // 设置输入值
  setInputValue: (value: string) => {
    set({ inputValue: value });
  },
  
  // 发送消息
  sendMessage: async (message: string) => {
    const state = get();
    
    if (!message.trim() || state.isLoading) {
      return;
    }
    
    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      createdAt: new Date(),
    };
    
    set({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
      inputValue: '',
    });
    
    try {
      // 调用AI服务
      const response: AIResponse = await aiService.chat({
        message,
        conversationId: state.currentConversationId || undefined,
        databaseSchema: state.context.databaseSchema,
        context: state.context,
      });
      
      // 添加AI回复
      const assistantMessage: Message = {
        id: Date.now().toString() + '_ai',
        role: 'assistant',
        content: response.response,
        queryData: response.query ? {
          query: response.query,
          collection: state.context.collection || '',
          database: state.context.database || '',
        } : undefined,
        createdAt: new Date(),
      };
      
      set({
        messages: [...get().messages, assistantMessage],
        currentConversationId: response.conversationId,
        isLoading: false,
      });
      
      // 如果是新对话，刷新对话列表
      if (!state.currentConversationId) {
        get().loadConversations();
      }
      
    } catch (error) {
      console.error('发送消息失败:', error);
      set({
        isLoading: false,
        error: {
          code: 'SEND_MESSAGE_FAILED',
          message: error instanceof Error ? error.message : '发送消息失败',
        },
      });
    }
  },
  
  // 加载对话列表
  loadConversations: async () => {
    set({ isLoadingConversations: true });
    
    try {
      const conversations = await aiService.getConversations();
      set({ 
        conversations,
        isLoadingConversations: false,
      });
    } catch (error) {
      console.error('加载对话列表失败:', error);
      set({
        isLoadingConversations: false,
        error: {
          code: 'LOAD_CONVERSATIONS_FAILED',
          message: error instanceof Error ? error.message : '加载对话列表失败',
        },
      });
    }
  },
  
  // 加载对话历史
  loadConversationHistory: async (conversationId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const history = await aiService.getConversationHistory(conversationId);
      set({
        currentConversationId: conversationId,
        messages: history.messages,
        isLoading: false,
      });
    } catch (error) {
      console.error('加载对话历史失败:', error);
      set({
        isLoading: false,
        error: {
          code: 'LOAD_HISTORY_FAILED',
          message: error instanceof Error ? error.message : '加载对话历史失败',
        },
      });
    }
  },
  
  // 创建新对话
  createNewConversation: () => {
    set({
      currentConversationId: null,
      messages: [],
      error: null,
      inputValue: '',
    });
  },
  
  // 删除对话
  deleteConversation: async (conversationId: string) => {
    try {
      await aiService.deleteConversation(conversationId);
      
      const state = get();
      
      // 从列表中移除对话
      set({
        conversations: state.conversations.filter(conv => conv.id !== conversationId),
      });
      
      // 如果删除的是当前对话，清空消息
      if (state.currentConversationId === conversationId) {
        set({
          currentConversationId: null,
          messages: [],
        });
      }
      
    } catch (error) {
      console.error('删除对话失败:', error);
      set({
        error: {
          code: 'DELETE_CONVERSATION_FAILED',
          message: error instanceof Error ? error.message : '删除对话失败',
        },
      });
    }
  },
  
  // 设置上下文
  setContext: (newContext: Partial<ConversationContext>) => {
    const state = get();
    set({
      context: {
        ...state.context,
        ...newContext,
      },
    });
  },
  
  // 清除错误
  clearError: () => {
    set({ error: null });
  },
  
  // 清空消息
  clearMessages: () => {
    set({
      messages: [],
      currentConversationId: null,
    });
  },
}));

export default useAIStore;