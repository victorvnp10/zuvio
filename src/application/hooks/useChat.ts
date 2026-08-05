import { useCallback, useEffect, useState } from "react";
import { ChatRepository } from "../../infrastructure/supabase/repositories/ChatRepository";
import { useAuth } from "../context/AuthContext";
import type { ChatMessage } from "../../domain/entities/types";

export function useChat(eventId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;

    setIsLoading(true);
    ChatRepository.listMessages(eventId)
      .then((data) => {
        if (isMounted) setMessages(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar o chat."))
      .finally(() => setIsLoading(false));

    const unsubscribe = ChatRepository.subscribeToMessages(eventId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [eventId]);

  const sendMessage = useCallback(
    async (texto: string) => {
      if (!eventId || !user || !texto.trim()) return;
      setIsSending(true);
      setError(null);
      try {
        await ChatRepository.sendMessage(eventId, user.id, texto.trim());
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível enviar — o chat só libera depois do quórum."
        );
      } finally {
        setIsSending(false);
      }
    },
    [eventId, user]
  );

  return { messages, isLoading, isSending, error, sendMessage };
}
