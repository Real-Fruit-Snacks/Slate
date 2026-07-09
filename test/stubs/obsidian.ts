// Minimal stand-ins for the pieces of the Obsidian API the data layer imports.
// Only what `src/taskStore.ts` uses is implemented; the pure modules do not
// import from "obsidian" at all.

/** Normalize a vault path: forward slashes, collapse repeats, no leading/trailing slash. */
export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

/** No-op stand-in for Obsidian's transient toast. Records the last message for assertions. */
export class Notice {
  static last: string | undefined;
  constructor(public message?: string, public timeout?: number) {
    Notice.last = message;
  }
  setMessage(message: string): this {
    this.message = message;
    return this;
  }
  hide(): void {}
}

export class TAbstractFile {
  path = "";
  name = "";
  parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {
  basename = "";
  extension = "";
  stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
  isRoot(): boolean {
    return this.path === "" || this.path === "/";
  }
}

// Types used only for annotations in the store; a bare class is enough.
export class App {}
export class Vault {}

// `settings.ts` (imported transitively by the store) references these at module
// load time (`class GraphiteSettingTab extends PluginSettingTab`). Minimal
// stand-ins so the module loads; their methods are never exercised in tests.
export class Plugin {}

export class PluginSettingTab {
  constructor(_app?: unknown, _plugin?: unknown) {}
  display(): void {}
}

export class Setting {
  constructor(_containerEl?: unknown) {}
  setName(): this { return this; }
  setDesc(): this { return this; }
  setHeading(): this { return this; }
  addText(): this { return this; }
  addToggle(): this { return this; }
  addDropdown(): this { return this; }
  addColorPicker(): this { return this; }
  addButton(): this { return this; }
}

// Modal subclasses (e.g. LabelManagementModals) are defined at module load;
// they are never opened in tests.
export class Modal {
  app: unknown;
  constructor(app?: unknown) {
    this.app = app;
  }
  open(): void {}
  close(): void {}
  onOpen(): void {}
  onClose(): void {}
}
