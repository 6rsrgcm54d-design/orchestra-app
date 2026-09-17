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
import type { Student, Piece, Evaluation, NavModule } from './types';
import { Music2, Link2 } from 'lucide-react';

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage() {
  const { signIn, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-orchestra-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-orchestra-gold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Music2 size={40} className="text-orchestra-navy" />
          </div>
          <h1 className="text-3xl font-bold text-white">OrquestraApp</h1>
          <p className="text-white/50 mt-2">Gestão profissional de orquestras</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-2">Bem-vindo</h2>
          <p className="text-white/50 text-sm mb-8">
            Faça login com a sua conta Google para aceder à aplicação. Os dados são sincronizados diretamente com o seu Google Sheets.
          </p>

          <button
            onClick={signIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-50 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {isLoading ? 'A autenticar...' : 'Entrar com Google'}
          </button>

          <p className="text-white/30 text-xs text-center mt-6">
            Necessário acesso ao Google Sheets API e Google Drive API
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Spreadsheet Setup ───────────────────────────────────────────────────────

function SpreadsheetSetup() {
  const { connect, isConnecting } = useSheets();
  const [input, setInput] = useState('');
  const { signOut, user } = useAuth();

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) connect(input.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-orchestra-navy flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orchestra-gold rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Link2 size={28} className="text-orchestra-navy" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conectar ao Google Sheets</h1>
          <p className="text-gray-500 dark:text-white/50 text-sm mt-2">
            Indica o ID ou URL do teu Google Spreadsheet
          </p>
        </div>

        <div className="bg-white dark:bg-white/5 dark:backdrop-blur border border-gray-200 dark:border-white/10 rounded-2xl p-6">
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL ou ID do Spreadsheet
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/ID... ou apenas o ID"
                className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
              />
              <p className="text-xs text-gray-400 mt-1">
                O Spreadsheet deve ser partilhado com a tua conta Google ({user?.email})
              </p>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isConnecting}
              className="w-full py-3 px-4 bg-orchestra-gold text-orchestra-navy font-semibold rounded-xl hover:bg-orchestra-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-orchestra-navy/40 border-t-orchestra-navy rounded-full animate-spin" />
                  A conectar...
                </span>
              ) : 'Conectar'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Como criar o Spreadsheet:</p>
            <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5 list-decimal list-inside">
              <li>Vai a sheets.google.com e cria um novo ficheiro</li>
              <li>Copia o URL ou o ID da barra de endereço</li>
              <li>Certifica-te que está partilhado com a tua conta</li>
            </ol>
          </div>

          <button onClick={signOut} className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            Sair da conta
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

  const { students, isLoading: studentsLoading, load: loadStudents, add: addStudent, update: updateStudent, remove: removeStudent, ensureHeader: ensureStudentsHeader } = useStudents();
  const { pieces, isLoading: piecesLoading, load: loadPieces, add: addPiece, update: updatePiece, remove: removePiece, ensureHeader: ensurePiecesHeader } = useRepertoire();
  const { evaluations, criteria, isLoading: evalsLoading, load: loadEvals, addEvaluation, removeEvaluation, ensureHeaders: ensureEvalsHeaders } = useEvaluations();
  const { plans, isLoading: plansLoading, load: loadPlans, savePlan, deletePlan, ensureHeader: ensurePlansHeader } = useStagePlans();

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
  }, [ensureStudentsHeader, ensurePiecesHeader, ensureEvalsHeaders, ensurePlansHeader, loadStudents, loadPieces, loadEvals, loadPlans]);

  // Initial load
  useEffect(() => {
    if (config) syncAll();
  }, [config]);

  const handleSync = () => {
    switch (activeModule) {
      case 'students': loadStudents(); break;
      case 'repertoire': loadPieces(); break;
      case 'evaluations': loadEvals(); break;
      case 'stagePlan': loadPlans(); break;
      default: syncAll();
    }
  };

  // Student handlers
  const handleAddStudent = () => { setEditingStudent(undefined); setShowStudentForm(true); };
  const handleEditStudent = (s: Student) => { setEditingStudent(s); setShowStudentForm(true); };
  const handleSaveStudent = async (data: Omit<Student, 'id' | 'rowIndex'>) => {
    if (editingStudent) {
      await updateStudent({ ...editingStudent, ...data });
    } else {
      await addStudent(data);
    }
  };

  // Piece handlers
  const handleAddPiece = () => { setEditingPiece(undefined); setShowPieceForm(true); };
  const handleEditPiece = (p: Piece) => { setEditingPiece(p); setShowPieceForm(true); };
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
        <main className="flex-1 overflow-y-auto">
          {renderModule()}
        </main>
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
  const { config, sheetsMeta, reconnect } = useSheets();

  // When user logs in and already has a saved spreadsheet ID, load its metadata
  React.useEffect(() => {
    if (isAuthenticated && config && !sheetsMeta) {
      reconnect();
    }
  }, [isAuthenticated, config, sheetsMeta, reconnect]);

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
