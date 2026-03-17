"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Send, User, Shield, Bot, Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCertificationMessages,
  useCertificationActions,
  useCertificationStatus,
} from "@/hooks/useCertification";
import { useUser } from "@/lib/auth";
import type { CertificationMessage } from "@/types/certification";

interface CertificationMessagesSheetProps {
  workoutId: string;
  workoutTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Side sheet for viewing and sending certification messages.
 */
export function CertificationMessagesSheet({
  workoutId,
  workoutTitle,
  open,
  onOpenChange,
}: CertificationMessagesSheetProps) {
  const { user } = useUser();
  const { messages, loading, error, unreadCount } =
    useCertificationMessages(workoutId);
  const { status } = useCertificationStatus(workoutId);
  const { sendMessage, markRead, isSending } = useCertificationActions();

  const [newMessage, setNewMessage] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<
    Map<string, CertificationMessage>
  >(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_MESSAGE_LENGTH = 5000;

  // Helper to safely get timestamp for sorting
  const getCreatedAtTime = (message: CertificationMessage): number => {
    const createdAt = message.created_at;
    if (!createdAt) {
      // Fallback for messages without timestamp (should not happen, but defensive)
      // Use 0 to sort these messages first, or use a very old timestamp to sort them last
      return 0;
    }
    if (createdAt instanceof Date) {
      return createdAt.getTime();
    }
    // Timestamp from Firestore has toMillis() method
    return createdAt.toMillis();
  };

  // Merge real messages with optimistic messages
  const displayMessages = useMemo(() => {
    const realMessageIds = new Set(messages.map((m) => m.id));
    const optimistic = Array.from(optimisticMessages.values()).filter(
      (m) => !realMessageIds.has(m.id)
    );
    return [...messages, ...optimistic].sort(
      (a, b) => getCreatedAtTime(a) - getCreatedAtTime(b)
    );
  }, [messages, optimisticMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages]);

  // Mark messages as read when sheet opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      markRead(workoutId);
    }
  }, [open, unreadCount, workoutId, markRead]);

  // Remove optimistic messages that have been confirmed by real-time updates
  // This effect syncs optimistic state with real messages from Firestore
  // The setState here is intentional - we're syncing external state (Firestore) with React state
  useEffect(() => {
    const realIds = new Set(messages.map((m) => m.id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimisticMessages((prev) => {
      const updated = new Map(prev);
      let hasChanges = false;
      for (const [id] of updated) {
        if (realIds.has(id)) {
          updated.delete(id);
          hasChanges = true;
        }
      }
      // Only return new Map if there were changes to avoid unnecessary re-renders
      return hasChanges ? updated : prev;
    });
  }, [messages]);

  const canSendMessages =
    status === "pending" ||
    status === "in_review" ||
    status === "changes_requested";

  const messageLength = newMessage.length;
  const isMessageValid =
    newMessage.trim().length > 0 && messageLength <= MAX_MESSAGE_LENGTH;

  const handleSend = async () => {
    if (!isMessageValid) return;

    // Ensure user is authenticated before sending
    if (!user?.uid) {
      toast.error("Authentication required", {
        description: "Please sign in to send messages.",
      });
      return;
    }

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    // Create optimistic message - workout_owner_id is required
    // SECURITY NOTE: Ownership is validated in the service layer (sendMessage function)
    // via a Firestore transaction. The optimistic update here assumes ownership for UX,
    // but will be removed if validation fails. Firestore security rules also enforce
    // ownership at the database level, providing defense in depth.
    const optimisticMessage: CertificationMessage = {
      id: tempId,
      workout_id: workoutId,
      workout_owner_id: user.uid, // Set optimistically - validated in service layer
      sender_id: user.uid,
      sender_type: "user",
      sender_name: user.displayName || user.email || "You",
      message: messageText,
      created_at: Timestamp.now(),
      is_edited: false,
    };

    // Add optimistically
    setOptimisticMessages((prev) =>
      new Map(prev).set(tempId, optimisticMessage)
    );
    setNewMessage("");

    try {
      const result = await sendMessage(workoutId, messageText);

      if (result.success && "messageId" in result && result.messageId) {
        // Update optimistic message with real ID
        const messageId = result.messageId as string;
        setOptimisticMessages((prev) => {
          const updated = new Map(prev);
          if (updated.has(tempId)) {
            const msg = updated.get(tempId)!;
            updated.delete(tempId);
            updated.set(messageId, { ...msg, id: messageId });
          }
          return updated;
        });

        toast.success("Message sent", {
          description: "Your message has been sent successfully.",
        });
      } else {
        // Remove on error
        setOptimisticMessages((prev) => {
          const updated = new Map(prev);
          updated.delete(tempId);
          return updated;
        });

        toast.error("Message not sent", {
          description: result.error
            ? `${result.error} You can edit your message and try sending again.`
            : "Your message was not sent. Please check your connection and try sending again.",
        });
      }
    } catch (error) {
      // Remove on error
      setOptimisticMessages((prev) => {
        const updated = new Map(prev);
        updated.delete(tempId);
        return updated;
      });

      toast.error("Error", {
        description: "Failed to send message. Please try again.",
      });
      // Log error for debugging
      console.error(
        "Failed to send message:",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && newMessage.trim()) {
        handleSend();
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Certification Messages</SheetTitle>
          <SheetDescription className="truncate">
            {workoutTitle}
          </SheetDescription>
        </SheetHeader>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 -mx-6 px-6">
          {loading ? (
            <MessagesLoading />
          ) : error ? (
            <div className="text-center text-destructive py-8">
              <p>{error}</p>
            </div>
          ) : displayMessages.length === 0 ? (
            <section
              className="text-center text-muted-foreground py-8"
              role="status"
              aria-label="No messages yet"
            >
              <MessageSquare
                className="w-12 h-12 mx-auto mb-3 opacity-50"
                aria-hidden="true"
              />
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">
                Start the conversation about this workout
              </p>
            </section>
          ) : (
            <>
              {displayMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentUser={message.sender_id === user?.uid}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        {canSendMessages ? (
          <div className="border-t pt-4 space-y-2">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={isSending}
              className="resize-none"
              aria-label="Type your message to the trainer"
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </span>
                <span
                  className={`text-xs ${
                    messageLength > MAX_MESSAGE_LENGTH
                      ? "text-destructive"
                      : messageLength > MAX_MESSAGE_LENGTH * 0.9
                        ? "text-orange-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {messageLength.toLocaleString()} /{" "}
                  {MAX_MESSAGE_LENGTH.toLocaleString()} characters
                </span>
              </div>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={isSending || !isMessageValid}
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" aria-hidden="true" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center">
              {status === "certified"
                ? "This workout has been certified. Messaging is closed."
                : status === "rejected"
                  ? "This certification was not approved. Messaging is closed."
                  : "Messaging is not available."}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Message Bubble Component
interface MessageBubbleProps {
  message: CertificationMessage;
  isCurrentUser: boolean;
}

function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const isSystem = message.sender_type === "system";
  const isTrainer = message.sender_type === "trainer";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <Bot className="w-3 h-3" />
          {message.message}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-end gap-2 ${isCurrentUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isTrainer
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isTrainer ? (
          <Shield className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>

      <div
        className={`max-w-[75%] ${
          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
        } rounded-2xl px-4 py-2`}
      >
        {!isCurrentUser && (
          <p className="text-xs font-medium mb-0.5 opacity-70">
            {message.sender_name}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.message}
        </p>
        <p
          className={`text-xs mt-1 ${
            isCurrentUser
              ? "text-primary-foreground/70"
              : "text-muted-foreground"
          }`}
        >
          {message.created_at
            ? formatDistanceToNow(
                message.created_at instanceof Date
                  ? message.created_at
                  : message.created_at.toDate(),
                {
                  addSuffix: true,
                }
              )
            : "Just now"}
        </p>
      </div>
    </div>
  );
}

// Loading Skeleton
function MessagesLoading() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`flex items-end gap-2 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
        >
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-48 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
