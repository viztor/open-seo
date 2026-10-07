import * as React from "react";
import { toast } from "sonner";
import { useSyncExternalStore } from "react";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { startBingLink as startBingLinkFn } from "@/serverFunctions/bing";

// One link flow at a time: a double-click, or a second Connect click while the
// redirect to Bing is pending, would start two consent screens for one
// return page.
let linkRedirectPending = false;
const listeners = new Set<() => void>();

function setLinkPending(pending: boolean) {
  linkRedirectPending = pending;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The Bing OAuth entry point shares request and navigation state. */
export function useBingLinkPending() {
  return useSyncExternalStore(
    subscribe,
    () => linkRedirectPending,
    () => false,
  );
}

/**
 * Kick off a delegated Bing Webmaster OAuth grant. On success this redirects
 * the whole page to Bing's consent screen; `callbackURL` is where Bing
 * returns the user afterward. Failures building the authorization URL surface
 * as a toast; failures during the Bing round-trip redirect back to the same
 * page with an error marker that BingLinkErrorAlert surfaces.
 */
export async function startBingLink(callbackURL: string): Promise<boolean> {
  if (linkRedirectPending) return false;
  setLinkPending(true);
  let redirecting = false;
  try {
    const { url } = await startBingLinkFn({ data: { callbackURL } });
    redirecting = true;
    window.location.href = url;
    // The page is about to unload, so the guard normally never needs to
    // release — but the browser can cancel a pending navigation (Esc, a
    // beforeunload prompt). Revive the buttons instead of leaving the page
    // dead until reload.
    setTimeout(() => {
      setLinkPending(false);
    }, 15_000);
    return true;
  } catch (error) {
    toast.error(getStandardErrorMessage(error));
    return false;
  } finally {
    // Single release point: any exit that didn't hand off to the browser
    // (a thrown request) re-arms the button immediately.
    if (!redirecting) setLinkPending(false);
  }
}

/** Restore the picker after Bing's full-page redirect, scoped to this project. */
export function useBingPickerResume(projectId: string) {
  // null lets the card derive unfinished setup from the saved credential.
  // false means the user explicitly closed the picker during this visit.
  const [picking, setPicking] = React.useState<boolean | null>(null);
  const linking = useBingLinkPending();
  const key = `bing-property-picker:${projectId}`;
  React.useEffect(() => {
    setPicking(null);
    try {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        setPicking(true);
      }
    } catch {
      /* Storage can be disabled; Connect still opens the picker. */
    }
  }, [key]);

  const linkAccount = async (callbackURL: string) => {
    try {
      sessionStorage.setItem(key, "open");
    } catch {
      /* Bing authorization does not require browser storage. */
    }
    const redirecting = await startBingLink(callbackURL);
    if (!redirecting) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Storage is optional. */
      }
    }
  };
  return { picking, setPicking, linkAccount, linking };
}
