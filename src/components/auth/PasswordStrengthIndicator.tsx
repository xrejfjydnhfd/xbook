import { Check, X } from "lucide-react";
import { useMemo } from "react";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const requirements: PasswordRequirement[] = useMemo(() => [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character (!@#$%^&*)", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount <= 1) return { level: "weak", color: "bg-destructive", width: "w-1/4" };
    if (metCount <= 2) return { level: "fair", color: "bg-orange-500", width: "w-2/4" };
    if (metCount <= 4) return { level: "good", color: "bg-yellow-500", width: "w-3/4" };
    return { level: "strong", color: "bg-green-500", width: "w-full" };
  }, [requirements]);

  if (!password) return null;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${strength.color} ${strength.width} transition-all duration-300 rounded-full`}
          />
        </div>
        <p className="text-xs text-muted-foreground capitalize">
          Password strength: <span className="font-medium">{strength.level}</span>
        </p>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1.5">
        {requirements.map((req, index) => (
          <li 
            key={index}
            className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
              req.met ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            }`}
          >
            {req.met ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const validatePasswordStrength = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
};
