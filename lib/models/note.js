import mongoose, { Schema } from "mongoose";
import {
  NOTE_CATEGORIES,
  NOTE_COLOR_TONES,
  NOTE_PRIORITIES,
  NOTE_STATUSES
} from "@/lib/note-constants";

const noteSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: NOTE_CATEGORIES,
      default: "Work"
    },
    priority: {
      type: String,
      enum: NOTE_PRIORITIES,
      default: "Medium"
    },
    status: {
      type: String,
      enum: NOTE_STATUSES,
      default: "Open"
    },
    tags: {
      type: [String],
      default: []
    },
    pinned: {
      type: Boolean,
      default: false
    },
    archived: {
      type: Boolean,
      default: false
    },
    colorTone: {
      type: String,
      enum: NOTE_COLOR_TONES,
      default: "amber"
    }
  },
  {
    timestamps: true
  }
);

const Note = mongoose.models.Note || mongoose.model("Note", noteSchema);

export default Note;
