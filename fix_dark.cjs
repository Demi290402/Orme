const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/Verbali/VerbaleEditor.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/(?<!dark:)bg-white\b/g, 'bg-white dark:bg-gray-800');
content = content.replace(/(?<!dark:)bg-gray-50\/50\b/g, 'bg-gray-50/50 dark:bg-gray-700/50');
content = content.replace(/(?<!dark:)bg-gray-50\b/g, 'bg-gray-50 dark:bg-gray-700');
content = content.replace(/(?<!dark:)border-gray-100\b/g, 'border-gray-100 dark:border-gray-700');
content = content.replace(/(?<!dark:)text-gray-800\b/g, 'text-gray-800 dark:text-gray-100');
content = content.replace(/(?<!dark:)text-gray-500\b/g, 'text-gray-500 dark:text-gray-300');

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched VerbaleEditor.tsx');
