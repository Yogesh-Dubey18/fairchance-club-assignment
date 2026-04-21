import { NextResponse } from "next/server";
import { z } from "zod";
import connectToDatabase from "@/lib/db";
import Note from "@/lib/models/note";
import normalizeNote from "@/lib/normalize-note";
import { seedNotes } from "@/lib/seed-notes";

const actionSchema = z.object({
  action: z.enum(["seed", "archiveCompleted"])
});

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { action } = actionSchema.parse(body);

    if (action === "seed") {
      const existingTitles = new Set((await Note.find({}, { title: 1 }).lean()).map((note) => note.title));
      const missingNotes = seedNotes.filter((note) => !existingTitles.has(note.title));

      if (missingNotes.length) {
        await Note.insertMany(missingNotes);
      }

      const notes = (await Note.find({}).sort({ pinned: -1, createdAt: -1 }).lean()).map(normalizeNote);
      return NextResponse.json({ notes, seeded: true });
    }

    if (action === "archiveCompleted") {
      await Note.updateMany({ status: "Completed" }, { archived: true });
      const notes = (await Note.find({}).sort({ pinned: -1, createdAt: -1 }).lean()).map(normalizeNote);
      return NextResponse.json({ notes, archived: true });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || "Unable to complete action." },
      { status: 500 }
    );
  }
}
