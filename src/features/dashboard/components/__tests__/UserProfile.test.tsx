import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfile from '../UserProfile';

describe('UserProfile', () => {
  it('renders initial profile correctly', () => {
    render(<UserProfile />);

    expect(screen.getByTestId('profile-name')).toHaveTextContent('IVANA');
    expect(screen.getByTestId('profile-role')).toHaveTextContent('BACK OFFICE');
  });

  it('navigates to next profile when next button is clicked', () => {
    render(<UserProfile />);

    const nextBtn = screen.getByTestId('next-profile-btn');
    fireEvent.click(nextBtn);

    expect(screen.getByTestId('profile-name')).toHaveTextContent('SOCIÉTÉ BX');
    expect(screen.getByTestId('profile-role')).toHaveTextContent('CLIENT');
  });

  it('cycles back to first profile when next is clicked at the end', () => {
    render(<UserProfile />);

    const nextBtn = screen.getByTestId('next-profile-btn');
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(nextBtn);
    }

    expect(screen.getByTestId('profile-name')).toHaveTextContent('IVANA');
  });

  it('navigates to previous profile when prev button is clicked', () => {
    render(<UserProfile />);

    const prevBtn = screen.getByTestId('prev-profile-btn');
    fireEvent.click(prevBtn);

    expect(screen.getByTestId('profile-name')).toHaveTextContent('TIMOUR');
  });
});
