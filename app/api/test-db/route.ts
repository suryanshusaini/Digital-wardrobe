// app/api/test-db/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";

export async function GET() {
  try {
    // Attempt to connect using the utility we created earlier
    await connectToDatabase();

    return NextResponse.json(
      { success: true, message: "Database connected successfully!" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to connect to the database." },
      { status: 500 },
    );
  }
}
