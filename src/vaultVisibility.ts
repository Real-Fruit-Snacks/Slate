import { App, Notice } from "obsidian";

const STYLE_EL_ID = "slate-data-folder-visibility";
const IGNORE_FILTERS_KEY = "userIgnoreFilters";

/**
 * Keeps the Slate data folder hidden from Obsidian's UI without touching stored
 * data. Two independent mechanisms:
 *
 * 1. A managed <style> element hides the folder's row (and its contents) in the
 *    file explorer, matched by the folder's `data-path`.
 * 2. The folder is added to Obsidian's "Excluded files" list so it also stays
 *    out of search, graph, and the quick switcher. This relies on the
 *    semi-internal vault config API; when unavailable it degrades to a one-time
 *    notice telling the user how to add the exclusion manually.
 *
 * All effects are reversible: turning the toggle off (or disabling the plugin)
 * removes the CSS, and the excluded-files entry is removed when hiding is off.
 */
export class DataFolderVisibility {
  private styleEl: HTMLStyleElement | null = null;
  private lastFilterPath: string | null = null;
  private warnedFilterFailure = false;

  constructor(private app: App) {}

  /** Reconcile both mechanisms to the given folder path and hidden state. */
  apply(folderPath: string, hidden: boolean): void {
    this.applyExplorerHiding(folderPath, hidden);
    this.applyExcludedFilter(folderPath, hidden);
  }

  /** Remove the injected CSS. Excluded-files entries are left as-is. */
  destroy(): void {
    this.styleEl?.remove();
    this.styleEl = null;
  }

  private applyExplorerHiding(folderPath: string, hidden: boolean): void {
    if (!hidden || !folderPath) {
      if (this.styleEl) {
        this.styleEl.textContent = "";
      }
      return;
    }

    const esc = cssAttrEscape(folderPath);
    this.ensureStyleEl().textContent = [
      `.nav-folder:has(> .nav-folder-title[data-path="${esc}"]) { display: none !important; }`,
      `.nav-folder-title[data-path="${esc}"] { display: none !important; }`,
      `.nav-file-title[data-path^="${esc}/"] { display: none !important; }`
    ].join("\n");
  }

  private ensureStyleEl(): HTMLStyleElement {
    if (this.styleEl && this.styleEl.isConnected) {
      return this.styleEl;
    }

    const el = document.createElement("style");
    el.id = STYLE_EL_ID;
    document.head.appendChild(el);
    this.styleEl = el;
    return el;
  }

  private applyExcludedFilter(folderPath: string, hidden: boolean): void {
    const vault = this.app.vault as unknown as {
      getConfig?(key: string): unknown;
      setConfig?(key: string, value: unknown): void;
    };

    if (typeof vault.getConfig !== "function" || typeof vault.setConfig !== "function") {
      this.warnFilterFallback(folderPath, hidden);
      return;
    }

    try {
      const current = vault.getConfig(IGNORE_FILTERS_KEY);
      const original: string[] = Array.isArray(current) ? (current as string[]) : [];
      let next = [...original];

      // Drop a stale entry from a previous apply (e.g. the folder was renamed).
      if (this.lastFilterPath && this.lastFilterPath !== folderPath) {
        next = next.filter((filter) => filter !== this.lastFilterPath);
      }

      if (hidden && folderPath) {
        if (!next.includes(folderPath)) {
          next.push(folderPath);
        }
        this.lastFilterPath = folderPath;
      } else {
        next = next.filter((filter) => filter !== folderPath);
        this.lastFilterPath = null;
      }

      if (!arraysEqual(original, next)) {
        vault.setConfig(IGNORE_FILTERS_KEY, next);
      }
    } catch (error) {
      console.warn("[slate] Could not update Obsidian excluded files list.", error);
      this.warnFilterFallback(folderPath, hidden);
    }
  }

  private warnFilterFallback(folderPath: string, hidden: boolean): void {
    if (!hidden || this.warnedFilterFailure) {
      return;
    }

    this.warnedFilterFailure = true;
    new Notice(
      `Slate hid "${folderPath}" from the file explorer. To also hide it from ` +
        `search and graph, add it to Settings → Files and links → Excluded files.`,
      10000
    );
  }
}

function cssAttrEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
