import { useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/mock-data";

interface ChatBarProps {
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void> | void;
  isSending?: boolean;
}

export function ChatBar({ messages, onSend, isSending = false }: ChatBarProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSend = async () => {
    const nextMessage = input.trim();
    if (!nextMessage || isSending) return;

    setInput("");
    await onSend(nextMessage);
  };

  return (
    <div className="rounded-lg border bg-card">
      {isExpanded && (
        <ScrollArea className="h-64 p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2 text-sm",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {msg.role === "assistant" && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2",
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="h-3.5 w-3.5 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      <div className="flex items-center gap-2 p-3">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs text-muted-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Hide" : "Chat"}
        </Button>
        <Input
          placeholder="Type a command... (e.g. 'submit all pending removals')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSend()}
          onFocus={() => setIsExpanded(true)}
          className="text-sm"
          disabled={isSending}
        />
        <Button size="icon" onClick={() => void handleSend()} disabled={!input.trim() || isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}