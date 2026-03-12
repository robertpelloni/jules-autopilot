'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Users,
    RefreshCw,
    AlertCircle,
    UserPlus,
    Shield,
    User,
    Eye,
    Mail,
    Loader2,
    Calendar,
    ChevronDown,
    CheckCircle2
} from 'lucide-react';

interface Member {
    id: string;
    role: string;
    user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
    };
    createdAt?: string;
}

const ROLE_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    owner: { icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Owner' },
    admin: { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Admin' },
    member: { icon: User, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Member' },
    viewer: { icon: Eye, color: 'text-zinc-400', bg: 'bg-zinc-500/10', label: 'Viewer' },
};

export default function MembersDashboard() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Invite modal state
    const [isInviting, setIsInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/workspaces/members');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setMembers(data.members || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load members');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        setInviteError(null);
        setInviteSuccess(false);

        try {
            const res = await fetch('/api/workspaces/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to invite user');
            
            setInviteSuccess(true);
            setInviteEmail('');
            fetchMembers();
            setTimeout(() => { setIsInviting(false); setInviteSuccess(false); }, 1500);
        } catch (err) {
            setInviteError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setInviteLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
            <div className="max-w-5xl mx-auto relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/20">
                            <Users className="h-6 w-6 text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Workspace Members</h1>
                            <p className="text-sm text-zinc-500">Manage team access and roles</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchMembers} disabled={loading} className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setIsInviting(true)} className="flex items-center gap-2 px-4 h-9 rounded-lg bg-teal-600 hover:bg-teal-500 transition-colors text-sm font-medium">
                            <UserPlus className="h-4 w-4" /> Invite Member
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Members List */}
                <div className="bg-zinc-900/50 border border-zinc-800 shadow-2xl rounded-xl overflow-hidden backdrop-blur-sm">
                    {loading && members.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                            Loading team...
                        </div>
                    ) : members.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">No additional members.</p>
                            <p className="text-sm mt-1">You are the only one in this workspace.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                                    <th className="px-6 py-4 font-medium text-zinc-400">User</th>
                                    <th className="px-6 py-4 font-medium text-zinc-400">Role</th>
                                    <th className="px-6 py-4 font-medium text-zinc-400 text-right">Settings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {members.map((member) => {
                                    const roleStyle = ROLE_STYLES[member.role] || ROLE_STYLES.member;
                                    const RoleIcon = roleStyle.icon;

                                    return (
                                        <tr key={member.id} className="hover:bg-zinc-800/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    {member.user.image ? (
                                                        <img src={member.user.image} alt="" className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-800" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                                            <User className="h-5 w-5 text-zinc-500" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-medium text-zinc-200">{member.user.name || 'Anonymous User'}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500">
                                                            <Mail className="h-3 w-3" /> {member.user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 ${roleStyle.bg}`}>
                                                    <RoleIcon className={`h-3 w-3 ${roleStyle.color}`} />
                                                    <span className={`text-xs font-medium ${roleStyle.color}`}>{roleStyle.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-zinc-500 hover:text-zinc-300 font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-xs">
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Invite Modal Overlay */}
                {isInviting && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden">
                            <h2 className="text-xl font-bold mb-1">Invite Member</h2>
                            <p className="text-sm text-zinc-500 mb-6">Send an email invitation to join this workspace.</p>

                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                        <input
                                            type="email"
                                            required
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            placeholder="colleague@example.com"
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Workspace Role</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                        <select
                                            value={inviteRole}
                                            onChange={e => setInviteRole(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-10 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="member">Member</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                                    </div>
                                    <p className="text-[11px] text-zinc-500 mt-1.5">
                                        {inviteRole === 'admin' ? 'Admins can manage settings and invite others.' :
                                         inviteRole === 'member' ? 'Members can run sub-agents and execute requests.' :
                                         'Viewers have read-only access to session history and logs.'}
                                    </p>
                                </div>

                                {inviteError && (
                                    <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                                        {inviteError}
                                    </div>
                                )}

                                {inviteSuccess && (
                                    <div className="p-3 rounded-lg bg-teal-500/10 text-teal-400 text-xs border border-teal-500/20 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> Invitiation sent successfully!
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsInviting(false)}
                                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviteLoading || !inviteEmail || inviteSuccess}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                        Send Invite
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
