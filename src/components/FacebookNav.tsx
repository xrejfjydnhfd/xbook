import { Home, Play, User, Search, MessageCircle, Users, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import xbookLogo from "@/assets/xbook-logo.png";

const FacebookNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: Users, path: "/friends", label: "Friends" },
    { icon: Play, path: "/videos", label: "Reels" },
    { icon: Bell, path: "/notifications", label: "Notifications" },
    { icon: User, path: "/profile", label: "Profile" },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="flex items-center justify-between px-3 sm:px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md ring-1 ring-primary/20">
              <img 
                src={xbookLogo} 
                alt="Xbook" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hidden sm:block">
              Xbook
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full w-9 h-9 sm:w-10 sm:h-10 bg-secondary/80 hover:bg-secondary transition-colors"
              onClick={() => navigate("/search")}
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full w-9 h-9 sm:w-10 sm:h-10 bg-secondary/80 hover:bg-secondary transition-colors"
              onClick={() => navigate("/messages")}
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center justify-around px-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isReels = item.label === "Reels";
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "flex-1 rounded-none h-11 sm:h-12 relative transition-all duration-200 px-1",
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
                      "p-1 sm:p-1.5 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30" 
                        : "bg-secondary/50"
                    )}>
                      <item.icon className="w-4 h-4 sm:w-5 sm:h-5" fill={isActive ? "currentColor" : "none"} />
                    </div>
                  ) : (
                    <item.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", isActive && "fill-primary/20")} />
                  )}
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 sm:left-4 sm:right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
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
