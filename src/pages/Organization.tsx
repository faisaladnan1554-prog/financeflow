import { useState, useEffect } from 'react';
import {
  Building2, Users, Crown, Shield, User, UserPlus, Trash2,
  Settings, ChevronDown, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrg } from '../contexts/OrgContext';
import { useAuth } from '../contexts/AuthContext';
import { orgApi, subscriptionApi } from '../lib/api';
import { useLocation } from 'wouter';
import type { OrgMember } from '../types';

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    member: 'bg-gray-100 text-gray-600',
  };
  const icons: Record<string, React.ReactNode> = {
    owner: <Crown size={10} />,
    admin: <Shield size={10} />,
    member: <User size={10} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${styles[role] ?? styles.member}`}>
      {icons[role] ?? icons.member}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function getMemberName(member: OrgMember): string {
  if (typeof member.userId === 'object' && member.userId !== null) {
    return member.userId.name;
  }
  return 'Unknown';
}

function getMemberEmail(member: OrgMember): string {
  if (typeof member.userId === 'object' && member.userId !== null) {
    return member.userId.email;
  }
  return '';
}

function getMemberId(member: OrgMember): string {
  if (typeof member.userId === 'object' && member.userId !== null) {
    return member.userId._id;
  }
  return member.userId as string;
}

export default function Organization() {
  const { org, members, orgRole, refreshOrg } = useOrg();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Org name editing
  const [editingName, setEditingName] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);

  // Role change dropdown state
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);

  // Subscription info
  const [subInfo, setSubInfo] = useState<{ currentPlan: string; planExpiry: string | null } | null>(null);

  useEffect(() => {
    if (org) setOrgName(org.name);
  }, [org]);

  useEffect(() => {
    subscriptionApi.getCurrent()
      .then(d => setSubInfo({ currentPlan: d.currentPlan, planExpiry: d.planExpiry }))
      .catch(() => {});
  }, []);

  const canManage = orgRole === 'owner' || orgRole === 'admin';

  const handleSaveName = async () => {
    if (!orgName.trim()) return;
    setSavingName(true);
    try {
      await orgApi.update(orgName.trim());
      await refreshOrg();
      setEditingName(false);
      toast.success('Organization name updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await orgApi.inviteMember(inviteEmail.trim(), inviteRole);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      await refreshOrg();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (member: OrgMember) => {
    const memberId = getMemberId(member);
    const memberName = getMemberName(member);
    if (!confirm(`Remove ${memberName} from the organization?`)) return;
    try {
      await orgApi.removeMember(memberId);
      toast.success(`${memberName} removed`);
      await refreshOrg();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleChangeRole = async (member: OrgMember, newRole: string) => {
    const memberId = getMemberId(member);
    try {
      await orgApi.changeMemberRole(memberId, newRole);
      toast.success('Role updated');
      setRoleDropdown(null);
      await refreshOrg();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
  };

  const currentPlan = subInfo?.currentPlan ?? org?.plan ?? 'free';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Building2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Workspace</h1>
          <p className="text-sm text-gray-500">Manage your organization settings and team</p>
        </div>
      </div>

      {/* Workspace Info */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Workspace Info</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Organization Name</label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Check size={14} />
                  {savingName ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingName(false); setOrgName(org?.name ?? ''); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{org?.name ?? 'My Workspace'}</span>
                {canManage && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Plan</label>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planColors[currentPlan] ?? planColors.free}`}>
                {currentPlan.toUpperCase()}
              </span>
            </div>
            {org?.createdAt && (
              <div>
                <label className="text-sm text-gray-500 block mb-1">Created</label>
                <span className="text-sm text-gray-700">
                  {new Date(org.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {subInfo?.planExpiry && (
              <div>
                <label className="text-sm text-gray-500 block mb-1">Plan Expires</label>
                <span className="text-sm text-gray-700">
                  {new Date(subInfo.planExpiry).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Subscription */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Subscription</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Current plan: <span className="font-semibold capitalize">{currentPlan}</span>
            </p>
            {subInfo?.planExpiry && (
              <p className="text-xs text-gray-500 mt-0.5">
                Renews / expires: {new Date(subInfo.planExpiry).toLocaleDateString()}
              </p>
            )}
          </div>
          {orgRole === 'owner' && (
            <button
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      </section>

      {/* Team Members */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Team Members</h2>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{members.length}</span>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No members yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(member => {
              const name = getMemberName(member);
              const email = getMemberEmail(member);
              const memberId = getMemberId(member);
              const isCurrentUser = email === user?.email;

              return (
                <div key={member.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                    {getInitials(name || email || 'U')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{name || email}</p>
                      {isCurrentUser && <span className="text-xs text-gray-400">(you)</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{email}</p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Role */}
                  <div className="flex items-center gap-2">
                    {orgRole === 'owner' && member.role !== 'owner' ? (
                      <div className="relative">
                        <button
                          onClick={() => setRoleDropdown(roleDropdown === memberId ? null : memberId)}
                          className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50"
                        >
                          <RoleBadge role={member.role} />
                          <ChevronDown size={10} className="text-gray-400" />
                        </button>
                        {roleDropdown === memberId && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            {(['admin', 'member'] as const).map(r => (
                              <button
                                key={r}
                                onClick={() => handleChangeRole(member, r)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left"
                              >
                                {member.role === r && <Check size={10} className="text-blue-600" />}
                                <span className={member.role === r ? 'text-blue-600 font-medium' : 'text-gray-700'}>
                                  {r.charAt(0).toUpperCase() + r.slice(1)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}

                    {canManage && member.role !== 'owner' && !isCurrentUser && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Invite Member */}
      {canManage && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Invite Member</h2>
          </div>
          <form onSubmit={handleInvite} className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </form>
        </section>
      )}

      {/* Danger Zone */}
      {orgRole !== 'owner' && (
        <section className="bg-white rounded-xl border border-red-200 p-6">
          <h2 className="font-semibold text-red-700 mb-3">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            Leave this organization. You will lose access to all shared data.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to leave this organization?')) {
                toast.info('Please contact your admin to be removed from the organization.');
              }
            }}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 font-medium"
          >
            Leave Organization
          </button>
        </section>
      )}
    </div>
  );
}
