import { getApiError, setOnUnauthorized } from './api';

describe('getApiError', () => {
  it('returns message from error response', () => {
    const error = { response: { data: { message: 'Неверный код доступа.' } } };
    expect(getApiError(error)).toBe('Неверный код доступа.');
  });

  it('returns default message when no response', () => {
    expect(getApiError({})).toBe('Произошла ошибка. Попробуйте ещё раз.');
  });

  it('returns default message when response has no data', () => {
    const error = { response: {} };
    expect(getApiError(error)).toBe('Произошла ошибка. Попробуйте ещё раз.');
  });
});

var requestHandler, responseErrorHandler;

jest.mock('axios', () => {
  const requestUse = jest.fn((handler) => { requestHandler = handler; return handler; });
  const responseUse = jest.fn((ok, handler) => { responseErrorHandler = handler; return handler; });
  return {
    create: jest.fn(() => ({
      interceptors: {
        request: { use: requestUse },
        response: { use: responseUse }
      }
    }))
  };
});

beforeEach(() => {
  localStorage.clear();
});

describe('request interceptor', () => {
  it('adds Bearer token from localStorage', () => {
    localStorage.setItem('token', 'my-token');
    const config = requestHandler({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer my-token');
  });

  it('does not add token when not in localStorage', () => {
    const config = requestHandler({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('response error interceptor', () => {
  it('calls onUnauthorized on 401', () => {
    const cb = jest.fn();
    setOnUnauthorized(cb);

    responseErrorHandler({ response: { status: 401 } }).catch(() => {});
    expect(cb).toHaveBeenCalled();
  });

  it('does not call onUnauthorized on other errors', () => {
    const cb = jest.fn();
    setOnUnauthorized(cb);

    responseErrorHandler({ response: { status: 500 } }).catch(() => {});
    expect(cb).not.toHaveBeenCalled();
  });

  it('rejects the error after handling', async () => {
    await expect(responseErrorHandler({ response: { status: 401 } })).rejects.toEqual({ response: { status: 401 } });
  });
});
