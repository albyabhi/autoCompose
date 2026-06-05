import { getCurrentUser } from "@/lib/auth/current-user";
import { success, failure } from "@/utils/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return success({ user });
  } catch (error) {
    return failure(error);
  }
}
