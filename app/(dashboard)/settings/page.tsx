"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/useAuthStore";

const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2, "Store name must be at least 2 characters.").max(150),
  address: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email("Invalid email format.").optional().nullable().or(z.literal("")),
  logoUrl: z.string().trim().url("Invalid logo URL.").optional().nullable().or(z.literal("")),
  receiptFooter: z.string().trim().max(300).optional().nullable(),
  defaultTaxPercent: z.coerce.number().min(0).max(100),
  currency: z.string().trim().max(10),
});

const userSettingsSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters.").max(150),
  email: z.string().trim().email("Invalid email format."),
  phone: z.string().trim().max(30).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters.").optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).refine(data => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
}).refine(data => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to set a new password.",
  path: ["currentPassword"],
});

type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>;
type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

export default function SettingsPage() {
  const isOwner = useAuthStore((s) => s.isOwner());
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [isLoadingStore, setIsLoadingStore] = useState(true);

  const {
    register: registerStore,
    handleSubmit: handleSubmitStore,
    reset: resetStore,
    formState: { errors: storeErrors, isSubmitting: isSubmittingStore },
  } = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: "",
      address: "",
      phone: "",
      email: "",
      logoUrl: "",
      receiptFooter: "",
      defaultTaxPercent: 0,
      currency: "IDR",
    },
  });

  const {
    register: registerUser,
    handleSubmit: handleSubmitUser,
    reset: resetUser,
    formState: { errors: userErrors, isSubmitting: isSubmittingUser },
  } = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const fetchStoreSettings = useCallback(async () => {
    setIsLoadingStore(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load store settings.");
      }
      resetStore({
        storeName: json.data.storeName ?? "",
        address: json.data.address ?? "",
        phone: json.data.phone ?? "",
        email: json.data.email ?? "",
        logoUrl: json.data.logoUrl ?? "",
        receiptFooter: json.data.receiptFooter ?? "",
        defaultTaxPercent: Number(json.data.defaultTaxPercent ?? 0),
        currency: json.data.currency ?? "IDR",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoadingStore(false);
    }
  }, [resetStore]);

  useEffect(() => {
    fetchStoreSettings();
  }, [fetchStoreSettings]);

  useEffect(() => {
    if (profile) {
      resetUser({
        fullName: profile.fullName ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [profile, resetUser]);

  const onSubmitStore = async (values: StoreSettingsFormValues) => {
    if (!isOwner) return;
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          address: values.address || null,
          phone: values.phone || null,
          email: values.email || null,
          logoUrl: values.logoUrl || null,
          receiptFooter: values.receiptFooter || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update store settings.");
      }
      toast.success("Store settings successfully updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    }
  };

  const onSubmitUser = async (values: UserSettingsFormValues) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          phone: values.phone || null,
          email: values.email,
          currentPassword: values.currentPassword || undefined,
          newPassword: values.newPassword || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update profile.");
      }
      
      if (profile) {
        setProfile({
          ...profile,
          fullName: json.data.fullName,
          email: json.data.email,
          phone: json.data.phone,
        });
      }
      
      resetUser({
        ...values,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      toast.success("Profile successfully updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    }
  };

  if (isLoadingStore || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and store preferences.
        </p>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList>
          <TabsTrigger value="store">Store Settings</TabsTrigger>
          <TabsTrigger value="profile">Profile Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="store" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>
                {isOwner
                  ? "Update the store information that will appear on receipts & reports."
                  : "Only the Owner can change these settings."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <fieldset disabled={!isOwner} className="space-y-4 disabled:opacity-70">
                <form onSubmit={handleSubmitStore(onSubmitStore)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Store Name</Label>
                      <Input id="storeName" {...registerStore("storeName")} />
                      {storeErrors.storeName && (
                        <p className="text-xs text-destructive">{storeErrors.storeName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" {...registerStore("phone")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" {...registerStore("email")} />
                      {storeErrors.email && (
                        <p className="text-xs text-destructive">{storeErrors.email.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <Input id="logoUrl" placeholder="https://..." {...registerStore("logoUrl")} />
                      {storeErrors.logoUrl && (
                        <p className="text-xs text-destructive">{storeErrors.logoUrl.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defaultTaxPercent">Default Tax (%)</Label>
                      <Input
                        id="defaultTaxPercent"
                        type="number"
                        step="0.01"
                        {...registerStore("defaultTaxPercent")}
                      />
                      {storeErrors.defaultTaxPercent && (
                        <p className="text-xs text-destructive">
                          {storeErrors.defaultTaxPercent.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input id="currency" {...registerStore("currency")} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" {...registerStore("address")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receiptFooter">Receipt Footer</Label>
                    <Textarea
                      id="receiptFooter"
                      placeholder="Example: Thank you for shopping with us!"
                      {...registerStore("receiptFooter")}
                    />
                  </div>
                  {isOwner && (
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmittingStore}>
                        {isSubmittingStore ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </form>
              </fieldset>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitUser(onSubmitUser)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" {...registerUser("fullName")} />
                    {userErrors.fullName && (
                      <p className="text-xs text-destructive">{userErrors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userEmail">Email</Label>
                    <Input id="userEmail" type="email" {...registerUser("email")} />
                    {userErrors.email && (
                      <p className="text-xs text-destructive">{userErrors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPhone">Phone</Label>
                    <Input id="userPhone" {...registerUser("phone")} />
                    {userErrors.phone && (
                      <p className="text-xs text-destructive">{userErrors.phone.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="my-6 border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Change Password</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" {...registerUser("currentPassword")} />
                      {userErrors.currentPassword && (
                        <p className="text-xs text-destructive">{userErrors.currentPassword.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" {...registerUser("newPassword")} />
                      {userErrors.newPassword && (
                        <p className="text-xs text-destructive">{userErrors.newPassword.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" {...registerUser("confirmPassword")} />
                      {userErrors.confirmPassword && (
                        <p className="text-xs text-destructive">{userErrors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmittingUser}>
                    {isSubmittingUser ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
