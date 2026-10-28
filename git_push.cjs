const { execSync } = require('child_process');

console.log('Staging files...');
execSync('git add .', { stdio: 'inherit' });

console.log('Committing...');
execSync('git commit -m "feat: preferenze canali notifiche in-app ed email, trigger lista attesa e luoghi con suoni"', { stdio: 'inherit' });

console.log('Pushing to origin main...');
execSync('git push origin main', { stdio: 'inherit' });

console.log('Done!');
