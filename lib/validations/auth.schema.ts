import { z } from "zod";

export const loginSchema = z.object({
  email: z.string({ required_error: "Email is required." }).email("Invalid email format."),
  password: z
    .string({ required_error: "Password is required." })
    .min(6, "Password must be at least 6 characters."),
});

export const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: "Full name is required." })
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(150),
    email: z.string({ required_error: "Email is required." }).email("Invalid email format."),
    password: z
      .string({ required_error: "Password is required." })
      .min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string({ required_error: "Password confirmation is required." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password confirmation does not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
