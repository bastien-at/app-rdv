
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../../components/Input';
import React from 'react';

describe('Input Component', () => {
  it('renders correctly with label', () => {
    render(<Input label="Email Address" id="email" />);
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('renders helper text when provided', () => {
    render(<Input helperText="We will never share your email." />);
    expect(screen.getByText('We will never share your email.')).toBeInTheDocument();
  });

  it('renders error message and applies error styles', () => {
    render(<Input error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('border-error');
  });

  it('toggles password visibility', () => {
    render(<Input type="password" placeholder="Enter password" />);
    
    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');
    
    // Trouver le bouton pour afficher le mot de passe (l'oeil)
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(input).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('forwards ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
  
  it('displays required asterisk when required prop is true', () => {
    render(<Input label="Required Field" required />);
    expect(screen.getByText('*')).toHaveClass('text-error');
  });
});
