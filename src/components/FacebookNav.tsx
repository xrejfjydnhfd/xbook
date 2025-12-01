import { Home, Play, User, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const FacebookNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: Play, path: "/videos", label: "Reels" },
    { icon: User, path: "/profile", label: "Profile" },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent tracking-tight">linkr</h1>
          <div className="flex items-center gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full bg-secondary/80 hover:bg-secondary transition-colors"
              onClick={() => navigate("/search")}
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full bg-secondary/80 hover:bg-secondary transition-colors"
              onClick={() => navigate("/messages")}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs - 3 Tabs */}
        <nav className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isReels = item.label === "Reels";
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "flex-1 rounded-none h-12 relative transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  isReels && isActive && "bg-gradient-to-t from-primary/10 to-transparent"
                )}
                onClick={() => navigate(item.path)}
              >
                <div className={cn(
                  "flex items-center justify-center transition-transform duration-200",
                  isActive && "scale-110",
                  isReels && "relative"
                )}>
                  {isReels ? (
                    <div className={cn(
                      "p-1.5 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30" 
                        : "bg-secondary/50"
                    )}>
                      <item.icon className="w-5 h-5" fill={isActive ? "currentColor" : "none"} />
                    </div>
                  ) : (
                    <item.icon className={cn("w-6 h-6", isActive && "fill-primary/20")} />
                  )}
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
                )}
              </Button>
            );
          })}
        </nav>
      </header>
    </>
  );
};

export default FacebookNav;
