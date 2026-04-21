import { NextResponse } from "next/server";
import { z } from "zod";
import connectToDatabase from "@/lib/db";
import Note from "@/lib/models/note";

const noteSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(80),
  description: z.string().trim().min(5, "Description must be at least 5 characters.").max(400)
});

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await connectToDatabase();

    const searchValue = request.nextUrl.searchParams.get("q")?.trim();
    const filter = searchValue
      ? {
          title: {
            $regex: searchValue,
            $options: "i"
          }
        }
      : {};

    const notes = await Note.find(filter).sort({ createdAt: -1 }).lean();

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

    const body = await request.json();
    const validatedData = noteSchema.parse(body);

    const note = await Note.create(validatedData);

    return NextResponse.json({ note }, { status: 201 });
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
