const fs = require('fs');
let content = fs.readFileSync('src/pages/Verbali/VerbaleEditor.tsx', 'utf8');

// The issue is that we returned JSX, but didn't close it properly with `);`
content = content.replace(/                                    <\/div>\r?\n                                        \r?\n                                if \(sez ===/g, '                                    </div>\n                                );\n                                    \n                                if (sez ===');

content = content.replace(/                                    <\/div>\r?\n\r?\n                                return null;/g, '                                    </div>\n                                );\n\n                                return null;');

fs.writeFileSync('src/pages/Verbali/VerbaleEditor.tsx', content, 'utf8');
console.log('Fixed');
