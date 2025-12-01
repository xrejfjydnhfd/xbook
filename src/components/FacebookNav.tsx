import { Home, PlaySquare, Users, Bell, Menu, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const FacebookNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: PlaySquare, path: "/videos", label: "Reels" },
    { icon: Users, path: "/friends", label: "Friends" },
    { icon: Bell, path: "/notifications", label: "Notifications" },
    { icon: Menu, path: "/settings", label: "Menu" },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-2xl font-bold text-primary tracking-tight">linkr</h1>
          <div className="flex items-center gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full bg-secondary"
              onClick={() => navigate("/search")}
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full bg-secondary"
              onClick={() => navigate("/messages")}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center justify-around border-t border-border">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "flex-1 rounded-none h-12 relative",
                  isActive && "text-primary"
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className={cn("w-6 h-6", isActive && "text-primary")} />
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
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
