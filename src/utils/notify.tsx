import { useEffect, useState } from "react";

/**
 * Themed replacements for window.alert / window.confirm.
 *
 * Both are plain async functions rather than hooks so they can be called from
 * non-component code (the factories in Utils.tsx, the share-URL loader) as well
 * as from components. <DialogHost /> must be mounted once, near the root; until
 * it is, these fall back to the native dialogs so nothing silently no-ops.
 */

export type DialogTone = "info" | "warning" | "danger";

interface DialogRequest {
  id: number;
  title?: string;
  message: string;
  tone: DialogTone;
  confirmLabel: string;
  cancelLabel?: string;
  resolve: (ok: boolean) => void;
}

type Listener = (queue: DialogRequest[]) => void;

let queue: DialogRequest[] = [];
let listener: Listener | null = null;
let nextId = 1;

function publish() {
  listener?.([...queue]);
}

function enqueue(req: Omit<DialogRequest, "id">): void {
  // No host mounted (tests, or a render error) — degrade to the native dialog
  // rather than leaving the caller's promise unsettled forever. Referenced as
  // bare globals so this also works where there is no DOM and they are simply
  // absent.
  if (!listener) {
    const text = req.title ? `${req.title}\n\n${req.message}` : req.message;
    if (req.cancelLabel === undefined) {
      if (typeof alert === "function") alert(text);
      req.resolve(true);
    } else {
      // With no way to ask, the safe answer to "are you sure?" is no.
      req.resolve(typeof confirm === "function" ? confirm(text) : false);
    }
    return;
  }

  queue = [...queue, { ...req, id: nextId++ }];
  publish();
}

/** Show a message with a single dismiss button. Replaces window.alert. */
export function notify(
  message: string,
  options: { title?: string; tone?: DialogTone; confirmLabel?: string } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    enqueue({
      message,
      title: options.title,
      tone: options.tone ?? "info",
      confirmLabel: options.confirmLabel ?? "OK",
      resolve,
    });
  });
}

/** Ask a yes/no question. Replaces window.confirm. Resolves true on confirm. */
export function confirmDialog(
  message: string,
  options: {
    title?: string;
    tone?: DialogTone;
    confirmLabel?: string;
    cancelLabel?: string;
  } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    enqueue({
      message,
      title: options.title,
      tone: options.tone ?? "warning",
      confirmLabel: options.confirmLabel ?? "Continue",
      cancelLabel: options.cancelLabel ?? "Cancel",
      resolve,
    });
  });
}

/**
 * Renders whatever notify()/confirmDialog() have queued. Mount once, near the
 * root of the tree.
 */
export function DialogHost() {
  const [items, setItems] = useState<DialogRequest[]>([]);

  useEffect(() => {
    listener = setItems;
    return () => {
      listener = null;
    };
  }, []);

  const current = items[0];

  useEffect(() => {
    if (!current) return;

    const settleCurrent = (ok: boolean) => {
      queue = queue.filter((q) => q.id !== current.id);
      publish();
      current.resolve(ok);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        settleCurrent(false);
      } else if (e.key === "Enter") {
        e.stopPropagation();
        settleCurrent(true);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [current]);

  if (!current) return null;

  const settle = (ok: boolean) => {
    queue = queue.filter((q) => q.id !== current.id);
    publish();
    current.resolve(ok);
  };

  return (
    <div className="appDialogOuter" role="presentation" onClick={() => settle(false)}>
      <div
        className={`appDialogInner tone-${current.tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-label={current.title ?? "Notice"}
        onClick={(e) => e.stopPropagation()}
      >
        {current.title && <h3 className="appDialogTitle">{current.title}</h3>}
        <p className="appDialogMessage">{current.message}</p>
        <div className="appDialogButtons">
          {current.cancelLabel !== undefined && (
            <button type="button" className="appDialogCancel" onClick={() => settle(false)}>
              {current.cancelLabel}
            </button>
          )}
          <button type="button" className="appDialogConfirm" autoFocus onClick={() => settle(true)}>
            {current.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DialogHost;
