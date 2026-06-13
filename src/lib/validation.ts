// Centralized zod schemas — shared by forms (react-hook-form) and API routes.
import { z } from "zod";

export const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Use only lowercase letters, numbers, and underscores"),
  displayName: z.string().min(1, "Display name is required").max(50),
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50),
  bio: z.string().max(160, "Bio must be at most 160 characters").optional().or(z.literal("")),
  isPrivate: z.boolean(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const commentSchema = z.object({
  text: z.string().min(1, "Comment can't be empty").max(500),
});
export type CommentInput = z.infer<typeof commentSchema>;

// Allowed media for uploads
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
// Kept under MongoDB's 16MB document limit (media is stored in the DB unless
// a Vercel Blob store is configured).
export const MAX_VIDEO_BYTES = 14 * 1024 * 1024; // 14 MB
