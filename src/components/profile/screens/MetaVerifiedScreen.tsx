import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BadgeCheck, Shield, Star, Zap, Crown } from "lucide-react";

interface MetaVerifiedScreenProps {
  onBack: () => void;
}

const MetaVerifiedScreen = ({ onBack }: MetaVerifiedScreenProps) => {
  const benefits = [
    { icon: BadgeCheck, title: "Verified Badge", description: "Get the blue checkmark on your profile" },
    { icon: Shield, title: "Account Protection", description: "Enhanced security for your account" },
    { icon: Star, title: "Priority Support", description: "Direct access to support team" },
    { icon: Zap, title: "Exclusive Features", description: "Access to beta features first" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Meta Verified</h2>
      </div>

      {/* Hero */}
      <div className="text-center py-6">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
          <BadgeCheck className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Get Verified</h3>
        <p className="text-muted-foreground">Stand out with a verified badge</p>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        {benefits.map((benefit, index) => (
          <Card key={index} className="bg-secondary/30">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">{benefit.title}</h4>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pricing */}
      <Card className="border-primary">
        <CardContent className="p-6 text-center">
          <Crown className="w-8 h-8 text-primary mx-auto mb-3" />
          <div className="text-3xl font-bold mb-1">$14.99<span className="text-lg font-normal">/month</span></div>
          <p className="text-sm text-muted-foreground mb-4">Cancel anytime</p>
          <Button className="w-full" size="lg">
            Subscribe Now
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        By subscribing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
};

export default MetaVerifiedScreen;
