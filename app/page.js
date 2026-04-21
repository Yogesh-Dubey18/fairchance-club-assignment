"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

const categories = ["All", "Work", "Study", "Personal", "Ideas"];
const priorities = ["All", "High", "Medium", "Low"];
const statuses = ["All", "Open", "In Progress", "Completed"];
const colorTones = ["amber", "teal", "rose", "slate"];

const emptyForm = {
  title: "",
  description: "",
  category: "Work",
  priority: "Medium",
  status: "Open",
  tags: "",
  pinned: false,
  archived: false,
  colorTone: "amber"
};

const initialFilters = {
  query: "",
  category: "All",
  priority: "All",
  status: "All",
  showArchived: false,
  sort: "newest"
};

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function toPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    priority: form.priority,
    status: form.status,
    pinned: form.pinned,
    archived: form.archived,
    colorTone: form.colorTone,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  };
}

function toForm(note) {
  return {
    title: note.title,
    description: note.description,
    category: note.category || "Work",
    priority: note.priority || "Medium",
    status: note.status || "Open",
    pinned: Boolean(note.pinned),
    archived: Boolean(note.archived),
    colorTone: note.colorTone || "amber",
    tags: Array.isArray(note.tags) ? note.tags.join(", ") : ""
  };
}

function buildQueryString(filters) {
  const params = new URLSearchParams();

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  if (filters.category !== "All") {
    params.set("category", filters.category);
  }

  if (filters.priority !== "All") {
    params.set("priority", filters.priority);
  }

  if (filters.status !== "All") {
    params.set("status", filters.status);
  }

  params.set("archived", String(filters.showArchived));
  params.set("sort", filters.sort);

  return params.toString();
}

