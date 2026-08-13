"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input, Modal, CardSkeleton, Toggle, ConfirmModal } from "@/shared/components";

export default function UsersClient() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [createError, setCreateError] = useState("");
  const [resetUser, setResetUser] = useState(null); // { id, username }
  const [resetPassword, setResetPassword] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.log("Error fetching users:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreateError("");
    if (!newUser.username.trim() || !newUser.password) return;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUser.username.trim(), password: newUser.password, role: "member" }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreate(false);
        setNewUser({ username: "", password: "" });
        await fetchUsers();
      } else {
        setCreateError(data.error || "Failed to create user");
      }
    } catch {
      setCreateError("An error occurred");
    }
  };

  const handleToggleActive = async (user, isActive) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive } : u)));
    } catch (e) {
      console.log("Error toggling user:", e);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || !resetPassword) return;
    try {
      const res = await fetch(`/api/users/${resetUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      if (res.ok) {
        setResetUser(null);
        setResetPassword("");
      }
    } catch (e) {
      console.log("Error resetting password:", e);
    }
  };

  const handleDelete = (user) => {
    setConfirmState({
      title: "Delete Member",
      message: `Delete "${user.username}"? Their API keys will be unassigned (billing history kept) and they can no longer log in.`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
          if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== user.id));
        } catch (e) {
          console.log("Error deleting user:", e);
        }
      },
    });
  };

  if (loading) return <CardSkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">group</span>
            Members
          </h2>
          <Button icon="person_add" onClick={() => setShowCreate(true)}>Add Member</Button>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">group</span>
            </div>
            <p className="text-text-main font-medium mb-1">No members yet</p>
            <p className="text-sm text-text-muted mb-4">Create a member account and assign API keys to it from the Endpoint page.</p>
            <Button icon="person_add" onClick={() => setShowCreate(true)}>Add Member</Button>
          </div>
        ) : (
          <div className="flex flex-col">
            {users.map((u) => (
              <div key={u.id} className={`group flex items-center justify-between py-3 border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0 ${u.isActive ? "" : "opacity-60"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    {u.username}
                    <span className="px-1.5 py-0.5 rounded text-xs bg-surface-2 text-text-muted">{u.role}</span>
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {u.keyCount} key{u.keyCount === 1 ? "" : "s"} · Created {new Date(u.createdAt).toLocaleDateString()}
                    {!u.isActive && " · Disabled"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle
                    size="sm"
                    checked={u.isActive}
                    onChange={(checked) => handleToggleActive(u, checked)}
                    title={u.isActive ? "Disable login" : "Enable login"}
                  />
                  <button
                    onClick={() => { setResetUser({ id: u.id, username: u.username }); setResetPassword(""); }}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary transition-all"
                    title="Reset password"
                  >
                    <span className="material-symbols-outlined text-[18px]">password</span>
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    className="p-2 hover:bg-red-500/10 rounded text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                    title="Delete member"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Member Modal */}
      <Modal isOpen={showCreate} title="Add Member" onClose={() => { setShowCreate(false); setCreateError(""); }}>
        <div className="flex flex-col gap-4">
          <Input
            label="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            placeholder="jane"
          />
          <Input
            label="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            placeholder="Set an initial password"
          />
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <div className="flex gap-2">
            <Button onClick={handleCreate} fullWidth disabled={!newUser.username.trim() || !newUser.password}>Create</Button>
            <Button onClick={() => { setShowCreate(false); setCreateError(""); }} variant="ghost" fullWidth>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!resetUser} title="Reset Password" onClose={() => setResetUser(null)}>
        {resetUser && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">Set a new password for <b>{resetUser.username}</b>.</p>
            <Input
              label="New password"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleResetPassword} fullWidth disabled={!resetPassword}>Save</Button>
              <Button onClick={() => setResetUser(null)} variant="ghost" fullWidth>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        variant="danger"
      />
    </div>
  );
}
