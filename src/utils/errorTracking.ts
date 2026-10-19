/**
 * Jifuno Error Tracking & Observability Service (Sentry Free Tier Compatible)
 * Safely captures unhandled exceptions, question runner errors, and network issues.
 * Works seamlessly in production with Sentry, and falls back to structured console logs in development.
 */

export interface ErrorContext {
  learnerId?: string;
  questionId?: string;
  lessonId?: string;
  component?: string;
  extra?: Record<string, any>;
}

export interface Breadcrumb {
  category: string;
  message: string;
  level?: 'info' | 'warning' | 'error';
  timestamp?: string;
}

class ErrorTrackingService {
  private isInitialized = false;
  private dsn: string | null = null;
  private breadcrumbs: Breadcrumb[] = [];
  private readonly MAX_BREADCRUMBS = 20;

  public init() {
    if (this.isInitialized) return;

    try {
      this.dsn = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SENTRY_DSN) || null;

      if (this.dsn) {
        // Sentry DSN provided
        console.log('[ErrorTracking] Sentry initialized with DSN:', this.dsn.replace(/:[^:]*@/, ':***@'));
      } else {
        console.log('[ErrorTracking] Sentry DSN not configured; running in local observability mode.');
      }

      // Global window error listener
      if (typeof window !== 'undefined') {
        window.addEventListener('error', (event) => {
          this.captureException(event.error || new Error(event.message), {
            component: 'window.onerror',
            extra: { filename: event.filename, lineno: event.lineno, colno: event.colno }
          });
        });

        window.addEventListener('unhandledrejection', (event) => {
          const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
          this.captureException(reason, { component: 'unhandledrejection' });
        });
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('[ErrorTracking] Initialization notice:', err);
    }
  }

  public addBreadcrumb(breadcrumb: Breadcrumb) {
    const entry: Breadcrumb = {
      ...breadcrumb,
      timestamp: breadcrumb.timestamp || new Date().toISOString()
    };
    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > this.MAX_BREADCRUMBS) {
      this.breadcrumbs.shift();
    }
  }

  public captureException(error: Error | unknown, context?: ErrorContext): string {
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const errObj = error instanceof Error ? error : new Error(String(error));

    const payload = {
      errorId,
      message: errObj.message,
      stack: errObj.stack,
      context,
      breadcrumbs: [...this.breadcrumbs],
      timestamp: new Date().toISOString()
    };

    // Forward to Sentry if active
    if (this.dsn && typeof window !== 'undefined' && (window as any).Sentry) {
      try {
        (window as any).Sentry.captureException(errObj, {
          extra: payload
        });
      } catch (_) {}
    }

    // Always log structured error in development / test
    console.error(`[ErrorTracking][${errorId}] Exception:`, errObj.message, payload);

    return errorId;
  }

  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    const payload = {
      message,
      level,
      context,
      timestamp: new Date().toISOString()
    };

    if (this.dsn && typeof window !== 'undefined' && (window as any).Sentry) {
      try {
        (window as any).Sentry.captureMessage(message, level);
      } catch (_) {}
    }

    if (level === 'error') {
      console.error(`[ErrorTracking] ${message}`, payload);
    } else if (level === 'warning') {
      console.warn(`[ErrorTracking] ${message}`, payload);
    } else {
      console.info(`[ErrorTracking] ${message}`, payload);
    }
  }

  public setUser(user: { id?: string; email?: string; role?: string } | null) {
    if (this.dsn && typeof window !== 'undefined' && (window as any).Sentry) {
      try {
        (window as any).Sentry.setUser(user);
      } catch (_) {}
    }
  }
}

export const errorTracker = new ErrorTrackingService();
