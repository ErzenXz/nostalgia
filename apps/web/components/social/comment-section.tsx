"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2, MessageCircle } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

interface Comment {
  _id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: number;
  updatedAt?: number;
}

interface CommentSectionProps {
  comments: Comment[];
  currentUserId: string | null;
  onPost: (text: string) => void;
  onDelete?: (commentId: string) => void;
  isLoading?: boolean;
}

export function CommentSection({
  comments,
  currentUserId,
  onPost,
  onDelete,
  isLoading = false,
}: CommentSectionProps) {
  const [text, setText] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed) return;
      onPost(trimmed);
      setText("");
    },
    [text, onPost],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        <span>
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 h-9 text-sm"
          disabled={!currentUserId}
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!text.trim() || !currentUserId}
          className="shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>

      {/* Comments list */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-3 group">
            {/* Avatar */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
              {comment.userName?.[0]?.toUpperCase() ?? "?"}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {comment.userName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatRelativeDate(comment.createdAt)}
                </span>
                {comment.updatedAt && (
                  <span className="text-[10px] text-muted-foreground/50">
                    (edited)
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground/90 mt-0.5">{comment.text}</p>
            </div>

            {/* Delete (own comments) */}
            {currentUserId === comment.userId && onDelete && (
              <button
                type="button"
                className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                onClick={() => onDelete(comment._id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-7 w-7 rounded-full bg-secondary/60" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-20 rounded bg-secondary/40" />
                  <div className="h-3 w-3/4 rounded bg-secondary/30" />
                </div>
              </div>
            ))}
          </div>
        )}

        {comments.length === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground/50 text-center py-4">
            No comments yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
}
