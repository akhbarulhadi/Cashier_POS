"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Bot,
  User,
  Plus,
  MessageSquare,
  Trash2,
  Loader2,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hello! I am your AI Business Advisor. Ask me anything about your store's business strategy based on recent sales data.",
};

export function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Load specific session
  const loadSession = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/chat-sessions/${id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const loadedMessages: ChatMessage[] = json.data.messages.map(
          (m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          })
        );
        setMessages(
          loadedMessages.length > 0 ? loadedMessages : [WELCOME_MESSAGE]
        );
        setSessionId(id);
        setShowHistory(false);
      } else {
        toast.error("Failed to load chat session.");
      }
    } catch {
      toast.error("Failed to load chat session.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load chat session list on component mount
  const fetchSessions = useCallback(async (autoLoadLatest = false) => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch("/api/ai/chat-sessions");
      const json = await res.json();
      if (res.ok && json.success) {
        setSessions(json.data);
        if (autoLoadLatest && json.data.length > 0) {
          loadSession(json.data[0].id);
        }
      }
    } catch {
      // Silent fail, sessions are optional
    } finally {
      setIsLoadingSessions(false);
    }
  }, [loadSession]);

  useEffect(() => {
    fetchSessions(true);
  }, [fetchSessions]);

  // Delete session
  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/ai/chat-sessions/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (sessionId === id) {
          handleNewSession();
        }
        toast.success("Chat session deleted.");
      }
    } catch {
      toast.error("Failed to delete chat session.");
    }
  };

  // Start new session
  const handleNewSession = () => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
    setInput("");
    setShowHistory(false);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    // Don't include WELCOME_MESSAGE which has no ID to the API
    const apiMessages = nextMessages
      .filter((m) => m !== WELCOME_MESSAGE)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: apiMessages.slice(-30),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to get AI response.");
      }

      // Set sessionId from response if newly created
      if (json.data.sessionId && !sessionId) {
        setSessionId(json.data.sessionId);
        // Refresh session list
        fetchSessions();
      }

      setMessages((prev) => [...prev, { role: "assistant", content: json.data.reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was a problem connecting to AI. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[600px] rounded-xl border bg-card overflow-hidden">
      {/* Chat History Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r bg-muted/30 transition-all duration-200",
          showHistory ? "w-64" : "w-0 border-r-0"
        )}
      >
        {showHistory && (
          <>
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground">Chat History</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleNewSession}
                title="New Session"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingSessions ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">
                  No chat history yet.
                </p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs hover:bg-muted/60 transition-colors border-b border-border/50",
                      sessionId === session.id && "bg-muted"
                    )}
                  >
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{session.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {session._count.messages} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="shrink-0 rounded p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header bar */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowHistory(!showHistory)}
            title="Chat History"
          >
            <History className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-muted-foreground truncate flex-1">
            {sessionId
              ? sessions.find((s) => s.id === sessionId)?.title || "Active Session"
              : "New Session"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleNewSession}
          >
            <Plus className="h-3 w-3" />
            New Session
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={cn(
                "flex items-start gap-3",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>
                  {message.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
                AI is typing...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 border-t p-3">
          <Textarea
            placeholder="Ask something about your business..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] resize-none"
            rows={1}
          />
          <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
