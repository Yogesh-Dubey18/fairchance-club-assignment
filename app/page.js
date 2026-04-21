"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

const emptyForm = { title: "", description: "" };

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function HomePage() {
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [screenState, setScreenState] = useState({
    loading: true,
    saving: false,
    deletingId: null,
    error: "",
    status: ""
  });
  const [isSearching, startSearchTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchNotes(query, controller.signal);
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query]);

  async function fetchNotes(search = "", signal) {
    setScreenState((current) => ({
      ...current,
      loading: true,
      error: ""
    }));

    try {
      const response = await fetch(`/api/notes${search ? `?q=${encodeURIComponent(search)}` : ""}`, {
        signal
      });

      if (!response.ok) {
        throw new Error("Unable to load notes.");
      }

      const payload = await response.json();
      setNotes(payload.notes);
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
        body: JSON.stringify(form)
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
      await fetchNotes(query);
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
      deletingId: noteId,
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
        deletingId: null
      }));
    }
  }

  function startEditing(note) {
    setEditingId(note._id);
    setForm({
      title: note.title,
      description: note.description
    });
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

  const noteCountLabel = useMemo(() => {
    if (screenState.loading) {
      return "Loading note collection...";
    }

    if (!notes.length) {
      return query ? "No notes match your search." : "No notes created yet.";
    }

    return `${notes.length} note${notes.length === 1 ? "" : "s"} ready`;
  }, [notes.length, query, screenState.loading]);

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Mini Notes App</span>
          <h1>Capture ideas with a sharper workflow.</h1>
          <p>
            A full-stack note manager with MongoDB persistence, instant search, inline editing,
            and responsive loading feedback for every action.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <strong>{notes.length}</strong>
            <span>Total Notes</span>
          </div>
          <div className="metric-card">
            <strong>{editingId ? "Edit" : "Create"}</strong>
            <span>Current Mode</span>
          </div>
          <div className="metric-card">
            <strong>{isSearching ? "..." : "Live"}</strong>
            <span>Search Status</span>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <article className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">{editingId ? "Update note" : "Create note"}</p>
              <h2>{editingId ? "Refine your draft" : "Write a fresh note"}</h2>
            </div>
            {editingId ? (
              <button type="button" className="ghost-button" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>

          <form className="note-form" onSubmit={handleSubmit}>
            <label>
              <span>Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Sprint reflection"
                maxLength={80}
                required
              />
            </label>

            <label>
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Write the note details here..."
                rows={7}
                maxLength={400}
                required
              />
            </label>

            <button type="submit" className="primary-button" disabled={screenState.saving}>
              {screenState.saving ? (editingId ? "Updating..." : "Creating...") : editingId ? "Save Changes" : "Create Note"}
            </button>
          </form>
        </article>

        <article className="panel notes-panel">
          <div className="panel-header notes-header">
            <div>
              <p className="panel-kicker">Notes library</p>
              <h2>Find and manage every entry</h2>
            </div>
            <div className="search-wrap">
              <input
                value={query}
                onChange={(event) =>
                  startSearchTransition(() => {
                    setQuery(event.target.value);
                  })
                }
                placeholder="Search by title..."
              />
            </div>
          </div>

          <div className="status-row">
            <span>{noteCountLabel}</span>
            {screenState.status ? <span>{screenState.status}</span> : null}
          </div>

          {screenState.error ? <p className="feedback error">{screenState.error}</p> : null}

          {screenState.loading ? (
            <div className="loading-grid" aria-live="polite">
              <div className="loading-card" />
              <div className="loading-card" />
              <div className="loading-card" />
            </div>
          ) : notes.length ? (
            <div className="notes-list">
              {notes.map((note) => (
                <article className="note-card" key={note._id}>
                  <div className="note-card-top">
                    <div>
                      <h3>{note.title}</h3>
                      <p>{note.description}</p>
                    </div>
                    <span>{formatDate(note.createdAt)}</span>
                  </div>
                  <div className="note-actions">
                    <button type="button" className="ghost-button" onClick={() => startEditing(note)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDelete(note._id)}
                      disabled={screenState.deletingId === note._id}
                    >
                      {screenState.deletingId === note._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>{query ? "No matching notes" : "Start your first note"}</h3>
              <p>
                {query
                  ? "Try another title keyword or clear the search box."
                  : "Create a note to see it appear here instantly."}
              </p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
