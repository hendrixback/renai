"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircleIcon,
  ArrowUpIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Floating assistant widget (Spec §19.4).
 *
 * Bottom-right button → side sheet with a streaming chat. v6
 * useChat hook handles the streaming + transport; we provide the UI
 * shell. No state persists across page reloads in this version —
 * conversation history lives only in component state.
 *
 * Props:
 *  - provider/model are surfaced in the footer ("powered by …") so
 *    the customer always knows which LLM answered.
 */

export function AssistantWidget({
  provider,
  model,
}: {
  provider: string;
  model: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        className={cn(
          "fixed right-6 bottom-6 z-40 size-12 rounded-full shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
        aria-label="Open RenAI assistant"
        onClick={() => setOpen(true)}
      >
        <SparklesIcon className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-md flex-col gap-0 p-0 sm:max-w-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="text-primary size-4" />
              <div>
                <p className="text-sm font-semibold">RenAI assistant</p>
                <p className="text-muted-foreground text-xs">
                  Product help, not legal advice.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}
            {error ? (
              <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-3 text-xs">
                <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Couldn&apos;t reach the assistant.</p>
                  <p className="opacity-80">{error.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => clearError()}
                  className="hover:opacity-70"
                  aria-label="Dismiss error"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="bg-background border-t p-3"
          >
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a module, a field, or what's missing…"
                rows={2}
                disabled={isStreaming}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    handleSubmit(e);
                  }
                }}
                className="min-h-10 resize-none text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isStreaming}
                aria-label="Send message"
              >
                {isStreaming ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <ArrowUpIcon className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-[10px]">
              Powered by {provider} · {model}. Conversations are not stored.
            </p>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function EmptyState() {
  const SUGGESTIONS = [
    "How do I record Scope 1 fuel emissions?",
    "What does PEF mean?",
    "Why is my dashboard showing missing data?",
    "How do I import waste flows from a CSV?",
  ];
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 py-8 text-center">
      <SparklesIcon className="text-primary/60 size-8" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          How can I help you use RenAI?
        </p>
        <p className="text-xs">
          Ask about a module, a field, or what&apos;s missing on your account.
        </p>
      </div>
      <ul className="mt-2 flex w-full flex-col gap-1.5 text-xs">
        {SUGGESTIONS.map((s) => (
          <li key={s} className="text-muted-foreground/80 italic">
            &ldquo;{s}&rdquo;
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: { role: string; parts?: ReadonlyArray<unknown> };
}) {
  const isUser = message.role === "user";
  const text = extractText(message.parts ?? []);
  if (!text) return null;
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {text}
      </div>
    </div>
  );
}

function extractText(parts: ReadonlyArray<unknown>): string {
  // UIMessage parts in v6 are typed unions; we only render text parts
  // here since the assistant doesn't emit tool / file parts in MVP.
  const out: string[] = [];
  for (const p of parts) {
    if (
      typeof p === "object" &&
      p !== null &&
      "type" in p &&
      (p as { type: string }).type === "text" &&
      "text" in p
    ) {
      out.push((p as { text: string }).text);
    }
  }
  return out.join("");
}
