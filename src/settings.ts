import { App, normalizePath, Plugin, PluginSettingTab, Setting } from "obsidian";
import { colorForName, resolveColorToHex } from "./colors";
import {
  DEFAULT_DAILY_NOTE_DATE_FORMAT,
  normalizeDailyNoteDateFormat
} from "./dailyNotes";
import { dedupeLabels, displayLabel, normalizeLabelName } from "./labels";
import { normalizeTaskProject } from "./projects";
import { DeleteLabelModal, RenameLabelModal } from "./views/LabelManagementModals";
import {
  SlateFontOption,
  SlateSortMode,
  FONT_OPTIONS,
  OVERDUE_RANGES,
  OverdueRange,
  SORT_MODES
} from "./types";

export const DEFAULT_DATA_FOLDER_PATH = "_slate_files";

export interface SlateSettings {
  tasksFilePath: string;
  dataFolderPath: string;
  defaultProject: string;
  icons: SlateIconSettings;
  projectColors: Record<string, string>;
  labelColors: Record<string, string>;
  labelRegistry: string[];
  projectRegistry: string[];
  sortMode: SlateSortMode;
  groupBy: "none" | "label" | "priority";
  defaultOverdueRange: OverdueRange;
  uiFont: SlateFontOption;
  taskTitleFont: SlateFontOption;
  taskDescriptionFont: SlateFontOption;
  labelFont: SlateFontOption;
  archivedProjects: string[];
  hideDataFolderFromVault: boolean;
  dailyNotesIntegrationEnabled: boolean;
  dailyNotesAutoInsertCompletedBlock: boolean;
  dailyNoteDateFormat: string;
}

export interface SlateIconSettings {
  search: string;
  inbox: string;
  today: string;
  upcoming: string;
  filters: string;
  projects: string;
  activity: string;
  completed: string;
}

export const DEFAULT_SETTINGS: SlateSettings = {
  tasksFilePath: "slate/tasks.md",
  dataFolderPath: DEFAULT_DATA_FOLDER_PATH,
  defaultProject: "",
  icons: {
    search: "search",
    inbox: "inbox",
    today: "today",
    upcoming: "upcoming",
    filters: "filters",
    projects: "projects",
    activity: "activity",
    completed: "completed"
  },
  projectColors: {},
  labelColors: {},
  labelRegistry: [],
  projectRegistry: [],
  archivedProjects: [],
  hideDataFolderFromVault: true,
  sortMode: "smart",
  groupBy: "none",
  defaultOverdueRange: "last7",
  uiFont: "system",
  taskTitleFont: "system",
  taskDescriptionFont: "system",
  labelFont: "system",
  dailyNotesIntegrationEnabled: true,
  dailyNotesAutoInsertCompletedBlock: false,
  dailyNoteDateFormat: DEFAULT_DAILY_NOTE_DATE_FORMAT
};

const OVERDUE_RANGE_LABELS: Record<OverdueRange, string> = {
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  older: "Older"
};

const FONT_OPTION_LABELS: Record<SlateFontOption, string> = {
  system: "System Font",
  ibmPlexSans: "IBM Plex Sans",
  ibmPlexMono: "IBM Plex Mono",
  spaceGrotesk: "Space Grotesk",
  spaceMono: "Space Mono",
  manrope: "Manrope",
  jetBrainsMono: "JetBrains Mono",
  sourceSans3: "Source Sans 3",
  inter: "Inter",
  geistMono: "Geist Mono",
  dmSans: "DM Sans"
};

const SLATE_FONT_STACKS: Record<SlateFontOption, string> = {
  system: 'var(--font-interface), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  ibmPlexSans: '"IBM Plex Sans", var(--font-interface), system-ui, sans-serif',
  ibmPlexMono: '"IBM Plex Mono", var(--font-monospace), monospace',
  spaceGrotesk: '"Space Grotesk", var(--font-interface), system-ui, sans-serif',
  spaceMono: '"Space Mono", var(--font-monospace), monospace',
  manrope: '"Manrope", var(--font-interface), system-ui, sans-serif',
  jetBrainsMono: '"JetBrains Mono", var(--font-monospace), monospace',
  sourceSans3: '"Source Sans 3", var(--font-interface), system-ui, sans-serif',
  inter: '"Inter", var(--font-interface), system-ui, sans-serif',
  geistMono: '"Geist Mono", var(--font-monospace), monospace',
  dmSans: '"DM Sans", var(--font-interface), system-ui, sans-serif'
};

