"use server";

import { redirect } from "next/navigation";
import { getSession } from "./session";

import { BACKEND_URL } from "./constant";
import {
  FormState,
  LoginFormSchema,
  SignupFormSchema,
} from "./type";
import { createSession, updateTokens } from "./session";
import { cookies } from "next/headers";

const readApiErrorMessage = async (
  response: Response,
  fallback: string
) => {
  try {
    const payload = await response.json();

    if (typeof payload?.message === "string") {
      return payload.message;
    }

    if (Array.isArray(payload?.message)) {
      return payload.message.join(", ");
    }

    return fallback;
  } catch {
    return fallback;
  }
};

export async function signOut() {
  try {
    const cookieStore = await cookies();
    const session = await getSession();

    if (session && session.accessToken) {
      await fetch(`${BACKEND_URL}/auth/signout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    }

    cookieStore.delete("session");
  } catch (error) {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    console.error("SignOut action failed:", error);
  }

  redirect("/auth/signin");
}
export async function signUp(
  state: FormState,
  formData: FormData
): Promise<FormState> {
  const rawName = formData.get("name");
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  if (
    typeof rawName !== "string" ||
    typeof rawEmail !== "string" ||
    typeof rawPassword !== "string"
  ) {
    return { message: "Invalid form submission" };
  }

  try {
    const validationFields = SignupFormSchema.safeParse({
      name: rawName,
      email: rawEmail,
      password: rawPassword,
    });

    if (!validationFields.success) {
      return { error: validationFields.error.flatten().fieldErrors };
    }

    const response = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validationFields.data),
      cache: "no-store",
    });

    if (!response.ok) {
      const message =
        response.status === 409
          ? "User already exists"
          : await readApiErrorMessage(response, "Failed to create account");

      return { message };
    }

    // Auto-login right after signup.
    const loginResponse = await fetch(`${BACKEND_URL}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: validationFields.data.email,
        password: validationFields.data.password,
      }),
      cache: "no-store",
    });

    if (!loginResponse.ok) {
      return {
        message:
          "Account created successfully, but automatic login failed. Please sign in.",
      };
    }

    const loginResult = await loginResponse.json();
    await createSession({
      user: {
        id: loginResult.id,
        name: loginResult.name,
        role: loginResult.role,
      },
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
    });
  } catch (error) {
    console.error("SignUp action failed:", error);
    return { message: "Server unreachable or connection error." };
  }

  redirect("/dashboard");
}

export async function signIn(
  state: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      message: "Validation Error",
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedFields.data),
      cache: "no-store",
    });

    if (!response.ok) {
      const message =
        response.status === 401
          ? "Invalid credentials"
          : await readApiErrorMessage(response, "Login failed");

      return { message };
    }

    const result = await response.json();

    await createSession({
      user: {
        id: result.id,
        name: result.name,
        role: result.role,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error("SignIn action failed:", error);
    return { message: "Server unreachable or connection error." };
  }

  redirect("/dashboard");
}

export const refreshToken = async (oldRefreshToken: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh: oldRefreshToken,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const { accessToken, refreshToken } = await response.json();

    await updateTokens({
      accessToken,
      refreshToken,
    });

    return accessToken;
  } catch (error) {
    console.error("Refresh token failed:", error);
    return null;
  }
};
