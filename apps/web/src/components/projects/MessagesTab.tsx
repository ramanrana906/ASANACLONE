import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMessage, listMessages } from "../../lib/messages";
import { Avatar } from "../common/Avatar";

interface MessagesTabProps {
  projectId: number;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessagesTab({ projectId }: MessagesTabProps) {
  const queryClient = useQueryClient();
  const queryKey = ["projects", projectId, "messages"];
  const [body, setBody] = useState("");

  const messagesQuery = useQuery({ queryKey, queryFn: () => listMessages(projectId) });
  const messages = messagesQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: string) => createMessage(projectId, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setBody("");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    createMutation.mutate(body.trim());
  }

  return (
    <div className="messages-tab">
      <div className="messages-tab__feed">
        {messages.length === 0 && (
          <p className="messages-tab__empty">No messages yet. Start the conversation.</p>
        )}
        {messages.map((message) => (
          <div className="messages-tab__item" key={message.id}>
            <Avatar name={message.author.name} userKey={message.author.id} size={30} />
            <div className="messages-tab__item-body">
              <div className="messages-tab__item-header">
                <span className="messages-tab__author">{message.author.name}</span>
                <span className="messages-tab__time">{formatTimestamp(message.createdAt)}</span>
              </div>
              <p className="messages-tab__text">{message.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form className="messages-tab__composer" onSubmit={handleSubmit}>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a message…"
          rows={3}
        />
        <button
          type="submit"
          className="auth-form__primary-button"
          disabled={createMutation.isPending || !body.trim()}
        >
          {createMutation.isPending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
