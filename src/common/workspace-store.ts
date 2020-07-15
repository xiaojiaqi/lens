import { action, computed, observable, toJS } from "mobx";
import { BaseStore } from "./base-store";
import { clusterStore } from "./cluster-store"

export type WorkspaceId = string;

export interface WorkspaceStoreModel {
  currentWorkspace?: WorkspaceId;
  workspaces: Workspace[]
}

export interface Workspace {
  id: WorkspaceId;
  name: string;
  description?: string;
}

export class WorkspaceStore extends BaseStore<WorkspaceStoreModel> {
  static readonly defaultId: WorkspaceId = "default"

  private constructor() {
    super({
      configName: "lens-workspace-store",
    });
  }

  @observable currentWorkspaceId = WorkspaceStore.defaultId;

  @observable workspaces = observable.map<WorkspaceId, Workspace>({
    [WorkspaceStore.defaultId]: {
      id: WorkspaceStore.defaultId,
      name: "default"
    }
  });

  @computed get currentWorkspace(): Workspace {
    return this.getById(this.currentWorkspaceId);
  }

  @computed get workspacesList() {
    return Array.from(this.workspaces.values());
  }

  getById(id: WorkspaceId): Workspace {
    return this.workspaces.get(id);
  }

  @action
  public saveWorkspace(workspace: Workspace) {
    const id = workspace.id;
    const existingWorkspace = this.getById(id);
    if (existingWorkspace) {
      Object.assign(existingWorkspace, workspace);
    } else {
      this.workspaces.set(id, workspace);
    }
  }

  @action
  public removeWorkspace(id: WorkspaceId) {
    const workspace = this.getById(id);
    if (!workspace) return;
    if (id === WorkspaceStore.defaultId) {
      throw new Error("Cannot remove default workspace");
    }
    if (id === this.currentWorkspaceId) {
      this.currentWorkspaceId = WorkspaceStore.defaultId;
    }
    this.workspaces.delete(id);
    clusterStore.removeByWorkspaceId(id)
  }

  @action
  protected fromStore({ currentWorkspace, workspaces = [] }: WorkspaceStoreModel) {
    if (currentWorkspace) {
      this.currentWorkspaceId = currentWorkspace
    }
    if (workspaces.length) {
      this.workspaces.clear();
      workspaces.forEach(workspace => {
        this.workspaces.set(workspace.id, workspace)
      })
    }
  }

  toJSON(): WorkspaceStoreModel {
    return toJS({
      currentWorkspace: this.currentWorkspaceId,
      workspaces: this.workspacesList,
    }, {
      recurseEverything: true
    })
  }
}

export const workspaceStore: WorkspaceStore = WorkspaceStore.getInstance()
