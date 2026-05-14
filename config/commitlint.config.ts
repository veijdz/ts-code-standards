import type { UserConfig } from '@commitlint/types'

const BANNED_AI_ATTRIBUTION_PATTERNS = [
  /generated (with|by) claude/i,
  /co-authored with claude/i,
  /🤖[\s\S]*claude/i,
] as const

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        // eslint-disable-next-line @typescript-eslint/naming-convention -- commitlint rule identifier
        'no-co-authored-by': (parsed) => {
          const raw = parsed['raw'] ?? ''
          const hasCoAuthored = /co-authored-by:/i.test(raw)
          return [
            !hasCoAuthored,
            'commit message must not contain a "Co-Authored-By:" trailer (see docs/conventions/git.md)',
          ]
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention -- commitlint rule identifier
        'no-ai-attribution': (parsed) => {
          const raw = parsed['raw'] ?? ''
          const hasAttribution = BANNED_AI_ATTRIBUTION_PATTERNS.some((pattern) => pattern.test(raw))
          return [
            !hasAttribution,
            'commit message must not contain AI attribution (see docs/conventions/git.md)',
          ]
        },
      },
    },
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'no-co-authored-by': [2, 'always'],
    'no-ai-attribution': [2, 'always'],
  },
}

export default config
