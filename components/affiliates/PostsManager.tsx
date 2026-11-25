"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Msg, useApi } from "@/components/admin/console/useApi";
import { CopyButton } from "@/components/affiliates/CopyButton";

export type PostRow = {
  id: string;
  platform: string;
  url: string;
  title: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  sales: number;
  verified: boolean;
  locked: boolean;
  updated: string;
  subLink: string;
};

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);
const METRICS = ["views", "likes", "comments", "shares"] as const;

function PostEditor({ post, base, admin, readOnly }: { post: PostRow; base: string; admin: boolean; readOnly?: boolean }) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [editing, setEditing] = useState(false);
  const [m, setM] = useState({ views: String(post.views), likes: String(post.likes), comments: String(post.comments), shares: String(post.shares) });
  const canEdit = !readOnly && (admin || !post.locked);
  async function send(method: string, body?: Record<string, unknown>) {
    const r = await call(`${base}/${post.id}`, method, body);
    if (r.ok) {
      setEditing(false);
      router.refresh();
    }
  }
  return (
    <tr>
      <td>
        <a href={post.url} target="_blank" rel="noopener noreferrer">
          {post.title || `${post.platform} post`}
        </a>
        <div className="muted">
          {post.platform} · updated {post.updated}
          {post.verified ? <span className="pill paid"> verified</span> : null}
          {post.locked ? <span className="pill"> locked</span> : null}
        </div>
        <div className="aff-sub">
          <code>{post.subLink}</code> <CopyButton value={post.subLink} label="Copy link" />
        </div>
      </td>
      {METRICS.map((k) => (
        <td key={k} className="num">
          {editing ? (
            <input className="aff-num" inputMode="numeric" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} aria-label={k} />
          ) : (
            fmt(post[k])
          )}
        </td>
      ))}
      <td className="num">{fmt(post.clicks)}</td>
      <td className="num">{fmt(post.sales)}</td>
      <td>
        <div className="row-actions">
          {editing ? (
            <>
              <button className="btn btn-p btn-sm" type="button" disabled={busy} onClick={() => send("PATCH", m)}>
                Save
              </button>
              <button className="btn btn-g btn-sm" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </>
          ) : canEdit ? (
            <button className="btn btn-g btn-sm" type="button" onClick={() => setEditing(true)}>
              Update numbers
            </button>
          ) : null}
          {admin && !readOnly ? (
            <>
              <button className="btn btn-g btn-sm" type="button" disabled={busy} onClick={() => send("PATCH", { verified: !post.verified })}>
                {post.verified ? "Unverify" : "Verify"}
              </button>
              <button className="btn btn-g btn-sm" type="button" disabled={busy} onClick={() => send("PATCH", { locked: !post.locked })}>
                {post.locked ? "Unlock" : "Lock"}
              </button>
            </>
          ) : null}
          {!readOnly && (admin || (!post.verified && !post.locked)) ? (
            <button
              className="btn btn-danger btn-sm"
              type="button"
              disabled={busy}
              onClick={() => window.confirm("Remove this post? Its sub-link keeps working but stops counting.") && send("DELETE")}
            >
              Remove
            </button>
          ) : null}
        </div>
        <Msg message={message} />
      </td>
    </tr>
  );
}

export function PostsManager({ posts, base, createUrl, admin, readOnly }: { posts: PostRow[]; base: string; createUrl: string; admin: boolean; readOnly?: boolean }) {
  const router = useRouter();
  const { busy, message, call } = useApi();
  const [form, setForm] = useState({ url: "", title: "", views: "", likes: "", comments: "", shares: "" });
  async function add(event: React.FormEvent) {
    event.preventDefault();
    const body: Record<string, string> = { url: form.url, title: form.title };
    for (const k of METRICS) if (form[k].trim()) body[k] = form[k];
    const r = await call(createUrl, "POST", body);
    if (r.ok) {
      setForm({ url: "", title: "", views: "", likes: "", comments: "", shares: "" });
      router.refresh();
    }
  }
  return (
    <div>
      {readOnly ? null : (
        <form className="card" onSubmit={add} style={{ marginBottom: 14 }}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
            <div className="adm-grid">
              <label className="field">
                Post link (Instagram, TikTok, YouTube, Facebook) *
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://www.instagram.com/reel/…" required />
              </label>
              <label className="field">
                Title (optional)
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="My 55 agents reel" />
              </label>
              {METRICS.map((k) => (
                <label key={k} className="field">
                  {k[0].toUpperCase() + k.slice(1)}
                  <input inputMode="numeric" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder="0" />
                </label>
              ))}
            </div>
            <Msg message={message} />
            <button className="btn btn-p btn-sm" type="submit" style={{ marginTop: 8 }}>
              {busy ? "Adding…" : "Add post"}
            </button>
            <small className="muted" style={{ display: "block", marginTop: 6 }}>
              Copy the numbers from the app&apos;s insights. Each post gets its own link: put it in that post&apos;s caption or bio so its sales are counted.
            </small>
          </fieldset>
        </form>
      )}
      {posts.length === 0 ? (
        <p className="muted">No posts added yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Post</th>
                <th className="num">Views</th>
                <th className="num">Likes</th>
                <th className="num">Comments</th>
                <th className="num">Shares</th>
                <th className="num">Clicks</th>
                <th className="num">Sales</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <PostEditor key={p.id} post={p} base={base} admin={admin} readOnly={readOnly} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
