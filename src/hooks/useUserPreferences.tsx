import { useState, useEffect } from 'react';
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
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  base_currency: 'EUR',
  locale: 'es-ES',
  language: 'es',
  date_format: 'DD/MM/YYYY',
};

function detectBrowserLocale(): { locale: string; language: string; currency: string } {
  const browserLocale = navigator.language || 'es-ES';
  const language = browserLocale.split('-')[0] || 'es';
  
  // Map common locales to currencies
  const localeToCurrency: Record<string, string> = {
    'es-ES': 'EUR',
    'es-AR': 'ARS',
    'es-MX': 'MXN',
    'es-CO': 'COP',
    'es-CL': 'CLP',
    'en-US': 'USD',
    'en-GB': 'GBP',
    'pt-BR': 'BRL',
    'de-DE': 'EUR',
    'fr-FR': 'EUR',
    'it-IT': 'EUR',
    'ja-JP': 'JPY',
    'en-CA': 'CAD',
    'en-AU': 'AUD',
  };
  
  const currency = localeToCurrency[browserLocale] || 'EUR';
  
  return { locale: browserLocale, language, currency };
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [browserDefaults] = useState(detectBrowserLocale);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user_preferences', user?.id],
    queryFn: async (): Promise<UserPreferences | null> => {
      if (!user) return null;
      
      // Use raw SQL query since types may not be updated yet
      const { data, error } = await supabase
        .from('user_preferences' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching preferences:', error);
        return null;
      }
      
      // If no preferences exist, create with browser defaults
      if (!data) {
        const newPrefs = {
          user_id: user.id,
          base_currency: browserDefaults.currency,
          locale: browserDefaults.locale,
          language: browserDefaults.language,
          date_format: browserDefaults.locale.startsWith('en-US') ? 'MM/DD/YYYY' : 'DD/MM/YYYY',
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
    },
    enabled: !!user,
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
    locale: browserDefaults.locale,
    language: browserDefaults.language,
    date_format: browserDefaults.locale.startsWith('en-US') ? 'MM/DD/YYYY' : 'DD/MM/YYYY',
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
