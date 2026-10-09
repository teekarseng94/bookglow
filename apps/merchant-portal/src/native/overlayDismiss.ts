type DismissHandler = () => void;

const stack: DismissHandler[] = [];

/** Register the topmost overlay. The latest registration closes first. */
export function registerOverlayDismiss(onClose: DismissHandler): () => void {
  stack.push(onClose);
  return () => {
    const index = stack.lastIndexOf(onClose);
    if (index >= 0) stack.splice(index, 1);
  };
}

/** Close the top overlay. Returns false when nothing is open. */
export function dismissTopOverlay(): boolean {
  const onClose = stack[stack.length - 1];
  if (!onClose) return false;
  onClose();
  return true;
}
