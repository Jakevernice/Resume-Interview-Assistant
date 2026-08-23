/**
 * Editor.tsx
 *
 * Monaco-based LaTeX source editor.
 *
 * Phase-1 update: reads the Monaco theme from the --monaco-theme CSS variable
 * set by themes.css (either 'vs' or 'vs-dark') so the editor respects the
 * active theme without needing to pass props down the tree.
 */

import React, { useRef } from 'react';
import MonacoEditor, { OnMount, Monaco } from '@monaco-editor/react';
import { useStore } from '../store/useStore';
import { useTheme } from '../store/ThemeProvider';

const Editor: React.FC = () => {
  const { resume_latex, setResumeLatex } = useStore();
  const { theme } = useTheme();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Map app theme to Monaco built-in theme identifiers.
  const monacoTheme = theme === 'dark' ? 'xp-dark' : 'xp-light';

  const handleBeforeMount = (monaco: Monaco) => {
    // Define classic high-fidelity Windows XP themes
    monaco.editor.defineTheme('xp-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000ff', bold: true },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
      }
    });

    monaco.editor.defineTheme('xp-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '608b4e', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569cd6', bold: true },
      ],
      colors: {
        'editor.background': '#151515',
        'editor.foreground': '#f1f5f9',
        'editor.lineHighlightBackground': '#222222',
        'editorCursor.foreground': '#3b82f6',
      }
    });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Keyboard shortcut to trigger manual compilation (Cmd/Ctrl + S).
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const event = new CustomEvent('manual-compile');
      window.dispatchEvent(event);
    });
  };

  return (
    <MonacoEditor
      height="100%"
      language="latex"
      theme={monacoTheme}
      value={resume_latex}
      onChange={(value) => setResumeLatex(value || '')}
      onMount={handleEditorDidMount}
      beforeMount={handleBeforeMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        padding: { top: 16 },
      }}
    />
  );
};

export default Editor;
