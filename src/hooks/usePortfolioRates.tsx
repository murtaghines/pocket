import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useExchangeRates } from "./useExchangeRates";
import { useCallback } from "react";

export interface RateOverride {
  id: string;
  user_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  rate_type: string;
  updated_at: string;
}

export type RateType = "official" | "mep" | "blue" | "custom";

export function usePortfolioRates(preferredRateType: RateType = "official") {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { convertAmount: autoConvert, rates: autoRates, isLoading: isLoadingAuto } = useExchangeRates();

  const { data: overrides = [], isLoading: isLoadingOverrides } = useQuery({
    queryKey: ["portfolio-rate-overrides", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_rate_overrides")
        .select("*")
        .eq("user_id", user!.id)
        .order("from_currency");

      if (error) throw error;
      return data as RateOverride[];
    },
    enabled: !!user,
  });

  const upsertRate = useMutation({
    mutationFn: async (input: {
      from_currency: string;
      to_currency: string;
      rate: number;
      rate_type?: RateType;
    }) => {
      const { error } = await supabase
        .from("portfolio_rate_overrides")
        .upsert(
          {
            user_id: user!.id,
            from_currency: input.from_currency,
            to_currency: input.to_currency,
            rate: input.rate,
            rate_type: input.rate_type ?? "official",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,from_currency,to_currency,rate_type" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-rate-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  const deleteRate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("portfolio_rate_overrides")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-rate-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  const convert = useCallback(
    (amount: number, from: string, to: string): { converted: number; hasRate: boolean; source: "override" | "auto" | "none" } => {
      if (from === to) return { converted: amount, hasRate: true, source: "auto" };

      // 1. Try user override with preferred rate type
      const directOverride = overrides.find(
        (r) => r.from_currency === from && r.to_currency === to && r.rate_type === preferredRateType
      );
      if (directOverride) return { converted: amount * directOverride.rate, hasRate: true, source: "override" };

      const inverseOverride = overrides.find(
        (r) => r.from_currency === to && r.to_currency === from && r.rate_type === preferredRateType
      );
      if (inverseOverride) return { converted: amount / inverseOverride.rate, hasRate: true, source: "override" };

      // 2. Try user override with official rate type (fallback)
      if (preferredRateType !== "official") {
        const directOff = overrides.find(
          (r) => r.from_currency === from && r.to_currency === to && r.rate_type === "official"
        );
        if (directOff) return { converted: amount * directOff.rate, hasRate: true, source: "override" };

        const inverseOff = overrides.find(
          (r) => r.from_currency === to && r.to_currency === from && r.rate_type === "official"
        );
        if (inverseOff) return { converted: amount / inverseOff.rate, hasRate: true, source: "override" };
      }

      // 3. Fall back to automatic rates (frankfurter API)
      if (autoRates && Object.keys(autoRates).length > 0) {
        const converted = autoConvert(amount, from, to);
        if (converted !== amount || from === to) {
          return { converted, hasRate: true, source: "auto" };
        }
      }

      return { converted: amount, hasRate: false, source: "none" };
    },
    [overrides, preferredRateType, autoRates, autoConvert]
  );

  return {
    overrides,
    isLoading: isLoadingOverrides || isLoadingAuto,
    upsertRate,
    deleteRate,
    convert,
    hasOverrides: overrides.length > 0,
  };
}
