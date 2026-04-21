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
import { seedNotes } from "@/lib/seed-notes";

const noteSchema = z.object({
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

export async function GET(request) {
  try {
    await connectToDatabase();

    const searchValue = request.nextUrl.searchParams.get("q")?.trim();
    const category = request.nextUrl.searchParams.get("category")?.trim();
    const status = request.nextUrl.searchParams.get("status")?.trim();
    const priority = request.nextUrl.searchParams.get("priority")?.trim();
    const archived = request.nextUrl.searchParams.get("archived")?.trim();
    const sort = request.nextUrl.searchParams.get("sort")?.trim() || "newest";

    const filter = {};

    if (searchValue) {
      filter.$or = [
        { title: { $regex: searchValue, $options: "i" } },
        { description: { $regex: searchValue, $options: "i" } },
        { tags: { $elemMatch: { $regex: searchValue, $options: "i" } } }
      ];
    }

    if (category && NOTE_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    if (status && NOTE_STATUSES.includes(status)) {
      filter.status = status;
    }

    if (priority && NOTE_PRIORITIES.includes(priority)) {
      filter.priority = priority;
    }

    if (archived === "true") {
      filter.archived = true;
    }

    if (archived === "false") {
      filter.archived = false;
    }

    const sortConfig =
      sort === "oldest"
        ? { createdAt: 1 }
        : sort === "priority"
          ? { pinned: -1, priority: -1, createdAt: -1 }
          : sort === "title"
            ? { title: 1 }
            : { pinned: -1, createdAt: -1 };

    const notes = (await Note.find(filter).sort(sortConfig).lean()).map(normalizeNote);

    return NextResponse.json({ notes });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to fetch notes." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();

    if (request.nextUrl.searchParams.get("seed") === "true") {
      const existingTitles = new Set((await Note.find({}, { title: 1 }).lean()).map((note) => note.title));
      const missingNotes = seedNotes.filter((note) => !existingTitles.has(note.title));

      if (missingNotes.length) {
        await Note.insertMany(missingNotes);
      }

      const notes = (await Note.find({}).sort({ pinned: -1, createdAt: -1 }).lean()).map(normalizeNote);
      return NextResponse.json({ notes, seeded: true }, { status: 201 });
    }

    const body = await request.json();
    const validatedData = noteSchema.parse({
      ...body,
      tags: body.tags || []
    });

    const note = await Note.create(validatedData);

    return NextResponse.json({ note: normalizeNote(note.toObject()) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || "Unable to create note." },
      { status: 500 }
    );
  }
}
