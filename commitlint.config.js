export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-empty': [2, 'never'],
    'body-format': [2, 'always'],
    'body-max-line-length': [0], // Disable line length limit
  },
  plugins: [
    {
      rules: {
        'body-format': ({ raw }) => {
          // Use raw message to get the full commit message including all lines
          if (!raw) {
            return [false, 'Commit message is required'];
          }
          
          // Extract body from raw message (everything after the subject line and blank line)
          const lines = raw.split('\n');
          const bodyStartIndex = lines.findIndex((line, index) => 
            index > 0 && lines[index - 1] === '' && line !== ''
          );
          
          if (bodyStartIndex === -1) {
            return [false, 'Commit body is required'];
          }
          
          const body = lines.slice(bodyStartIndex).join('\n');
          
          const hasOverview = body.includes('# Overview');
          const hasBackground = body.includes('# Background');
          const hasCoAuthored = body.includes('Co-authored-by:') || body.includes('Co-Authored-By:');
          
          const errors = [];
          
          if (!hasOverview) {
            errors.push('Missing "# Overview" section');
          }
          
          if (!hasBackground) {
            errors.push('Missing "# Background" section');
          }
          
          // Only check for Co-authored-by when CLAUDECODE=1
          if (process.env.CLAUDECODE === '1' && !hasCoAuthored) {
            errors.push('Missing "Co-authored-by:" or "Co-Authored-By:" line');
          }
          
          if (errors.length > 0) {
            return [false, `Commit body must include:\n${errors.join('\n')}`];
          }
          
          return [true];
        },
      },
    },
  ],
};