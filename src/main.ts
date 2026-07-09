import { Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import type { MarkdownPostProcessorContext } from "obsidian";
import { dailyNoteDateFromPath, normalizeDailyNoteDateFormat } from "./dailyNotes";
import {
  GraphiteSettingTab,
  GraphiteSettings,
  DEFAULT_SETTINGS,
  normalizeDefaultProject,
  normalizeDataFolderPath,
  normalizeFontOption,
  normalizeLabelColorMap,
  normalizeLabelRegistry,
  normalizeOverdueRange,
  normalizeSortMode,
  normalizeProjectRegistry
} from "./settings";
import { dedupeLabels, normalizeLabelName } from "./labels";
import { DataFolderVisibility } from "./vaultVisibility";
import { TaskStore } from "./taskStore";
import { TaskBoardView, VIEW_TYPE_GRAPHITE } from "./views/TaskBoardView";
import { cleanProjectName, uniqueRealProjects } from "./projects";
import { QuickAddModal } from "./views/QuickAddModal";
import { DailyNoteCompletedBlock } from "./views/DailyNoteCompletedBlock";

const GRAPHITE_COMPLETED_CODE_BLOCK = "```graphite-completed\n```";
const GRAPHITE_COMPLETED_CODE_BLOCK_RE = /```graphite-completed\b[\s\S]*?```/i;

export default class GraphitePlugin extends Plugin {
  settings: GraphiteSettings;
  store: TaskStore;
  private reloadDebounceTimer: number | null = null;
  private dataFolderVisibility: DataFolderVisibility | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.store = new TaskStore(this.app, this.settings);
    this.dataFolderVisibility = new DataFolderVisibility(this.app);
    this.applyDataFolderVisibility();

    this.registerView(
      VIEW_TYPE_GRAPHITE,
      (leaf: WorkspaceLeaf) =>
        new TaskBoardView(leaf, this.store, this.settings, () => this.saveSettings())
    );

    this.addRibbonIcon("check-circle-2", "Open graphite", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open",
      name: "Open",
      callback: () => {
        void this.activateView();
      }
    });

    this.addCommand({
      id: "quick-add-task",
      name: "Quick Add Task",
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "A"
        }
      ],
      callback: () => {
        new QuickAddModal(this.app, async (title) => {
          await this.store.createTask({ title });
          new Notice("Task added to Inbox");
        }).open();
      }
    });

    this.addCommand({
      id: "show-active-daily-note-completed-tasks",
      name: "Show Completed Tasks for Active Daily Note",
      callback: () => {
        void this.openActiveDailyNoteCompletedTasks();
      }
    });

    this.addCommand({
      id: "insert-active-daily-note-completed-block",
      name: "Insert Completed Tasks Block in Active Daily Note",
      callback: () => {
        void this.insertActiveDailyNoteCompletedBlock();
      }
    });

    this.addCommand({
      id: "normalize-labels",
      name: "Normalize Labels",
      callback: async () => {
        await this.store.normalizeLabels();
        this.settings.labelColors = normalizeLabelColorMap(this.settings.labelColors);
        this.settings.labelRegistry = normalizeLabelRegistry([
          ...this.settings.labelRegistry,
          ...Object.keys(this.settings.labelColors)
        ]);
        await this.saveSettings();
        new Notice("graphite labels normalized.");
      }
    });

    this.addCommand({
      id: "migrate-old-task-file",
      name: "Migrate old task file",
      callback: async () => {
        const migratedCount = await this.store.migrateOldTaskFile();
        if (migratedCount === 0) {
          new Notice("graphite found no old tasks to migrate.");
          return;
        }

        new Notice(`graphite migrated ${migratedCount} task${migratedCount === 1 ? "" : "s"}.`);
      }
    });

    this.addSettingTab(new GraphiteSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        void this.refreshIfTaskFile(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        void this.refreshIfTaskFile(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (
          this.store.isTaskStorageFile(oldPath) ||
          this.store.isTaskStorageFile(file.path)
        ) {
          this.scheduleReload();
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (this.store.isTaskStorageFile(file.path)) {
          this.scheduleReload();
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        void this.handleDailyNoteFileOpen(file);
      })
    );

    this.registerMarkdownCodeBlockProcessor("graphite-completed", (source, el, ctx) => {
      this.renderCompletedTasksCodeBlock(source, el, ctx);
    });

    void this.initializeStore();
  }

  onunload(): void {
    if (this.reloadDebounceTimer !== null) {
      window.clearTimeout(this.reloadDebounceTimer);
    }
    this.dataFolderVisibility?.destroy();
    this.dataFolderVisibility = null;
  }

  async loadSettings(): Promise<void> {
    const saved = toSettingsData(await this.loadData());
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...saved,
      dataFolderPath: normalizeDataFolderPath(saved?.dataFolderPath),
      defaultProject: normalizeDefaultProject(saved?.defaultProject),
      icons: {
        ...DEFAULT_SETTINGS.icons,
        ...saved?.icons
      },
      projectColors: {
        ...DEFAULT_SETTINGS.projectColors,
        ...saved?.projectColors
      },
      labelColors: normalizeLabelColorMap({
        ...DEFAULT_SETTINGS.labelColors,
        ...saved?.labelColors
      }),
      labelRegistry: normalizeLabelRegistry([
        ...DEFAULT_SETTINGS.labelRegistry,
        ...(saved?.labelRegistry || []),
        ...Object.keys(saved?.labelColors || {})
      ]),
      projectRegistry: normalizeProjectRegistry([
        ...(saved?.projectRegistry || []),
        ...Object.keys(saved?.projectColors || {})
      ]),
      sortMode: normalizeSortMode(saved?.sortMode),
      defaultOverdueRange: normalizeOverdueRange(saved?.defaultOverdueRange),
      uiFont: normalizeFontOption(saved?.uiFont),
      taskTitleFont: normalizeFontOption(saved?.taskTitleFont),
      taskDescriptionFont: normalizeFontOption(saved?.taskDescriptionFont),
      labelFont: normalizeFontOption(saved?.labelFont),
      dailyNotesIntegrationEnabled:
        saved?.dailyNotesIntegrationEnabled ?? DEFAULT_SETTINGS.dailyNotesIntegrationEnabled,
      dailyNotesAutoInsertCompletedBlock:
        saved?.dailyNotesAutoInsertCompletedBlock ??
        DEFAULT_SETTINGS.dailyNotesAutoInsertCompletedBlock,
      dailyNoteDateFormat: normalizeDailyNoteDateFormat(saved?.dailyNoteDateFormat)
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.applyDataFolderVisibility();
  }

  applyDataFolderVisibility(): void {
    this.dataFolderVisibility?.apply(
      normalizeDataFolderPath(this.settings.dataFolderPath),
      this.settings.hideDataFolderFromVault
    );
  }

  async reloadTasks(): Promise<void> {
    try {
      await this.store.reloadFromDisk();
    } catch (error) {
      new Notice("graphite could not reload task data.");
      console.error(error);
    }
  }

  refreshGraphiteViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_GRAPHITE)) {
      const view = leaf.view;
      if (view instanceof TaskBoardView) {
        view.refresh();
      }
    }
  }

  getProjectNames(): string[] {
    return uniqueRealProjects([
      cleanProjectName(this.settings.defaultProject),
      ...this.store.getProjects().map(cleanProjectName),
      ...Object.keys(this.settings.projectColors).map(cleanProjectName),
      ...this.settings.projectRegistry.map(cleanProjectName)
    ]);
  }

  getLabelNames(): string[] {
    const taskLabels: string[] = [];
    for (const task of this.store.getTasks()) {
      taskLabels.push(...task.labels);
    }

    return dedupeLabels([
      ...this.settings.labelRegistry,
      ...Object.keys(this.settings.labelColors),
      ...taskLabels
    ]).sort((a, b) => a.localeCompare(b));
  }

  getLabelTaskCount(label: string): number {
    const normalized = normalizeLabelName(label);
    if (!normalized) {
      return 0;
    }

    return this.store
      .getTasks()
      .filter((task) => task.labels.some((candidate) => normalizeLabelName(candidate) === normalized))
      .length;
  }

  async renameLabel(oldLabel: string, newLabel: string): Promise<void> {
    const oldNormalized = normalizeLabelName(oldLabel);
    const newNormalized = normalizeLabelName(newLabel);
    if (!oldNormalized || !newNormalized || oldNormalized === newNormalized) {
      return;
    }

    await this.store.renameLabel(oldNormalized, newNormalized);

    const preservedColor = this.settings.labelColors[oldNormalized];
    if (preservedColor) {
      this.settings.labelColors[newNormalized] = preservedColor;
    }
    delete this.settings.labelColors[oldNormalized];
    this.settings.labelRegistry = dedupeLabels([
      ...this.settings.labelRegistry.filter(
        (label) => normalizeLabelName(label) !== oldNormalized
      ),
      newNormalized
    ]);
    await this.saveSettings();
    this.refreshGraphiteViews();
  }

  async deleteLabel(label: string): Promise<void> {
    const normalized = normalizeLabelName(label);
    if (!normalized) {
      return;
    }

    await this.store.deleteLabel(normalized);
    delete this.settings.labelColors[normalized];
    this.settings.labelRegistry = this.settings.labelRegistry.filter(
      (candidate) => normalizeLabelName(candidate) !== normalized
    );
    await this.saveSettings();
    this.refreshGraphiteViews();
  }

  private async activateView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GRAPHITE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof TaskBoardView) {
        view.openToday();
      }
      this.app.workspace.setActiveLeaf(leaves[0], { focus: true });
      return;
    }

    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_GRAPHITE, active: true });
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }

  private async activateDailyNoteView(date: string, sourcePath: string): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GRAPHITE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof TaskBoardView) {
        view.openDailyNote(date, sourcePath);
      }
      this.app.workspace.setActiveLeaf(leaves[0], { focus: true });
      return;
    }

    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_GRAPHITE, active: true });
    const view = leaf.view;
    if (view instanceof TaskBoardView) {
      view.openDailyNote(date, sourcePath);
    }
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
  }

  private async openActiveDailyNoteCompletedTasks(): Promise<void> {
    if (!this.settings.dailyNotesIntegrationEnabled) {
      new Notice("graphite Daily Notes integration is disabled in settings.");
      return;
    }

    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Open a daily note first.");
      return;
    }

    const date = this.dateFromDailyNoteFile(file);
    if (!date) {
      new Notice("graphite could not detect a date from the active note.");
      return;
    }

    await this.activateDailyNoteView(date, file.path);
  }

  private async insertActiveDailyNoteCompletedBlock(): Promise<void> {
    if (!this.settings.dailyNotesIntegrationEnabled) {
      new Notice("graphite Daily Notes integration is disabled in settings.");
      return;
    }

    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("Open a daily note first.");
      return;
    }

    if (!this.dateFromDailyNoteFile(file)) {
      new Notice("graphite could not detect a date from the active note.");
      return;
    }

    const result = await this.ensureDailyNoteCompletedBlock(file);
    if (result === "inserted") {
      new Notice("graphite completed tasks block added.");
    } else if (result === "exists") {
      new Notice("This note already has a graphite completed tasks block.");
    }
  }

  private async handleDailyNoteFileOpen(file: TFile | null): Promise<void> {
    this.refreshDailyNoteViews(file);

    if (!this.settings.dailyNotesAutoInsertCompletedBlock || !file) {
      return;
    }

    const date = this.dateFromDailyNoteFile(file);
    if (!date) {
      return;
    }

    await this.ensureDailyNoteCompletedBlock(file);
  }

  private refreshDailyNoteViews(file: TFile | null): void {
    if (!this.settings.dailyNotesIntegrationEnabled || !file) {
      return;
    }

    const date = this.dateFromDailyNoteFile(file);
    if (!date) {
      return;
    }

    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_GRAPHITE)) {
      const view = leaf.view;
      if (view instanceof TaskBoardView) {
        view.openDailyNote(date, file.path);
      }
    }
  }

  private async ensureDailyNoteCompletedBlock(file: TFile): Promise<"inserted" | "exists" | "skipped"> {
    if (!this.settings.dailyNotesIntegrationEnabled || !file.path.toLowerCase().endsWith(".md")) {
      return "skipped";
    }

    const content = await this.app.vault.read(file);
    if (GRAPHITE_COMPLETED_CODE_BLOCK_RE.test(content)) {
      return "exists";
    }

    const separator = content.trim().length > 0
      ? content.endsWith("\n") ? "\n" : "\n\n"
      : "";
    await this.app.vault.modify(file, `${content}${separator}${GRAPHITE_COMPLETED_CODE_BLOCK}\n`);
    return "inserted";
  }

  private renderCompletedTasksCodeBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): void {
    ctx.addChild(new DailyNoteCompletedBlock({
      app: this.app,
      containerEl: el,
      source,
      sourcePath: ctx.sourcePath,
      store: this.store,
      settings: this.settings,
      openDailyNote: (date, sourcePath) => {
        void this.activateDailyNoteView(date, sourcePath);
      }
    }));
  }

  private dateFromDailyNoteFile(file: TFile): string | null {
    return dailyNoteDateFromPath(file.path, this.settings.dailyNoteDateFormat);
  }

  private scheduleReload(): void {
    if (this.reloadDebounceTimer !== null) {
      window.clearTimeout(this.reloadDebounceTimer);
    }
    this.reloadDebounceTimer = window.setTimeout(() => {
      this.reloadDebounceTimer = null;
      void this.reloadTasks();
    }, 300);
  }

  private refreshIfTaskFile(file: TAbstractFile): void {
    if (!this.store.isTaskStorageFile(file.path)) return;
    if (this.store.isCurrentlyWriting(file.path)) return;
    this.scheduleReload();
  }

  private async initializeStore(): Promise<void> {
    try {
      await this.store.load();
    } catch (error) {
      new Notice("graphite could not initialize task storage. Open the developer console for details.");
      console.error("[graphite] Failed to initialize task storage.", error, {
        dataFolderPath: this.settings.dataFolderPath,
        tasksFilePath: this.settings.tasksFilePath
      });
    }
  }
}

function toSettingsData(value: unknown): Partial<GraphiteSettings> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}
