import { useState } from 'react';
import { Mail, ShieldCheck, UserMinus, UserPlus, GitBranch } from 'lucide-react';
import { ApiError } from '../../api/client.js';
import {
  canManageContent,
  formatDate,
  roleBadgeVariant,
  roleLabel,
} from '../../lib/format.js';
import { useAuthStore } from '../../stores/authStore.js';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Modal,
} from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';
import { useProject } from '../../components/layout/ProjectLayout.jsx';
import { MemberPipelineModal } from '../members/MemberPipelineModal.jsx';

const ROLE_OPTIONS = [
  { value: 'project_admin', label: 'Project admin' },
  { value: 'member', label: 'Member' },
];

/**
 * P2.5 — Members tab.
 * - List with role badges + joined dates
 * - Add by email (role select) — admin / project_admin
 * - Change role / remove — **owner (project admin role) only** per backend
 *   contract (PUT/DELETE /members/:userId are ADMIN-only endpoints; inviting
 *   is broader: admin + project_admin). Controls are hidden, not disabled,
 *   for unauthorized roles (docs/05 "role-gated controls hidden").
 */
export function ProjectMembersTab() {
  const { project, members, tasks, myRole, addMember, updateMemberRole, removeMember } =
    useProject();
  const currentUserId = useAuthStore((s) => s.user?._id);

  const canInvite = canManageContent(myRole);
  const isOwner = myRole === 'admin';
  const [inviting, setInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [pipelineOpen, setPipelineOpen] = useState(false);

  const handleChangeRole = async (member, role) => {
    if (role === member.role) return;
    setBusyUserId(member.user._id);
    try {
      await updateMemberRole(member.user._id, role);
      toast.success(`${member.user.username} is now ${roleLabel(role)}.`);
    } catch (err) {
      toast.error(err?.message || 'Could not update the role.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (member) => {
    setBusyUserId(member.user._id);
    try {
      await removeMember(member.user._id);
      toast.success(`${member.user.username} removed from the project.`);
    } catch (err) {
      toast.error(err?.message || 'Could not remove the member.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          People with access to <strong>{project.name}</strong>.
        </p>
        {canInvite && (
          <Button size="sm" onClick={() => setInviting(true)}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Add member
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No members yet"
          description="Invite teammates by email to collaborate on this project."
          action={
            canInvite ? (
              <Button onClick={() => setInviting(true)}>
                <UserPlus className="h-4 w-4" aria-hidden />
                Add your first member
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="app-card divide-y divide-border">
          {members.map((member) => {
            const user = member.user ?? {};
            const isSelf = user._id === currentUserId;
            const canTouch = isOwner && !isSelf;
            const busy = busyUserId === user._id;

            const memberTasks = (tasks || []).filter((t) => {
              const aid = String(t.assignedTo?._id || t.assignedTo || '');
              return aid === String(user._id);
            });
            const memberTaskCount = memberTasks.length;
            const activeCount = memberTasks.filter((t) => t.status !== 'done').length;
            const workload = activeCount === 0
              ? { label: 'Available', variant: 'neutral' }
              : activeCount <= 3
              ? { label: `${activeCount} active`, variant: 'success' }
              : activeCount <= 5
              ? { label: `${activeCount} heavy`, variant: 'warning' }
              : { label: `${activeCount} overload`, variant: 'danger' };

            return (
              <li
                key={member._id ?? user._id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
              >
                <div
                  onClick={() => {
                    setSelectedMember(member);
                    setPipelineOpen(true);
                  }}
                  className="flex cursor-pointer items-center gap-3 min-w-0 flex-1 group"
                >
                  <Avatar user={user} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {user.fullName || user.username || 'Unknown user'}
                      {isSelf && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email || '—'}
                    </p>
                  </div>
                </div>

                {/* Pipeline button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedMember(member);
                    setPipelineOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs h-7.5 px-2.5 transition hover:border-primary hover:text-primary shadow-2xs"
                  title={`View ${user.fullName || user.username}'s tasks and pipeline dependencies`}
                >
                  <GitBranch className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Pipeline</span>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                    {memberTaskCount}
                  </span>
                </Button>

                <Badge variant={workload.variant} size="sm" className="hidden sm:inline-flex text-[10px]">
                  {workload.label}
                </Badge>

                {canTouch ? (
                  <select
                    aria-label={`Role for ${user.username || 'member'}`}
                    className="h-8 w-36 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                    value={member.role}
                    disabled={busy}
                    onChange={(e) => handleChangeRole(member, e.target.value)}
                  >
                    <option value="admin" className="bg-card text-foreground">Admin</option>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-card text-foreground">
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={roleBadgeVariant(member.role)}>
                    {roleLabel(member.role)}
                  </Badge>
                )}

                {canTouch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busy}
                    disabled={busy}
                    onClick={() => handleRemove(member)}
                    aria-label={`Remove ${user.username || 'member'} from the project`}
                  >
                    <UserMinus className="h-4 w-4" aria-hidden />
                    <span className="sr-only sm:not-sr-only">Remove</span>
                  </Button>
                )}

                <span className="hidden w-24 text-right text-xs text-muted-foreground lg:block">
                  {formatDate(member.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {inviting && (
        <InviteMemberModal
          onClose={() => setInviting(false)}
          onInvite={addMember}
        />
      )}

      {/* Member Pipeline Modal */}
      {selectedMember && (
        <MemberPipelineModal
          open={pipelineOpen}
          onClose={() => {
            setPipelineOpen(false);
            setSelectedMember(null);
          }}
          memberEntry={{
            user: selectedMember.user,
            projects: [{ id: project._id, name: project.name, role: selectedMember.role }],
            roles: { [project._id]: selectedMember.role },
            createdAt: selectedMember.createdAt,
          }}
          allTasks={tasks || []}
          projects={[project]}
          currentProjectId={project._id}
        />
      )}
    </div>
  );
}

/**
 * Add-by-email modal. Backend behavior worth mirroring in the UI:
 * - 404 → "No registered user with that email"
 * - Upsert: inviting an existing member just updates their role — surface
 *   that as success with a different message so it doesn't feel like a bug.
 */
function InviteMemberModal({ onClose, onInvite }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setError({ email: 'Email is required' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError({ email: 'Enter a valid email address' });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onInvite({ email: trimmed, role });
      toast.success(`Invitation sent to ${trimmed}.`);
      onClose();
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError && err.status === 404) {
        setError({ email: 'No registered user with that email — ask them to sign up first.' });
        return;
      }
      const fieldErrors = err instanceof ApiError ? err.fieldErrors : null;
      if (fieldErrors && Object.keys(fieldErrors).length) {
        setError(fieldErrors);
      } else {
        setError({
          form: err?.message || 'Could not add the member. Please try again.',
        });
      }
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Add member"
      description="They must already have a WorkPulse account."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            <Mail className="h-4 w-4" aria-hidden />
            {submitting ? 'Adding…' : 'Add member'}
          </Button>
        </>
      }
    >
      {error?.form && (
        <div
          className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error.form}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <Field
          label="Email"
          htmlFor="invite-email"
          error={error?.email}
          hint="If they're already a member, their role is updated instead."
        >
          <input
            id="invite-email"
            type="email"
            autoComplete="off"
            data-autofocus
            className={`app-input ${error?.email ? 'app-input-error' : ''}`}
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error?.email}
          />
        </Field>

        <Field label="Role" htmlFor="invite-role">
          <select
            id="invite-role"
            className="app-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}
