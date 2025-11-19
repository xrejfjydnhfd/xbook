import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const AdminReports = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports Management</h1>
        <p className="text-muted-foreground">View and manage reported content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reported Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No reports at this time</p>
            <Badge variant="secondary" className="mt-4">0 Pending Reports</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
