import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { readRange, updateRange, INITIAL_LOCAL_DATA } from '../api/sheetsApi';
import { useSheets } from '../context/SheetsContext';
import type { StagePlan } from '../types';
import { safeStorage } from '../utils/storage';

const TAB = 'PlanosPalco';
// Armazenamos cada plano como JSON numa célula na coluna A
// Linha 1 = header, linhas 2+ = planos

const CACHE_KEY = 'orchestra_cache_plans';

function getInitialPlans(): StagePlan[] {
  const saved = safeStorage.getItem(CACHE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  const raw = INITIAL_LOCAL_DATA['PlanosPalco'] || [];
  if (raw.length > 1) {
    const list: StagePlan[] = [];
    raw.slice(1).forEach((row) => {
      if (row[0]) {
        try {
          list.push(JSON.parse(row[0]));
        } catch {}
      }
    });
    if (list.length > 0) {
      safeStorage.setItem(CACHE_KEY, JSON.stringify(list));
      return list;
    }
  }
  return [];
}

export function useStagePlans() {
  const { config } = useSheets();
  const [plans, setPlans] = useState<StagePlan[]>(getInitialPlans);
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
      if (loaded.length > 0) {
        safeStorage.setItem(CACHE_KEY, JSON.stringify(loaded));
      }
    } catch (err) {
      toast.error(`Erro ao carregar planos: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Persiste todos os planos de volta para o Sheets e cache
  const persistPlans = useCallback(
    async (updatedPlans: StagePlan[]) => {
      safeStorage.setItem(CACHE_KEY, JSON.stringify(updatedPlans));
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

  const exportPlansBackup = useCallback(() => {
    if (plans.length === 0) {
      toast.error('Nenhum plano para exportar');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(plans, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `planos_palco_orquestras_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Ficheiro de backup dos planos descarregado com sucesso!');
  }, [plans]);

  const importPlansBackup = useCallback(
    async (imported: StagePlan[]) => {
      if (!Array.isArray(imported) || imported.length === 0) {
        toast.error('Ficheiro inválido ou sem planos.');
        return;
      }
      const toastId = toast.loading('A importar planos de palco...');
      try {
        // Junta com os existentes substituindo por ID se já existir
        const map = new Map<string, StagePlan>();
        plans.forEach((p) => map.set(p.id, p));
        imported.forEach((p) => map.set(p.id, p));
        const merged = Array.from(map.values());
        await persistPlans(merged);
        setPlans(merged);
        toast.success(`${imported.length} planos importados com sucesso!`, { id: toastId });
      } catch (err) {
        toast.error(`Erro ao importar: ${err instanceof Error ? err.message : 'Erro'}`, { id: toastId });
      }
    },
    [plans, persistPlans]
  );

  const ensureHeader = useCallback(async () => {
    if (!config) return;
    const rows = await readRange(config.spreadsheetId, `${TAB}!A1`);
    if (!rows.length || rows[0][0] !== 'PlanosPalco_JSON') {
      await updateRange(config.spreadsheetId, `${TAB}!A1`, [['PlanosPalco_JSON']]);
    }
  }, [config]);

  return { plans, isLoading, load, savePlan, deletePlan, ensureHeader, exportPlansBackup, importPlansBackup };
}
