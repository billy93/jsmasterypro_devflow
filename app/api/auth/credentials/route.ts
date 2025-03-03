// app/api/auth/credentials/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { api } from "@/lib/api";
import { SignInSchema } from "@/lib/validations";
import { IUserDoc } from "@/database/user.model";
import { IAccountDoc } from "@/database/account.model";

export const runtime = "nodejs"; // Force Node.js runtime

export async function POST(request: Request) {
  const credentials = await request.json();
  const validatedFields = SignInSchema.safeParse(credentials);

  if (!validatedFields.success) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }

  const { email, password } = validatedFields.data;

  try {
    const accountResponse = await api.accounts.getByProvider(email);
    const { data: existingAccount } =
      accountResponse as ActionResponse<IAccountDoc>;

    if (!existingAccount?.password) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const isValidPassword = await bcrypt.compare(
      password,
      existingAccount.password
    );

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const userResponse = await api.users.getById(
      existingAccount.userId.toString()
    );
    const { data: existingUser } = userResponse as ActionResponse<IUserDoc>;

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        image: existingUser.image,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
