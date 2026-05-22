import { useState, useCallback, useRef } from 'react';
import { chatAPI } from '../utils/api';
import { generateId } from '../utils/helpers';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const abortRef = useRef(null);

  const sendMessage = useCallback(async (content, language = null) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setSuggestedQuestions([]);
    const convId = conversationId || generateId();
    if (!conversationId) setConversationId(convId);

    // Add user message immediately
    const userMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatAPI.sendMessage(content, convId, language);
      const data = response.data;

      // Add assistant response
      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.message,
        sources: data.sources,
        confidence: data.confidence,
        isLowConfidence: data.isLowConfidence,
        suggestedQuestions: data.suggestions || data.suggestedQuestions || [],
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Set suggested follow-up questions (backend returns "suggestions")
      const suggestions = data.suggestions || data.suggestedQuestions || [];
      if (suggestions.length > 0) {
        setSuggestedQuestions(suggestions);
      } else {
        setSuggestedQuestions([]);
      }
    } catch (err) {
      const errorMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        isError: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setError(err.message);
      setSuggestedQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setSuggestedQuestions([]);
  }, []);

  const loadConversation = useCallback(async (convId) => {
    try {
      setIsLoading(true);
      setSuggestedQuestions([]);
      const response = await chatAPI.getConversation(convId);
      setMessages(response.data.messages);
      setConversationId(convId);
    } catch (err) {
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    conversationId,
    error,
    suggestedQuestions,
    sendMessage,
    clearChat,
    loadConversation
  };
}
