import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type LoadMoreButtonProps = {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
};

export function LoadMoreButton({ hasMore, loading, onClick }: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading} className="self-center">
      {loading ? <Spinner /> : "Load more"}
    </Button>
  );
}