export function normalizeLabelColorMap(
  colors: Record<string, string> | undefined
): Record<string, string> {
  const normalizedColors: Record<string, string> = {};

  for (const [label, color] of Object.entries(colors || {})) {
    const normalized = normalizeLabelName(label);
    if (!normalized) {
      continue;
    }

    normalizedColors[normalized] = color;
  }

  return normalizedColors;
}

export function normalizeLabelRegistry(labels: string[] | undefined): string[] {
  return dedupeLabels(labels || []);
}

export function normalizeProjectRegistry(projects: string[] | undefined): string[] {
  return [...new Set((projects || []).map(normalizeTaskProject).filter(Boolean) as string[])]
    .sort((a, b) => a.localeCompare(b));
}

export function normalizeDataFolderPath(value: string | undefined): string {
  const trimmed = (value || "").trim().replace(/^\/+/, "");
  const normalized = normalizePath(trimmed || DEFAULT_DATA_FOLDER_PATH)
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return normalized || DEFAULT_DATA_FOLDER_PATH;
}

export function normalizeSortMode(value: string | undefined): SlateSortMode {
  return SORT_MODES.includes(value as SlateSortMode)
    ? (value as SlateSortMode)
    : DEFAULT_SETTINGS.sortMode;
}

export function normalizeOverdueRange(value: string | undefined): OverdueRange {
  return OVERDUE_RANGES.includes(value as OverdueRange)
    ? (value as OverdueRange)
    : DEFAULT_SETTINGS.defaultOverdueRange;
}

export function normalizeFontOption(value: string | undefined): SlateFontOption {
  return FONT_OPTIONS.includes(value as SlateFontOption)
    ? (value as SlateFontOption)
    : "system";
}

export function normalizeDefaultProject(value: string | undefined): string {
  return normalizeTaskProject(value) || "";
}

export function fontOptionLabel(option: SlateFontOption): string {
  return FONT_OPTION_LABELS[option];
}

export function overdueRangeLabel(range: OverdueRange): string {
  return OVERDUE_RANGE_LABELS[range];
}

export function fontStackForOption(option: SlateFontOption): string {
  return SLATE_FONT_STACKS[option] || SLATE_FONT_STACKS.system;
}

export function applySlateFontSettings(
  element: HTMLElement,
  settings: SlateSettings
): void {
  element.setCssProps({
    "--slate-font-ui": fontStackForOption(settings.uiFont),
    "--slate-font-task-title": fontStackForOption(settings.taskTitleFont),
    "--slate-font-task-description": fontStackForOption(settings.taskDescriptionFont),
    "--slate-font-label": fontStackForOption(settings.labelFont)
  });
}

interface SlateSettingsPlugin extends Plugin {
  settings: SlateSettings;
  saveSettings(): Promise<void>;
  reloadTasks(): Promise<void>;
  refreshSlateViews(): void;
  getProjectNames(): string[];
  getLabelNames(): string[];
  getLabelTaskCount(label: string): number;
  renameLabel(oldLabel: string, newLabel: string): Promise<void>;
  deleteLabel(label: string): Promise<void>;
}

