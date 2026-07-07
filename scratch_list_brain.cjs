const fs = require('fs');
try {
    const files = fs.readdirSync('/Users/linhvu/.gemini/antigravity-ide/conversations');
    console.log('Conversations in conversations/:', files);
} catch (e) {
    console.error('Error listing conversations:', e);
}

try {
    const files = fs.readdirSync('/Users/linhvu/.gemini/antigravity-ide/brain');
    console.log('Folders in brain/:', files);
} catch (e) {
    console.error('Error listing brain:', e);
}
