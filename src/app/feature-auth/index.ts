export * from './auth.routes';
export * from './admin.routes';
// Deliberately only the login page: the admin panel's components, its store and its row view-model
// stay feature-internal, so `/login`'s chunk does not carry them (see `admin.routes.ts`).
export * from './components';
