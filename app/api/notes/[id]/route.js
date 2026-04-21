import { NextResponse } from "next/server";
import { z } from "zod";
import connectToDatabase from "@/lib/db";
import Note from "@/lib/models/note";
import {
  NOTE_CATEGORIES,
  NOTE_COLOR_TONES,
  NOTE_PRIORITIES,
  NOTE_STATUSES
} from "@/lib/note-constants";
import normalizeNote from "@/lib/normalize-note";

const updateSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(80),
  description: z.string().trim().min(5, "Description must be at least 5 characters.").max(400),
  category: z.enum(NOTE_CATEGORIES),
  priority: z.enum(NOTE_PRIORITIES),
  status: z.enum(NOTE_STATUSES),
  tags: z.array(z.string().trim().min(1).max(20)).max(6),
  pinned: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
  colorTone: z.enum(NOTE_COLOR_TONES).optional().default("amber")
});

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const validatedData = updateSchema.parse({
      ...body,
      tags: body.tags || []
    });

    const note = await Note.findByIdAndUpdate(params.id, validatedData, {
      new: true,
      runValidators: true
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    return NextResponse.json({ note: normalizeNote(note.toObject()) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || "Unable to update note." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    await connectToDatabase();

    const note = await Note.findByIdAndDelete(params.id);

    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to delete note." },
      { status: 500 }
    );
  }
}
