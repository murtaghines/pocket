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
  country?: string;
  date_format?: string | null;
  selected_categories?: string[];
  onboarding_completed?: boolean;
  joint_account_split?: number;
  joint_account_names?: string[];
  theme?: string;
  created_at: string;
  updated_at: string;
}

function detectDefaultCurrency(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  
  if (timezone.includes('Buenos_Aires') || timezone.includes('Argentina')) return 'ARS';
  if (timezone.includes('Mexico')) return 'MXN';
  if (timezone.includes('Bogota') || timezone.includes('Colombia')) return 'COP';
  if (timezone.includes('Santiago') || timezone.includes('Chile')) return 'CLP';
  if (timezone.includes('Sao_Paulo') || timezone.includes('Brazil')) return 'BRL';
  if (timezone.includes('New_York') || timezone.includes('Los_Angeles') || timezone.includes('Chicago')) return 'USD';
  if (timezone.includes('London')) return 'GBP';
  if (timezone.includes('Europe/')) return 'EUR';
  if (timezone.includes('Tokyo') || timezone.includes('Japan')) return 'JPY';
  if (timezone.includes('Sydney') || timezone.includes('Australia')) return 'AUD';
  if (timezone.includes('Toronto') || timezone.includes('Canada')) return 'CAD';
  
  return 'EUR';
}

function detectBrowserLanguage(): string {
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';
  const baseLang = browserLang.split('-')[0];
  // Only return if it's a supported language
  if (['en', 'es'].includes(baseLang)) {
    return baseLang;
  }
  return 'en';
}

export function useUserPreferences() {
  // Use session instead of just user to ensure auth token is ready
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  
  const [browserDefaults] = useState(() => ({
    currency: detectDefaultCurrency(),
    language: detectBrowserLanguage(),
  }));

  const { data: preferences, isLoading } = useQuery({
    // Keyed by user id; query will run when `enabled` flips to true.
    queryKey: ['user_preferences', user?.id],
    queryFn: async (): Promise<UserPreferences | null> => {
      if (!user) return null;

      // IMPORTANT: Avoid re-reading session from storage here.
      // We already gate via `enabled` using the in-memory session.
      if (!session?.access_token) return null;
      
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching preferences:', error);
          return null;
        }
        
        // If no preferences exist, create with detected defaults from browser
        if (!data) {
          const newPrefs = {
            user_id: user.id,
            base_currency: browserDefaults.currency,
            locale: browserDefaults.language === 'es' ? 'es-ES' : 'en-US',
            language: browserDefaults.language,
          };
          
          const { data: created, error: createError } = await supabase
            .from('user_preferences')
            .insert(newPrefs)
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating preferences:', createError);
            return null;
          }
          
          return created as UserPreferences;
        }
        
        return data as UserPreferences;
      } catch (err) {
        console.error('Preferences error:', err);
        return null;
      }
    },
    // Only enable when we have both user AND a valid session token
    enabled: !!user && !!session?.access_token,
    retry: 1,
    // Prevent stale data from causing issues
    staleTime: 1000,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>): Promise<UserPreferences> => {
      if (!user) throw new Error('User not authenticated');

      // IMPORTANT: Don't depend on storage-backed getSession() here.
      // If the user is authenticated in-app, the client will attach the token.
      if (!session?.access_token) throw new Error('No valid session. Please log in again.');
      
      // Try to update first (most common case)
      const { data: updated, error: updateError } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();
      
      // If update succeeded and returned data, we're done
      if (updated) {
        return updated as UserPreferences;
      }
      
      // If no row was updated, create new preferences
      if (!updated && !updateError) {
        const newPrefs = {
          user_id: user.id,
          base_currency: updates.base_currency || browserDefaults.currency,
          locale: browserDefaults.language === 'es' ? 'es-ES' : 'en-US',
          language: updates.language || browserDefaults.language,
          country: updates.country,
          selected_categories: updates.selected_categories,
          onboarding_completed: updates.onboarding_completed,
        };
        
        const { data, error } = await supabase
          .from('user_preferences')
          .insert(newPrefs)
          .select()
          .single();
        
        if (error) throw error;
        return data as UserPreferences;
      }
      
      if (updateError) throw updateError;
      throw new Error('Failed to update preferences');
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
    locale: browserDefaults.language === 'es' ? 'es-ES' : 'en-US',
    language: browserDefaults.language,
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
