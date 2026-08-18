import { createAnonClient } from "./supabase.ts";

export async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "");
  const supabase = createAnonClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export function hasSharedSecret(
  req: Request,
  headerName: string,
  envName: string,
) {
  const expected = Deno.env.get(envName);
  return Boolean(expected && req.headers.get(headerName) === expected);
}
