import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import GNNLogAnalyzer from '../src/components/GNNLogAnalyzer.jsx';

describe('GNNLogAnalyzer component', () => {
  it('renders title', () => {
    render(<GNNLogAnalyzer />);
    expect(screen.getByText(/GNN Log Analyzer/i)).toBeTruthy();
  });
});