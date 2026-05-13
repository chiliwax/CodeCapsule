export const CLI_NAME = 'codecapsule';

export function getHelpText(): string {
  return [
    'codecapsule',
    '',
    'Usage:',
    '  codecapsule [options]',
    '',
    'Options:',
    '  -h, --help   Show this help message'
  ].join('\n');
}