export default function HomePage() {
  const [notes, setNotes] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [screenState, setScreenState] = useState({
    loading: true,
    saving: false,
    actioning: "",
    mutatingId: null,
    error: "",
    status: ""
  });
  const [isSearching, startSearchTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchNotes(filters, controller.signal);
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [filters]);

  async function fetchNotes(nextFilters = filters, signal) {
    setScreenState((current) => ({
      ...current,
      loading: true,
      error: ""
    }));

    try {
      const queryString = buildQueryString(nextFilters);
      const response = await fetch(`/api/notes${queryString ? `?${queryString}` : ""}`, {
        signal
      });

      if (!response.ok) {
        throw new Error("Unable to load notes.");
      }

      const payload = await response.json();
      setNotes(payload.notes);

      setSelectedId((current) => {
        if (!payload.notes.length) {
          return null;
        }

        return payload.notes.some((note) => note._id === current)
          ? current
          : payload.notes[0]._id;
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        setScreenState((current) => ({
          ...current,
          error: error.message || "Unable to load notes."
        }));
      }
    } finally {
      if (!signal?.aborted) {
        setScreenState((current) => ({
          ...current,
          loading: false
        }));
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setScreenState((current) => ({
      ...current,
      saving: true,
      error: "",
      status: editingId ? "Updating note..." : "Creating note..."
    }));

    try {
      const response = await fetch(editingId ? `/api/notes/${editingId}` : "/api/notes", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(toPayload(form))
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save note.");
      }

      setForm(emptyForm);
      setEditingId(null);
      setScreenState((current) => ({
        ...current,
        status: editingId ? "Note updated successfully." : "Note created successfully."
      }));
      await fetchNotes(filters);
      setSelectedId(payload.note?._id || null);
    } catch (error) {
      setScreenState((current) => ({
        ...current,
        error: error.message || "Unable to save note.",
        status: ""
      }));
    } finally {
      setScreenState((current) => ({
        ...current,
        saving: false
      }));
    }
  }

  async function handleDelete(noteId) {
    setScreenState((current) => ({
      ...current,
      mutatingId: noteId,
      error: "",
      status: "Deleting note..."
    }));

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete note.");
      }

      setNotes((current) => current.filter((note) => note._id !== noteId));
      if (editingId === noteId) {
        setEditingId(null);
        setForm(emptyForm);
      }
      if (selectedId === noteId) {
        setSelectedId(null);
      }
      setScreenState((current) => ({
        ...current,
        status: "Note deleted successfully."
      }));
    } catch (error) {
      setScreenState((current) => ({
        ...current,
        error: error.message || "Unable to delete note.",
        status: ""
      }));
    } finally {
      setScreenState((current) => ({
        ...current,
        mutatingId: null
      }));
    }
  }

  async function handleBulkAction(action) {
    setScreenState((current) => ({
      ...current,
      actioning: action,
      error: "",
      status: action === "seed" ? "Adding sample notes..." : "Archiving completed notes..."
    }));

    try {
      const response = await fetch("/api/notes/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to finish this action.");
      }

      await fetchNotes(filters);
      setScreenState((current) => ({
        ...current,
        status: action === "seed" ? "Sample notes added." : "Completed notes archived."
      }));
    } catch (error) {
      setScreenState((current) => ({
        ...current,
        error: error.message || "Unable to finish this action.",
        status: ""
      }));
    } finally {
      setScreenState((current) => ({
        ...current,
        actioning: ""
      }));
    }
  }

  async function handleQuickUpdate(note, updates, message) {
    setScreenState((current) => ({
      ...current,
      mutatingId: note._id,
      error: "",
      status: message
    }));

    try {
      const response = await fetch(`/api/notes/${note._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...note,
          ...updates,
          tags: note.tags || []
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update note.");
      }

      setNotes((current) =>
        current.map((item) => (item._id === note._id ? payload.note : item))
      );

      if (editingId === note._id) {
        setForm(toForm(payload.note));
      }

      setScreenState((current) => ({
        ...current,
        status: "Quick update saved."
      }));
    } catch (error) {
      setScreenState((current) => ({
        ...current,
        error: error.message || "Unable to update note.",
        status: ""
      }));
    } finally {
      setScreenState((current) => ({
        ...current,
        mutatingId: null
      }));
    }
  }

  function startEditing(note) {
    setEditingId(note._id);
    setSelectedId(note._id);
    setForm(toForm(note));
    setScreenState((current) => ({
      ...current,
      status: "Editing selected note.",
      error: ""
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setScreenState((current) => ({
      ...current,
      status: "Ready to create a new note.",
      error: ""
    }));
  }

  const analytics = useMemo(() => {
    const completed = notes.filter((note) => note.status === "Completed").length;
    const pinned = notes.filter((note) => note.pinned).length;
    const highPriority = notes.filter((note) => note.priority === "High").length;
    const tagCount = new Set(notes.flatMap((note) => note.tags || [])).size;

    return { completed, pinned, highPriority, tagCount };
  }, [notes]);

  const selectedNote = useMemo(
    () => notes.find((note) => note._id === selectedId) || null,
    [notes, selectedId]
  );

  const noteCountLabel = useMemo(() => {
    if (screenState.loading) {
      return "Loading note workspace...";
    }

    if (!notes.length) {
      return filters.query ? "No notes match your search." : "No notes in this view yet.";
    }

    return `${notes.length} note${notes.length === 1 ? "" : "s"} in view`;
  }, [filters.query, notes.length, screenState.loading]);

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Advanced Notes Workspace</span>
          <h1>Plan, prioritize, pin, and move faster.</h1>
          <p>
            A richer full-stack notes system with categories, priorities, tags, archive control,
            seeded sample data, analytics, and real-time workspace filters.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => handleBulkAction("seed")}
              disabled={screenState.actioning === "seed"}
            >
              {screenState.actioning === "seed" ? "Adding..." : "Load Sample Data"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => handleBulkAction("archiveCompleted")}
              disabled={screenState.actioning === "archiveCompleted"}
            >
              {screenState.actioning === "archiveCompleted" ? "Archiving..." : "Archive Completed"}
            </button>
          </div>
        </div>

        <div className="hero-metrics">
          <div className="metric-card">
            <strong>{notes.length}</strong>
            <span>Notes in View</span>
          </div>
          <div className="metric-card">
            <strong>{analytics.pinned}</strong>
            <span>Pinned Notes</span>
          </div>
          <div className="metric-card">
            <strong>{analytics.completed}</strong>
            <span>Completed</span>
          </div>
          <div className="metric-card">
            <strong>{analytics.highPriority}</strong>
            <span>High Priority</span>
          </div>
        </div>
      </section>

      <section className="panel filter-panel">
        <div className="panel-header compact-header">
          <div>
            <p className="panel-kicker">Smart filters</p>
            <h2>Control the note feed</h2>
          </div>
          <span className="meta-chip">{isSearching ? "Refreshing..." : noteCountLabel}</span>
        </div>

        <div className="filter-grid">
          <label className="field">
            <span>Search</span>
            <input
              value={filters.query}
              onChange={(event) =>
                startSearchTransition(() => {
                  setFilters((current) => ({ ...current, query: event.target.value }));
                })
              }
              placeholder="Search title, description, or tags"
            />
          </label>

          <label className="field">
            <span>Category</span>
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Priority</span>
            <select
              value={filters.priority}
              onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Sort by</span>
            <select
              value={filters.sort}
              onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Priority first</option>
              <option value="title">Title A-Z</option>
            </select>
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={filters.showArchived}
              onChange={(event) =>
                setFilters((current) => ({ ...current, showArchived: event.target.checked }))
              }
            />
            <span>Show archived notes</span>
          </label>
        </div>
      </section>

      {screenState.error ? <p className="feedback error">{screenState.error}</p> : null}
      {screenState.status ? <p className="feedback status">{screenState.status}</p> : null}

      <section className="workspace-grid">
        <article className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">{editingId ? "Update note" : "Create note"}</p>
              <h2>{editingId ? "Refine the selected note" : "Add a richer note"}</h2>
            </div>
            {editingId ? (
              <button type="button" className="ghost-button" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>

          <form className="note-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Quarterly launch prep"
                maxLength={80}
                required
              />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Capture the details, blockers, and follow-up steps..."
                rows={6}
                maxLength={400}
                required
              />
            </label>

            <div className="dual-grid">
              <label className="field">
                <span>Category</span>
                <select
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                >
                  {categories.slice(1).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Priority</span>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  {priorities.slice(1).map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="dual-grid">
              <label className="field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {statuses.slice(1).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Color tone</span>
                <select
                  value={form.colorTone}
                  onChange={(event) => setForm((current) => ({ ...current, colorTone: event.target.value }))}
                >
                  {colorTones.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Tags</span>
              <input
                value={form.tags}
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                placeholder="planning, design, urgent"
              />
            </label>

            <div className="toggle-row">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
                />
                <span>Pin this note</span>
              </label>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.archived}
                  onChange={(event) => setForm((current) => ({ ...current, archived: event.target.checked }))}
                />
                <span>Archive on save</span>
              </label>
            </div>

            <button type="submit" className="primary-button" disabled={screenState.saving}>
              {screenState.saving
                ? editingId
                  ? "Updating..."
                  : "Creating..."
                : editingId
                  ? "Save Changes"
                  : "Create Note"}
            </button>
          </form>
        </article>

        <article className="panel notes-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Notes board</p>
              <h2>Browse the active workspace</h2>
            </div>
            <div className="board-meta">
              <span className="meta-chip">{analytics.tagCount} unique tags</span>
            </div>
          </div>

          {screenState.loading ? (
            <div className="loading-grid" aria-live="polite">
              <div className="loading-card" />
              <div className="loading-card" />
              <div className="loading-card" />
            </div>
          ) : notes.length ? (
            <div className="notes-list">
              {notes.map((note) => (
                <article
                  className={`note-card tone-${note.colorTone || "amber"} ${selectedId === note._id ? "selected" : ""}`}
                  key={note._id}
                  onClick={() => setSelectedId(note._id)}
                >
                  <div className="note-card-top">
                    <div>
                      <div className="title-row">
                        <h3>{note.title}</h3>
                        {note.pinned ? <span className="chip strong">Pinned</span> : null}
                        {note.archived ? <span className="chip muted">Archived</span> : null}
                      </div>
                      <p>{note.description}</p>
                    </div>
                    <span>{formatDate(note.createdAt)}</span>
                  </div>

                  <div className="chip-row">
                    <span className="chip">{note.category || "Work"}</span>
                    <span className="chip">{note.priority || "Medium"}</span>
                    <span className="chip">{note.status || "Open"}</span>
                    {(note.tags || []).map((tag) => (
                      <span className="chip muted" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="note-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        startEditing(note);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={screenState.mutatingId === note._id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleQuickUpdate(note, { pinned: !note.pinned }, note.pinned ? "Unpinning note..." : "Pinning note...");
                      }}
                    >
                      {note.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={screenState.mutatingId === note._id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleQuickUpdate(
                          note,
                          { status: note.status === "Completed" ? "Open" : "Completed" },
                          note.status === "Completed" ? "Reopening note..." : "Marking complete..."
                        );
                      }}
                    >
                      {note.status === "Completed" ? "Reopen" : "Complete"}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={screenState.mutatingId === note._id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleQuickUpdate(
                          note,
                          { archived: !note.archived },
                          note.archived ? "Restoring note..." : "Archiving note..."
                        );
                      }}
                    >
                      {note.archived ? "Restore" : "Archive"}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(note._id);
                      }}
                      disabled={screenState.mutatingId === note._id}
                    >
                      {screenState.mutatingId === note._id ? "Working..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>{filters.query ? "No matching notes" : "This workspace is empty"}</h3>
              <p>
                {filters.query
                  ? "Try different keywords, tags, or filters."
                  : "Load sample data or create your first structured note."}
              </p>
            </div>
          )}
        </article>

        <article className="panel detail-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Insight panel</p>
              <h2>{selectedNote ? "Selected note details" : "Workspace summary"}</h2>
            </div>
          </div>

          {selectedNote ? (
            <div className="detail-stack">
              <div className={`spotlight-card tone-${selectedNote.colorTone || "amber"}`}>
                <div className="title-row">
                  <h3>{selectedNote.title}</h3>
                  <span className="meta-chip">{selectedNote.status}</span>
                </div>
                <p>{selectedNote.description}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span>Category</span>
                  <strong>{selectedNote.category}</strong>
                </div>
                <div className="detail-item">
                  <span>Priority</span>
                  <strong>{selectedNote.priority}</strong>
                </div>
                <div className="detail-item">
                  <span>Created</span>
                  <strong>{formatDate(selectedNote.createdAt)}</strong>
                </div>
                <div className="detail-item">
                  <span>Updated</span>
                  <strong>{formatDate(selectedNote.updatedAt)}</strong>
                </div>
              </div>

              <div className="chip-row">
                {(selectedNote.tags || []).length ? (
                  selectedNote.tags.map((tag) => (
                    <span className="chip muted" key={tag}>
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="chip muted">No tags</span>
                )}
              </div>
            </div>
          ) : (
            <div className="summary-grid">
              <div className="detail-item">
                <span>Total visible notes</span>
                <strong>{notes.length}</strong>
              </div>
              <div className="detail-item">
                <span>Pinned</span>
                <strong>{analytics.pinned}</strong>
              </div>
              <div className="detail-item">
                <span>Completed</span>
                <strong>{analytics.completed}</strong>
              </div>
              <div className="detail-item">
                <span>Tag count</span>
                <strong>{analytics.tagCount}</strong>
              </div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
