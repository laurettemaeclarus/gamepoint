import { supabaseAdmin } from "@/lib/supabase";
import { UserRepository } from "@/lib/repositories/UserRepository";
import type { User } from "@/types";

export class UserService {
  private userRepo = new UserRepository();

  async getUsers(
    orderBy = "points",
    page?: number,
    pageSize?: number
  ): Promise<{ data: User[]; total: number }> {
    return this.userRepo.findAll(orderBy, page, pageSize);
  }

  async updateAvatar(
    userId: string,
    file: File
  ): Promise<{ url: string } | { error: string }> {
    try {
      if (!file || file.size === 0) {
        return { error: "No file uploaded" };
      }
      if (!file.type.startsWith("image/")) {
        return { error: "File must be an image" };
      }
      if (file.size > 5 * 1024 * 1024) {
        return { error: "Image must be 5MB or smaller" };
      }

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const safeExt = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)
        ? ext
        : "png";
      const fileName = `${userId}-${Date.now()}.${safeExt}`;

      const client = supabaseAdmin;

      const { error: uploadError } = await client.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        return { error: uploadError.message };
      }

      const { data } = client.storage.from("avatars").getPublicUrl(fileName);

      const { error: dbError } = await client
        .from("users")
        .update({ avatar_url: data.publicUrl })
        .eq("id", userId);

      if (dbError) {
        return { error: dbError.message };
      }

      return { url: data.publicUrl };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Avatar update failed";
      return { error: message };
    }
  }
  async deductTimeCredit(userId: string, minutes: number): Promise<void> {
    await this.userRepo.deductTimeCreditById(userId, minutes);
  }

}