export class SlateSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SlateSettingsPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    applySlateFontSettings(containerEl, this.plugin.settings);

    new Setting(containerEl)
      .setName("Old task file")
      .setDesc("Legacy Markdown file used by older slate versions.")
      .addText((text) => {
        text
          .setPlaceholder("slate/tasks.md")
          .setValue(this.plugin.settings.tasksFilePath)
          .onChange(async (value) => {
            this.plugin.settings.tasksFilePath = value.trim() || DEFAULT_SETTINGS.tasksFilePath;
            await this.plugin.saveSettings();
            await this.plugin.reloadTasks();
          });
      });

    new Setting(containerEl)
      .setName("Data folder")
      .setDesc("Folder where slate stores task data and attachments.")
      .addText((text) => {
        let draftPath = this.plugin.settings.dataFolderPath;
        const commitPathChange = async () => {
          const normalizedPath = normalizeDataFolderPath(draftPath);
          if (normalizedPath === this.plugin.settings.dataFolderPath) {
            text.setValue(normalizedPath);
            return;
          }

          this.plugin.settings.dataFolderPath = normalizedPath;
          text.setValue(normalizedPath);
          await this.plugin.saveSettings();
          await this.plugin.reloadTasks();
        };

        text
          .setPlaceholder(DEFAULT_DATA_FOLDER_PATH)
          .setValue(this.plugin.settings.dataFolderPath)
          .onChange((value) => {
            draftPath = value;
          });

        text.inputEl.addEventListener("blur", () => {
          void commitPathChange();
        });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          text.inputEl.blur();
        });
      });

    new Setting(containerEl)
      .setName("Hide data folder from the vault UI")
      .setDesc(
        "Hide the Slate data folder from the file explorer, search, and graph. Files stay on disk and Slate keeps using them."
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.hideDataFolderFromVault)
          .onChange(async (value) => {
            this.plugin.settings.hideDataFolderFromVault = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Default overdue range")
      .setDesc("Default range used by the Today overdue section.")
      .addDropdown((dropdown) => {
        for (const range of OVERDUE_RANGES) {
          dropdown.addOption(range, overdueRangeLabel(range));
        }
        dropdown
          .setValue(this.plugin.settings.defaultOverdueRange)
          .onChange(async (value) => {
            this.plugin.settings.defaultOverdueRange = normalizeOverdueRange(value);
            await this.plugin.saveSettings();
            this.plugin.refreshSlateViews();
          });
      });

    new Setting(containerEl).setName("Daily Notes").setHeading();

    new Setting(containerEl)
      .setName("Enable Daily Notes integration")
      .setDesc("Allow slate to show completed tasks for the active daily note date.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.dailyNotesIntegrationEnabled)
          .onChange(async (value) => {
            this.plugin.settings.dailyNotesIntegrationEnabled = value;
            await this.plugin.saveSettings();
            this.plugin.refreshSlateViews();
          });
      });

    new Setting(containerEl)
      .setName("Daily note date format")
      .setDesc("Used to match the active note file to a date. Default: YYYY-MM-DD.")
      .addText((text) => {
        let draftFormat = this.plugin.settings.dailyNoteDateFormat;
        const commitFormat = async () => {
          const normalized = normalizeDailyNoteDateFormat(draftFormat);
          this.plugin.settings.dailyNoteDateFormat = normalized;
          text.setValue(normalized);
          await this.plugin.saveSettings();
          this.plugin.refreshSlateViews();
        };

        text
          .setPlaceholder(DEFAULT_DAILY_NOTE_DATE_FORMAT)
          .setValue(this.plugin.settings.dailyNoteDateFormat)
          .onChange((value) => {
            draftFormat = value;
          });

        text.inputEl.addEventListener("blur", () => {
          void commitFormat();
        });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          text.inputEl.blur();
        });
      });

    new Setting(containerEl)
      .setName("Auto-add completed tasks block")
      .setDesc("When a daily note is opened, append a slate-completed code block if the note does not already have one.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.dailyNotesAutoInsertCompletedBlock)
          .onChange(async (value) => {
            this.plugin.settings.dailyNotesAutoInsertCompletedBlock = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName("Fonts").setHeading();

    this.addFontSetting(
      "UI Font",
      "Used for sidebar, headings, buttons, settings, and the general interface.",
      "uiFont"
    );
    this.addFontSetting(
      "Task Title Font",
      "Used for task row titles and the task detail title input.",
      "taskTitleFont"
    );
    this.addFontSetting(
      "Task Description Font",
      "Used for task row descriptions and the task detail description textarea.",
      "taskDescriptionFont"
    );
    this.addFontSetting(
      "Label Font",
      "Used for label chip text.",
      "labelFont"
    );

    new Setting(containerEl).setName("Project colors").setHeading();

    const projects = this.plugin.getProjectNames();
    if (projects.length === 0) {
      containerEl.createDiv({
        cls: "setting-item-description",
        text: "No projects yet. slate will generate stable colors when projects appear."
      });
    }

    for (const project of projects) {
      this.addProjectColorSetting(project);
    }

    new Setting(containerEl).setName("Label colors").setHeading();

    this.addLabelRegistrySetting();

    const labels = this.plugin.getLabelNames();
    if (labels.length === 0) {
      containerEl.createDiv({
        cls: "setting-item-description",
        text: "No labels yet. Add one here or create one from Filters & Labels."
      });
    }

    for (const label of labels) {
      this.addLabelColorSetting(label);
    }
  }

  private addFontSetting(
    name: string,
    description: string,
    key: "uiFont" | "taskTitleFont" | "taskDescriptionFont" | "labelFont"
  ): void {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(description)
      .addDropdown((dropdown) => {
        for (const option of FONT_OPTIONS) {
          dropdown.addOption(option, fontOptionLabel(option));
        }
        dropdown
          .setValue(this.plugin.settings[key])
          .onChange(async (value) => {
            this.plugin.settings[key] = normalizeFontOption(value);
            await this.plugin.saveSettings();
            this.plugin.refreshSlateViews();
            this.display();
          });
      });
  }

  private addProjectColorSetting(project: string): void {
    const automaticColor = colorForName(project).regular;
    const override = this.plugin.settings.projectColors[project];

    new Setting(this.containerEl)
      .setName(project)
      .setDesc(override ? "Custom color override" : "Automatic palette color")
      .addColorPicker((picker) => {
        picker.setValue(resolveColorToHex(override || automaticColor)).onChange(async (value) => {
          this.plugin.settings.projectColors[project] = value;
          await this.plugin.saveSettings();
          this.plugin.refreshSlateViews();
        });
      })
      .addButton((button) => {
        button.setButtonText("Reset").onClick(() => {
          void (async () => {
            delete this.plugin.settings.projectColors[project];
            await this.plugin.saveSettings();
            this.plugin.refreshSlateViews();
            this.display();
          })();
        });
      });
  }

  private addLabelRegistrySetting(): void {
    let pendingLabel = "";

    new Setting(this.containerEl)
      .setName("Add label")
      .setDesc("Create a label without assigning it to a task yet.")
      .addText((text) => {
        text.setPlaceholder("#label").onChange((value) => {
          pendingLabel = value;
        });
      })
      .addButton((button) => {
        button.setButtonText("Add").onClick(() => {
          void (async () => {
            const label = normalizeLabelName(pendingLabel);
            if (!label) {
              return;
            }

            this.plugin.settings.labelRegistry = dedupeLabels([
              ...this.plugin.settings.labelRegistry,
              label
            ]);
            await this.plugin.saveSettings();
            this.plugin.refreshSlateViews();
            this.display();
          })();
        });
      });
  }

  private addLabelColorSetting(label: string): void {
    const automaticColor = colorForName(label).regular;
    const override = this.plugin.settings.labelColors[label];

    new Setting(this.containerEl)
      .setName(displayLabel(label))
      .setDesc(override ? "Custom color override" : "Automatic palette color")
      .addColorPicker((picker) => {
        picker.setValue(resolveColorToHex(override || automaticColor)).onChange(async (value) => {
          this.plugin.settings.labelColors[label] = value;
          await this.plugin.saveSettings();
          this.plugin.refreshSlateViews();
        });
      })
      .addButton((button) => {
        button.setButtonText("Rename").onClick(() => {
          new RenameLabelModal(this.app, label, this.plugin.getLabelNames(), async (newLabel) => {
            await this.plugin.renameLabel(label, newLabel);
            this.display();
          }).open();
        });
      })
      .addButton((button) => {
        button.setButtonText("Delete").onClick(() => {
          new DeleteLabelModal(
            this.app,
            label,
            this.plugin.getLabelTaskCount(label),
            async () => {
              await this.plugin.deleteLabel(label);
              this.display();
            }
          ).open();
        });
      })
      .addButton((button) => {
        button.setButtonText("Reset").onClick(() => {
          void (async () => {
            delete this.plugin.settings.labelColors[label];
            await this.plugin.saveSettings();
            this.plugin.refreshSlateViews();
            this.display();
          })();
        });
      });
  }
}
