import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface PagesResultsProps {
  pages: any[];
  loading: boolean;
}

const PagesResults = ({ pages, loading }: PagesResultsProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No pages found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {pages.map((page: any) => (
        <Card key={page.id} className="p-4 hover:bg-accent cursor-pointer">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={page.profile_image} />
              <AvatarFallback>{page.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-semibold">{page.name}</h3>
                {page.is_verified && (
                  <CheckCircle className="h-4 w-4 text-primary fill-primary" />
                )}
              </div>
              {page.category && (
                <p className="text-sm text-muted-foreground">{page.category}</p>
              )}
              {page.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {page.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {page.follower_count} followers
              </p>
            </div>
            <Button size="sm">Follow</Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PagesResults;