// Pure constants + helpers for the Team Overview module — safe to
// import from client components. Server-side queries live in
// src/lib/team.ts.

export const USER_STATUS_VALUES = [
  "ACTIVE",
  "INVITED",
  "INACTIVE",
] as const;
export type UserStatusValue = (typeof USER_STATUS_VALUES)[number];

export const USER_STATUS_OPTIONS: ReadonlyArray<{
  value: UserStatusValue;
  label: string;
}> = [
  { value: "ACTIVE", label: "Active" },
  { value: "INVITED", label: "Invited" },
  { value: "INACTIVE", label: "Inactive" },
];

export const ROLE_LABELS: Record<
  "OWNER" | "ADMIN" | "MEMBER" | "VIEWER",
  string
> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};
