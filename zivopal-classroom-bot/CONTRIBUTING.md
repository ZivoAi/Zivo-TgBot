# Contributing to ZivoPal Classroom Bot

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Local Setup

```bash
git clone https://github.com/zivopal/zivopal-classroom-bot.git
cd zivopal-classroom-bot
npm install
cp .env.example .env
# Edit .env with test credentials
npm run dev
```

## Branching Strategy

- `main`: Production-ready code, tagged with versions
- `develop`: Integration branch for features
- Feature branches: `feat/<feature-name>`
- Bug fixes: `bugfix/<issue-name>`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Test additions
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `chore`: Maintenance

Example:
```
feat(moderation): add hate-speech detection with regex patterns

- Implemented keyword-based detection
- Added severity scoring
- Tests cover 5 edge cases

Closes #42
```

## Code Style

- ESLint: `npm run lint`
- Prettier: `npm run format`
- Type checking: `npm run type-check`

Run before commit:
```bash
npm run lint:fix
npm run format
npm run type-check
```

## Testing

- **Unit tests**: `npm test`
- **Integration tests**: `npm run test:integration`
- **Coverage**: `npm test -- --coverage`

Target: **80%+ coverage** for all files

When adding features:
1. Write tests first (TDD approach preferred)
2. Implement feature
3. Ensure tests pass
4. Verify coverage meets threshold

Example test structure:
```typescript
describe('Feature X', () => {
  let subject: FeatureX;

  beforeEach(() => {
    subject = new FeatureX();
  });

  it('should do something', () => {
    const result = subject.doSomething();
    expect(result).toBeDefined();
  });
});
```

## Pull Request Process

1. Create feature branch from `develop`
2. Make commits with clear messages
3. Push to fork and create PR to `develop`
4. Fill PR template with:
   - Description of changes
   - Related issue(s)
   - Testing notes
   - Screenshots (if UI-related)

5. Ensure all CI checks pass:
   - Lint
   - Type checking
   - Tests
   - Coverage

6. Request review from maintainers
7. Address feedback in new commits (don't rewrite history)
8. Merge when approved

## Documentation

When adding features, update:
- [README.md](README.md) - Usage and setup
- Inline code comments for complex logic
- API docs in code (JSDoc)
- [API_REQUIREMENTS.md](API_REQUIREMENTS.md) - If API changes

## Reporting Issues

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs. actual behavior
- Node.js version
- OS and environment details
- Relevant logs/screenshots

## Questions?

Open an Issue with `[QUESTION]` tag or contact the team.

## License

All contributions are licensed under MIT.
