import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingForm from './BookingForm';

jest.mock('../api', () => ({
  getApiError: jest.fn(() => 'Произошла ошибка. Попробуйте ещё раз.')
}));

const rooms = [
  { id: 1, name: 'Main Hall' },
  { id: 2, name: 'Small Room' }
];

function renderForm(props) {
  return render(
    <BookingForm
      rooms={rooms}
      initialDate="2026-06-15"
      onClose={jest.fn()}
      onSubmit={jest.fn()}
      {...props}
    />
  );
}

describe('BookingForm', () => {
  it('renders all form fields', () => {
    renderForm();
    expect(screen.getByText('Новая заявка')).toBeTruthy();
    expect(screen.getByText('Зал')).toBeTruthy();
    expect(screen.getByText('Название*')).toBeTruthy();
    expect(screen.getByText('Дата*')).toBeTruthy();
    expect(screen.getByText('С*')).toBeTruthy();
    expect(screen.getByText('До*')).toBeTruthy();
    expect(screen.getByText('Комментарий')).toBeTruthy();
    expect(screen.getByText('Отправить')).toBeTruthy();
    expect(screen.getByText('Закрыть')).toBeTruthy();
  });

  it('shows error when time_to <= time_from', async () => {
    renderForm();
    fireEvent.change(screen.getByDisplayValue('09:00'), { target: { value: '12:00' } });
    fireEvent.change(screen.getByDisplayValue('10:00'), { target: { value: '09:00' } });

    fireEvent.click(screen.getByText('Отправить'));
    await waitFor(() => {
      expect(screen.getByText('Время окончания должно быть позже времени начала.')).toBeTruthy();
    });
  });

  it('calls onSubmit and onClose on valid submit', async () => {
    const onSubmit = jest.fn().mockResolvedValue();
    const onClose = jest.fn();
    renderForm({ onSubmit, onClose });

    fireEvent.change(screen.getByPlaceholderText('Например, репетиция хора'), { target: { value: 'Meeting' } });
    fireEvent.click(screen.getByText('Отправить'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state during submit', async () => {
    const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderForm({ onSubmit });

    fireEvent.click(screen.getByText('Отправить'));
    expect(screen.getByText('Отправляем...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Отправить')).toBeTruthy();
    });
  });

  it('calls onClose when clicking backdrop', () => {
    const onClose = jest.fn();
    render(
      <BookingForm
        rooms={rooms}
        initialDate="2026-06-15"
        onClose={onClose}
        onSubmit={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText('Новая заявка').parentElement.parentElement);
    expect(onClose).toHaveBeenCalled();
  });
});
