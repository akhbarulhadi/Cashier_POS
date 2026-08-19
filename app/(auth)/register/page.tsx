"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Store,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const registerSchema = z.object({
  storeName: z.string().trim().min(2, "Store name must be at least 2 characters.").max(150),
  storePhone: z.string().trim().max(30).optional().or(z.literal("")),
  storeAddress: z.string().trim().max(500).optional().or(z.literal("")),
  ownerName: z.string().trim().min(2, "Owner name must be at least 2 characters.").max(150),
  ownerEmail: z.string().trim().email("Invalid email format."),
  ownerPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Must contain at least one number."),
  confirmPassword: z.string(),
}).refine((d) => d.ownerPassword === d.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      storeName: "",
      storePhone: "",
      storeAddress: "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: data.storeName,
          storePhone: data.storePhone || null,
          storeAddress: data.storeAddress || null,
          ownerName: data.ownerName,
          ownerEmail: data.ownerEmail,
          ownerPassword: data.ownerPassword,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error("Registration failed", {
          description: json?.message ?? "An error occurred. Please try again.",
        });
        return;
      }

      setIsSuccess(true);
      toast.success("Store registered successfully!", {
        description: "Please log in with your newly created owner account.",
      });
    } catch {
      toast.error("Network error occurred.", {
        description: "Please check your internet connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <div className="text-center">
            <h2 className="text-xl font-semibold">Store Registered Successfully!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your owner account and store data are ready. Please log in to start managing your store.
            </p>
          </div>
          <Button className="w-full" onClick={() => router.push("/login")}>
            Go to My Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Register New Store</CardTitle>
        <CardDescription>
          Create an OWNER account and register your store data at the same time.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* STORE DATA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Store Data</span>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="storeName"
                  placeholder="e.g., Jaya Grocery Store"
                  className="pl-9"
                  {...register("storeName")}
                />
              </div>
              {errors.storeName && (
                <p className="text-xs text-destructive">{errors.storeName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="storePhone">Store Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="storePhone"
                    placeholder="08xxxxxxxxxx"
                    className="pl-9"
                    {...register("storePhone")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeAddress">Store Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="storeAddress"
                    placeholder="1 Main Street"
                    className="pl-9"
                    {...register("storeAddress")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* OWNER DATA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Owner Data (OWNER)</span>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label htmlFor="ownerName">Full Name <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ownerName"
                  placeholder="Your Name"
                  className="pl-9"
                  {...register("ownerName")}
                />
              </div>
              {errors.ownerName && (
                <p className="text-xs text-destructive">{errors.ownerName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Email <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ownerEmail"
                  type="email"
                  placeholder="owner@email.com"
                  className="pl-9"
                  autoComplete="email"
                  {...register("ownerEmail")}
                />
              </div>
              {errors.ownerEmail && (
                <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ownerPassword">Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="ownerPassword"
                    type="password"
                    placeholder="Min. 8 characters"
                    className="pl-9"
                    autoComplete="new-password"
                    {...register("ownerPassword")}
                  />
                </div>
                {errors.ownerPassword && (
                  <p className="text-xs text-destructive">{errors.ownerPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat password"
                    className="pl-9"
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register My Store
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Login here
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
