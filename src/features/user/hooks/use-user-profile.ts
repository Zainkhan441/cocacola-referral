// Re-exported for backward compatibility with every existing call site
// (`@/features/user/hooks/use-user-profile`) — the real implementation is
// now a shared context provider (one onSnapshot subscription for the whole
// app) instead of a plain hook that opened its own listener per call site.
// See user-profile-provider.tsx for why.
export { useUserProfile } from "@/features/user/context/user-profile-provider";
