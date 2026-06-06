import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => globalThis.__loginPage_auth(),
}));

jest.mock('../api', () => ({
  getApiError: (...args) => globalThis.__loginPage_getApiError(...args),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => globalThis.__loginPage_navigate,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.__loginPage_auth = jest.fn(() => ({ isAuthenticated: false, login: jest.fn() }));
    globalThis.__loginPage_getApiError = jest.fn(() => 'Ошибка входа.');
    globalThis.__loginPage_navigate = jest.fn();
  });

  it('renders login form', () => {
    renderPage();
    expect(screen.getByText('Добро пожаловать')).toBeTruthy();
    expect(screen.getByText('Войти')).toBeTruthy();
    expect(screen.getByText('Имя')).toBeTruthy();
    expect(screen.getByText('Код доступа')).toBeTruthy();
  });

  it('redirects to / when already authenticated', () => {
    globalThis.__loginPage_auth = jest.fn(() => ({ isAuthenticated: true }));
    renderPage();
    expect(screen.queryByText('Добро пожаловать')).toBeNull();
  });

  it('shows error on failed login', async () => {
    const login = jest.fn().mockRejectedValue(new Error('fail'));
    globalThis.__loginPage_auth = jest.fn(() => ({ isAuthenticated: false, login }));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Например, Анна'), { target: { value: 'User' } });
    fireEvent.change(screen.getByPlaceholderText('Код из приглашения'), { target: { value: 'WRONG' } });
    fireEvent.submit(screen.getByRole('button').closest('form'));

    expect(await screen.findByText('Ошибка входа.')).toBeTruthy();
  });

  it('calls login with name and inviteCode', async () => {
    const login = jest.fn().mockResolvedValue({ role: 'user' });
    globalThis.__loginPage_auth = jest.fn(() => ({ isAuthenticated: false, login }));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Например, Анна'), { target: { value: 'TestUser' } });
    fireEvent.change(screen.getByPlaceholderText('Код из приглашения'), { target: { value: 'CODE123' } });
    fireEvent.submit(screen.getByRole('button').closest('form'));

    await screen.findByText('Войти');
    expect(login).toHaveBeenCalledWith('TestUser', 'CODE123');
  });

  it('shows loading text while submitting', async () => {
    const login = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    globalThis.__loginPage_auth = jest.fn(() => ({ isAuthenticated: false, login }));
    renderPage();

    fireEvent.submit(screen.getByRole('button').closest('form'));
    expect(screen.getByText('Входим...')).toBeTruthy();
  });
});
