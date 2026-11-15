import streamDeck, {
  action,
  type KeyAction,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";
import {
  fetchJiraIssues,
  JiraConfigurationError,
  transitionIssueToInProgress,
} from "../jira-client.js";
import { getDemoIssues } from "../demo-data.js";
import { renderDetail, renderIssue, renderMessage } from "../render.js";
import {
  DEFAULT_REFRESH_SECONDS,
  type JiraIssue,
  type JiraSettings,
} from "../types.js";
import { typeWorkspaceText } from "../type-text.js";

type DeviceState = {
  issues: JiraIssue[];
  selected: JiraIssue | null;
  error: Error | null;
};

@action({ UUID: "com.samir.jira-tickets.issue" })
export class JiraTicketsAction extends SingletonAction {
  private settings: JiraSettings = {};
  private readonly devices = new Map<string, DeviceState>();
  private readonly visibleActions = new Set<string>();
  private refreshTimer?: NodeJS.Timeout;
  private refreshPromise?: Promise<void>;
  private initializationPromise?: Promise<void>;
  private initialized = false;

  constructor() {
    super();
    streamDeck.settings.onDidReceiveGlobalSettings<JiraSettings>((event) => {
      this.settings = event.settings;
      if (!this.initialized) return;
      this.restartTimer();
      if (this.visibleActions.size > 0) void this.refresh();
    });
  }

  override async onWillAppear(event: WillAppearEvent): Promise<void> {
    const isEnteringView = this.visibleActions.size === 0;
    this.visibleActions.add(event.action.id);
    this.ensureDevice(event.action.device.id);
    await this.drawDevice(event.action.device.id);
    await this.initialize();
    if (isEnteringView && this.visibleActions.size > 0) {
      this.restartTimer();
      await this.refresh();
    }
    await this.drawDevice(event.action.device.id);
  }

  override onWillDisappear(event: WillDisappearEvent): void {
    this.visibleActions.delete(event.action.id);
    if (this.visibleActions.size === 0) this.stopTimer();
  }

  override async onKeyDown(event: KeyDownEvent): Promise<void> {
    const deviceId = event.action.device.id;
    const state = this.ensureDevice(deviceId);
    if (state.selected) {
      const slot = this.visibleKeys(deviceId).findIndex((key) => key.id === event.action.id);
      if (slot === 3) {
        await this.startIssue(state.selected, event.action);
        return;
      }
      state.selected = null;
    } else {
      const visibleKeys = this.visibleKeys(deviceId);
      const slot = visibleKeys.findIndex((key) => key.id === event.action.id);
      state.selected = state.issues[slot] ?? null;
      if (!state.selected) {
        await event.action.showAlert();
        return;
      }
    }
    await this.drawDevice(deviceId);
  }

  private async startIssue(issue: JiraIssue, key: KeyAction<any>): Promise<void> {
    try {
      await typeWorkspaceText(issue.key, issue.summary);
      if (this.settings.demoMode === false && issue.status.trim().toLowerCase() !== "in progress") {
        await transitionIssueToInProgress(this.settings, issue.key);
      }
      for (const state of this.devices.values()) {
        state.issues = state.issues.map((candidate) => candidate.key === issue.key
          ? { ...candidate, status: "In Progress", statusCategory: "indeterminate" }
          : candidate);
        if (state.selected?.key === issue.key) {
          state.selected = state.issues.find((candidate) => candidate.key === issue.key) ?? null;
        }
      }
      await Promise.all([...this.devices.keys()].map((deviceId) => this.drawDevice(deviceId)));
      await key.showOk();
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      streamDeck.logger.error(`Could not start ${issue.key}: ${normalized.message}`);
      await key.showAlert();
    }
  }

  private ensureDevice(deviceId: string): DeviceState {
    let state = this.devices.get(deviceId);
    if (!state) {
      state = { issues: [], selected: null, error: null };
      this.devices.set(deviceId, state);
    }
    return state;
  }

  private initialize(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        this.settings = await streamDeck.settings.getGlobalSettings<JiraSettings>();
        this.initialized = true;
      })().catch((error) => {
        // Allow a later willAppear event to retry if Stream Deck was not ready
        // to return global settings during startup.
        this.initializationPromise = undefined;
        throw error;
      });
    }
    return this.initializationPromise;
  }

  private async refresh(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      try {
        // Demo mode is intentionally the default for fresh installs. Once the
        // user explicitly disables it, the plugin uses the real Jira client.
        const issues = this.settings.demoMode !== false
          ? getDemoIssues()
          : await fetchJiraIssues(this.settings);
        for (const state of this.devices.values()) {
          state.issues = issues;
          state.error = null;
          if (state.selected) {
            state.selected = issues.find((issue) => issue.key === state.selected?.key) ?? state.selected;
          }
        }
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        streamDeck.logger.error(normalized.message);
        for (const state of this.devices.values()) state.error = normalized;
      } finally {
        await Promise.all([...this.devices.keys()].map((deviceId) => this.drawDevice(deviceId)));
      }
    })().finally(() => {
      this.refreshPromise = undefined;
    });
    return this.refreshPromise;
  }

  private restartTimer(): void {
    this.stopTimer();
    if (this.visibleActions.size === 0) return;
    const seconds = Math.max(15, Number(this.settings.refreshSeconds) || DEFAULT_REFRESH_SECONDS);
    this.refreshTimer = setInterval(() => void this.refresh(), seconds * 1000);
  }

  private stopTimer(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
  }

  private async drawDevice(deviceId: string): Promise<void> {
    const state = this.ensureDevice(deviceId);
    const updates = this.visibleKeys(deviceId)
      .map(async (key, slot) => {
        let image: string;
        if (state.selected) {
          image = renderDetail(state.selected, slot);
        } else if (state.error) {
          const isConfig = state.error instanceof JiraConfigurationError;
          image = renderMessage(
            isConfig ? "#344054" : "#B42318",
            isConfig ? "SETUP" : "JIRA ERROR",
            isConfig ? "Select a key to configure" : state.error.message,
          );
        } else if (state.issues[slot]) {
          image = renderIssue(state.issues[slot]);
        } else {
          image = renderMessage("#1D2939", "JIRA", slot === 0 ? "No active tickets" : "Empty");
        }
        await key.setTitle("");
        await key.setImage(image);
      });
    await Promise.all(updates);
  }

  private visibleKeys(deviceId: string): KeyAction<any>[] {
    const keys: KeyAction<any>[] = [];
    for (const candidate of this.actions) {
      if (candidate.isKey() && candidate.device.id === deviceId && candidate.coordinates) {
        keys.push(candidate);
      }
    }
    return keys.sort((left, right) => {
        const columns = left.device.size.columns;
        const leftSlot = left.coordinates!.row * columns + left.coordinates!.column;
        const rightSlot = right.coordinates!.row * columns + right.coordinates!.column;
        return leftSlot - rightSlot;
      });
  }
}
