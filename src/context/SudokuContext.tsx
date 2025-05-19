/**
 * Sudoku Game — Copyright (c) 2025 Dylan Almond
 * @license GNU General Public License v3.0
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef
} from 'react';
import type { GameAction, GameState } from '../types';
import {
  type DragStartEvent,
  type DragEndEvent,
  useSensors,
  useSensor,
  PointerSensor,
  type SensorDescriptor,
  type SensorOptions,
  KeyboardSensor
} from '@dnd-kit/core';
import {
  generatePuzzledifficulty,
  removeConflictsForCell,
  getConflicts,
  isGameWon,
  createEmptyBoard,
  computeHighlights
} from '../util';

type SudokuProviderProps = {
  children: React.ReactNode;
};

type SudokuProviderState = {
  /**
   * Core game state
   */
  game: GameState;

  /**
   * Drag and drop sensors (DnD Kit)
   */
  sensors: SensorDescriptor<SensorOptions>[];

  /**
   * Game container ref
   */
  containerRef: React.RefObject<HTMLDivElement | null>;

  /**
   * Main game board ref
   */
  boardRef: React.RefObject<HTMLDivElement | null>;

  /**
   * Set of all highlighted cells
   */
  highlights: Set<string>;

  /**
   * Game state dispatcher
   */
  dispatch: React.ActionDispatch<[action: GameAction]>;

  /**
   * Drag start handler (DnD Kit)
   */
  handleDragStart: (e: DragStartEvent) => void;

  /**
   * Drop handler (DnD Kit)
   */
  handleDrop: (e: DragEndEvent) => void;

  /**
   * Cell click handler
   */
  handleClick: (row: number, col: number) => void;

  /**
   * Start a new Sudoku game
   */
  newGame: () => void;

  /**
   * Add a hint to the game board
   */
  addHint: () => void;
};

const initialState: GameState = {
  board: createEmptyBoard(),
  originalBoard: createEmptyBoard(),
  solution: createEmptyBoard(),
  score: 0,
  lives: 0,
  status: 'idle',
  selected: { row: null, col: null },
  conflicts: new Map(),
  hints: new Set(),
  dragValue: null,
  showSolution: false
};

/**
 * Game state modifiers
 * @returns
 */
function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return {
        ...state,
        board: action.payload.board,
        originalBoard: action.payload.board,
        solution: action.payload.solution,
        score: 0,
        lives: 6,
        status: 'playing',
        selected: { row: null, col: null },
        conflicts: new Map(),
        hints: new Set(),
        dragValue: null,
        showSolution: false
      };
    case 'SELECT_CELL':
      return { ...state, selected: { row: action.row, col: action.col } };
    case 'RESET_SELECTION':
      return { ...state, selected: { row: null, col: null } };
    case 'SET_CONFLICTS':
      return { ...state, conflicts: action.conflicts };
    case 'SET_DRAG_VALUE':
      return { ...state, dragValue: action.value };
    case 'UPDATE_BOARD':
      return { ...state, board: action.board };
    case 'SET_SCORE':
      return { ...state, score: action.score };
    case 'SET_LIVES':
      return { ...state, lives: action.lives };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SHOW_SOLUTION':
      return { ...state, showSolution: action.show };
    case 'ADD_HINT': {
      const hints = new Set(state.hints);
      hints.add(`${action.row},${action.col}`);
      // Hints cost a life
      const lives = state.lives - 1;
      return { ...state, hints, lives };
    }
    default:
      return state;
  }
}

const SudokuContext = createContext<SudokuProviderState | undefined>(undefined);

/**
 * Provides Sudoku game state and logic.
 * @returns
 */
