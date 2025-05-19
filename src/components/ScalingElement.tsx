/**
 * Sudoku Game — Copyright (c) 2025 Dylan Almond
 * @license GNU General Public License v3.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import './ScalingElement.css';

interface ScalingElementProps {
  /**
   * Original width of the element (before scaling)
   */
  originalWidth: number;

  /**
   * Original height of the element (before scaling)
   */
  originalHeight: number;

  /**
   * The default scale
   */
  defaultScale?: number;

  /**
   * The minimum scale to apply
   */
  minScale?: number;

  /**
   * Margin percentage to leave around the scaled element (0-1)
   */
  margin?: number;

  /**
   * Additional class name for the container
   */
  className?: string;

  /**
   * Whether to show debug information
   */
  showDebugInfo?: boolean;

  /**
   * Children to render inside the scaling element
   */
  children: React.ReactNode;
}

/**
 * A component that scales its children while maintaining aspect ratio
 * to always fit within its container.
 * @returns
 */
const ScalingElement = ({
  originalWidth,
  originalHeight,
  defaultScale = 0,
  minScale = 0.1,
  margin = 0,
  className = '',
  showDebugInfo = false,
  children
}: ScalingElementProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(defaultScale);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  /**
   * Update scale when container size changes
   */
  const updateScale = useCallback(() => {
    if (!containerRef.current || !elementRef.current) return;

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Calculate scale factors
    const scaleX = containerWidth / originalWidth;
    const scaleY = containerHeight / originalHeight;

    // Use the smaller scale to ensure it fits
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY) * (1 - margin), minScale), 1);

    setScale(newScale);
    setContainerSize({ width: containerWidth, height: containerHeight });
  }, [margin, minScale, originalHeight, originalWidth]);

  // Setup resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    // Initial scale update
    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [originalWidth, originalHeight, margin, updateScale]);

  return (
    <div
      ref={containerRef}
      className={`scaling ${className}`}
      style={{
        maxHeight: `${originalHeight}px`,
        minHeight: `${originalHeight * minScale}px`
      }}
    >
      <div
        ref={elementRef}
        className='scaling__content'
        style={{
          transform: `scale(${scale})`
        }}
      >
        {children}
      </div>

      {showDebugInfo && (
        <div className='scaling__debug'>
          Scale: {scale.toFixed(2)}
          <br />
          Container: {containerSize.width}×{containerSize.height}px
          <br />
          Original: {originalWidth}×{originalHeight}px
        </div>
      )}
    </div>
  );
};

export default ScalingElement;
