import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  UserPlus,
  FolderOpen,
  AlertCircle,
  GitBranch,
} from 'lucide-react';
import { projectsApi } from '../../api/projects.js';
import { tasksApi } from '../../api/tasks.js';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { Avatar, Badge, Button, Modal, Field, Skeleton } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';
import { fromNow, roleLabel, roleBadgeVariant } from '../../lib/format.js';
import { useAuthStore } from '../../stores/authStore.js';
import { MemberPipelineModal } from './MemberPipelineModal.jsx';
import { useLiveSync } from '../../lib/useLiveSync.js';

export function MembersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [membersMap, setMembersMap] = useState(new Map());
  const [allTasks, setAllTasks] = useState([]);

  // Pipeline modal state
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [selectedMemberForPipeline, setSelectedMemberForPipeline] = useState(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteProjectId, setInviteProjectId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pList = await projectsApi.list();
      const projs = Array.isArray(pList) ? pList.map((p) => p.project) : [];
      setProjects(projs);

      if (projs.length > 0 && !inviteProjectId) {
        setInviteProjectId(projs[0]._id);
      }

      // Fetch members and tasks for all projects in parallel
      const memberPromises = projs.map((p) =>
        projectsApi
          .listMembers(p._id)
          .then((members) => ({ projectId: p._id, projectName: p.name, members: members || [] }))
          .catch(() => ({ projectId: p._id, projectName: p.name, members: [] }))
      );

      const taskPromises = projs.map((p) =>
        tasksApi
          .list(p._id)
          .then((tasks) => (Array.isArray(tasks) ? tasks.map((t) => ({ ...t, project: p })) : []))
          .catch(() => [])
      );

      const [results, taskResults] = await Promise.all([
        Promise.all(memberPromises),
        Promise.all(taskPromises),
      ]);

      const flatTasks = taskResults.flat();
      setAllTasks(flatTasks);

      // Aggregate members by user ID
      const map = new Map();

      results.forEach((r) => {
        r.members.forEach((m) => {
          const u = m.user;
          if (!u || !u._id) return;

          const key = String(u._id);
          if (!map.has(key)) {
            map.set(key, {
              user: u,
              projects: [],
              roles: {},
              createdAt: m.createdAt,
            });
          }

          const entry = map.get(key);
          entry.projects.push({ id: r.projectId, name: r.projectName, role: m.role });
          entry.roles[r.projectId] = m.role;
        });
      });

      // Ensure currentUser is included if not yet attached to any project
      if (currentUser?._id && !map.has(String(currentUser._id))) {
        map.set(String(currentUser._id), {
          user: currentUser,
          projects: [],
          roles: {},
          createdAt: new Date().toISOString(),
        });
      }

      setMembersMap(map);
    } catch (err) {
      setError(err.message || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, inviteProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useLiveSync({
    enabled: true,
    intervalMs: 30000,
    onSync: () => loadData(),
  });

  // Flatten and filter members
  const memberList = useMemo(() => {
    const all = Array.from(membersMap.values());

    return all.filter((entry) => {
      const u = entry.user;
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      const matchesProject =
        selectedProjectId === 'all' ||
        entry.projects.some((p) => p.id === selectedProjectId);

      return matchesSearch && matchesProject;
    });
  }, [membersMap, searchQuery, selectedProjectId]);

  const tasksCountByUserId = useMemo(() => {
    const counts = new Map();
    allTasks.forEach((t) => {
      const uid = String(t.assignedTo?._id || t.assignedTo || '');
      if (uid) {
        counts.set(uid, (counts.get(uid) || 0) + 1);
      }
    });
    return counts;
  }, [allTasks]);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError('Please enter a valid user email.');
      return;
    }
    if (!inviteProjectId) {
      setInviteError('Please select a project to invite to.');
      return;
    }

    setInviting(true);
    setInviteError(null);
    try {
      await projectsApi.addMember(inviteProjectId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      toast.success(`Member invited to project successfully!`);
      setInviteModalOpen(false);
      setInviteEmail('');
      await loadData();
    } catch (err) {
      setInviteError(err.message || 'Failed to invite member. Ensure the user email exists.');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (userId, newRole, projectId) => {
    try {
      await projectsApi.updateMemberRole(projectId, userId, newRole);
      toast.success(`Updated role to ${roleLabel(newRole)}`);
      await loadData();
    } catch (err) {
      toast.error(err?.message || 'Could not update member role');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-danger" />
        <h3 className="mt-2 text-base font-semibold text-danger">Failed to load members</h3>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">{error}</p>
        <Button variant="outline" size="sm" onClick={loadData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        description={`${membersMap.size} collaborator${
          membersMap.size === 1 ? '' : 's'
        } across all workspace projects.`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setInviteError(null);
              setInviteModalOpen(true);
            }}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite member</span>
          </Button>
        }
      />

      {/* ── Filter & Search Toolbar ──────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-dark-border dark:bg-dark-card">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted dark:text-dark-muted" />
          <input
            type="text"
            placeholder="Search by name, username, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-alt pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted transition focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-surface-alt dark:text-dark-foreground dark:placeholder-dark-muted"
          />
        </div>

        {/* Project Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="members-proj-filter" className="text-xs text-muted dark:text-dark-muted">
            Project:
          </label>
          <select
            id="members-proj-filter"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-xs font-medium text-foreground transition focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-surface-alt dark:text-dark-foreground"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Members Table ──────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:border-dark-border dark:bg-dark-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-alt/50 text-xs font-semibold uppercase tracking-wider text-muted dark:border-dark-border dark:bg-dark-surface-alt/50 dark:text-dark-muted">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Projects</th>
                <th className="px-6 py-3.5">Pipeline & Tasks</th>
                <th className="px-6 py-3.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 dark:divide-dark-border/60">
              {memberList.map((entry) => {
                const u = entry.user;
                const isCurrent = currentUser?._id === u._id;
                // Determine primary role
                const roles = Object.values(entry.roles);
                const primaryRole = roles.includes('admin')
                  ? 'admin'
                  : roles.includes('project_admin')
                  ? 'project_admin'
                  : 'member';

                const uTasks = allTasks.filter(
                  (t) => String(t.assignedTo?._id || t.assignedTo || '') === String(u._id)
                );
                const userTaskCount = uTasks.length;
                const activeCount = uTasks.filter((t) => t.status !== 'done').length;
                const doneCount = uTasks.filter((t) => t.status === 'done').length;
                const completionRate = userTaskCount ? Math.round((doneCount / userTaskCount) * 100) : 0;

                const workload = activeCount === 0
                  ? { label: 'Available', variant: 'neutral' }
                  : activeCount <= 3
                  ? { label: `${activeCount} active`, variant: 'success' }
                  : activeCount <= 5
                  ? { label: `${activeCount} heavy`, variant: 'warning' }
                  : { label: `${activeCount} overload`, variant: 'danger' };

                return (
                  <tr
                    key={u._id}
                    className="group transition hover:bg-surface-alt/50 dark:hover:bg-dark-surface-alt/50"
                  >
                    {/* User info */}
                    <td className="px-6 py-4">
                      <div
                        onClick={() => {
                          setSelectedMemberForPipeline(entry);
                          setPipelineModalOpen(true);
                        }}
                        className="flex cursor-pointer items-center gap-3 group-hover:opacity-95"
                      >
                        <Avatar user={u} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground dark:text-dark-foreground group-hover:text-primary transition-colors">
                              {u.fullName || u.username}
                            </span>
                            {isCurrent && (
                              <Badge variant="primary" size="sm">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted dark:text-dark-muted">
                            @{u.username} · {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role update selector */}
                    <td className="px-6 py-4">
                      {entry.projects.length > 0 && !isCurrent ? (
                        <select
                          aria-label={`Role for ${u.username || 'member'}`}
                          className="h-8 w-36 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          value={primaryRole}
                          onChange={(e) => {
                            const primaryProj = entry.projects[0]?.id;
                            if (primaryProj) {
                              handleUpdateRole(u._id, e.target.value, primaryProj);
                            }
                          }}
                        >
                          <option value="admin" className="bg-card text-foreground">Admin</option>
                          <option value="project_admin" className="bg-card text-foreground">Project admin</option>
                          <option value="member" className="bg-card text-foreground">Member</option>
                        </select>
                      ) : (
                        <Badge variant={roleBadgeVariant(primaryRole)} size="sm">
                          {roleLabel(primaryRole)}
                        </Badge>
                      )}
                    </td>

                    {/* Projects membership */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {entry.projects.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-alt px-2 py-0.5 text-xs text-foreground dark:border-dark-border dark:bg-dark-surface-alt dark:text-dark-foreground"
                          >
                            <FolderOpen className="h-3 w-3 text-muted dark:text-dark-muted" />
                            <span>{p.name}</span>
                          </span>
                        ))}
                        {entry.projects.length === 0 && (
                          <span className="text-xs italic text-muted dark:text-dark-muted">
                            None
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Pipeline & Tasks */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMemberForPipeline(entry);
                              setPipelineModalOpen(true);
                            }}
                            className="flex items-center gap-1.5 text-xs h-7.5 px-2.5 transition hover:border-primary hover:text-primary shadow-2xs"
                            title={`View ${u.fullName || u.username}'s tasks and pipeline dependencies`}
                          >
                            <GitBranch className="h-3.5 w-3.5 text-primary" />
                            <span>Pipeline</span>
                            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                              {userTaskCount}
                            </span>
                          </Button>
                          <Badge variant={workload.variant} size="sm" className="text-[10px]">
                            {workload.label}
                          </Badge>
                        </div>
                        {userTaskCount > 0 && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border/60">
                              <div
                                className="h-full bg-success transition-all"
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                            <span>{doneCount}/{userTaskCount}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Joined date */}
                    <td className="px-6 py-4 text-xs text-muted dark:text-dark-muted">
                      {fromNow(entry.createdAt)}
                    </td>
                  </tr>
                );
              })}

              {memberList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-muted dark:text-dark-muted">
                    No members match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Invite Member Modal ──────────────────────── */}
      {inviteModalOpen && (
        <Modal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          title="Invite Member to Project"
          description="Add a teammate to an existing project by entering their registered email."
        >
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            {inviteError && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                {inviteError}
              </div>
            )}

            <Field label="Target Project" id="invite-project">
              <select
                id="invite-project"
                value={inviteProjectId}
                onChange={(e) => setInviteProjectId(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-dark-foreground"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Teammate Email" id="invite-email">
              <input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-dark-foreground"
              />
            </Field>

            <Field label="Assigned Role" id="invite-role">
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-dark-foreground"
              >
                <option value="member">Member (Can edit tasks and view notes)</option>
                <option value="project_admin">Project Admin (Can manage project settings and members)</option>
              </select>
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setInviteModalOpen(false)}
                disabled={inviting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={inviting} className="flex items-center gap-1.5">
                <UserPlus className="h-4 w-4" />
                <span>Send Invitation</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Member Pipeline Modal ──────────────────────── */}
      {selectedMemberForPipeline && (
        <MemberPipelineModal
          open={pipelineModalOpen}
          onClose={() => {
            setPipelineModalOpen(false);
            setSelectedMemberForPipeline(null);
          }}
          memberEntry={selectedMemberForPipeline}
          allTasks={allTasks}
          projects={projects}
          currentProjectId={selectedProjectId !== 'all' ? selectedProjectId : null}
        />
      )}
    </div>
  );
}
