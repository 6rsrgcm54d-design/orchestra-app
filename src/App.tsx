import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SheetsProvider, useSheets } from './context/SheetsContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Dashboard from './components/dashboard/Dashboard';
import StudentList from './components/students/StudentList';
import StudentForm from './components/students/StudentForm';
import RepertoireList from './components/repertoire/RepertoireList';
import PieceForm from './components/repertoire/PieceForm';
import EvaluationsView from './components/evaluations/EvaluationsView';
import StagePlanView from './components/stagePlan/StagePlanView';
import { useStudents } from './hooks/useStudents';
import { useRepertoire } from './hooks/useRepertoire';
import { useEvaluations } from './hooks/useEvaluations';
import { useStagePlans } from './hooks/useStagePlans';
import type { Student, Piece, NavModule } from './types';
import { Music2, Link2, Sparkles, HardDrive } from 'lucide-react';

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage() {
  const { signIn, signInGuest, isLoading } = useAuth();
  const { connectLocal } = useSheets();

  const handleInstantAccess = async () => {
    signInGuest();
    await connectLocal();
  };

  return (
    <div className="min-h-screen bg-orchestra-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orchestra-gold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Music2 size={40} className="text-orchestra-navy" />
          </div>
          <h1 className="text-3xl font-bold text-white">OrquestraApp</h1>
          <p className="text-white/60 mt-1">Gestão profissional de orquestras</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Bem-vindo</h2>
            <p className="text-white/60 text-sm mt-1">
              Escolhe como queres aceder à aplicação:
            </p>
          </div>

          {/* Opção 1: Entrada Direta (Sem contas nem Google Cloud) */}
          <button
            onClick={handleInstantAccess}
            className="w-full group text-left p-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 border border-orchestra-gold/40 hover:border-orchestra-gold rounded-xl transition-all shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orchestra-gold text-orchestra-navy flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  Entrar Imediatamente
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-orchestra-gold/30 text-amber-300">
                    Recomendado
                  </span>
                </p>
                <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
                  Sem login nem configurações. Dados de exemplo prontos e guardados no teu navegador.
                </p>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Opção 2: Login Google OAuth */}
          <div>
            <button
              onClick={signIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-medium text-sm rounded-xl transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {isLoading ? 'A autenticar...' : 'Entrar com Conta Google'}
            </button>
            <p className="text-white/30 text-[11px] text-center mt-2">
              Sincroniza diretamente com uma folha Google Sheets (requer chaves Google Cloud)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Spreadsheet Setup ───────────────────────────────────────────────────────

function SpreadsheetSetup() {
  const { connect, connectLocal, isConnecting } = useSheets();
  const [input, setInput] = useState('');
  const { signOut, user } = useAuth();

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) connect(input.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-orchestra-navy flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orchestra-gold rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Link2 size={28} className="text-orchestra-navy" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fonte de Dados</h1>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-1">
            Escolhe onde guardar as informações da orquestra
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 dark:backdrop-blur border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-6">
          {/* Opção Rápida */}
          <div>
            <button
              onClick={() => connectLocal()}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2 p-3 bg-orchestra-gold text-orchestra-navy font-semibold text-sm rounded-xl hover:bg-orchestra-gold-light transition-all shadow-md"
            >
              <HardDrive size={18} />
              Continuar com Base de Dados Local (Sem Google Sheets)
            </button>
            <p className="text-xs text-gray-400 dark:text-white/40 text-center mt-1.5">
              Guarda todos os dados da orquestra diretamente no navegador com segurança.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
            <span className="text-xs text-gray-400 dark:text-white/40 uppercase tracking-wider">ou Google Sheets</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
          </div>

          {/* Opção Sheets */}
          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link ou ID da folha Google Sheets
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/ID..."
                className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              />
              <p className="text-xs text-gray-400 mt-1">
                Partilhada com a conta ({user?.email})
              </p>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isConnecting}
              className="w-full py-2.5 px-4 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-medium text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all disabled:opacity-50"
            >
              {isConnecting ? 'A conectar...' : 'Conectar ao Google Sheets'}
            </button>
          </form>

          <button
            onClick={signOut}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors pt-2"
          >
            Sair da sessão
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App (authenticated + connected) ────────────────────────────────────

function MainApp() {
  const { user, signOut } = useAuth();
  const { config, sheetsMeta, disconnect } = useSheets();
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Student modal state
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();

  // Piece modal state
  const [showPieceForm, setShowPieceForm] = useState(false);
  const [editingPiece, setEditingPiece] = useState<Piece | undefined>();

  const {
    students,
    isLoading: studentsLoading,
    load: loadStudents,
    add: addStudent,
    update: updateStudent,
    remove: removeStudent,
    ensureHeader: ensureStudentsHeader,
  } = useStudents();

  const {
    pieces,
    isLoading: piecesLoading,
    load: loadPieces,
    add: addPiece,
    update: updatePiece,
    remove: removePiece,
    ensureHeader: ensurePiecesHeader,
  } = useRepertoire();

  const {
    evaluations,
    criteria,
    isLoading: evalsLoading,
    load: loadEvals,
    addEvaluation,
    removeEvaluation,
    ensureHeaders: ensureEvalsHeaders,
  } = useEvaluations();

  const {
    plans,
    isLoading: plansLoading,
    load: loadPlans,
    savePlan,
    deletePlan,
    ensureHeader: ensurePlansHeader,
  } = useStagePlans();

  const syncAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        ensureStudentsHeader(),
        ensurePiecesHeader(),
        ensureEvalsHeaders(),
        ensurePlansHeader(),
      ]);
      await Promise.all([loadStudents(), loadPieces(), loadEvals(), loadPlans()]);
    } finally {
      setIsSyncing(false);
    }
  }, [
    ensureStudentsHeader,
    ensurePiecesHeader,
    ensureEvalsHeaders,
    ensurePlansHeader,
    loadStudents,
    loadPieces,
    loadEvals,
    loadPlans,
  ]);

  // Initial load
  useEffect(() => {
    if (config) syncAll();
  }, [config]);

  const handleSync = () => {
    switch (activeModule) {
      case 'students':
        loadStudents();
        break;
      case 'repertoire':
        loadPieces();
        break;
      case 'evaluations':
        loadEvals();
        break;
      case 'stagePlan':
        loadPlans();
        break;
      default:
        syncAll();
    }
  };

  // Student handlers
  const handleAddStudent = () => {
    setEditingStudent(undefined);
    setShowStudentForm(true);
  };
  const handleEditStudent = (s: Student) => {
    setEditingStudent(s);
    setShowStudentForm(true);
  };
  const handleSaveStudent = async (data: Omit<Student, 'id' | 'rowIndex'>) => {
    if (editingStudent) {
      await updateStudent({ ...editingStudent, ...data });
    } else {
      await addStudent(data);
    }
  };

  // Piece handlers
  const handleAddPiece = () => {
    setEditingPiece(undefined);
    setShowPieceForm(true);
  };
  const handleEditPiece = (p: Piece) => {
    setEditingPiece(p);
    setShowPieceForm(true);
  };
  const handleSavePiece = async (data: Omit<Piece, 'id' | 'rowIndex'>) => {
    if (editingPiece) {
      await updatePiece({ ...editingPiece, ...data });
    } else {
      await addPiece(data);
    }
  };

  const spreadsheetTitle = sheetsMeta?.title;

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard students={students} pieces={pieces} evaluations={evaluations} />;
      case 'students':
        return (
          <StudentList
            students={students}
            isLoading={studentsLoading}
            onAdd={handleAddStudent}
            onEdit={handleEditStudent}
            onDelete={removeStudent}
          />
        );
      case 'repertoire':
        return (
          <RepertoireList
            pieces={pieces}
            isLoading={piecesLoading}
            onAdd={handleAddPiece}
            onEdit={handleEditPiece}
            onDelete={removePiece}
          />
        );
      case 'evaluations':
        return (
          <EvaluationsView
            evaluations={evaluations}
            students={students}
            criteria={criteria}
            isLoading={evalsLoading}
            onAdd={addEvaluation}
            onDelete={removeEvaluation}
          />
        );
      case 'stagePlan':
        return (
          <StagePlanView
            plans={plans}
            students={students}
            isLoading={plansLoading}
            onSave={savePlan}
            onDelete={deletePlan}
          />
        );
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar
        activeModule={activeModule}
        onNavigate={setActiveModule}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onSignOut={signOut}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          activeModule={activeModule}
          user={user}
          spreadsheetTitle={spreadsheetTitle}
          onSync={handleSync}
          onDisconnect={disconnect}
          isSyncing={isSyncing}
        />
        <main className="flex-1 overflow-y-auto">{renderModule()}</main>
      </div>

      {/* Modals */}
      {showStudentForm && (
        <StudentForm
          student={editingStudent}
          onSave={handleSaveStudent}
          onClose={() => setShowStudentForm(false)}
        />
      )}
      {showPieceForm && (
        <PieceForm
          piece={editingPiece}
          onSave={handleSavePiece}
          onClose={() => setShowPieceForm(false)}
        />
      )}
    </div>
  );
}

// ─── App Router ──────────────────────────────────────────────────────────────

function AppRouter() {
  const { isAuthenticated } = useAuth();
  const { config, sheetsMeta, reconnect, connectLocal } = useSheets();

  React.useEffect(() => {
    if (isAuthenticated) {
      if (!config) {
        connectLocal();
      } else if (!sheetsMeta) {
        reconnect();
      }
    }
  }, [isAuthenticated, config, sheetsMeta, reconnect, connectLocal]);

  if (!isAuthenticated) return <LoginPage />;
  if (!config || !sheetsMeta) return <SpreadsheetSetup />;
  return <MainApp />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SheetsProvider>
          <AppRouter />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#d4a017', secondary: '#0f172a' } },
            }}
          />
        </SheetsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
