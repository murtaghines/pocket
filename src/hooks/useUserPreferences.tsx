import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserPreferences {
  id: string;
  user_id: string;
  base_currency: string;
  locale: string;
  language: string;
  date_format: string;
  country?: string;
  selected_categories?: string[];
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
}

function detectBrowserLanguage(): string {
  // Always default to English regardless of browser settings
  return 'en';
}

function detectDefaultCurrency(): string {
  // Try to detect from timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  
  // Map timezones to currencies
  if (timezone.includes('Buenos_Aires') || timezone.includes('Argentina')) return 'ARS';
  if (timezone.includes('Mexico')) return 'MXN';
  if (timezone.includes('Bogota') || timezone.includes('Colombia')) return 'COP';
  if (timezone.includes('Santiago') || timezone.includes('Chile')) return 'CLP';
  if (timezone.includes('Sao_Paulo') || timezone.includes('Brazil')) return 'BRL';
  if (timezone.includes('New_York') || timezone.includes('Los_Angeles') || timezone.includes('Chicago') || timezone.includes('America/')) {
    // Check if it's a Latin American timezone
    if (timezone.includes('Lima') || timezone.includes('Peru')) return 'USD'; // Peru uses USD often
    if (!timezone.includes('Argentina') && !timezone.includes('Mexico') && !timezone.includes('Bogota') && !timezone.includes('Santiago') && !timezone.includes('Sao_Paulo')) {
      return 'USD';
    }
  }
  if (timezone.includes('London')) return 'GBP';
  if (timezone.includes('Europe/')) return 'EUR';
  if (timezone.includes('Tokyo') || timezone.includes('Japan')) return 'JPY';
  if (timezone.includes('Sydney') || timezone.includes('Australia')) return 'AUD';
  if (timezone.includes('Toronto') || timezone.includes('Canada')) return 'CAD';
  
  // Default to EUR if we can't detect
  return 'EUR';
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [browserDefaults] = useState(() => ({
    language: detectBrowserLanguage(),
    currency: detectDefaultCurrency(),
  }));

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user_preferences', user?.id],
    queryFn: async (): Promise<UserPreferences | null> => {
      if (!user) return null;
      
      try {
        const { data, error } = await supabase
          .from('user_preferences' as any)
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching preferences:', error);
          return null;
        }
        
        // If no preferences exist, create with detected defaults
        if (!data) {
          const newPrefs = {
            user_id: user.id,
            base_currency: browserDefaults.currency,
            locale: browserDefaults.language === 'en' ? 'en-US' : browserDefaults.language === 'pt' ? 'pt-BR' : 'es-ES',
            language: browserDefaults.language,
            date_format: browserDefaults.language === 'en' ? 'MM/dd/yyyy' : 'dd/MM/yyyy',
          };
          
          const { data: created, error: createError } = await supabase
            .from('user_preferences' as any)
            .insert(newPrefs)
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating preferences:', createError);
            return null;
          }
          
          return created as unknown as UserPreferences;
        }
        
        return data as unknown as UserPreferences;
      } catch (err) {
        console.error('Preferences error:', err);
        return null;
      }
    },
    enabled: !!user,
    retry: 1,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>): Promise<UserPreferences> => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_preferences' as any)
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as UserPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_preferences', user?.id] });
    },
  });

  // Return effective preferences (from DB or browser defaults)
  const effectivePreferences: UserPreferences = preferences || {
    id: '',
    user_id: user?.id || '',
    base_currency: browserDefaults.currency,
    locale: browserDefaults.language === 'en' ? 'en-US' : browserDefaults.language === 'pt' ? 'pt-BR' : 'es-ES',
    language: browserDefaults.language,
    date_format: browserDefaults.language === 'en' ? 'MM/dd/yyyy' : 'dd/MM/yyyy',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    preferences: effectivePreferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
