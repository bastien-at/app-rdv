
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Un composant simple à tester
function HelloWorld({ name }: { name: string }) {
  return <h1>Bonjour, {name}!</h1>;
}

describe('HelloWorld Component', () => {
  it('renders the correct greeting', () => {
    render(<HelloWorld name="Bastien" />);
    
    // Vérifie que le texte est présent
    expect(screen.getByText('Bonjour, Bastien!')).toBeInTheDocument();
    
    // Vérifie que c'est bien un h1
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bonjour, Bastien!');
  });
});
