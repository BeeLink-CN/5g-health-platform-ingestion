# Contributing to 5G Health Platform Ingestion Service

Thank you for your interest in contributing!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Set up contracts: See [CONTRACTS.md](./CONTRACTS.md)
4. Copy `.env.example` to `.env` and configure
5. Start the infra stack (see main README)
6. Run migrations: `make migrate`

## Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Type check: `npm run typecheck`
6. Build: `npm run build`
7. Test locally with simulator: `npm run simulate`
8. Commit with conventional commits format
9. Push and open a PR

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(mqtt): add support for ambulance vitals topic
fix(validation): handle missing optional fields correctly
docs(readme): update troubleshooting section
```

## Code Style

- Follow TypeScript best practices
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused
- Use async/await over callbacks

## Testing

- Write unit tests for new features
- Ensure existing tests pass
- Aim for >80% code coverage
- Test edge cases and error handling

## Pull Request Process

1. Update README.md if needed
2. Update CHANGELOG.md following Keep a Changelog format
3. Ensure CI passes (tests, lint, typecheck, build)
4. Request review from maintainers
5. Address review feedback
6. Squash commits if requested

## Questions?

Open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase
- Suggestions for improvements
