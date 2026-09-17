import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { readRange, updateRange } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { StagePlan } from '../types';

const TAB = 'PlanosPalco';
// Armazenamos cada plano como JSON numa célula na coluna A
// Linha 1 = header, linhas 2+ = planos

export function useStagePlans() {
  const { config } = useSheets();
  const [plans, setPlans] = useState<StagePlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!config) return;
    setIsLoading(true);
    try {
      const rows = await readRange(config.spreadsheetId, `${TAB}!A:A`);
      const dataRows = rows.slice(1); // skip header
      const loaded: StagePlan[] = [];
      for (const row of dataRows) {
        if (row[0]) {
          try {
            loaded.push(JSON.parse(row[0]) as StagePlan);
          } catch {
            // Skip invalid JSON
          }
        }
      }
      setPlans(loaded);
    } catch (err) {
      toast.error(`Erro ao carregar planos: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Persiste todos os planos de volta para o Sheets
  const persistPlans = useCallback(
    async (updatedPlans: StagePlan[]) => {
      if (!config) return;
      const values: string[][] = [['PlanosPalco_JSON']]; // header
      updatedPlans.forEach((p) => values.push([JSON.stringify(p)]));
      await updateRange(config.spreadsheetId, `${TAB}!A1:A${values.length}`, values);
    },
    [config]
  );

  const savePlan = useCallback(
    async (plan: StagePlan) => {
      if (!config) return;
      const toastId = toast.loading('A guardar plano...');
      try {
        const existing = plans.find((p) => p.id === plan.id);
        let updated: StagePlan[];
        if (existing) {
          updated = plans.map((p) => (p.id === plan.id ? plan : p));
        } else {
          updated = [...plans, plan];
        }
        await persistPlans(updated);
        setPlans(updated);
        toast.success('Plano guardado!', { id: toastId });
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, plans, persistPlans]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      if (!config) return;
      const toastId = toast.loading('A eliminar plano...');
      try {
        const updated = plans.filter((p) => p.id !== planId);
        await persistPlans(updated);
        setPlans(updated);
        toast.success('Plano eliminado!', { id: toastId });
      } catch (err) {
        toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [config, plans, persistPlans]
  );

  const ensureHeader = useCallback(async () => {
    if (!config) return;
    const rows = await readRange(config.spreadsheetId, `${TAB}!A1`);
    if (!rows.length || rows[0][0] !== 'PlanosPalco_JSON') {
      await updateRange(config.spreadsheetId, `${TAB}!A1`, [['PlanosPalco_JSON']]);
    }
  }, [config]);

  return { plans, isLoading, load, savePlan, deletePlan, ensureHeader };
}
