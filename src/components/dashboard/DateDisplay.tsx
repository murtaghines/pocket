import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export function DateDisplay() {
  const { i18n } = useTranslation();
  const today = new Date();
  
  const dayNumber = today.getDate();
  const dayName = today.toLocaleDateString(i18n.language, { weekday: 'short' });
  const monthName = today.toLocaleDateString(i18n.language, { month: 'long' });
  
  return (
    <div className="flex items-center gap-4 animate-fade-in">
      {/* Large day number in circle */}
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted flex items-center justify-center">
        <span className="text-2xl md:text-3xl font-bold text-foreground">
          {dayNumber}
        </span>
      </div>
      
      {/* Day and month */}
      <div className="flex flex-col">
        <span className="text-sm md:text-base font-medium text-foreground capitalize">
          {dayName},
        </span>
        <span className="text-sm md:text-base text-muted-foreground capitalize">
          {monthName}
        </span>
      </div>
      
      {/* Divider */}
      <div className="hidden md:block w-px h-10 bg-border mx-2" />
      
      {/* Quick action button */}
      <Link to="/profile" className="hidden md:block">
        <Button 
          variant="default" 
          className="rounded-full gap-2 px-5"
        >
          Ver perfil
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
      
      {/* Calendar icon button */}
      <Button 
        variant="outline" 
        size="icon"
        className="rounded-full hidden md:flex"
      >
        <Calendar className="w-4 h-4" />
      </Button>
    </div>
  );
}
