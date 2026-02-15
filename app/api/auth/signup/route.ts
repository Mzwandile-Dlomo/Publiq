import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { signupSchema } from "@/lib/validators/auth";
import { ZodError } from "zod";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name } = signupSchema.parse(body);

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 400 }
            );
        }

        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });

        await createSession(user.id);

        return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
