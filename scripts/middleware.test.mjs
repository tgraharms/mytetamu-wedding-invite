import test from 'node:test';
import assert from 'node:assert/strict';

// Run the real root middleware. Node strips the types natively; `next()` from
// @vercel/functions answers with an `x-middleware-next: 1` header, which is how
// Vercel's edge is told to carry on to the static file.
const { default: middleware } = await import('../middleware.ts');

const KEYS = ['LAB_PASSWORD', 'PUBLIC_PORTFOLIO_MODE'];

// Set the environment for one case, run it, and put the environment back.
function withEnv(env, run) {
  const saved = Object.fromEntries(KEYS.map(key => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
  Object.assign(process.env, env);
  try {
    return run();
  } finally {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function visit(credentials) {
  const headers = credentials ? { authorization: `Basic ${btoa(credentials)}` } : {};
  return middleware(new Request('https://demo.example/urus', { headers }));
}

const passesThrough = response => response.headers.get('x-middleware-next') === '1';

test('live: no LAB_PASSWORD fails closed with 503', () => {
  withEnv({}, () => {
    const response = visit();
    assert.equal(response.status, 503);
    assert.ok(!passesThrough(response));
  });
});

test('live: no credentials gets a 401 challenge', () => {
  withEnv({ LAB_PASSWORD: 'correct-horse' }, () => {
    const response = visit();
    assert.equal(response.status, 401);
    assert.match(response.headers.get('www-authenticate'), /^Basic /);
    assert.ok(!passesThrough(response));
  });
});

test('live: a wrong password gets 401', () => {
  withEnv({ LAB_PASSWORD: 'correct-horse' }, () => {
    const response = visit('lab:wrong');
    assert.equal(response.status, 401);
    assert.ok(!passesThrough(response));
  });
});

test('live: the right Basic credentials pass through', () => {
  withEnv({ LAB_PASSWORD: 'correct-horse' }, () => {
    const response = visit('lab:correct-horse');
    assert.ok(passesThrough(response));
    assert.notEqual(response.status, 401);
  });
});

test('portfolio mode passes through with no credentials, even without LAB_PASSWORD', () => {
  withEnv({ PUBLIC_PORTFOLIO_MODE: 'true' }, () => {
    const response = visit();
    assert.ok(passesThrough(response));
    assert.notEqual(response.status, 503);
  });
});

test('portfolio mode passes through when LAB_PASSWORD is set and no credentials come', () => {
  withEnv({ PUBLIC_PORTFOLIO_MODE: 'true', LAB_PASSWORD: 'correct-horse' }, () => {
    assert.ok(passesThrough(visit()));
  });
});

test('PUBLIC_PORTFOLIO_MODE other than exactly "true" is still gated', () => {
  withEnv({ PUBLIC_PORTFOLIO_MODE: '1', LAB_PASSWORD: 'correct-horse' }, () => {
    const response = visit();
    assert.equal(response.status, 401);
    assert.ok(!passesThrough(response));
  });
  withEnv({ PUBLIC_PORTFOLIO_MODE: '1' }, () => {
    assert.equal(visit().status, 503);
  });
});
