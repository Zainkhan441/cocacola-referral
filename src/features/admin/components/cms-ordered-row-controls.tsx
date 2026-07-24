import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type CmsOrderedRowControlsProps = {
  isFirst: boolean;
  isLast: boolean;
  isPublished: boolean;
  busy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onTogglePublished: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

// The reorder/publish/edit/delete button cluster shared by every simple
// ordered CMS list admin screen (announcements, FAQ, guide steps, rules,
// nav/footer links) — kept as one component instead of repeating the same
// five buttons five times.
export function CmsOrderedRowControls({
  isFirst,
  isLast,
  isPublished,
  busy,
  onMoveUp,
  onMoveDown,
  onTogglePublished,
  onEdit,
  onDelete,
}: CmsOrderedRowControlsProps) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst || busy}
          aria-label="Move up"
          className="flex h-6 w-6 items-center justify-center rounded text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast || busy}
          aria-label="Move down"
          className="flex h-6 w-6 items-center justify-center rounded text-white/50 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <Button variant="outline" size="sm" onClick={onEdit} disabled={busy}>
        Edit
      </Button>
      <Button variant="outline" size="sm" onClick={onTogglePublished} disabled={busy}>
        {isPublished ? "Unpublish" : "Publish"}
      </Button>
      <Button variant="outline" size="sm" onClick={onDelete} disabled={busy}>
        Delete
      </Button>
    </div>
  );
}
