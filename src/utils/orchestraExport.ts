import type { Student } from '../types';
import { NAIPES, formatNaipe, isValidOrchestraNaipe } from '../types';
import { isSameOrchestra, normalizeOrchestraName, sanitizeOrchestraList, getInstitutionForOrchestra } from './orchestras';
import toast from 'react-hot-toast';

export function isChefeDeNaipe(student: Student): boolean {
  if (!student) return false;
  const c = (student.chefeNaipe || '').trim().toLowerCase();
  if (c && !['não', 'nao', 'false', '0', '-', 'n'].includes(c)) return true;
  if (student.orquestra && /chefe/i.test(student.orquestra)) return true;
  return false;
}

/**
 * Ordena os naipes seguindo a ordem canónica da partitura de orquestra
 */
export function sortNaipesCanonical(naipes: string[]): string[] {
  const canonicalList = Array.from(NAIPES);
  return [...naipes].sort((a, b) => {
    const idxA = canonicalList.indexOf(a as typeof NAIPES[number]);
    const idxB = canonicalList.indexOf(b as typeof NAIPES[number]);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Agrupa os alunos por Naipe e ordena os naipes pela ordem oficial da orquestra
 */
export function groupStudentsByNaipe(students: Student[]): { naipe: string; students: Student[] }[] {
  const map = new Map<string, Student[]>();

  students.forEach((s) => {
    if (!isValidOrchestraNaipe(s.naipe)) return;
    const formatted = formatNaipe(s.naipe);
    if (!formatted) return;

    if (!map.has(formatted)) {
      map.set(formatted, []);
    }
    map.get(formatted)!.push(s);
  });

  const sortedNaipeNames = sortNaipesCanonical(Array.from(map.keys()));

  return sortedNaipeNames.map((naipe) => {
    const list = map.get(naipe) || [];
    // Ordena: chefes primeiro, depois por número ou nome
    const sortedStudents = [...list].sort((a, b) => {
      const aChefe = isChefeDeNaipe(a) ? 1 : 0;
      const bChefe = isChefeDeNaipe(b) ? 1 : 0;
      if (aChefe !== bChefe) return bChefe - aChefe; // Chefes no topo

      // Se ambos tiverem número de processo, ordena por número
      const numA = parseInt(a.numero || '', 10);
      const numB = parseInt(b.numero || '', 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;

      return a.nome.localeCompare(b.nome);
    });

    return {
      naipe,
      students: sortedStudents,
    };
  });
}

/**
 * Agrupa os alunos por Orquestra (apenas instrumentistas com naipe válido)
 */
export function groupStudentsByOrchestra(
  students: Student[],
  availableOrchestras?: string[]
): { orchestra: string; students: Student[] }[] {
  const listOrchs = sanitizeOrchestraList(availableOrchestras);
  const result: { orchestra: string; students: Student[] }[] = [];

  listOrchs.forEach((orchName) => {
    const orchStudents = students.filter(
      (s) => isSameOrchestra(s.orquestra, orchName) && isValidOrchestraNaipe(s.naipe)
    );
    if (orchStudents.length > 0) {
      result.push({
        orchestra: orchName,
        students: orchStudents,
      });
    }
  });

  return result;
}

/**
 * Exporta as constituições das orquestras para formato Excel (.csv com UTF-8 BOM e separador ;)
 */
export function exportOrchestrasToExcel(
  students: Student[],
  selectedOrchestra?: string,
  availableOrchestras?: string[]
): void {
  const validStudents = students.filter((s) => isValidOrchestraNaipe(s.naipe));
  const targetStudents =
    selectedOrchestra && selectedOrchestra !== 'todas'
      ? validStudents.filter((s) => isSameOrchestra(s.orquestra, selectedOrchestra))
      : validStudents;

  if (targetStudents.length === 0) {
    toast.error('Não existem músicos com naipe atribuído para exportar.');
    return;
  }

  const orchGroups = groupStudentsByOrchestra(targetStudents, availableOrchestras);
  const nowStr = new Date().toLocaleDateString('pt-PT');
  const yearStr = new Date().getFullYear();

  // Criação das linhas do ficheiro Excel
  const lines: string[] = [];

  // Cabeçalho institucional
  const topInst = selectedOrchestra && selectedOrchestra !== 'todas'
    ? `CONSTITUIÇÃO DA ORQUESTRA - ${getInstitutionForOrchestra(selectedOrchestra).toUpperCase()}`
    : 'CONSTITUIÇÃO DAS ORQUESTRAS';

  lines.push(`${topInst}; ; ; ; ; ; `);
  lines.push(`Data de Emissão: ${nowStr};Ano Letivo: ${yearStr}-${yearStr + 1};Total de Músicos: ${targetStudents.length}; ; ; ; `);
  lines.push(''); // Linha vazia

  orchGroups.forEach((group) => {
    const orchTitle = group.orchestra.toLowerCase().startsWith('orquestra')
      ? group.orchestra
      : `Orquestra ${group.orchestra}`;
    const groupInst = getInstitutionForOrchestra(group.orchestra);
    const naipeGroups = groupStudentsByNaipe(group.students);
    const totalGroupMusicians = naipeGroups.reduce((acc, ng) => acc + ng.students.length, 0);

    lines.push(`=== ${orchTitle.toUpperCase()} - ${groupInst.toUpperCase()} (${totalGroupMusicians} Músicos) ===; ; ; ; ; ; `);
    lines.push('Orquestra;Naipe;Nº / Ordem;Nome do Músico;Chefe de Naipe;Grau;Estado');

    naipeGroups.forEach((ng) => {
      ng.students.forEach((s, idx) => {
        const isChefe = isChefeDeNaipe(s);
        const chefeStr = isChefe
          ? s.chefeNaipe && !['sim', 'true', '1'].includes(s.chefeNaipe.toLowerCase())
            ? s.chefeNaipe
            : 'Sim (Chefe)'
          : 'Não';

        const row = [
          group.orchestra,
          ng.naipe,
          s.numero || String(idx + 1),
          s.nome,
          chefeStr,
          s.grau || '—',
          s.ativo !== false ? 'Ativo' : 'Inativo',
        ];

        // Escapa valores que contenham ponto e vírgula, aspas ou quebras de linha
        const formattedRow = row.map((val) => {
          const str = String(val ?? '').replace(/"/g, '""');
          return /[";\n\r]/.test(str) ? `"${str}"` : str;
        });

        lines.push(formattedRow.join(';'));
      });
    });

    // Quadro Síntese da Instrumentação desta Orquestra (Apenas naipes e número de instrumentistas)
    lines.push('');
    lines.push('Naipe;Nº de Instrumentistas; ; ; ; ; ');
    naipeGroups.forEach((ng) => {
      lines.push(`${ng.naipe};${ng.students.length}; ; ; ; ; `);
    });
    lines.push(`TOTAL;${totalGroupMusicians}; ; ; ; ; `);
    lines.push('');
    lines.push(''); // Separação entre orquestras
  });

  // Converte para Blob com UTF-8 BOM (\uFEFF) para abrir com perfeição no Excel Windows/Mac
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const cleanName = selectedOrchestra && selectedOrchestra !== 'todas'
    ? normalizeOrchestraName(selectedOrchestra).replace(/\s+/g, '_')
    : 'Todas';
  const filename = `Constituicao_Orquestra_${cleanName}_${yearStr}.csv`;

  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Ficheiro Excel "${filename}" descarregado com sucesso!`);
}
