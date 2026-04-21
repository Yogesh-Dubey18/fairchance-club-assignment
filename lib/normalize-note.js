export default function normalizeNote(note) {
  if (!note) {
    return note;
  }

  return {
    ...note,
    category: note.category || "Work",
    priority: note.priority || "Medium",
    status: note.status || "Open",
    tags: Array.isArray(note.tags) ? note.tags : [],
    pinned: Boolean(note.pinned),
    archived: Boolean(note.archived),
    colorTone: note.colorTone || "amber"
  };
}