export function SudokuProvider({ children }: SudokuProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Drag and drop
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  /**
   * Grid of all fixed cells
   */
  const fixedCells = useMemo(
    () => state.originalBoard.map((row) => row.map((val) => val !== null)),
    [state.originalBoard]
  );

  /**
   * Set of all highlighted cells
   */
  const highlights: Set<string> = useMemo(
    () =>
      state.selected.row != null && state.selected.col != null
        ? computeHighlights(state.selected.row, state.selected.col, state.board)
        : new Set(),
    [state.board, state.selected.col, state.selected.row]
  );

  /**
   * Starts a new game.
   * Generates board and resets state.
   */
  const newGame = useCallback(() => {
    const { puzzle, solution } = generatePuzzledifficulty('easy');
    console.log(solution);

    containerRef.current?.scrollTo(0, 0);
    dispatch({ type: 'NEW_GAME', payload: { board: puzzle, solution } });
  }, []);

  /**
   * Handle cell selection.
   */
  const handleClick = useCallback((row: number, col: number) => {
    dispatch({ type: 'SELECT_CELL', row, col });
  }, []);

  /**
   * Handle dragging start.
   * Capture value and select source cell.
   */
  const handleDragStart = useCallback((e: DragStartEvent) => {
    const cell = e.active.data.current?.cell;
    if (!cell) return;
    dispatch({ type: 'SET_DRAG_VALUE', value: cell.value });
    dispatch({ type: 'SELECT_CELL', row: cell.row, col: cell.col });
  }, []);

  /**
   * Determines if a drop is invalid (no move or fixed cell.)
   */
  const isInvalidDrop = useCallback(
    (
      sourceRow: number | undefined,
      sourceCol: number | undefined,
      targetRow: number,
      targetCol: number
    ) =>
      !state.dragValue ||
      fixedCells[targetRow][targetCol] ||
      (sourceRow === targetRow && sourceCol === targetCol),
    [state.dragValue, fixedCells]
  );

  /**
   * Clears a source cell when dropped out of bounds.
   */
  const handleOutOfBounds = useCallback(
    (sourceRow: number, sourceCol: number) => {
      let deltaScore = 0;

      const sourceValue = state.board[sourceRow][sourceCol];

      // Remove the cell from the board
      const newBoard = state.board.map((r) => [...r]);
      newBoard[sourceRow][sourceCol] = null;
      dispatch({ type: 'UPDATE_BOARD', board: newBoard });

      // Update conflicts map
      let newConflicts = new Map(state.conflicts);

      // Remove source conflcits
      if (sourceValue !== null) {
        // Deduct previously granted score if source is a valid cell
        if (!newConflicts.has(`${sourceRow},${sourceCol}`)) {
          deltaScore -= 20;
        }

        newConflicts = removeConflictsForCell(
          state.board,
          newConflicts,
          sourceRow,
          sourceCol,
          sourceValue
        );
      }

      // Delete the source cell
      newConflicts.delete(`${sourceRow},${sourceCol}`);

      dispatch({ type: 'SET_CONFLICTS', conflicts: newConflicts });
      dispatch({ type: 'SET_SCORE', score: Math.max(state.score + deltaScore, 0) });
      dispatch({ type: 'SET_DRAG_VALUE', value: null });
      dispatch({ type: 'RESET_SELECTION' });
    },
    [state.board, state.conflicts]
  );

  /**
   * Handles in-bounds drop.
   * Moves value, computes conflicts and updates state.
   */
  const handleInBounds = useCallback(
    (
      sourceRow: number | undefined,
      sourceCol: number | undefined,
      targetRow: number,
      targetCol: number
    ) => {
      let deltaScore = 0;
      let newLives = state.lives;

      const newBoard = state.board.map((r) => [...r]);
      let newConflicts = new Map(state.conflicts);
      const value = state.dragValue!;

      // If we have no source to check, check the value at the target
      if (sourceRow == null || sourceCol == null) {
        sourceRow = targetRow;
        sourceCol = targetCol;
      }

      // Remove the source cell and deduct any points given
      const sourceValue = state.board[sourceRow][sourceCol];
      newBoard[sourceRow][sourceCol] = null;

      console.log(sourceValue);

      // Remove source conflcits
      if (sourceValue !== null) {
        // Deduct previously granted score if source is a valid cell
        if (!newConflicts.has(`${sourceRow},${sourceCol}`)) {
          deltaScore -= 20;
        }

        newConflicts = removeConflictsForCell(
          state.board,
          newConflicts,
          sourceRow,
          sourceCol,
          sourceValue
        );
      }

      // Add our new value to the board
      newBoard[targetRow][targetCol] = value;

      // Check for conflicts
      const targetConflicts = getConflicts(newBoard, targetRow, targetCol, value);

      // Score + lives handling
      if (targetConflicts.size) {
        // Increment conflict count for each cell in conflict
        for (const [conflictKey, countToAdd] of targetConflicts.entries()) {
          const current = newConflicts.get(conflictKey) ?? 0;
          newConflicts.set(conflictKey, current + countToAdd);
        }
        newLives -= 1;
        deltaScore -= 10;
      } else if (!state.board[targetRow][targetCol]) {
        deltaScore += 20;
      }

      dispatch({ type: 'UPDATE_BOARD', board: newBoard });
      dispatch({ type: 'SET_CONFLICTS', conflicts: newConflicts });
      dispatch({ type: 'SET_LIVES', lives: newLives });
      dispatch({ type: 'SET_SCORE', score: Math.max(state.score + deltaScore, 0) });
      dispatch({ type: 'SELECT_CELL', row: targetRow, col: targetCol });
      dispatch({ type: 'SET_DRAG_VALUE', value: null });
    },
    [state.board, state.conflicts, state.dragValue, state.lives, state.score]
  );

  /**
   * Main drop handler.
   * Delegates to out-of-bounds or in-bounds handlers.
   */
  const handleDrop = useCallback(
    (e: DragEndEvent) => {
      const { over, active } = e;
      if (!active) return;

      const { row: sourceRow, col: sourceCol } = active.data.current?.cell ?? {};
      const sourceIsCell = sourceRow != null && sourceCol != null;

      // Handle missing target
      if (!over) {
        if (sourceIsCell) handleOutOfBounds(sourceRow!, sourceCol!);
        return;
      }

      const { row: targetRow, col: targetCol } = over.data.current!.cell;
      if (isInvalidDrop(sourceRow, sourceCol, targetRow, targetCol)) return;

      // We've dropped onto a valid cell
      handleInBounds(sourceRow, sourceCol, targetRow, targetCol);
    },
    [handleOutOfBounds, handleInBounds, isInvalidDrop]
  );

  /**
   * Add Hint to board
   */
  const addHint = useCallback(() => {
    // Collect all empty, non-fixed cells
    const emptyCells: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!fixedCells[r][c] && state.board[r][c] === null) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length === 0) return;

    // Pick a random cell
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    const newBoard = state.board.map((row) => [...row]);
    newBoard[r][c] = state.solution[r][c];

    const newConflicts = new Map(state.conflicts);
    newConflicts.delete(`${r},${c}`);

    dispatch({ type: 'UPDATE_BOARD', board: newBoard });
    dispatch({ type: 'SET_CONFLICTS', conflicts: newConflicts });
    dispatch({ type: 'SELECT_CELL', row: r, col: c });
    dispatch({ type: 'ADD_HINT', row: r, col: c });
  }, [fixedCells, state.board, state.solution, state.conflicts, dispatch]);

  // Deselect when clicking outside the grid
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boardRef.current && !boardRef.current.contains(e.target as Node)) {
        dispatch({ type: 'RESET_SELECTION' });
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Check win/lose conditions
  useEffect(() => {
    if (state.status !== 'playing') return;

    // Lose
    if (state.lives < 1) {
      dispatch({ type: 'SET_STATUS', status: 'lose' });
      return;
    }

    // Win
    if (isGameWon(state.board, state.conflicts)) {
      dispatch({ type: 'SET_STATUS', status: 'win' });
      return;
    }
  }, [state.board, state.conflicts, state.lives, state.status]);

  // Start new game on mount
  useEffect(newGame, [newGame]);

  return (
    <SudokuContext.Provider
      value={{
        game: state,
        sensors,
        containerRef,
        boardRef,
        highlights,
        handleDragStart,
        handleDrop,
        addHint,
        handleClick,
        newGame,
        dispatch
      }}
    >
      {children}
    </SudokuContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSudoku = () => {
  const context = useContext(SudokuContext);
  if (context === undefined) throw new Error('useSudoku must be used within a SudokuProvider');
  return context;
};
