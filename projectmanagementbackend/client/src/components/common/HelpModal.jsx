import { useState } from 'react';
import {
  Boxes,
  KanbanSquare,
  Users,
  Command,
  FileText,
  BarChart3,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  Paperclip,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';

const SECTIONS = [
  { id: 'hierarchy', label: 'System Hierarchy', icon: Boxes },
  { id: 'kanban', label: 'Kanban & Tasks', icon: KanbanSquare },
  { id: 'roles', label: 'Roles & RBAC', icon: ShieldCheck },
  { id: 'shortcuts', label: '⌘K Shortcuts', icon: Command },
  { id: 'notes', label: 'Notes & Docs', icon: FileText },
  { id: 'analytics', label: 'Analytics & Export', icon: BarChart3 },
];

export function HelpModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState('hierarchy');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="WorkPulse System Guide & Workflow Overview"
      description="Learn how WorkPulse coordinates projects, optimistic Kanban boards, permissions, and keyboard workflows."
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd> to close
          </span>
          <Button size="sm" onClick={onClose}>
            Got it, return to app
          </Button>
        </div>
      }
    >
      <div className="flex flex-col md:flex-row min-h-[420px] max-h-[60vh] -mx-6 -my-4">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-border bg-surface-alt/40 p-3 space-y-1 shrink-0 overflow-y-auto">
          {SECTIONS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm">
          {activeTab === 'hierarchy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">How WorkPulse Organizes Work</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  WorkPulse follows a clear 3-level hierarchy designed for speed and isolation:
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-card p-3.5 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-primary text-xs uppercase tracking-wider">
                    <Boxes className="h-4 w-4" /> 1. Workspace
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your global team account containing your user profile, active sessions, notification center, and theme preferences.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3.5 space-y-1 ml-3 border-l-2 border-l-primary">
                  <div className="flex items-center gap-2 font-semibold text-indigo-500 text-xs uppercase tracking-wider">
                    <ArrowRight className="h-3.5 w-3.5" /> 2. Projects
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Independent collaborative hubs (e.g. <em>Web App</em>, <em>Infrastructure</em>). Each project has its own Kanban Board, Discussions/Notes, Team Roster, and Analytics.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3.5 space-y-1 ml-6 border-l-2 border-l-emerald-500">
                  <div className="flex items-center gap-2 font-semibold text-emerald-500 text-xs uppercase tracking-wider">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 3. Tasks &amp; Subtasks
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The atomic units of delivery. Tasks carry priority flags, assignees, due dates, image attachments, and checklists that auto-calculate progress.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Optimistic Kanban Pipeline</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  How cards move and stay synchronized across client and server:
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3 bg-surface/50">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">1. To Do</span>
                  <p className="mt-1 text-xs text-muted-foreground">Backlog items ready for active pickup. Assign team members &amp; set target due dates.</p>
                </div>
                <div className="rounded-lg border border-primary/40 p-3 bg-primary/5">
                  <span className="text-[11px] font-bold text-primary uppercase">2. In Progress</span>
                  <p className="mt-1 text-xs text-muted-foreground">Active execution. Check off subtask items; progress ring updates automatically.</p>
                </div>
                <div className="rounded-lg border border-success/40 p-3 bg-success/5">
                  <span className="text-[11px] font-bold text-success uppercase">3. Done</span>
                  <p className="mt-1 text-xs text-muted-foreground">Shipped &amp; verified work. Moves automatically reflect in dashboard stats.</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-alt/30 p-3.5 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Optimistic State Updates</span>
                </div>
                <p>
                  When you drag a card or check a subtask, the interface updates immediately (zero latency). If the network request fails, the store automatically rolls back to the previous state and triggers an error alert.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">3-Tier Role-Based Access Control (RBAC)</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Permissions are strictly validated on the server for each project:
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-surface-alt font-semibold text-foreground">
                    <tr>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5 text-center">Admin</th>
                      <th className="p-2.5 text-center">Project Admin</th>
                      <th className="p-2.5 text-center">Member</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground">
                    <tr>
                      <td className="p-2.5 font-medium text-foreground">Manage Project Settings &amp; Delete</td>
                      <td className="p-2.5 text-center text-success font-bold">✓</td>
                      <td className="p-2.5 text-center text-muted">✗</td>
                      <td className="p-2.5 text-center text-muted">✗</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-foreground">Invite Members &amp; Change Roles</td>
                      <td className="p-2.5 text-center text-success font-bold">✓</td>
                      <td className="p-2.5 text-center text-success font-bold">✓ (Invite)</td>
                      <td className="p-2.5 text-center text-muted">✗</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-foreground">Create, Edit &amp; Delete Tasks</td>
                      <td className="p-2.5 text-center text-success font-bold">✓</td>
                      <td className="p-2.5 text-center text-success font-bold">✓</td>
                      <td className="p-2.5 text-center text-muted">✗</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-foreground">Toggle Subtasks &amp; Move Own Tasks</td>
                      <td className="p-2.5 text-center text-success font-bold">✓</td>
                      <td className="p-2.5 text-center text-success font-bold">✓</td>
                      <td className="p-2.5 text-center text-success font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-foreground">Create &amp; Pin Project Notes</td>
                      <td className="p-2.5 text-center text-success font-bold">✓</td>
                      <td className="p-2.5 text-center text-success font-bold">✓</td>
                      <td className="p-2.5 text-center text-muted">✗</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Keyboard-First Navigation (⌘K)</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Navigate, create, and search without lifting your hands from the keyboard:
                </p>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { key: '⌘ K  or  Ctrl K', desc: 'Open Command Palette from any page' },
                  { key: 'Esc', desc: 'Dismiss any modal, drawer, or palette' },
                  { key: '↑ / ↓', desc: 'Navigate through search results and palette commands' },
                  { key: 'Enter', desc: 'Execute active command or open highlighted item' },
                ].map((s) => (
                  <div key={s.key} className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-card">
                    <span className="text-muted-foreground">{s.desc}</span>
                    <kbd className="rounded border border-border bg-surface-alt px-2 py-1 font-mono text-[11px] font-semibold text-foreground">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Project Notes &amp; Markdown Specs</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Document specs, technical RFCs, and retrospective meeting summaries:
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-muted-foreground">
                <div className="rounded-lg border border-border p-3 bg-card space-y-1">
                  <span className="font-semibold text-foreground">📌 Pinning Priority</span>
                  <p>Pin mission-critical guidelines or architecture links so they always appear at the top of the grid.</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card space-y-1">
                  <span className="font-semibold text-foreground">📝 Markdown Support</span>
                  <p>Supports headings, checklists, code blocks, bold/italics, and bulleted workflows.</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card space-y-1">
                  <span className="font-semibold text-foreground">⚡ Server-Mirrored Pagination</span>
                  <p>Handles large documentation repositories with 12 notes per page and instant page jumping.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Analytics &amp; Data Portability</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Real-time project telemetry and automated reporting tools:
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-muted-foreground">
                <div className="rounded-lg border border-border p-3 bg-card space-y-1">
                  <span className="font-semibold text-foreground">📊 SVG Status Donut</span>
                  <p>Instant visual breakdown of To Do, In Progress, and Completed tasks with percentage calculations.</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card space-y-1">
                  <span className="font-semibold text-foreground">👥 Member Workload Pipeline</span>
                  <p>Inspect active task distribution per member to balance team workload and prevent delivery bottlenecks.</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-card space-y-1">
                  <span className="font-semibold text-foreground">💾 One-Click CSV &amp; JSON Export</span>
                  <p>Export all project tasks, due dates, assignees, and priorities to spreadsheet-ready CSV or raw JSON.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
