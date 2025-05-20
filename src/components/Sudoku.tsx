/**
 * Sudoku Game — Copyright (c) 2025 Dylan Almond
 * @license GNU General Public License v3.0
 */

import Draggable from './Draggable';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import SudokuGrid from './SudokuGrid';
import { useSudoku } from '../context/SudokuContext';
import './Sudoku.css';
import { Dynascale } from 'dynascale';

/**
 * Main Sudoku UI component
 * @returns
 */
const Sudoku = () => {
  const {
    game,
    sensors,
    containerRef,
    boardRef,
    addHint,
    handleDragStart,
    handleDrop,
    newGame,
    dispatch
  } = useSudoku();
  const isPlaying = game.status === 'playing';

  return (
    <div ref={containerRef} className={`sudoku ${isPlaying ? '' : 'sudoku--game-over'}`}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDrop}>
        <DragOverlay dropAnimation={null}>
          {game.dragValue ? (
            <div className='sudoku__cell sudoku__cell--dragging'>{game.dragValue}</div>
          ) : null}
        </DragOverlay>

        <div className='sudoku__game'>
          <p className='sudoku__stat'>
            {'Score '}
            <span>{game.score}</span>
          </p>

          {/* Game Board */}
          <Dynascale defaultScale={0} margin={0}>
            <SudokuGrid ref={boardRef} showSolution={false} />
          </Dynascale>

          <p className='sudoku__stat'>
            <span>{game.lives}</span>
            {' Lives Remaining'}
          </p>

          {/* Draggable numbers */}
          <div className={`sudoku__controls ${!isPlaying ? 'sudoku__controls--game-over' : ''}`}>
            <div className='sudoku__controls-numlist'>
              {Array.from({ length: 9 }).map((_, i) => (
                <Draggable
                  key={i}
                  id={`draggable-${i + 1}`}
                  isDisabled={!isPlaying}
                  className={`sudoku__cell ${!isPlaying ? 'sudoku__cell--disabled' : ''}`}
                  data={{ cell: { value: i + 1 } }}
                  tabIndex={isPlaying ? 0 : -1}
                >
                  {i + 1}
                </Draggable>
              ))}
            </div>

            <button disabled={!isPlaying} className='button button--warning' onClick={addHint}>
              Hint
            </button>
          </div>
        </div>
      </DndContext>

      {/* Lose and Win screens */}
      {game.status === 'lose' ? (
        <div className='sudoku__game-over'>
          <div className='sudoku__game-over-banner'>
            <h1>Game Over</h1>
            <p>Click 'Show solution' below to see the correct number combination</p>
          </div>

          <div>
            <p className='sudoku__stat'>
              {'Your Score '}
              <span>{game.score}</span>
            </p>
          </div>

          {/* Solution View */}
          {game.showSolution ? (
            <Dynascale margin={0.1} defaultScale={1}>
              <SudokuGrid showSolution={true} />
            </Dynascale>
          ) : (
            <button
              className='button'
              onClick={() => dispatch({ type: 'SHOW_SOLUTION', show: true })}
            >
              Show Solution
            </button>
          )}

          <button className='button button--active' onClick={newGame}>
            Play Again
          </button>
        </div>
      ) : game.status === 'win' ? (
        <div className='sudoku__game-over'>
          <div className='sudoku__game-over-banner'>
            <h1>Sudoku Complete</h1>
          </div>

          <div>
            <p className='sudoku__stat'>
              {'Your Score '}
              <span>{game.score}</span>
            </p>

            <p className='sudoku__stat'>
              {'Lives Remaining '}
              <span>{game.lives}</span>
            </p>
          </div>

          <button className='button button--active' onClick={newGame}>
            Play Again
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default Sudoku;
