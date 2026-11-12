/** Cookie that remembers whether the desktop sidebar is collapsed. */
export const SIDEBAR_COLLAPSED_COOKIE = "sidebar_collapsed";

export function isSidebarCollapsed(value: string | undefined): boolean {
  return value === "1";
}
