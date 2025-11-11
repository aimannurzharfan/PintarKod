import { API_URL } from '@/app/config';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

export type ForumComment = {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ForumThread = {
  id: string;
  title: string;
  content: string;
  attachment: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  comments: ForumComment[];
};

type CreateThreadInput = {
  title: string;
  content: string;
  authorId: number | null;
  attachment?: string | null;
};

type UpdateThreadInput = {
  id: string;
  title: string;
  content: string;
  authorId?: number | null;
  attachment?: string | null;
};

type CreateCommentInput = {
  threadId: string;
  content: string;
  authorId: number | null;
};

type UpdateCommentInput = {
  threadId: string;
  commentId: string;
  content: string;
  authorId?: number | null;
};

type ForumContextValue = {
  threads: ForumThread[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createThread: (input: CreateThreadInput) => Promise<ForumThread | undefined>;
  updateThread: (input: UpdateThreadInput) => Promise<ForumThread | undefined>;
  addComment: (input: CreateCommentInput) => Promise<ForumComment | undefined>;
  updateComment: (input: UpdateCommentInput) => Promise<ForumComment | undefined>;
  deleteThread: (threadId: string, authorId: number | null) => Promise<boolean>;
  deleteComment: (threadId: string, commentId: string, authorId: number | null) => Promise<boolean>;
  getThreadById: (id: string) => ForumThread | undefined;
  fetchThreadById: (id: string) => Promise<ForumThread | undefined>;
};

const ForumContext = createContext<ForumContextValue | undefined>(undefined);

const FALLBACK_THREADS: ForumThread[] = [
  {
    id: 'sample-thread',
    title: 'Need help understanding JavaScript array methods',
    content:
      'Hey everyone, I am trying to help my students differentiate between map, filter, and reduce. ' +
      'Does anyone have concrete classroom activities or metaphors that have worked well?',
    attachment: null,
    authorId: '0',
    authorName: 'Community Mentor',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    comments: [
      {
        id: 'sample-comment',
        threadId: 'sample-thread',
        content:
          'I usually use sorting Lego bricks: map = repaint each brick, filter = only keep blue ones, ' +
          'reduce = count the total studs. Students grasp it quickly!',
        authorId: '0',
        authorName: 'Aina (Teacher)',
        authorRole: 'Teacher',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ],
  },
];

export function ForumProvider({ children }: { children: React.ReactNode }) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeComment = useCallback((comment: any): ForumComment => {
    return {
      id: String(comment.id),
      threadId: String(comment.threadId),
      content: comment.content,
      authorId: comment.authorId != null ? String(comment.authorId) : '',
      authorName: comment.author?.username || comment.author?.email || 'Unknown user',
      authorRole: comment.author?.role ?? comment.authorRole ?? null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }, []);

  const normalizeThread = useCallback((thread: any): ForumThread => {
    return {
      id: String(thread.id),
      title: thread.title,
      content: thread.content,
      attachment: thread.attachment ?? null,
      authorId: String(thread.authorId),
      authorName: thread.author?.username || thread.author?.email || 'Unknown user',
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      comments: (thread.comments || []).map(normalizeComment),
    };
  }, [normalizeComment]);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/forum/threads`);
      if (!res.ok) {
        throw new Error('Unable to load forum threads');
      }
      const data = await res.json();
      const normalized = Array.isArray(data) ? data.map(normalizeThread) : [];
      setThreads(normalized);
    } catch (err: any) {
      console.warn('Forum fetch error:', err?.message ?? err);
      setError(err?.message ?? 'Failed to load forum threads');
      setThreads((prev) => (prev.length ? prev : FALLBACK_THREADS));
    } finally {
      setLoading(false);
    }
  }, [normalizeThread]);

  const fetchThreadById = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`${API_URL}/api/forum/threads/${id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Thread not found');
        }
        const data = await res.json();
        const normalized = normalizeThread(data);
        setThreads((prev) => {
          const exists = prev.some((thread) => thread.id === normalized.id);
          if (exists) {
            return prev.map((thread) => (thread.id === normalized.id ? normalized : thread));
          }
          return [normalized, ...prev];
        });
        return normalized;
      } catch (err: any) {
        console.error('Forum thread fetch error:', err);
        setError(err?.message ?? 'Unable to load thread');
        return undefined;
      }
    },
    [normalizeThread]
  );

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const createThread = useCallback(
    async (input: CreateThreadInput) => {
      try {
        const res = await fetch(`${API_URL}/api/forum/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: input.title,
            content: input.content,
            authorId: input.authorId,
            attachment: typeof input.attachment === 'string' ? input.attachment : null,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Unable to create thread');
        }
        const data = await res.json();
        const normalized = normalizeThread(data);
        setThreads((prev) => [normalized, ...prev]);
        setError(null);
        return normalized;
      } catch (err: any) {
        console.error('Create thread error:', err);
        setError(err?.message ?? 'Unable to create thread');
        return undefined;
      }
    },
    [normalizeThread]
  );

  const updateThread = useCallback(
    async (input: UpdateThreadInput) => {
      try {
        const res = await fetch(`${API_URL}/api/forum/threads/${input.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: input.title,
            content: input.content,
            authorId: input.authorId,
            attachment: typeof input.attachment === 'string' ? input.attachment : null,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Unable to update thread');
        }
        const data = await res.json();
        const normalized = normalizeThread(data);
        setThreads((prev) =>
          prev.map((thread) => (thread.id === normalized.id ? normalized : thread))
        );
        setError(null);
        return normalized;
      } catch (err: any) {
        console.error('Update thread error:', err);
        setError(err?.message ?? 'Unable to update thread');
        return undefined;
      }
    },
    [normalizeThread]
  );

  const addComment = useCallback(
    async (input: CreateCommentInput) => {
      try {
        const res = await fetch(`${API_URL}/api/forum/threads/${input.threadId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: input.content,
            authorId: input.authorId,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Unable to post comment');
        }
        const data = await res.json();
        const normalized = normalizeComment({
          ...data,
          threadId: input.threadId,
        });
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === input.threadId
              ? {
                  ...thread,
                  comments: [...thread.comments, normalized],
                  updatedAt: normalized.updatedAt,
                }
              : thread
          )
        );
        setError(null);
        return normalized;
      } catch (err: any) {
        console.error('Add comment error:', err);
        setError(err?.message ?? 'Unable to post comment');
        return undefined;
      }
    },
    [normalizeComment]
  );

  const updateComment = useCallback(
    async (input: UpdateCommentInput) => {
      try {
        const res = await fetch(`${API_URL}/api/forum/comments/${input.commentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: input.content,
            authorId: input.authorId,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Unable to update comment');
        }
        const data = await res.json();
        const normalized = normalizeComment({
          ...data,
          threadId: input.threadId,
        });
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === input.threadId
              ? {
                  ...thread,
                  comments: thread.comments.map((comment) =>
                    comment.id === normalized.id ? normalized : comment
                  ),
                  updatedAt: normalized.updatedAt,
                }
              : thread
          )
        );
        setError(null);
        return normalized;
      } catch (err: any) {
        console.error('Update comment error:', err);
        setError(err?.message ?? 'Unable to update comment');
        return undefined;
      }
    },
    [normalizeComment]
  );

  const deleteThread = useCallback(
    async (threadId: string, authorId: number | null) => {
      if (authorId == null) return false;
      const threadIdNum = Number(threadId);
      const isNumericId = Number.isInteger(threadIdNum);
      if (!isNumericId) {
        setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
        return true;
      }
      try {
        const res = await fetch(`${API_URL}/api/forum/threads/${threadIdNum}?authorId=${Number(authorId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Unable to delete thread');
        }
        setThreads((prev) => prev.filter((thread) => thread.id !== threadIdNum.toString()));
        return true;
      } catch (err) {
        console.error('Delete thread error:', err);
        return false;
      }
    },
    []
  );

  const deleteComment = useCallback(
    async (threadId: string, commentId: string, authorId: number | null) => {
      if (authorId == null) return false;
      const commentIdNum = Number(commentId);
      const threadIdNum = Number(threadId);
      const isCommentNumeric = Number.isInteger(commentIdNum);
      const isThreadNumeric = Number.isInteger(threadIdNum);
      if (!isCommentNumeric || !isThreadNumeric) {
        const threadKey = isThreadNumeric ? String(threadIdNum) : threadId;
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === threadKey
              ? {
                  ...thread,
                  comments: thread.comments.filter((comment) => comment.id !== commentId),
                }
              : thread
          )
        );
        return true;
      }
      const threadKey = String(threadIdNum);
      try {
        const res = await fetch(`${API_URL}/api/forum/comments/${commentIdNum}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Unable to delete comment');
        }
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === threadKey
              ? {
                  ...thread,
                  comments: thread.comments.filter((comment) => comment.id !== commentId),
                }
              : thread
          )
        );
        return true;
      } catch (err) {
        console.error('Delete comment error:', err);
        return false;
      }
    },
    []
  );

  const getThreadByIdInternal = useCallback(
    (id: string) => threads.find((thread) => thread.id === id),
    [threads]
  );

  const value = useMemo<ForumContextValue>(
    () => ({
      threads,
      loading,
      error,
      refresh: fetchThreads,
      createThread,
      updateThread,
      addComment,
      updateComment,
      deleteThread,
      deleteComment,
      getThreadById: getThreadByIdInternal,
      fetchThreadById,
    }),
    [
      threads,
      loading,
      error,
      fetchThreads,
      createThread,
      updateThread,
      addComment,
      updateComment,
      deleteThread,
      deleteComment,
      getThreadByIdInternal,
      fetchThreadById,
    ]
  );

  return <ForumContext.Provider value={value}>{children}</ForumContext.Provider>;
}

export function useForum() {
  const ctx = useContext(ForumContext);
  if (!ctx) throw new Error('useForum must be used within a ForumProvider');
  return ctx;
}

