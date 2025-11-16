import { NavLink } from "react-router-dom";
import { Home, Users, Video, Bell, User } from "lucide-react";

const BottomNav = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/friends", icon: Users, label: "Friends" },
    { to: "/videos", icon: Video, label: "Videos" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;